const orbBtn      = document.getElementById('orbBtn');
const statusText  = document.getElementById('statusText');
const transcriptText = document.getElementById('transcriptText');
const systemLog   = document.getElementById('systemLog');

// ======================================================================
// CAPA DE SEGURIDAD
// La API Key SOLO proviene de window.APP_CONFIG (generado por GitHub Actions).
// No se acepta ninguna clave introducida manualmente por el usuario en la UI.
// ======================================================================
function getApiKey() {
  const key = window.APP_CONFIG && window.APP_CONFIG.geminiApiKey;
  return (key && key.trim() !== '') ? key.trim() : '';
}

function isKeyPreConfigured() {
  return getApiKey() !== '';
}

function getYtApiKeyConfig() {
  const key = window.APP_CONFIG && window.APP_CONFIG.youtubeApiKey;
  return (key && key.trim() !== '') ? key.trim() : localStorage.getItem('youtubeApiKey') || '';
}

// Actualiza el badge en la top bar y la tarjeta dentro del modal
function updateAIStatusUI() {
  const badge    = document.getElementById('aiStatusBadge');
  const badgeText = document.getElementById('aiStatusText');
  const card     = document.getElementById('aiStatusCard');
  const cardTitle = document.getElementById('aiStatusCardTitle');
  const cardDesc  = document.getElementById('aiStatusCardDesc');
  const hint      = document.getElementById('aiHint');
  const icon      = card && card.querySelector('.ai-status-icon');

  if (isKeyPreConfigured()) {
    // ✅ Configurada
    if (badge)     { badge.className = 'ai-status-badge ready'; }
    if (badgeText)  badgeText.textContent = 'IA Gemini activa';
    if (card)      { card.className = 'ai-status-card ready'; }
    if (icon)       icon.textContent = '✅';
    if (cardTitle)  cardTitle.textContent = 'IA configurada vía servidor';
    if (cardDesc)   cardDesc.textContent = 'Gemini API Key inyectada por GitHub Actions (segura)';
    if (hint)       hint.style.display = 'none';
    logMessage('[SEGURIDAD] ✅ Gemini API Key cargada desde GitHub Secrets');
  } else {
    // ⚠️ Sin clave
    if (badge)     { badge.className = 'ai-status-badge warn'; }
    if (badgeText)  badgeText.textContent = 'Sin IA · modo local';
    if (card)      { card.className = 'ai-status-card warn'; }
    if (icon)       icon.textContent = '⚠️';
    if (cardTitle)  cardTitle.textContent = 'Sin clave de IA configurada';
    if (cardDesc)   cardDesc.textContent = 'Modo local activo. Sólo comandos predefinidos.';
    if (hint) {
      hint.style.display = 'block';
      hint.innerHTML = 'Para activar Gemini, agrega <code>GEMINI_API_KEY</code> en <strong>GitHub → Settings → Secrets → Actions</strong> y redespliega.';
    }
  }
}

// ======================================================================
// MQTT — Conexión al broker vía WebSockets
// ======================================================================
let mqttClient = null;

function getMqttConfig() {
  const cfg = window.APP_CONFIG || {};
  return {
    host:     cfg.mqttHost     || localStorage.getItem('mqttHost')     || '',
    port:     cfg.mqttPort     || localStorage.getItem('mqttPort')     || '8884',
    user:     cfg.mqttUser     || localStorage.getItem('mqttUser')     || '',
    password: cfg.mqttPassword || localStorage.getItem('mqttPassword') || ''
  };
}

function conectarMQTT() {
  if (typeof mqtt === 'undefined') {
    logMessage('[MQTT] ⚠️ Librería MQTT.js no cargada. Modo simulación activo.');
    return;
  }
  const { host, port, user, password } = getMqttConfig();
  if (!host) {
    logMessage('[MQTT] ℹ️ Sin broker configurado. Usando simulación local.');
    return;
  }

  const url = `wss://${host}:${port}/mqtt`;
  logMessage(`[MQTT] Conectando a ${host}:${port}...`);

  mqttClient = mqtt.connect(url, {
    clientId: 'scall_browser_' + Math.random().toString(16).substr(2, 8),
    username: user,
    password: password,
    clean: true,
    reconnectPeriod: 5000
  });

  mqttClient.on('connect', () => {
    logMessage('[MQTT] ✅ Conectado al broker. ESP32 listo.');
    statusText.innerText = 'MQTT Conectado';
    statusText.style.color = '#10b981';
    // Actualizar dot top bar
    const dot   = document.getElementById('mqttStatusDot');
    const label = document.getElementById('mqttStatusLabel');
    if (dot)   dot.className   = 'mqtt-dot connected';
    if (label) label.textContent = 'ON';
    setTimeout(() => {
      statusText.innerText = 'Presiona el orbe para hablar';
      statusText.style.color = '';
    }, 3000);
    // Iniciar listener SOS desde ESP32
    if (typeof iniciarListenerSOS === 'function') iniciarListenerSOS(mqttClient);
  });

  mqttClient.on('error',   (err) => {
    logMessage(`[MQTT] ❌ Error: ${err.message}`);
    const dot = document.getElementById('mqttStatusDot');
    if (dot) dot.className = 'mqtt-dot error';
  });
  mqttClient.on('offline', () => {
    logMessage('[MQTT] ⚠️ Broker desconectado. Reconectando...');
    const dot   = document.getElementById('mqttStatusDot');
    const label = document.getElementById('mqttStatusLabel');
    if (dot)   dot.className    = 'mqtt-dot';
    if (label) label.textContent = 'MQTT';
  });
}

// ======================================================================
// ESTADO DE ACTIVIDADES Y TOGGLE
// ======================================================================
let activityState = { musicPlaying: false, lightsOn: false, tvOn: false, currentCommand: '' };

function updateActivityState(type, value) {
  activityState[type] = value;
  updateToggleDisplay();
}

function updateToggleDisplay() {
  const { commandToggle, toggleLabel, toggleStateText } = getToggleElements();
  if (!commandToggle) return;
  let status = [];
  if (activityState.musicPlaying)  status.push('🎵 Música ON');
  if (activityState.lightsOn)      status.push('💡 Luces ON');
  if (activityState.tvOn)          status.push('📺 TV ON');
  if (activityState.currentCommand) status.push(`↳ ${activityState.currentCommand}`);
  const displayText = status.length > 0 ? status.join(' | ') : 'Sistema activo';
  if (toggleLabel)     toggleLabel.innerText     = displayText;
  if (toggleStateText) toggleStateText.innerText = status.length > 0 ? 'Activo' : 'Inactivo';
}

function getToggleElements() {
  let commandToggle = document.getElementById('commandToggle');
  if (!commandToggle) {
    commandToggle = document.createElement('div');
    commandToggle.id = 'commandToggle';
    commandToggle.className = 'command-toggle hidden';
    commandToggle.innerHTML = `
      <span id="toggleLabel">Acción recibida</span>
      <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="toggleAction" checked>
        <span id="toggleStateText">Activado</span>
      </label>
      <button onclick="hideCommandToggle()" style="background:none;border:none;color:#000;font-size:18px;cursor:pointer;">×</button>
    `;
    document.body.appendChild(commandToggle);
  }
  return {
    commandToggle,
    toggleAction:    document.getElementById('toggleAction'),
    toggleLabel:     document.getElementById('toggleLabel'),
    toggleStateText: document.getElementById('toggleStateText')
  };
}

// ======================================================================
// RECONOCIMIENTO DE VOZ
// ======================================================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  statusText.innerText = 'Error: Navegador no soporta API de Voz (usa Chrome o Edge).';
  statusText.style.color = 'red';
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = true;
  let isListening = false;

  orbBtn.addEventListener('click', () => {
    if (!isListening) {
      try {
        recognition.start();
        orbBtn.classList.add('listening');
        statusText.innerText = 'Escuchando...';
        transcriptText.innerText = '';
        isListening = true;
      } catch(e) { console.error('No se pudo iniciar:', e); }
    } else {
      recognition.stop();
    }
  });

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];

    if (!result.isFinal) {
      // Mostrar texto intermedio en pantalla sin llamar a Gemini
      transcriptText.innerText = result[0].transcript;
      return;
    }

    // Solo cuando la frase está completa
    const texto = result[0].transcript;
    logMessage(`Frase completa: "${texto}"`);
    transcriptText.innerText = texto;
    ejecutarHabilidad(texto);
  };

  recognition.onerror = (event) => {
    statusText.innerText = 'Error de voz: ' + event.error;
    orbBtn.classList.remove('listening');
    isListening = false;
  };

  recognition.onend = () => {
    statusText.innerText = 'Procesando...';
    orbBtn.classList.remove('listening');
    isListening = false;
    setTimeout(() => { statusText.innerText = 'Presiona el orbe para hablar'; }, 2000);
  };
}

// ======================================================================
// TOGGLE UI
// ======================================================================
function showCommandToggle(message = 'Acción recibida') {
  const { commandToggle, toggleAction, toggleLabel, toggleStateText } = getToggleElements();
  if (!commandToggle || !toggleAction || !toggleLabel || !toggleStateText) return;
  activityState.currentCommand = message;
  updateToggleDisplay();
  toggleAction.checked = true;
  commandToggle.classList.remove('hidden');
  commandToggle.style.display = 'flex';
  logMessage('[TOGGLE UI] Visible');
}

function hideCommandToggle() {
  const { commandToggle } = getToggleElements();
  if (!commandToggle) return;
  commandToggle.classList.add('hidden');
  commandToggle.style.display = 'none';
}

function autoHideToggle(delay = 5000) {
  setTimeout(() => { hideCommandToggle(); }, delay);
}

function prepareToggleListener() {
  const { toggleAction, toggleStateText } = getToggleElements();
  if (!toggleAction) return;
  toggleAction.addEventListener('change', () => {
    const checked = toggleAction.checked;
    if (toggleStateText) toggleStateText.innerText = checked ? 'Activado' : 'Desactivado';
    logMessage(`[TOGGLE] ${checked ? 'Activado' : 'Desactivado'}`);
    if (!checked && typeof pausarMusica  === 'function') pausarMusica();
    if ( checked && typeof reanudarMusica === 'function') reanudarMusica();
  });
}

function logMessage(msg) {
  systemLog.innerHTML += `<br>&gt; ${msg}`;
  systemLog.scrollTop = systemLog.scrollHeight;
}

// ======================================================================
// GUARDAR CONFIGURACIÓN (sin manejo de API key manual)
// ======================================================================
function saveAssistantConfig() {
  const name = document.getElementById('assistantName').value.trim() || 'SCALL';
  localStorage.setItem('assistantName', name);
  document.getElementById('displayName').innerText = name;

  if (isKeyPreConfigured()) {
    logMessage(`[CONFIG] Asistente renombrado a "${name}". IA usa clave de servidor.`);
  } else {
    logMessage(`[CONFIG] Asistente renombrado a "${name}". Sin IA activa (modo local).`);
  }

  document.getElementById('configModal').style.display = 'none';
}

function guardarYConectarMQTT() {
  const host     = document.getElementById('mqttHost').value.trim();
  const user     = document.getElementById('mqttUser').value.trim();
  const password = document.getElementById('mqttPassword').value.trim();
  if (!host) { alert('Ingresa el host del broker MQTT.'); return; }
  localStorage.setItem('mqttHost',     host);
  localStorage.setItem('mqttUser',     user);
  localStorage.setItem('mqttPassword', password);
  if (mqttClient) { try { mqttClient.end(true); } catch(e) {} }
  logMessage(`[MQTT] Guardando config y conectando a ${host}...`);
  conectarMQTT();
}

// Spotify / YouTube alias (el modal ya no tiene spotifyClientId como key de Spotify)
function conectarSpotify() {
  const key = document.getElementById('spotifyClientId') && document.getElementById('spotifyClientId').value.trim();
  if (key) localStorage.setItem('youtubeApiKey', key);
  logMessage('[MÚSICA] YouTube API Key guardada.');
}

// ======================================================================
// CEREBRO: IA PROFUNDA (Gemini) + INTENTS LOCALES
// ======================================================================
let geminiCooldown = false;

async function ejecutarHabilidad(texto) {
  showCommandToggle(`Comando: ${texto}`);
  logMessage(`Usuario dijo: "${texto}"`);
  const apiKey = getApiKey();
  const name   = localStorage.getItem('assistantName') || 'SCALL';

  if (apiKey) {
    // Evitar llamadas múltiples seguidas
    if (geminiCooldown) {
      logMessage('[GEMINI] ⏳ Espera un momento antes del siguiente comando.');
      responderVoz('Un momento por favor.');
      return;
    }
    geminiCooldown = true;
    setTimeout(() => { geminiCooldown = false; }, 3000); // 3s entre llamadas

    logMessage('Consultando Cerebro IA (Gemini)...');
    transcriptText.innerText = 'Pensando...';

    const systemPrompt = `INSTRUCCIONES DE SISTEMA OBLIGATORIAS:
Eres ${name}, un asistente personal inteligente, amigable y muy capaz. Tu trabajo es hablar con el usuario sobre cualquier tema, responder preguntas, hacer chistes o ayudarle en lo que necesite.
Además, tienes habilidades domóticas. Si el usuario te pide encender, apagar o controlar hardware (luces, ventiladores, puertas), DEBES responder de forma natural y servicial, pero OBLIGATORIAMENTE debes incluir al puro final de tu respuesta el comando técnico en el formato exacto: MQTT[topic|payload].
Ejemplo 1 (Usuario: "Hola, ¿quién eres?"): "¡Hola! Soy ${name}, tu asistente personal. ¿En qué te ayudo?"
Ejemplo 2 (Usuario: "Enciende las luces de la sala"): "Claro, enseguida enciendo las luces. MQTT[casa/sala/luces|ON]"
Ejemplo 3 (Usuario: "Apaga la luz"): "Entendido, apagando luz. MQTT[casa/sala/luces|OFF]"

MENSAJE DEL USUARIO: "${texto}"`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let aiResponse = data.candidates[0].content.parts[0].text;

      // Extraer comandos MQTT de la respuesta
      const mqttRegex = /MQTT\[(.*?)\]/g;
      let match;
      while ((match = mqttRegex.exec(aiResponse)) !== null) {
        const cmd = match[1].split('|');
        if (cmd.length === 2) enviarComandoMQTT(cmd[0], cmd[1]);
      }
      aiResponse = aiResponse.replace(/MQTT\[.*?\]/g, '').trim();
      responderVoz(aiResponse);

    } catch (err) {
      geminiCooldown = false;
      if (err.message && err.message.includes('429')) {
        logMessage('[GEMINI] ⚠️ Límite de velocidad alcanzado. Usando intents locales...');
        responderVoz('Estoy ocupado, usando modo local.');
        ejecutarIntentLocal(texto);
      } else {
        logMessage(`Error IA: ${err.message}`);
        responderVoz('Hubo un error de conexión con el cerebro de Inteligencia Artificial.');
      }
    }
    return;
  }

  // FALLBACK: intents locales
  const comando = texto.toLowerCase();
  let intentEncontrado = false;
  if (typeof intents !== 'undefined') {
    for (const intent of intents) {
      if (intent.match(comando)) {
        logMessage(`Intent local: [${intent.name}]`);
        intent.action(comando);
        intentEncontrado = true;
        break;
      }
    }
  }
  if (!intentEncontrado) {
    responderVoz('En modo local no tengo registrado ese comando. Configura Gemini para respuestas avanzadas.');
  }
}

// FALLBACK: intents locales
function ejecutarIntentLocal(texto) {
  const comando = texto.toLowerCase();
  let intentEncontrado = false;
  if (typeof intents !== 'undefined') {
    for (const intent of intents) {
      if (intent.match(comando)) {
        logMessage(`Intent local: [${intent.name}]`);
        intent.action(comando);
        intentEncontrado = true;
        break;
      }
    }
  }
  if (!intentEncontrado) {
    responderVoz('No reconocí ese comando. Intenta de nuevo.');
  }
}
// ======================================================================
function enviarComandoMQTT(topic, payload) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) logMessage(`[MQTT] ❌ Error: ${err.message}`);
      else     logMessage(`[MQTT] 📡 → <span style="color:yellow">${topic}</span> | <span style="color:yellow">${payload}</span>`);
    });
  } else {
    logMessage(`[MQTT SIM] <span style="color:yellow">${topic}</span> | <span style="color:yellow">${payload}</span>`);
  }
  if (topic.includes('luces')) updateActivityState('lightsOn', payload === 'ON');
  if (topic.includes('tv'))    updateActivityState('tvOn',     payload === 'ON');
  transcriptText.innerText = `Enviando: ${topic} → ${payload}`;
  transcriptText.style.color = '#10b981';
  setTimeout(() => { transcriptText.style.color = 'var(--text)'; }, 2000);
}

// ======================================================================
// VOZ — Text to Speech masculina
// ======================================================================
const VOCES_MASCULINAS_ES = [
  'Microsoft Pablo', 'Microsoft Jorge', 'Google español',
  'Diego', 'Carlos', 'Jorge', 'Pablo', 'Rodrigo'
];

function elegirVozMasculina() {
  const voces = window.speechSynthesis.getVoices();
  if (!voces || voces.length === 0) return null;
  for (const nombre of VOCES_MASCULINAS_ES) {
    const voz = voces.find(v => v.name.toLowerCase().includes(nombre.toLowerCase()));
    if (voz) return voz;
  }
  return voces.find(v => v.lang.startsWith('es')) || voces[0] || null;
}

function responderVoz(mensaje) {
  transcriptText.innerText = mensaje;
  logMessage(`[VOZ] "${mensaje}"`);
  const speech  = new SpeechSynthesisUtterance(mensaje);
  speech.lang   = 'es-ES';
  speech.rate   = 1.0;
  speech.pitch  = 0.85;
  const voces   = window.speechSynthesis.getVoices();
  const asignar = () => {
    const voz = elegirVozMasculina();
    if (voz) { speech.voice = voz; logMessage(`[VOZ] Usando: ${voz.name}`); }
    window.speechSynthesis.speak(speech);
  };
  if (voces.length > 0) asignar();
  else window.speechSynthesis.onvoiceschanged = asignar;
}

// ======================================================================
// INICIO
// ======================================================================
window.onload = () => {
  // Poblar dropdown de intents
  const dropdown = document.getElementById('intentDropdown');
  if (dropdown && typeof intents !== 'undefined') {
    intents.forEach(intent => {
      const option      = document.createElement('option');
      option.value      = intent.name;
      option.textContent = intent.description || intent.name;
      dropdown.appendChild(option);
    });
    dropdown.addEventListener('change', (e) => {
      if (e.target.value) {
        const sel = intents.find(i => i.name === e.target.value);
        if (sel) { logMessage(`Ejecutando desde menú: [${sel.name}]`); sel.action(); }
        dropdown.value = '';
      }
    });
  }

  // Restaurar nombre
  const savedName = localStorage.getItem('assistantName') || 'SCALL';
  const nameInput = document.getElementById('assistantName');
  if (nameInput) nameInput.value = savedName;
  document.getElementById('displayName').innerText = savedName;

  // Restaurar MQTT del localStorage
  const savedHost = localStorage.getItem('mqttHost');
  if (savedHost) {
    const h = document.getElementById('mqttHost');
    const u = document.getElementById('mqttUser');
    const p = document.getElementById('mqttPassword');
    if (h) h.value = savedHost;
    if (u) u.value = localStorage.getItem('mqttUser') || '';
    if (p) p.value = localStorage.getItem('mqttPassword') || '';
  }

  // Actualizar UI de estado IA
  updateAIStatusUI();

  hideCommandToggle();
  setTimeout(() => { prepareToggleListener(); }, 100);
  setTimeout(() => { conectarMQTT(); }, 500);
  setTimeout(() => { showCommandToggle('Sistema listo'); }, 1500);
};
