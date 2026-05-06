// =====================================================================
// MÓDULO SOS — SCALL
// Botón de emergencia con cuenta regresiva, contactos y WhatsApp
// =====================================================================

const SOS_CONTACTOS_KEY = 'scall_sos_contactos';
let sosCountdown  = null;
let sosActivo     = false;
let sosSegundos   = 30;

// ── Contactos ─────────────────────────────────────────────────────────

function getSosContactos() {
  try { return JSON.parse(localStorage.getItem(SOS_CONTACTOS_KEY)) || []; }
  catch { return []; }
}

function saveSosContactos(lista) {
  localStorage.setItem(SOS_CONTACTOS_KEY, JSON.stringify(lista));
}

// ── Activar SOS ───────────────────────────────────────────────────────

function activarSOS() {
  if (sosActivo) { cancelarSOS(); return; }
  sosActivo   = true;
  sosSegundos = 30;

  _sosLog('[SOS] 🆘 Alerta activada — cuenta regresiva 30s');
  if (typeof responderVoz === 'function')
    responderVoz('Alerta S O S activada. Tienes 30 segundos para cancelar.');

  // Publicar MQTT inmediatamente
  if (typeof enviarComandoMQTT === 'function')
    enviarComandoMQTT('casa/sos/alerta', JSON.stringify({ activo: true, hora: new Date().toISOString() }));

  mostrarPanelSOS();

  sosCountdown = setInterval(() => {
    sosSegundos--;
    actualizarCuentaRegresiva();
    if (sosSegundos <= 0) {
      clearInterval(sosCountdown);
      dispararSOS();
    }
  }, 1000);

  // Botón en top bar — estado activo
  const btn = document.getElementById('sosBtn');
  if (btn) { btn.classList.add('sos-activo'); btn.title = 'Cancelar SOS'; }
}

function cancelarSOS() {
  if (!sosActivo) return;
  clearInterval(sosCountdown);
  sosActivo = false;

  _sosLog('[SOS] ✅ Alerta cancelada por el usuario.');
  if (typeof responderVoz === 'function')
    responderVoz('Alerta cancelada. Todo bien.');

  if (typeof enviarComandoMQTT === 'function')
    enviarComandoMQTT('casa/sos/alerta', JSON.stringify({ activo: false }));

  cerrarPanelSOS();

  const btn = document.getElementById('sosBtn');
  if (btn) { btn.classList.remove('sos-activo'); btn.title = 'Botón SOS'; }
}

function dispararSOS() {
  sosActivo = false;
  _sosLog('[SOS] 🚨 ENVIANDO ALERTAS A CONTACTOS...');
  if (typeof responderVoz === 'function')
    responderVoz('Enviando alerta de emergencia a tus contactos.');

  const contactos = getSosContactos();
  if (contactos.length === 0) {
    _sosLog('[SOS] ⚠️ Sin contactos configurados. Agrega contactos en el panel SOS.');
    if (typeof responderVoz === 'function')
      responderVoz('No tienes contactos de emergencia configurados. Por favor agrega uno.');
    cerrarPanelSOS();
    return;
  }

  const hora     = new Date().toLocaleTimeString('es-CO');
  const nombre   = localStorage.getItem('assistantName') || 'SCALL';
  const mensaje  = `🆘 *ALERTA DE EMERGENCIA*\n\n${nombre} activó el botón SOS.\n🕐 Hora: ${hora}\n\nPor favor comunícate de inmediato.`;

  contactos.forEach((c, i) => {
    setTimeout(() => {
      _sosLog(`[SOS] 📲 Notificando a ${c.nombre}...`);
      enviarSosWhatsApp(c, mensaje);
    }, i * 1500);
  });

  cerrarPanelSOS();

  const btn = document.getElementById('sosBtn');
  if (btn) { btn.classList.remove('sos-activo'); btn.title = 'Botón SOS'; }
}

// ── WhatsApp ──────────────────────────────────────────────────────────

async function enviarSosWhatsApp(contacto, mensaje) {
  const relayUrl = window.APP_CONFIG && window.APP_CONFIG.relayUrl;

  if (relayUrl) {
    try {
      const res = await fetch(`${relayUrl}/api/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contacto.telefono, mensaje })
      });
      const data = await res.json();
      if (data.ok) { _sosLog(`[SOS] ✅ WhatsApp enviado a ${contacto.nombre}`); return; }
    } catch (e) { _sosLog(`[SOS] ⚠️ Relay no disponible. Abriendo WhatsApp Web...`); }
  }

  // Fallback wa.me
  const numero  = contacto.telefono.startsWith('57') ? contacto.telefono : `57${contacto.telefono}`;
  const url     = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
  _sosLog(`[SOS] 🔗 WhatsApp Web abierto para ${contacto.nombre}`);
}

// ── Panel visual SOS ──────────────────────────────────────────────────

function mostrarPanelSOS() {
  let panel = document.getElementById('sosPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'sosPanel';
    document.body.appendChild(panel);
  }

  const contactos = getSosContactos();
  panel.innerHTML = `
    <div class="sos-overlay">
      <div class="sos-panel">
        <div class="sos-icon-big">🆘</div>
        <h2 class="sos-title">ALERTA DE EMERGENCIA</h2>
        <p class="sos-subtitle">Se notificará a tus contactos en:</p>

        <div class="sos-countdown" id="sosCountdownEl">${sosSegundos}</div>
        <div class="sos-countdown-label">segundos</div>

        <div class="sos-contactos-preview">
          ${contactos.length > 0
            ? contactos.map(c => `<span class="sos-chip">📞 ${c.nombre}</span>`).join('')
            : '<span class="sos-chip warn">⚠️ Sin contactos configurados</span>'
          }
        </div>

        <button class="sos-cancel-btn" onclick="cancelarSOS()">
          ✕ CANCELAR
        </button>

        <p class="sos-hint">Presiona CANCELAR si fue un error</p>
      </div>
    </div>
  `;

  panel.style.display = 'block';
  injectSosStyles();
}

function actualizarCuentaRegresiva() {
  const el = document.getElementById('sosCountdownEl');
  if (el) {
    el.textContent = sosSegundos;
    if (sosSegundos <= 10) el.style.color = '#ef4444';
    if (sosSegundos <= 5)  el.style.animation = 'sosPulse 0.5s ease-in-out infinite';
  }
}

function cerrarPanelSOS() {
  const panel = document.getElementById('sosPanel');
  if (panel) panel.style.display = 'none';
}

// ── Modal gestión contactos SOS ───────────────────────────────────────

function abrirModalSOS() {
  let modal = document.getElementById('sosModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sosModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>🆘 Contactos de Emergencia</h3>
          <button class="modal-close" onclick="document.getElementById('sosModal').style.display='none'">✕</button>
        </div>

        <div class="form-group">
          <label>Nombre del contacto</label>
          <input type="text" id="sosNombre" placeholder="Ej: María (hija)">
          <label>Teléfono WhatsApp</label>
          <input type="tel" id="sosTelefono" placeholder="Ej: 3001234567">
          <button class="btn btn-primary" style="background:#ef4444;" onclick="sosGuardarContacto()">
            ➕ Agregar contacto
          </button>
        </div>

        <hr class="modal-divider">

        <div class="form-group">
          <label>Contactos guardados</label>
          <div id="sosContactosLista" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>

        <div class="form-group" style="margin-top:8px;">
          <button class="btn" style="background:#1e293b;border:1px solid #ef4444;color:#ef4444;"
            onclick="activarSOS();document.getElementById('sosModal').style.display='none'">
            🆘 Probar SOS ahora
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }
  renderSosContactos();
  injectSosStyles();
}

function sosGuardarContacto() {
  const nombre   = document.getElementById('sosNombre').value.trim();
  const telefono = document.getElementById('sosTelefono').value.trim().replace(/\D/g, '');
  if (!nombre || !telefono) { alert('Completa nombre y teléfono.'); return; }

  const lista = getSosContactos();
  lista.push({ id: Date.now(), nombre, telefono });
  saveSosContactos(lista);

  document.getElementById('sosNombre').value   = '';
  document.getElementById('sosTelefono').value = '';
  renderSosContactos();
  _sosLog(`[SOS] ✅ Contacto ${nombre} guardado.`);
}

function renderSosContactos() {
  const lista = getSosContactos();
  const el    = document.getElementById('sosContactosLista');
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = '<p style="color:#64748b;font-size:0.82rem;text-align:center;">Sin contactos aún</p>';
    return;
  }

  el.innerHTML = lista.map(c => `
    <div class="cum-item">
      <div class="cum-item-left">
        <span style="font-size:1.2rem;">👤</span>
        <div>
          <strong>${c.nombre}</strong>
          <small style="display:block;color:#64748b;">+57 ${c.telefono}</small>
        </div>
      </div>
      <div class="cum-item-right">
        <button onclick="eliminarSosContacto(${c.id})" style="color:#ef4444;" title="Eliminar">✕</button>
      </div>
    </div>
  `).join('');
}

function eliminarSosContacto(id) {
  saveSosContactos(getSosContactos().filter(c => c.id !== id));
  renderSosContactos();
}

// ── Escuchar SOS desde MQTT (botón físico ESP32) ──────────────────────

function iniciarListenerSOS(mqttClient) {
  if (!mqttClient) return;
  mqttClient.subscribe('casa/sos/alerta', { qos: 1 });
  mqttClient.on('message', (topic, payload) => {
    if (topic !== 'casa/sos/alerta') return;
    try {
      const data = JSON.parse(payload.toString());
      if (data.activo && !sosActivo) {
        _sosLog('[SOS] 🆘 Alerta recibida desde ESP32 físico.');
        activarSOS();
      }
    } catch(e) {}
  });
}

// ── Estilos ───────────────────────────────────────────────────────────

function injectSosStyles() {
  if (document.getElementById('sos-styles')) return;
  const s = document.createElement('style');
  s.id = 'sos-styles';
  s.textContent = `
    /* Botón SOS top bar */
    .btn-sos {
      background: rgba(239,68,68,0.15) !important;
      border-color: rgba(239,68,68,0.4) !important;
      color: #ef4444 !important;
      font-size: 1rem !important;
      transition: all 0.2s !important;
    }
    .btn-sos:hover { background: rgba(239,68,68,0.3) !important; }
    .btn-sos.sos-activo {
      background: #ef4444 !important;
      color: white !important;
      animation: sosBtnPulse 1s ease-in-out infinite;
    }
    @keyframes sosBtnPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
    }

    /* MQTT status */
    .mqtt-status-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      font-size: 0.7rem !important;
      cursor: default !important;
      pointer-events: none;
    }
    .mqtt-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #475569;
      flex-shrink: 0;
      transition: background 0.3s;
    }
    .mqtt-dot.connected  { background: #10b981; box-shadow: 0 0 5px #10b981; }
    .mqtt-dot.error      { background: #ef4444; }

    /* Panel SOS overlay */
    #sosPanel { display: none; }
    .sos-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

    .sos-panel {
      background: linear-gradient(160deg, #1a0000 0%, #2d0000 100%);
      border: 2px solid #ef4444;
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      width: min(380px, calc(100vw - 32px));
      box-shadow: 0 0 60px rgba(239,68,68,0.4);
      animation: sosSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes sosSlideIn {
      from { transform: scale(0.8); opacity:0; }
      to   { transform: scale(1);   opacity:1; }
    }

    .sos-icon-big  { font-size: 3.5rem; margin-bottom: 8px; }
    .sos-title     { font-family:'Orbitron',sans-serif; color:#ef4444; font-size:1.1rem; margin:0 0 8px; letter-spacing:0.05em; }
    .sos-subtitle  { color:#94a3b8; font-size:0.82rem; margin:0 0 16px; }

    .sos-countdown {
      font-family: 'Orbitron', sans-serif;
      font-size: 5rem;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1;
      transition: color 0.3s;
    }
    .sos-countdown-label { color:#64748b; font-size:0.75rem; margin-bottom:20px; }

    @keyframes sosPulse {
      0%,100% { transform: scale(1); }
      50%      { transform: scale(1.1); }
    }

    .sos-contactos-preview {
      display: flex; flex-wrap: wrap; gap: 6px;
      justify-content: center;
      margin-bottom: 24px;
    }
    .sos-chip {
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 0.75rem;
      color: #fca5a5;
    }
    .sos-chip.warn { border-color: #f59e0b; color: #fcd34d; background: rgba(245,158,11,0.1); }

    .sos-cancel-btn {
      width: 100%;
      padding: 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 1.1rem;
      font-weight: 700;
      font-family: 'Orbitron', sans-serif;
      cursor: pointer;
      letter-spacing: 0.05em;
      transition: all 0.2s;
      margin-bottom: 12px;
    }
    .sos-cancel-btn:hover { background: #dc2626; transform: scale(1.02); }
    .sos-hint { color:#475569; font-size:0.72rem; margin:0; }
  `;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────
function _sosLog(msg) {
  typeof logMessage === 'function' ? logMessage(msg) : console.log(msg);
}

// Init estilos al cargar
window.addEventListener('load', () => { injectSosStyles(); });
