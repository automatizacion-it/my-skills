// =====================================================================
// MÓDULO ALARMAS — SCALL
// Alarmas, recordatorios, medicamentos, temporizador, cronómetro
// Parser de voz mejorado: acepta lenguaje natural colombiano
// =====================================================================

const ALARMAS_KEY = 'scall_alarmas';
let alarmasActivas   = {};
let timerInterval    = null;
let timerSegundos    = 0;
let cronometroInt    = null;
let cronometroSeg    = 0;
let cronometroActivo = false;

// ── CRUD alarmas ──────────────────────────────────────────────────────

function getAlarmas() {
  try { return JSON.parse(localStorage.getItem(ALARMAS_KEY)) || []; }
  catch { return []; }
}
function saveAlarmas(lista) {
  localStorage.setItem(ALARMAS_KEY, JSON.stringify(lista));
}

function crearAlarma({ hora, minuto, mensaje, tipo = 'alarma', repetir = false }) {
  const lista = getAlarmas();
  const id    = Date.now();
  lista.push({ id, hora, minuto, mensaje, tipo, repetir, activa: true });
  saveAlarmas(lista);
  iniciarChequeoAlarma({ id, hora, minuto, mensaje, tipo, repetir });
  renderizarListaAlarmas();

  const horaStr = `${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`;
  const tipoLabel = tipo === 'medicamento' ? 'Recordatorio de medicamento' :
                    tipo === 'recordatorio' ? 'Recordatorio' : 'Alarma';
  _alarVoz(`${tipoLabel} programado para las ${hora === 0 ? 'doce' : hora} ${minuto > 0 ? 'y ' + minuto : ''} ${hora < 12 ? 'de la mañana' : 'de la tarde'}.${mensaje ? ' ' + mensaje : ''}`);
  _alarLog(`[ALARMA] ✅ ${tipo} → ${horaStr} "${mensaje}" repetir:${repetir}`);
  return id;
}

function iniciarChequeoAlarma(alarma) {
  // Evitar duplicados
  if (alarmasActivas[alarma.id]) clearInterval(alarmasActivas[alarma.id]);

  const intervalo = setInterval(() => {
    const now = new Date();
    if (now.getHours() === alarma.hora &&
        now.getMinutes() === alarma.minuto &&
        now.getSeconds() < 30) {
      dispararAlarma(alarma);
      if (!alarma.repetir) {
        clearInterval(intervalo);
        delete alarmasActivas[alarma.id];
        const lista = getAlarmas().map(a =>
          a.id === alarma.id ? { ...a, activa: false } : a
        );
        saveAlarmas(lista);
        renderizarListaAlarmas();
      }
    }
  }, 15000);
  alarmasActivas[alarma.id] = intervalo;
}

function dispararAlarma(alarma) {
  const icono = alarma.tipo === 'medicamento' ? '💊' :
                alarma.tipo === 'recordatorio' ? '📌' : '⏰';
  _alarVoz(alarma.mensaje || `Alarma. Son las ${alarma.hora} y ${alarma.minuto} minutos.`);
  _alarLog(`[ALARMA] ${icono} DISPARADA: "${alarma.mensaje}"`);
  mostrarToastAlarma(alarma);
  if (Notification.permission === 'granted') {
    new Notification(`SCALL ${icono}`, {
      body: alarma.mensaje || '¡Es hora!',
      icon: '/favicon.ico'
    });
  }
}

function eliminarAlarma(id) {
  if (alarmasActivas[id]) { clearInterval(alarmasActivas[id]); delete alarmasActivas[id]; }
  saveAlarmas(getAlarmas().filter(a => a.id !== id));
  renderizarListaAlarmas();
  _alarLog(`[ALARMA] 🗑 Eliminada ${id}`);
}

function toggleAlarma(id) {
  const lista = getAlarmas().map(a => {
    if (a.id !== id) return a;
    const activa = !a.activa;
    if (activa) iniciarChequeoAlarma(a);
    else if (alarmasActivas[id]) { clearInterval(alarmasActivas[id]); delete alarmasActivas[id]; }
    return { ...a, activa };
  });
  saveAlarmas(lista);
  renderizarListaAlarmas();
}

// ── Listar alarmas por voz ────────────────────────────────────────────

function listarAlarmasPorVoz() {
  const lista = getAlarmas().filter(a => a.activa);
  if (lista.length === 0) {
    _alarVoz('No tienes alarmas activas.');
    return;
  }
  const res = lista.map(a => {
    const h = String(a.hora).padStart(2,'0');
    const m = String(a.minuto).padStart(2,'0');
    return `${a.tipo} a las ${h}:${m}${a.mensaje ? ', ' + a.mensaje : ''}`;
  }).join('. ');
  _alarVoz(`Tienes ${lista.length} alarma${lista.length > 1 ? 's' : ''} activa${lista.length > 1 ? 's' : ''}: ${res}.`);
}

function cancelarTodasAlarmas() {
  Object.values(alarmasActivas).forEach(iv => clearInterval(iv));
  alarmasActivas = {};
  saveAlarmas([]);
  renderizarListaAlarmas();
  _alarVoz('Todas las alarmas han sido canceladas.');
  _alarLog('[ALARMA] 🗑 Todas eliminadas');
}

// ── PARSER DE VOZ MEJORADO ────────────────────────────────────────────
// Soporta:
//   "pon alarma a las 7"
//   "ponme una alarma a las 7 y media"
//   "despiértame a las 6 de la mañana"
//   "recuérdame tomar la medicina a las 8 de la noche"
//   "recuérdame la reunión a las 3 y 30 de la tarde"
//   "programa una alarma para las 10"
//   "todos los días a las 7 recuérdame tomar el jarabe"
//   "pastilla a las 8 todos los días"

function parsearAlarmaVoz(comando) {
  const c = comando.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes para matching
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');

  // ── 1. Extraer hora y minuto ──────────────────────────────────────
  let hora = null, minuto = 0;

  // "7 y media" → 7:30
  const mediaMatch = c.match(/(\d{1,2})\s*y\s*media/);
  if (mediaMatch) { hora = parseInt(mediaMatch[1]); minuto = 30; }

  // "7 y cuarto" → 7:15
  if (hora === null) {
    const cuartoMatch = c.match(/(\d{1,2})\s*y\s*cuarto/);
    if (cuartoMatch) { hora = parseInt(cuartoMatch[1]); minuto = 15; }
  }

  // "7 y 45" o "7:45" o "7 con 45"
  if (hora === null) {
    const fullMatch = c.match(/(\d{1,2})\s*(?:y|con|:|\.)\s*(\d{1,2})/);
    if (fullMatch) { hora = parseInt(fullMatch[1]); minuto = parseInt(fullMatch[2]); }
  }

  // solo hora "a las 7" "las 7" "7 en punto"
  if (hora === null) {
    const soloHora = c.match(/(?:a\s+las|las|para\s+las)?\s*(\d{1,2})\s*(?:en\s+punto)?/);
    if (soloHora) { hora = parseInt(soloHora[1]); minuto = 0; }
  }

  if (hora === null) return null;

  // ── 2. Ajustar AM/PM ─────────────────────────────────────────────
  const esTarde  = c.includes('tarde') || c.includes('noche');
  const esMañana = c.includes('mañana') || c.includes('manana') || c.includes('am');
  if (esTarde && hora < 12) hora += 12;
  if (esMañana && hora === 12) hora = 0;
  // Heurística: si no dice mañana ni tarde y la hora es < 7, asumir PM
  if (!esMañana && !esTarde && hora > 0 && hora < 7) hora += 12;

  // Limitar rango
  if (hora >= 24) hora = hora % 24;
  if (minuto >= 60) minuto = 0;

  // ── 3. Detectar tipo ─────────────────────────────────────────────
  let tipo = 'alarma';
  let msg  = '';

  const esMedicamento = c.includes('medicamento') || c.includes('pastilla') ||
                        c.includes('medicina') || c.includes('jarabe') ||
                        c.includes('capsula') || c.includes('comprimido') ||
                        c.includes('inyeccion') || c.includes('dosis');

  const esRecordatorio = c.includes('recuerdame') || c.includes('recordatorio') ||
                         c.includes('recuerda') || c.includes('no olvides') ||
                         c.includes('avisame') || c.includes('notificame');

  const esDespertar = c.includes('despiertame') || c.includes('despertarme') ||
                      c.includes('despierta') || c.includes('levantarme') ||
                      c.includes('levantame');

  if (esMedicamento) {
    tipo = 'medicamento';
    // Intentar extraer qué medicamento
    const medMatch = c.match(/(?:tomar|toma|teme)\s+((?:el|la|los|las)?\s*\w+)/);
    const medNombre = medMatch ? medMatch[1].trim() : '';
    msg = medNombre
      ? `Es hora de tomar ${medNombre}.`
      : 'Es hora de tomar tu medicamento.';
  } else if (esRecordatorio) {
    tipo = 'recordatorio';
    // Extraer mensaje entre "recuérdame [MENSAJE] a las"
    const msgPatterns = [
      /recuerdame\s+(.+?)\s+(?:a\s+las|para\s+las|en)/i,
      /recordatorio(?:\s+de)?\s+(.+?)\s+(?:a\s+las|para)/i,
      /avisame\s+(?:de\s+)?(.+?)\s+(?:a\s+las|para)/i,
    ];
    for (const pat of msgPatterns) {
      const m = c.match(pat);
      if (m && m[1].trim().length > 1) { msg = m[1].trim(); break; }
    }
    if (!msg) msg = 'Tienes un recordatorio.';
    // Capitalizar primera letra
    msg = msg.charAt(0).toUpperCase() + msg.slice(1);
    if (!msg.endsWith('.')) msg += '.';
  } else if (esDespertar) {
    tipo = 'alarma';
    msg  = '¡Buenos días! Es hora de levantarse.';
  } else {
    msg = '';
  }

  // ── 4. Repetir ───────────────────────────────────────────────────
  const repetir = c.includes('todos los dias') || c.includes('cada dia') ||
                  c.includes('diario') || c.includes('siempre') ||
                  c.includes('de lunes a viernes') || c.includes('cada manana');

  return { hora, minuto, tipo, mensaje: msg, repetir };
}

// ── UI del panel de alarmas ───────────────────────────────────────────

function guardarAlarmaUI() {
  const hora   = parseInt(document.getElementById('alarmHora').value);
  const minuto = parseInt(document.getElementById('alarmMin').value);
  const tipo   = document.getElementById('alarmTipo').value;
  const msg    = document.getElementById('alarmMsg').value.trim();
  const repetir = document.getElementById('alarmRepetir').checked;
  if (isNaN(hora) || hora < 0 || hora > 23) { alert('Hora inválida (0-23)'); return; }
  if (isNaN(minuto) || minuto < 0 || minuto > 59) { alert('Minutos inválidos (0-59)'); return; }
  crearAlarma({ hora, minuto, tipo,
    mensaje: msg || (tipo === 'medicamento' ? 'Es hora de tomar tu medicamento.' :
                     tipo === 'recordatorio' ? 'Tienes un recordatorio.' : ''),
    repetir
  });
}

let sonidoActivado = true;
function toggleSonido() {
  sonidoActivado = !sonidoActivado;
  const btn = document.getElementById('soundToggle');
  if (btn) {
    btn.textContent   = sonidoActivado ? 'ON' : 'OFF';
    btn.className     = `sound-toggle ${sonidoActivado ? 'on' : 'off'}`;
  }
}

function renderizarListaAlarmas() {
  const el = document.getElementById('alarmaLista');
  if (!el) return;
  const lista = getAlarmas();
  if (lista.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.75rem;text-align:center;padding:8px;">Sin alarmas guardadas</p>'; return; }

  el.innerHTML = lista.map(a => {
    const h     = String(a.hora).padStart(2,'0');
    const m     = String(a.minuto).padStart(2,'0');
    const icono = a.tipo === 'medicamento' ? '💊' : a.tipo === 'recordatorio' ? '📌' : '⏰';
    const repLabel = a.repetir ? ' · diario' : '';
    return `
      <div class="alarm-item ${a.activa ? '' : 'alarm-inactive'}">
        <span style="font-size:1.1rem;">${icono}</span>
        <div class="alarm-item-info">
          <strong>${h}:${m}${repLabel}</strong>
          <small>${a.mensaje || a.tipo}</small>
        </div>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:.7rem;color:var(--text-muted);">
          <input type="checkbox" ${a.activa ? 'checked' : ''} onchange="toggleAlarma(${a.id})">
          ${a.activa ? 'ON' : 'OFF'}
        </label>
        <button onclick="eliminarAlarma(${a.id})"
          style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.9rem;padding:0 4px;"
          title="Eliminar">✕</button>
      </div>`;
  }).join('');
}

// Renderizar cuando se abre el panel
function togglePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const visible = el.style.display !== 'none';
  // Cerrar todos
  ['alarmaPanel','noticiasPanel','climaPanel','tradPanel','corpusPanel'].forEach(p => {
    const pe = document.getElementById(p);
    if (pe) pe.style.display = 'none';
  });
  if (!visible) {
    el.style.display = 'flex';
    if (id === 'alarmaPanel') {
      renderCalendario();
      renderizarListaAlarmas();
    }
  }
}

// ── Calendario mini ───────────────────────────────────────────────────

function renderCalendario() {
  const el = document.getElementById('alarmCalendar');
  if (!el) return;
  const hoy   = new Date();
  const año   = hoy.getFullYear();
  const mes   = hoy.getMonth();
  const dias  = new Date(año, mes + 1, 0).getDate();
  const inicio = new Date(año, mes, 1).getDay();
  const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS   = ['D','L','M','X','J','V','S'];

  let html = `<div class="cal-header">${MESES[mes]} ${año}</div>
    <div class="cal-grid">
      ${DIAS.map(d => `<div class="cal-cell cal-day-name">${d}</div>`).join('')}
      ${Array(inicio).fill('<div class="cal-cell"></div>').join('')}
      ${Array.from({length: dias}, (_,i) => {
        const d = i + 1;
        const esHoy = d === hoy.getDate();
        return `<div class="cal-cell ${esHoy ? 'cal-hoy' : ''}">${d}</div>`;
      }).join('')}
    </div>`;
  el.innerHTML = html;
}

// ── TEMPORIZADOR ──────────────────────────────────────────────────────

function iniciarTimer(segundos) {
  if (timerInterval) clearInterval(timerInterval);
  timerSegundos = segundos;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  _alarVoz(`Temporizador de ${min > 0 ? min + ' minutos' : ''}${seg > 0 ? (min > 0 ? ' y ' : '') + seg + ' segundos' : ''} iniciado.`);
  _alarLog(`[TIMER] ⏱ ${segundos}s iniciado`);
  mostrarToastTimer(segundos);
  timerInterval = setInterval(() => {
    timerSegundos--;
    actualizarToastTimer(timerSegundos);
    if (timerSegundos <= 0) {
      clearInterval(timerInterval); timerInterval = null;
      _alarVoz('¡El temporizador terminó!');
      _alarLog('[TIMER] ✅ Completado');
      if (Notification.permission === 'granted')
        new Notification('SCALL ⏱', { body: '¡Temporizador completado!' });
      ocultarToastTimer();
    }
  }, 1000);
}

function parsearTimer(comando) {
  let total = 0;
  const h = comando.match(/(\d+)\s*hora/);
  const m = comando.match(/(\d+)\s*minuto/);
  const s = comando.match(/(\d+)\s*segundo/);
  if (h) total += parseInt(h[1]) * 3600;
  if (m) total += parseInt(m[1]) * 60;
  if (s) total += parseInt(s[1]);
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
  cronometroSeg = 0; cronometroActivo = true;
  cronometroInt = setInterval(() => { cronometroSeg++; actualizarToastCronometro(); }, 1000);
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
  pausarCronometro(); cronometroSeg = 0;
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
  const p = [];
  if (h > 0) p.push(`${h} hora${h > 1 ? 's' : ''}`);
  if (m > 0) p.push(`${m} minuto${m > 1 ? 's' : ''}`);
  if (s > 0 || p.length === 0) p.push(`${s} segundo${s !== 1 ? 's' : ''}`);
  return p.join(' y ');
}

// ── TOASTS ────────────────────────────────────────────────────────────

function mostrarToastAlarma(alarma) {
  const icono = alarma.tipo === 'medicamento' ? '💊' :
                alarma.tipo === 'recordatorio' ? '📌' : '⏰';
  const toast = document.createElement('div');
  toast.className = 'alarm-toast';
  toast.innerHTML = `
    <span style="font-size:2rem;">${icono}</span>
    <div style="flex:1;">
      <strong>${alarma.mensaje || 'Alarma'}</strong>
      <small style="display:block;color:#94a3b8;margin-top:2px;">
        ${String(alarma.hora).padStart(2,'0')}:${String(alarma.minuto).padStart(2,'0')}
        ${alarma.repetir ? ' · repetición diaria' : ''}
      </small>
    </div>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 15000);
}

let timerToast = null;
function mostrarToastTimer(seg) {
  if (timerToast) timerToast.remove();
  timerToast = document.createElement('div');
  timerToast.id = 'timerWidget';
  timerToast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    width:min(280px,calc(100vw - 32px));background:var(--surface,#1e293b);
    border:1px solid rgba(0,212,255,0.3);border-radius:16px;
    padding:16px 20px;z-index:19998;color:var(--text,#f8fafc);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;
    font-family:var(--font-display,monospace);`;
  timerToast.innerHTML = `
    <div style="font-size:.68rem;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">⏱ Temporizador</div>
    <div id="timerDisplay" style="font-size:2.2rem;font-weight:700;color:var(--glow,#00d4ff);">${formatTiempoPadded(seg)}</div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;">
      <button onclick="cancelarTimer()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.78rem;">Cancelar</button>
    </div>`;
  document.body.appendChild(timerToast);
}
function actualizarToastTimer(seg) {
  const el = document.getElementById('timerDisplay');
  if (el) { el.textContent = formatTiempoPadded(seg); if (seg <= 10) el.style.color = '#ef4444'; }
}
function ocultarToastTimer() { if (timerToast) { timerToast.remove(); timerToast = null; } }

let cronToast = null;
function mostrarToastCronometro() {
  if (cronToast) cronToast.remove();
  cronToast = document.createElement('div');
  cronToast.id = 'cronWidget';
  cronToast.style.cssText = `position:fixed;bottom:90px;right:16px;
    width:min(240px,calc(100vw - 32px));background:var(--surface,#1e293b);
    border:1px solid rgba(16,185,129,0.3);border-radius:16px;
    padding:16px 20px;z-index:19997;color:var(--text,#f8fafc);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;
    font-family:var(--font-display,monospace);`;
  cronToast.innerHTML = `
    <div style="font-size:.68rem;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">⏱ Cronómetro</div>
    <div id="cronDisplay" style="font-size:1.8rem;font-weight:700;color:#10b981;">00:00:00</div>
    <div style="display:flex;gap:6px;margin-top:12px;justify-content:center;">
      <button onclick="pausarCronometro()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#f8fafc;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:.72rem;">Pausar</button>
      <button onclick="reiniciarCronometro()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:.72rem;">Reset</button>
    </div>`;
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
  return `${String(Math.floor(seg/60)).padStart(2,'0')}:${String(seg%60).padStart(2,'0')}`;
}

// ── PERMISOS Y INIT ───────────────────────────────────────────────────

function pedirPermisoNotificacion() {
  if ('Notification' in window && Notification.permission === 'default')
    Notification.requestPermission();
}

window.addEventListener('load', () => {
  pedirPermisoNotificacion();
  const alarmas = getAlarmas().filter(a => a.activa);
  alarmas.forEach(a => iniciarChequeoAlarma(a));
  if (alarmas.length > 0) _alarLog(`[ALARMA] ♻ ${alarmas.length} alarma(s) reactivada(s)`);
});

function _alarLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _alarVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }
