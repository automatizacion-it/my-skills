// =====================================================================
// MÓDULO CUMPLEAÑOS — SCALL
// Almacena cumpleaños en localStorage, chequea diariamente,
// y envía WhatsApp (wa.me directo o Twilio vía relay.js)
// =====================================================================

const CUMPLEANOS_KEY = 'scall_cumpleanos';
const ULTIMO_CHEQUEO = 'scall_cumpleanos_lastcheck';

// ── CRUD ─────────────────────────────────────────────────────────────

function getCumpleanos() {
  try { return JSON.parse(localStorage.getItem(CUMPLEANOS_KEY)) || []; }
  catch { return []; }
}

function saveCumpleanos(lista) {
  localStorage.setItem(CUMPLEANOS_KEY, JSON.stringify(lista));
}

function agregarCumpleanos({ nombre, telefono, dia, mes, mensaje }) {
  if (!nombre || !telefono || !dia || !mes) {
    _cumLog('⚠️ Faltan datos para agregar cumpleaños.');
    return false;
  }
  const lista = getCumpleanos();

  // Evitar duplicados por nombre
  const existe = lista.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) {
    _cumLog(`⚠️ Ya existe un cumpleaños para ${nombre}.`);
    return false;
  }

  lista.push({
    id:       Date.now(),
    nombre,
    telefono: telefono.replace(/\D/g, ''),  // solo dígitos
    dia:      parseInt(dia),
    mes:      parseInt(mes),
    mensaje:  mensaje || `¡Feliz cumpleaños ${nombre}! 🎂🎉 Que tengas un día increíble. — SCALL`
  });

  saveCumpleanos(lista);
  _cumLog(`✅ Cumpleaños de ${nombre} guardado (${dia}/${mes})`);
  return true;
}

function eliminarCumpleanos(id) {
  const lista = getCumpleanos().filter(c => c.id !== id);
  saveCumpleanos(lista);
  _cumLog(`🗑 Cumpleaños eliminado.`);
}

function editarMensaje(id, nuevoMensaje) {
  const lista = getCumpleanos().map(c =>
    c.id === id ? { ...c, mensaje: nuevoMensaje } : c
  );
  saveCumpleanos(lista);
  _cumLog(`✏️ Mensaje actualizado.`);
}

// ── Chequeo diario ────────────────────────────────────────────────────

function chequearCumpleanos() {
  const hoy    = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth() + 1;
  const claveHoy = `${diaHoy}-${mesHoy}-${hoy.getFullYear()}`;

  // Solo chequear una vez por día
  const ultimoChequeo = localStorage.getItem(ULTIMO_CHEQUEO);
  if (ultimoChequeo === claveHoy) return;
  localStorage.setItem(ULTIMO_CHEQUEO, claveHoy);

  const lista = getCumpleanos();
  const hoyList = lista.filter(c => c.dia === diaHoy && c.mes === mesHoy);

  if (hoyList.length === 0) {
    _cumLog(`[CUMPLEAÑOS] Sin cumpleaños hoy (${diaHoy}/${mesHoy}).`);
    return;
  }

  _cumLog(`[CUMPLEAÑOS] 🎂 Hoy cumplen años: ${hoyList.map(c => c.nombre).join(', ')}`);

  hoyList.forEach((persona, i) => {
    // Escalonar para no abrir todo al mismo tiempo
    setTimeout(() => {
      notificarCumpleanos(persona);
    }, i * 3000);
  });
}

// ── Notificación ──────────────────────────────────────────────────────

async function notificarCumpleanos(persona) {
  _cumLog(`[CUMPLEAÑOS] 🎉 Notificando a ${persona.nombre}...`);

  // Anuncio de voz
  if (typeof responderVoz === 'function') {
    responderVoz(`Hoy es el cumpleaños de ${persona.nombre}. Enviando mensaje de WhatsApp.`);
  }

  // Mostrar toast en pantalla
  mostrarToastCumpleanos(persona);

  // Intentar envío automático vía relay.js (Twilio)
  const relayOk = await enviarWhatsAppTwilio(persona);

  // Fallback: abrir WhatsApp Web si no hay relay
  if (!relayOk) {
    setTimeout(() => abrirWhatsApp(persona), 2000);
  }
}

// ── WhatsApp vía relay.js + Twilio (automático) ───────────────────────

async function enviarWhatsAppTwilio(persona) {
  const relayUrl = window.APP_CONFIG && window.APP_CONFIG.relayUrl;
  if (!relayUrl) return false;

  try {
    const res = await fetch(`${relayUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      persona.telefono,
        mensaje: persona.mensaje
      })
    });
    const data = await res.json();
    if (data.ok) {
      _cumLog(`[WHATSAPP] ✅ Mensaje enviado a ${persona.nombre} (${persona.telefono})`);
      return true;
    }
    _cumLog(`[WHATSAPP] ❌ Error relay: ${data.error}`);
    return false;
  } catch (e) {
    _cumLog(`[WHATSAPP] ⚠️ Relay no disponible. Abriendo WhatsApp Web...`);
    return false;
  }
}

// ── WhatsApp vía wa.me (fallback, abre navegador) ─────────────────────

function abrirWhatsApp(persona) {
  const numero  = persona.telefono.startsWith('57')
    ? persona.telefono
    : `57${persona.telefono}`;   // agregar código Colombia
  const mensaje = encodeURIComponent(persona.mensaje);
  const url     = `https://wa.me/${numero}?text=${mensaje}`;
  window.open(url, '_blank');
  _cumLog(`[WHATSAPP] 🔗 Abriendo wa.me para ${persona.nombre}`);
}

// ── Toast visual ──────────────────────────────────────────────────────

function mostrarToastCumpleanos(persona) {
  const toast = document.createElement('div');
  toast.className = 'cumpleanos-toast';
  toast.innerHTML = `
    <div class="cum-toast-emoji">🎂</div>
    <div class="cum-toast-info">
      <strong>¡Hoy cumple ${persona.nombre}!</strong>
      <small>${persona.dia}/${persona.mes} · ${persona.telefono}</small>
    </div>
    <button onclick="abrirWhatsApp(${JSON.stringify(persona).split('"').join("'")});this.parentElement.remove()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.52 5.824L0 24l6.335-1.501A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.032-1.388l-.36-.214-3.733.884.938-3.63-.235-.374A9.818 9.818 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
      </svg>
      Enviar
    </button>
  `;
  document.body.appendChild(toast);

  // Auto-cerrar en 12 segundos
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 12000);
  injectCumStyles();
}

// ── UI Modal de gestión ───────────────────────────────────────────────

function abrirModalCumpleanos() {
  let modal = document.getElementById('cumModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cumModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>🎂 Cumpleaños</h3>
          <button class="modal-close" onclick="document.getElementById('cumModal').style.display='none'">✕</button>
        </div>

        <!-- Formulario agregar -->
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="cumNombre" placeholder="Ej: María García">
          <label>Teléfono WhatsApp (Colombia)</label>
          <input type="tel" id="cumTelefono" placeholder="Ej: 3001234567">
          <div class="input-row">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label>Día</label>
              <input type="number" id="cumDia" placeholder="DD" min="1" max="31">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label>Mes</label>
              <select id="cumMes" style="padding:11px 14px;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:8px;">
                <option value="1">Enero</option><option value="2">Febrero</option>
                <option value="3">Marzo</option><option value="4">Abril</option>
                <option value="5">Mayo</option><option value="6">Junio</option>
                <option value="7">Julio</option><option value="8">Agosto</option>
                <option value="9">Septiembre</option><option value="10">Octubre</option>
                <option value="11">Noviembre</option><option value="12">Diciembre</option>
              </select>
            </div>
          </div>
          <label>Mensaje personalizado</label>
          <input type="text" id="cumMensaje" placeholder="¡Feliz cumpleaños! 🎂">
          <button class="btn btn-primary" onclick="cumGuardar()" style="margin-top:4px;">➕ Agregar</button>
        </div>

        <hr class="modal-divider">

        <!-- Lista -->
        <div class="form-group">
          <label>Cumpleaños guardados</label>
          <div id="cumLista" style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }

  renderCumLista();
  injectCumStyles();
}

function cumGuardar() {
  const nombre   = document.getElementById('cumNombre').value.trim();
  const telefono = document.getElementById('cumTelefono').value.trim();
  const dia      = document.getElementById('cumDia').value;
  const mes      = document.getElementById('cumMes').value;
  const mensaje  = document.getElementById('cumMensaje').value.trim();

  const ok = agregarCumpleanos({ nombre, telefono, dia, mes, mensaje });
  if (ok) {
    document.getElementById('cumNombre').value   = '';
    document.getElementById('cumTelefono').value = '';
    document.getElementById('cumDia').value      = '';
    document.getElementById('cumMensaje').value  = '';
    renderCumLista();
    if (typeof responderVoz === 'function') responderVoz(`Cumpleaños de ${nombre} guardado.`);
  }
}

function renderCumLista() {
  const lista = getCumpleanos();
  const el    = document.getElementById('cumLista');
  if (!el) return;

  const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  if (lista.length === 0) {
    el.innerHTML = '<p style="color:#64748b;font-size:0.82rem;text-align:center;">Sin cumpleaños guardados</p>';
    return;
  }

  // Ordenar por mes y día
  const ordenada = [...lista].sort((a, b) => a.mes - b.mes || a.dia - b.dia);

  el.innerHTML = ordenada.map(c => {
    const hoy     = new Date();
    const esHoy   = c.dia === hoy.getDate() && c.mes === (hoy.getMonth() + 1);
    return `
      <div class="cum-item ${esHoy ? 'cum-hoy' : ''}">
        <div class="cum-item-left">
          <span class="cum-fecha">${c.dia} ${MESES[c.mes]}</span>
          <div>
            <strong>${c.nombre}</strong>
            <small>+57 ${c.telefono}</small>
          </div>
        </div>
        <div class="cum-item-right">
          ${esHoy ? '<span class="cum-badge">HOY 🎂</span>' : ''}
          <button onclick="abrirWhatsApp(${JSON.stringify(c).split('"').join("'")})" title="Enviar WhatsApp ahora">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.52 5.824L0 24l6.335-1.501A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.032-1.388l-.36-.214-3.733.884.938-3.63-.235-.374A9.818 9.818 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
            </svg>
          </button>
          <button onclick="eliminarCumpleanos(${c.id});renderCumLista();" title="Eliminar" style="color:#ef4444;">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Estilos ───────────────────────────────────────────────────────────

function injectCumStyles() {
  if (document.getElementById('cum-styles')) return;
  const s = document.createElement('style');
  s.id = 'cum-styles';
  s.textContent = `
    /* Toast */
    .cumpleanos-toast {
      position: fixed;
      top: 70px;
      right: 16px;
      width: min(320px, calc(100vw - 32px));
      background: linear-gradient(135deg, #064e3b, #065f46);
      border: 1px solid #10b981;
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 20000;
      box-shadow: 0 8px 32px rgba(16,185,129,0.3);
      animation: slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes slideInRight {
      from { opacity:0; transform: translateX(60px); }
      to   { opacity:1; transform: translateX(0); }
    }
    .cum-toast-emoji { font-size: 2rem; flex-shrink: 0; }
    .cum-toast-info  { flex:1; display:flex; flex-direction:column; gap:2px; }
    .cum-toast-info strong { font-size: 0.88rem; color: #f0fdf4; }
    .cum-toast-info small  { font-size: 0.72rem; color: #6ee7b7; }
    .cumpleanos-toast button {
      background: rgba(37,211,102,0.15);
      border: 1px solid #25d366;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      color: #25d366;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    .cumpleanos-toast button:hover { background: rgba(37,211,102,0.3); }

    /* Lista */
    .cum-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 10px 14px;
      gap: 8px;
      transition: border-color 0.2s;
    }
    .cum-item:hover { border-color: #334155; }
    .cum-item.cum-hoy {
      border-color: #10b981;
      background: rgba(16,185,129,0.08);
    }
    .cum-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cum-fecha {
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: 'Orbitron', sans-serif;
      min-width: 36px;
      text-align: center;
    }
    .cum-item-left strong { font-size: 0.85rem; display:block; }
    .cum-item-left small  { font-size: 0.72rem; color: #64748b; display:block; }
    .cum-item-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cum-item-right button {
      background: rgba(255,255,255,0.06);
      border: 1px solid #1e293b;
      border-radius: 8px;
      width: 30px; height: 30px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .cum-item-right button:hover { background: rgba(255,255,255,0.12); }
    .cum-badge {
      font-size: 0.65rem;
      font-weight: 700;
      background: #10b981;
      color: #000;
      padding: 2px 8px;
      border-radius: 20px;
    }
  `;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────

function _cumLog(msg) {
  typeof logMessage === 'function' ? logMessage(msg) : console.log(msg);
}

// ── Init: chequeo automático al cargar ────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(() => {
    chequearCumpleanos();
    // Re-chequear cada hora (por si la página queda abierta todo el día)
    setInterval(chequearCumpleanos, 60 * 60 * 1000);
  }, 3000); // esperar 3s a que SCALL cargue
});
