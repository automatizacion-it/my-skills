// =====================================================================
// MÓDULO ALARMAS — SCALL
// Alarmas, recordatorios, medicamentos, temporizador, cronómetro
// =====================================================================

const ALARMAS_KEY = 'scall_alarmas';
let alarmasActivas  = {};     // { id: setInterval }
let timerInterval   = null;
let timerSegundos   = 0;
let cronometroInt   = null;
let cronometroSeg   = 0;
let cronometroActivo = false;

// ── ALARMAS ──────────────────────────────────────────────────────────

function getAlarmas() {
  try { return JSON.parse(localStorage.getItem(ALARMAS_KEY)) || []; }
  catch { return []; }
}
function saveAlarmas(lista) { localStorage.setItem(ALARMAS_KEY, JSON.stringify(lista)); }

function crearAlarma({ hora, minuto, mensaje, tipo = 'alarma', repetir = false }) {
  const lista = getAlarmas();
  const id    = Date.now();
  lista.push({ id, hora, minuto, mensaje, tipo, repetir, activa: true });
  saveAlarmas(lista);
  iniciarChequeoAlarma({ id, hora, minuto, mensaje, tipo });

  const horaStr = `${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`;
  _alarVoz(`Alarma configurada para las ${hora} y ${minuto} minutos. ${mensaje ? mensaje + '.' : ''}`);
  _alarLog(`[ALARMA] ✅ ${tipo} → ${horaStr} "${mensaje}"`);
  return id;
}

function iniciarChequeoAlarma(alarma) {
  const intervalo = setInterval(() => {
    const now = new Date();
    if (now.getHours() === alarma.hora && now.getMinutes() === alarma.minuto && now.getSeconds() < 30) {
      dispararAlarma(alarma);
      if (!alarma.repetir) {
        clearInterval(intervalo);
        delete alarmasActivas[alarma.id];
        // Marcar como inactiva
        const lista = getAlarmas().map(a => a.id === alarma.id ? { ...a, activa: false } : a);
        saveAlarmas(lista);
      }
    }
  }, 15000); // chequear cada 15s
  alarmasActivas[alarma.id] = intervalo;
}

function dispararAlarma(alarma) {
  const tipo = alarma.tipo === 'medicamento' ? '💊' : alarma.tipo === 'recordatorio' ? '📌' : '⏰';
  _alarVoz(alarma.mensaje || `Alarma. Son las ${alarma.hora} y ${alarma.minuto} minutos.`);
  _alarLog(`[ALARMA] ${tipo} DISPARADA: "${alarma.mensaje}"`);
  mostrarToastAlarma(alarma);
  // Notificación del navegador
  if (Notification.permission === 'granted') {
    new Notification(`SCALL ${tipo}`, { body: alarma.mensaje || 'Es hora!', icon: '/favicon.ico' });
  }
}

function eliminarAlarma(id) {
  if (alarmasActivas[id]) { clearInterval(alarmasActivas[id]); delete alarmasActivas[id]; }
  saveAlarmas(getAlarmas().filter(a => a.id !== id));
  _alarLog(`[ALARMA] 🗑 Eliminada ${id}`);
}

// ── PARSER DE VOZ ─────────────────────────────────────────────────────

function parsearAlarmaVoz(comando) {
  // "pon alarma a las 7 y 30", "recuérdame tomar pastilla a las 8"
  // "despiértame a las 6 de la mañana"
  const horaMatch = comando.match(/(\d{1,2})\s*(?:y\s*(\d{1,2}))?\s*(?:de\s+la\s+(mañana|tarde|noche))?/);
  if (!horaMatch) return null;

  let hora   = parseInt(horaMatch[1]);
  let minuto = parseInt(horaMatch[2] || '0');
  const periodo = horaMatch[3];

  if (periodo === 'tarde' || periodo === 'noche') {
    if (hora < 12) hora += 12;
  } else if (periodo === 'mañana' && hora === 12) {
    hora = 0;
  }

  // Detectar tipo
  let tipo = 'alarma';
  let msg  = '';
  if (comando.includes('medicamento') || comando.includes('pastilla') || comando.includes('medicina')) {
    tipo = 'medicamento';
    msg  = 'Es hora de tomar tu medicamento.';
  } else if (comando.includes('recordatorio') || comando.includes('recuérdame') || comando.includes('recuerda')) {
    tipo = 'recordatorio';
    // Extraer el mensaje
    const msgMatch = comando.match(/recuérdame\s+(.+?)\s+a\s+las/i) || comando.match(/recuerda\s+(.+?)\s+a\s+las/i);
    if (msgMatch) msg = msgMatch[1];
    else msg = 'Tienes un recordatorio.';
  } else if (comando.includes('despierta') || comando.includes('despiértame')) {
    msg = 'Buenos días! Es hora de levantarse.';
  }

  return { hora, minuto, tipo, mensaje: msg, repetir: comando.includes('todos los días') };
}

// ── TEMPORIZADOR ──────────────────────────────────────────────────────

function iniciarTimer(segundos) {
  if (timerInterval) { clearInterval(timerInterval); }
  timerSegundos = segundos;

  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  _alarVoz(`Temporizador de ${min > 0 ? min + ' minutos' : ''} ${seg > 0 ? seg + ' segundos' : ''} iniciado.`);
  _alarLog(`[TIMER] ⏱ ${segundos}s iniciado`);

  mostrarToastTimer(segundos);

  timerInterval = setInterval(() => {
    timerSegundos--;
    actualizarToastTimer(timerSegundos);
    if (timerSegundos <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      _alarVoz('¡El temporizador terminó!');
      _alarLog('[TIMER] ✅ Completado');
      if (Notification.permission === 'granted') new Notification('SCALL ⏱', { body: '¡Temporizador completado!' });
      ocultarToastTimer();
    }
  }, 1000);
}

function parsearTimer(comando) {
  let total = 0;
  const horas   = comando.match(/(\d+)\s*hora/);
  const minutos = comando.match(/(\d+)\s*minuto/);
  const segundos = comando.match(/(\d+)\s*segundo/);
  if (horas)    total += parseInt(horas[1]) * 3600;
  if (minutos)  total += parseInt(minutos[1]) * 60;
  if (segundos) total += parseInt(segundos[1]);
  return total;
}

function cancelarTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  ocultarToastTimer();
  _alarVoz('Temporizador cancelado.');
}

// ── CRONÓMETRO ────────────────────────────────────────────────────────

function iniciarCronometro() {
  if (cronometroActivo) { _alarVoz('El cronómetro ya está corriendo.'); return; }
  cronometroSeg    = 0;
  cronometroActivo = true;
  cronometroInt    = setInterval(() => { cronometroSeg++; actualizarToastCronometro(); }, 1000);
  _alarVoz('Cronómetro iniciado.');
  _alarLog('[CRONÓMETRO] ▶ Iniciado');
  mostrarToastCronometro();
}

function pausarCronometro() {
  if (cronometroInt) { clearInterval(cronometroInt); cronometroInt = null; }
  cronometroActivo = false;
  _alarVoz(`Cronómetro pausado en ${formatTiempo(cronometroSeg)}.`);
}

function reiniciarCronometro() {
  pausarCronometro();
  cronometroSeg = 0;
  _alarVoz('Cronómetro reiniciado.');
  actualizarToastCronometro();
}

function leerCronometro() {
  _alarVoz(`El cronómetro lleva ${formatTiempo(cronometroSeg)}.`);
}

function formatTiempo(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} hora${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minuto${m > 1 ? 's' : ''}`);
  if (s > 0 || parts.length === 0) parts.push(`${s} segundo${s !== 1 ? 's' : ''}`);
  return parts.join(' y ');
}

// ── TOASTS ────────────────────────────────────────────────────────────

function mostrarToastAlarma(alarma) {
  const emoji = alarma.tipo === 'medicamento' ? '💊' : alarma.tipo === 'recordatorio' ? '📌' : '⏰';
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:70px;left:50%;transform:translateX(-50%);
    width:min(340px,calc(100vw - 32px));
    background:linear-gradient(135deg,#1a0d4d,#0d0626);
    border:1px solid rgba(123,97,255,0.4);border-radius:16px;
    padding:16px 18px;z-index:20001;color:#f8fafc;
    box-shadow:0 8px 32px rgba(123,97,255,0.3);
    font-family:var(--font-body,sans-serif);
    display:flex;align-items:center;gap:14px;
  `;
  toast.innerHTML = `
    <span style="font-size:2rem;">${emoji}</span>
    <div style="flex:1;">
      <strong style="font-size:0.9rem;">${alarma.mensaje || 'Alarma'}</strong>
      <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">
        ${String(alarma.hora).padStart(2,'0')}:${String(alarma.minuto).padStart(2,'0')}
      </div>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 15000);
}

let timerToast = null;
function mostrarToastTimer(seg) {
  if (timerToast) timerToast.remove();
  timerToast = document.createElement('div');
  timerToast.id = 'timerWidget';
  timerToast.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    width:min(280px,calc(100vw - 32px));
    background:var(--surface,#1e293b);
    border:1px solid rgba(0,212,255,0.3);border-radius:16px;
    padding:16px 20px;z-index:19998;color:var(--text,#f8fafc);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;
    font-family:var(--font-display,monospace);
  `;
  timerToast.innerHTML = `
    <div style="font-size:0.68rem;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">⏱ Temporizador</div>
    <div id="timerDisplay" style="font-size:2.2rem;font-weight:700;color:var(--glow,#00d4ff);">${formatTiempoPadded(seg)}</div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;">
      <button onclick="cancelarTimer()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.78rem;">Cancelar</button>
    </div>
  `;
  document.body.appendChild(timerToast);
}

function actualizarToastTimer(seg) {
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = formatTiempoPadded(seg);
  if (seg <= 10 && el) el.style.color = '#ef4444';
}

function ocultarToastTimer() {
  if (timerToast) { timerToast.remove(); timerToast = null; }
}

let cronToast = null;
function mostrarToastCronometro() {
  if (cronToast) cronToast.remove();
  cronToast = document.createElement('div');
  cronToast.id = 'cronWidget';
  cronToast.style.cssText = `
    position:fixed;bottom:90px;right:16px;
    width:min(240px,calc(100vw - 32px));
    background:var(--surface,#1e293b);
    border:1px solid rgba(16,185,129,0.3);border-radius:16px;
    padding:16px 20px;z-index:19997;color:var(--text,#f8fafc);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;
    font-family:var(--font-display,monospace);
  `;
  cronToast.innerHTML = `
    <div style="font-size:0.68rem;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">⏱ Cronómetro</div>
    <div id="cronDisplay" style="font-size:1.8rem;font-weight:700;color:#10b981;">00:00:00</div>
    <div style="display:flex;gap:6px;margin-top:12px;justify-content:center;">
      <button onclick="pausarCronometro()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#f8fafc;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:0.72rem;">Pausar</button>
      <button onclick="reiniciarCronometro()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:0.72rem;">Reset</button>
    </div>
  `;
  document.body.appendChild(cronToast);
}

function actualizarToastCronometro() {
  const el = document.getElementById('cronDisplay');
  if (el) {
    const h = Math.floor(cronometroSeg / 3600);
    const m = Math.floor((cronometroSeg % 3600) / 60);
    const s = cronometroSeg % 60;
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}

function formatTiempoPadded(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── PERMISOS NOTIFICACIÓN ─────────────────────────────────────────────
function pedirPermisoNotificacion() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ── INIT ──────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  pedirPermisoNotificacion();
  // Reactivar alarmas guardadas
  const alarmas = getAlarmas().filter(a => a.activa);
  alarmas.forEach(a => iniciarChequeoAlarma(a));
  if (alarmas.length > 0) _alarLog(`[ALARMA] ♻ ${alarmas.length} alarma(s) reactivada(s)`);
});

function _alarLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _alarVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn(m); }
