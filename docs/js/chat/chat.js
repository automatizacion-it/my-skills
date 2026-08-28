// =====================================================================
// CHAT — SCALL
// Mensajería en tiempo real entre dos instancias de SCALL (amigo a amigo),
// usando MQTT (protocolo pub/sub ya integrado en la app para IoT/SOS,
// aquí con un broker y una conexión completamente independientes).
// Ambos amigos deben usar el mismo broker + la misma "sala" para verse.
// =====================================================================

if (window._SCALL_CHAT_LOADED) {
  console.warn('[CHAT] Ya cargado');
} else {
window._SCALL_CHAT_LOADED = true;

var CHAT_CONFIG_KEY = 'scall_chat_config';
var CHAT_ID_KEY      = 'scall_chat_mi_id';

var chatClient     = null;
var chatConectado  = false;
var chatPanel      = null;
var chatVisible    = false;
var chatSalaActual = null;

// ── Identidad local (para distinguir "mis" burbujas de las del amigo,
//    sin depender del nombre que cada quien escriba) ──
function getChatMiId() {
  var id = localStorage.getItem(CHAT_ID_KEY);
  if (!id) {
    id = 'u' + Math.random().toString(16).slice(2) + Date.now().toString(16);
    localStorage.setItem(CHAT_ID_KEY, id);
  }
  return id;
}

function getChatConfig() {
  try { return JSON.parse(localStorage.getItem(CHAT_CONFIG_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveChatConfig(cfg) {
  localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(cfg));
}

function sanearSala(s) {
  return (s || '').toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
}

function chatHistorialKey(sala) { return 'scall_chat_historial_' + sala; }
function getChatHistorial(sala) {
  try { return JSON.parse(localStorage.getItem(chatHistorialKey(sala))) || []; }
  catch (e) { return []; }
}
function saveChatHistorial(sala, lista) {
  // Guarda solo los últimos 50 mensajes para no crecer indefinidamente
  var recortada = lista.slice(-50);
  localStorage.setItem(chatHistorialKey(sala), JSON.stringify(recortada));
}

// ── Conexión MQTT dedicada al chat (independiente de mqttClient de IoT) ──
function conectarChat() {
  if (typeof mqtt === 'undefined') {
    chatSetEstado('error', 'Librería MQTT no disponible');
    return;
  }
  var cfg = getChatConfig();
  if (!cfg.host || !cfg.sala) {
    chatSetEstado('error', 'Falta configurar broker o sala');
    return;
  }
  chatSalaActual = sanearSala(cfg.sala);

  if (chatClient) { try { chatClient.end(true); } catch (e) {} }

  var port = cfg.port || '8884';
  var url  = 'wss://' + cfg.host + ':' + port + '/mqtt';
  chatSetEstado('conectando', 'Conectando...');

  chatClient = mqtt.connect(url, {
    clientId: 'scall_chat_' + getChatMiId(),
    username: cfg.user || undefined,
    password: cfg.password || undefined,
    clean: true,
    reconnectPeriod: 5000
  });

  chatClient.on('connect', function() {
    chatConectado = true;
    chatSetEstado('ok', 'Conectado');
    chatClient.subscribe('scall/chat/' + chatSalaActual, { qos: 1 });
    renderMensajesChat();
  });

  chatClient.on('message', function(topic, payload) {
    if (topic !== 'scall/chat/' + chatSalaActual) return;
    var msg;
    try { msg = JSON.parse(payload.toString()); } catch (e) { return; }
    if (!msg || !msg.texto) return;
    var hist = getChatHistorial(chatSalaActual);
    hist.push(msg);
    saveChatHistorial(chatSalaActual, hist);
    renderMensajesChat();
  });

  chatClient.on('error', function(err) {
    chatConectado = false;
    chatSetEstado('error', 'Error: ' + (err && err.message ? err.message : 'desconocido'));
  });

  chatClient.on('offline', function() {
    chatConectado = false;
    chatSetEstado('offline', 'Desconectado — reconectando...');
  });
}

function desconectarChat() {
  if (chatClient) { try { chatClient.end(true); } catch (e) {} }
  chatClient = null;
  chatConectado = false;
  chatSetEstado('offline', 'Desconectado');
}

function enviarMensajeChat() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var texto = (input.value || '').trim();
  if (!texto) return;
  if (!chatClient || !chatConectado) {
    if (typeof _sv === 'function') _sv('El chat no está conectado.');
    return;
  }
  var cfg = getChatConfig();
  var msg = {
    id: getChatMiId(),
    from: cfg.miNombre || 'Yo',
    texto: texto,
    ts: Date.now()
  };
  chatClient.publish('scall/chat/' + chatSalaActual, JSON.stringify(msg), { qos: 1 });
  input.value = '';
}

// ── UI ──
function chatSetEstado(tipo, texto) {
  var dot = document.getElementById('chatEstadoDot');
  var lbl = document.getElementById('chatEstadoTexto');
  if (dot) dot.style.background = (tipo === 'ok') ? '#10b981' : (tipo === 'error') ? '#ef4444' : '#f59e0b';
  if (lbl) lbl.textContent = texto;
}

function crearPanelChat() {
  chatPanel = document.createElement('div');
  chatPanel.id = 'chatPanel';
  chatPanel.className = 'skill-panel';
  chatPanel.style.display = 'none';

  chatPanel.innerHTML =
    '<div class="skill-panel-header">' +
      '<span>Chat</span>' +
      '<div style="display:flex;gap:6px;">' +
        '<button onclick="toggleChatConfig()" title="Configurar broker/sala">⚙</button>' +
        '<button onclick="cerrarChat()">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="skill-panel-body">' +

      '<div id="chatConfigForm" style="display:none;flex-direction:column;gap:8px;">' +
        '<p class="skill-hint">Broker MQTT exclusivo para el chat — independiente del que uses para tus dispositivos IoT. Tu amigo debe usar el mismo broker y la misma sala.</p>' +
        '<div><label class="skill-label">Host del broker</label>' +
          '<input id="chatHost" class="alarm-input" placeholder="ej: broker.hivemq.com" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
        '<div class="input-row">' +
          '<div><label class="skill-label">Puerto (WSS)</label>' +
            '<input id="chatPort" class="alarm-input" placeholder="8884" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
          '<div><label class="skill-label">Sala</label>' +
            '<input id="chatSala" class="alarm-input" placeholder="ej: pizza2026" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
        '</div>' +
        '<div class="input-row">' +
          '<div><label class="skill-label">Usuario (opcional)</label>' +
            '<input id="chatUser" class="alarm-input" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
          '<div><label class="skill-label">Contraseña (opcional)</label>' +
            '<input id="chatPassword" type="password" class="alarm-input" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
        '</div>' +
        '<div><label class="skill-label">Tu nombre</label>' +
          '<input id="chatMiNombre" class="alarm-input" placeholder="Como te va a ver tu amigo" style="width:100%;margin-top:4px;box-sizing:border-box;"></div>' +
        '<button class="btn btn-primary" onclick="guardarConfigChat()">Guardar y conectar</button>' +
      '</div>' +

      '<div id="chatEstadoRow" style="display:flex;align-items:center;gap:7px;font-size:.68rem;color:var(--text-muted);font-family:var(--font-mono);">' +
        '<span id="chatEstadoDot" style="width:7px;height:7px;border-radius:50%;background:#475569;flex-shrink:0;"></span>' +
        '<span id="chatEstadoTexto">Sin configurar</span>' +
        '<span id="chatSalaLabel" style="margin-left:auto;opacity:.6;"></span>' +
      '</div>' +

      '<div id="chatMensajes" class="rss-list" style="min-height:140px;max-height:260px;"></div>' +

      '<div style="display:flex;gap:6px;">' +
        '<input id="chatInput" class="alarm-input" placeholder="Escribe un mensaje..." style="flex:1;" ' +
          'onkeydown="if(event.key===\'Enter\'){enviarMensajeChat();}">' +
        '<button class="btn btn-primary" style="width:auto;padding:9px 16px;" onclick="enviarMensajeChat()">Enviar</button>' +
      '</div>' +

    '</div>';

  document.body.appendChild(chatPanel);
}

function toggleChatConfig() {
  var form = document.getElementById('chatConfigForm');
  if (!form) return;
  var cfg = getChatConfig();
  if (form.style.display !== 'flex') {
    document.getElementById('chatHost').value      = cfg.host || '';
    document.getElementById('chatPort').value      = cfg.port || '8884';
    document.getElementById('chatSala').value      = cfg.sala || '';
    document.getElementById('chatUser').value      = cfg.user || '';
    document.getElementById('chatPassword').value  = cfg.password || '';
    document.getElementById('chatMiNombre').value  = cfg.miNombre || '';
    form.style.display = 'flex';
  } else {
    form.style.display = 'none';
  }
}

function guardarConfigChat() {
  var cfg = {
    host:     (document.getElementById('chatHost').value || '').trim(),
    port:     (document.getElementById('chatPort').value || '8884').trim(),
    sala:     (document.getElementById('chatSala').value || '').trim(),
    user:     (document.getElementById('chatUser').value || '').trim(),
    password: document.getElementById('chatPassword').value || '',
    miNombre: (document.getElementById('chatMiNombre').value || '').trim()
  };
  if (!cfg.host || !cfg.sala || !cfg.miNombre) {
    if (typeof _sv === 'function') _sv('Falta el broker, la sala o tu nombre.');
    else alert('Falta el broker, la sala o tu nombre.');
    return;
  }
  saveChatConfig(cfg);
  document.getElementById('chatConfigForm').style.display = 'none';
  var lbl = document.getElementById('chatSalaLabel');
  if (lbl) lbl.textContent = 'Sala: ' + sanearSala(cfg.sala);
  conectarChat();
}

function renderMensajesChat() {
  var cont = document.getElementById('chatMensajes');
  if (!cont || !chatSalaActual) return;
  var miId = getChatMiId();
  var hist = getChatHistorial(chatSalaActual);
  if (!hist.length) {
    cont.innerHTML = '<p class="skill-hint">Todavía no hay mensajes en esta sala.</p>';
    return;
  }
  cont.innerHTML = hist.map(function(m) {
    var propio = m.id === miId;
    var hora = new Date(m.ts || Date.now()).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    return '<div class="rss-item" style="' +
        (propio
          ? 'margin-left:24px;border-color:rgba(0,212,255,.35);background:rgba(0,212,255,.06);'
          : 'margin-right:24px;') +
      '">' +
        (propio ? '' : '<div class="rss-title" style="margin-bottom:2px;">' + (m.from || 'Amigo') + '</div>') +
        '<div class="rss-desc" style="color:var(--text);font-size:.78rem;">' + m.texto + '</div>' +
        '<div style="font-size:.58rem;color:var(--text-muted);margin-top:3px;text-align:' + (propio ? 'right' : 'left') + ';">' + hora + '</div>' +
      '</div>';
  }).join('');
  cont.scrollTop = cont.scrollHeight;
}

function abrirChat() {
  if (!chatPanel) crearPanelChat();
  chatPanel.style.display = 'flex';
  chatVisible = true;

  var cfg = getChatConfig();
  if (!cfg.host || !cfg.sala || !cfg.miNombre) {
    toggleChatConfig();
  } else {
    var lbl = document.getElementById('chatSalaLabel');
    if (lbl) lbl.textContent = 'Sala: ' + sanearSala(cfg.sala);
    if (!chatConectado) conectarChat();
    else renderMensajesChat();
  }
}
function cerrarChat() {
  if (chatPanel) chatPanel.style.display = 'none';
  chatVisible = false;
}
function toggleChat() {
  if (chatVisible) cerrarChat(); else abrirChat();
}

} // fin guard _SCALL_CHAT_LOADED
