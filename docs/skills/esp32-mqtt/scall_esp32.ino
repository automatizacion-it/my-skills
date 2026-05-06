// ============================================================
//  SCALL ESP32 — Cliente MQTT para Asistente de Voz
//  Broker: HiveMQ Cloud (TLS puerto 8883)
//  Librerías necesarias (Arduino Library Manager):
//    - PubSubClient  (Nick O'Leary)
//    - ESP32Servo    (Kevin Harrington)
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ──────────────────────────────────────────────
//  ⚠️  CONFIGURA AQUÍ TUS CREDENCIALES
// ──────────────────────────────────────────────
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";

// HiveMQ Cloud → Cluster → Overview
const char* MQTT_HOST     = "xxxx.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;          // TLS
const char* MQTT_USER     = "tu_usuario";
const char* MQTT_PASSWORD = "tu_password";
const char* CLIENT_ID     = "scall-esp32-01";

// ──────────────────────────────────────────────
//  PINES GPIO
// ──────────────────────────────────────────────
#define PIN_LUZ_SALA   2    // Relay luces sala   → LED/Relay
#define PIN_LUZ_CUARTO 4    // Relay luces cuarto → LED/Relay
#define PIN_TV         5    // Relay TV            → LED/Relay
#define PIN_SERVO      18   // Servo persianas     → Servo motor

// ──────────────────────────────────────────────
//  TOPICS MQTT (deben coincidir con app.js)
// ──────────────────────────────────────────────
#define TOPIC_LUZ_SALA    "casa/sala/luces"
#define TOPIC_LUZ_CUARTO  "casa/cuarto/luces"
#define TOPIC_LUZ_GENERAL "casa/general/luces"
#define TOPIC_TV          "casa/sala/tv"
#define TOPIC_PERSIANAS   "casa/persianas"
#define TOPIC_STATUS      "scall/esp32/status"  // Publicar estado del ESP32

Servo servoPersianas;
WiFiClientSecure espClient;
PubSubClient     mqttClient(espClient);

// ──────────────────────────────────────────────
//  CALLBACK: Mensajes MQTT recibidos
// ──────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convertir payload a String
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.printf("[MQTT] Topic: %s | Payload: %s\n", topic, msg.c_str());

  // ── Luces sala ──────────────────────────────
  if (strcmp(topic, TOPIC_LUZ_SALA) == 0) {
    digitalWrite(PIN_LUZ_SALA, msg == "ON" ? HIGH : LOW);
    Serial.println(msg == "ON" ? "💡 Sala ON" : "💡 Sala OFF");
  }

  // ── Luces cuarto ────────────────────────────
  else if (strcmp(topic, TOPIC_LUZ_CUARTO) == 0) {
    digitalWrite(PIN_LUZ_CUARTO, msg == "ON" ? HIGH : LOW);
    Serial.println(msg == "ON" ? "💡 Cuarto ON" : "💡 Cuarto OFF");
  }

  // ── Luces generales (todas) ─────────────────
  else if (strcmp(topic, TOPIC_LUZ_GENERAL) == 0) {
    bool state = (msg == "ON");
    digitalWrite(PIN_LUZ_SALA,   state ? HIGH : LOW);
    digitalWrite(PIN_LUZ_CUARTO, state ? HIGH : LOW);
    Serial.println(state ? "💡 Todas ON" : "💡 Todas OFF");
  }

  // ── Televisor ───────────────────────────────
  else if (strcmp(topic, TOPIC_TV) == 0) {
    digitalWrite(PIN_TV, msg == "ON" ? HIGH : LOW);
    Serial.println(msg == "ON" ? "📺 TV ON" : "📺 TV OFF");
  }

  // ── Persianas (Servo) ───────────────────────
  else if (strcmp(topic, TOPIC_PERSIANAS) == 0) {
    if (msg == "OPEN") {
      servoPersianas.write(90);   // Abrir
      Serial.println("🪟 Persianas ABIERTAS");
    } else if (msg == "CLOSE") {
      servoPersianas.write(0);    // Cerrar
      Serial.println("🪟 Persianas CERRADAS");
    }
  }

  // Publicar ACK de vuelta al broker
  String ack = "ACK:" + String(topic) + "=" + msg;
  mqttClient.publish(TOPIC_STATUS, ack.c_str());
}

// ──────────────────────────────────────────────
//  WIFI
// ──────────────────────────────────────────────
void conectarWifi() {
  Serial.printf("\n[WiFi] Conectando a %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] ✅ Conectado — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ──────────────────────────────────────────────
//  MQTT RECONNECT
// ──────────────────────────────────────────────
void conectarMQTT() {
  while (!mqttClient.connected()) {
    Serial.printf("[MQTT] Conectando como %s...", CLIENT_ID);
    if (mqttClient.connect(CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
      Serial.println(" ✅ Conectado al broker!");

      // Suscribirse a todos los topics de control
      mqttClient.subscribe(TOPIC_LUZ_SALA);
      mqttClient.subscribe(TOPIC_LUZ_CUARTO);
      mqttClient.subscribe(TOPIC_LUZ_GENERAL);
      mqttClient.subscribe(TOPIC_TV);
      mqttClient.subscribe(TOPIC_PERSIANAS);

      // Publicar presencia
      mqttClient.publish(TOPIC_STATUS, "ESP32:ONLINE");
      Serial.println("[MQTT] Subscripciones activas. Esperando comandos de SCALL...");
    } else {
      Serial.printf(" ❌ Fallo (rc=%d). Reintentando en 5s...\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ──────────────────────────────────────────────
//  SETUP
// ──────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== SCALL ESP32 MQTT Controller ===");

  // Configurar pines de salida
  pinMode(PIN_LUZ_SALA,   OUTPUT);
  pinMode(PIN_LUZ_CUARTO, OUTPUT);
  pinMode(PIN_TV,         OUTPUT);
  digitalWrite(PIN_LUZ_SALA,   LOW);
  digitalWrite(PIN_LUZ_CUARTO, LOW);
  digitalWrite(PIN_TV,         LOW);

  // Servo
  servoPersianas.attach(PIN_SERVO);
  servoPersianas.write(0);  // Posición inicial: cerrado

  // WiFi
  conectarWifi();

  // MQTT con TLS (sin verificar certificado — válido para HiveMQ Cloud)
  espClient.setInsecure();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  conectarMQTT();
}

// ──────────────────────────────────────────────
//  LOOP
// ──────────────────────────────────────────────
void loop() {
  if (!mqttClient.connected()) {
    conectarMQTT();
  }
  mqttClient.loop();  // Mantener conexión y procesar mensajes
}
