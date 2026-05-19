// =====================================================================
// MÓDULO ALARMAS — SCALL
// Alarmas con sonidos Web Audio API, sincronización UI, voz→panel
// =====================================================================

const ALARMAS_KEY = 'scall_alarmas';
let alarmasActivas   = {};
let timerInterval    = null;
let timerSegundos    = 0;
let cronometroInt    = null;
let cronometroSeg    = 0;
let cronometroActivo = false;

// ── Sonido seleccionado actualmente en la UI ─────────────────────────
let sonidoSeleccionado = 'beep';
let sonidoActivado     = true;

// ══════════════════════════════════════════════════════════════════════
// MOTOR DE SONIDO — Web Audio API (sin archivos externos)
// ══════════════════════════════════════════════════════════════════════

function getAudioCtx() {
  if (!window._scallAudioCtx) {
    window._scallAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._scallAudioCtx;
}

// Generadores de sonido por tipo
const SONIDOS = {

  // ── Beep clásico de alarma ─────────────────────────────────────
  beep(ctx) {
    const secuencia = [880, 880, 0, 880, 880, 0, 880, 880];
    let t = ctx.currentTime;
    secuencia.forEach((freq, i) => {
      if (freq === 0) { t += 0.1; return; }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type      = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
      t += 0.22;
    });
  },

  // ── Urgente — sirena ascendente ────────────────────────────────
  urgente(ctx) {
    for (let rep = 0; rep < 3; rep++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      const t0 = ctx.currentTime + rep * 0.7;
      osc.frequency.setValueAtTime(400, t0);
      osc.frequency.linearRampToValueAtTime(900, t0 + 0.5);
      gain.gain.setValueAtTime(0.35, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
      osc.start(t0); osc.stop(t0 + 0.6);
    }
  },

  // ── Suave — tono amable ────────────────────────────────────────
  suave(ctx) {
    const notas = [523, 659, 784]; // Do-Mi-Sol
    let t = ctx.currentTime;
    notas.forEach(freq => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.55);
      t += 0.3;
    });
  },

  // ── Digital — pulsos rápidos estilo tech ───────────────────────
  digital(ctx) {
    const pulsos = [1200, 0, 1200, 0, 800, 0, 800, 0, 1000];
    let t = ctx.currentTime;
    pulsos.forEach(freq => {
      if (freq === 0) { t += 0.06; return; }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type      = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t); osc.stop(t + 0.08);
      t += 0.1;
    });
  },

  // ── Campana — resonancia larga ─────────────────────────────────
  campana(ctx) {
    const harmonicos = [523, 1046, 1568];
    harmonicos.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const vol = [0.35, 0.2, 0.1][i];
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 2.5);
    });
    // Segunda campanada
    setTimeout(() => {
      const ctx2 = getAudioCtx();
      harmonicos.forEach((freq, i) => {
        const osc  = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.connect(gain); gain.connect(ctx2.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx2.currentTime);
        gain.gain.setValueAtTime([0.3,0.18,0.09][i], ctx2.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 2);
        osc.start(ctx2.currentTime); osc.stop(ctx2.currentTime + 2);
      });
    }, 900);
  },

  // ── Medicina — melodía corta amable ───────────────────────────
  medicina(ctx) {
    // "ding-dong-ding" amable
    const melodia = [
      { f: 659, d: 0.25 },
      { f: 784, d: 0.25 },
      { f: 880, d: 0.4  },
      { f: 0,   d: 0.15 },
      { f: 659, d: 0.2  },
      { f: 784, d: 0.35 },
    ];
    let t = ctx.currentTime;
    melodia.forEach(({ f, d }) => {
      if (f === 0) { t += d; return; }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.1);
      osc.start(t); osc.stop(t + d + 0.1);
      t += d + 0.05;
    });
  }
};

// Sonido por defecto según tipo de alarma
const SONIDO_POR_TIPO = {
  alarma:       'beep',
  recordatorio: 'suave',
  medicamento:  'medicina'
};

function tocarSonido(nombreSonido) {
  if (!sonidoActivado) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const fn = SONIDOS[nombreSonido] || SONIDOS.beep;
    fn(ctx);
  } catch(e) {
    _alarLog(`[SONIDO] ⚠️ Error: ${e.message}`);
  }
}

// Repetir el sonido N veces
function tocarSonidoRepetido(nombre, veces = 3, intervalo = 1800) {
  tocarSonido(nombre);
  let count = 1;
  const iv = setInterval(() => {
    tocarSonido(nombre);
    count++;
    if (count >= veces) clearInterval(iv);
  }, intervalo);
}

// ── UI del selector de sonido ─────────────────────────────────────────

function seleccionarSonido(nombre, btn) {
  sonidoSeleccionado = nombre;
  document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _alarLog(`[SONIDO] Seleccionado: ${nombre}`);
}

function previsualizarSonido() {
  tocarSonido(sonidoSeleccionado);
}

function actualizarSonidoPorTipo() {
  const tipo = document.getElementById('alarmTipo')?.value || 'alarma';
  const sonido = SONIDO_POR_TIPO[tipo] || 'beep';
  seleccionarSonidoUI(sonido);
}

function seleccionarSonidoUI(nombre) {
  sonidoSeleccionado = nombre;
  document.querySelectorAll('.sound-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sound === nombre);
  });
}

function toggleSonido() {
  // Compatibilidad con botón legacy — ahora usa el checkbox
  const cb = document.getElementById('alarmSonidoOn');
  if (cb) { cb.checked = !cb.checked; sonidoActivado = cb.checked; }
}

// ══════════════════════════════════════════════════════════════════════
// CRUD ALARMAS
// ══════════════════════════════════════════════════════════════════════

function getAlarmas() {
  try { return JSON.parse(localStorage.getItem(ALARMAS_KEY)) || []; }
  catch { return []; }
}
function saveAlarmas(lista) {
  localStorage.setItem(ALARMAS_KEY, JSON.stringify(lista));
}

function crearAlarma({ hora, minuto, mensaje, tipo = 'alarma', repetir = false, sonido = null }) {
  const lista = getAlarmas();
  const id    = Date.now();
  const s     = sonido || SONIDO_POR_TIPO[tipo] || 'beep';
  lista.push({ id, hora, minuto, mensaje, tipo, repetir, sonido: s, activa: true });
  saveAlarmas(lista);
  iniciarChequeoAlarma({ id, hora, minuto, mensaje, tipo, repetir, sonido: s });
  renderizarListaAlarmas();

  const horaStr = `${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`;
  const tipoLabel = tipo === 'medicamento' ? 'Recordatorio de medicamento' :
                    tipo === 'recordatorio' ? 'Recordatorio' : 'Alarma';
  const repLabel = repetir ? ' Repetición diaria activada.' : '';
  _alarVoz(`${tipoLabel} programado para las ${horaStr}.${mensaje ? ' ' + mensaje : ''}${repLabel}`);
  _alarLog(`[ALARMA] ✅ ${tipo} → ${horaStr} sonido:${s} repetir:${repetir}`);
  return id;
}

function iniciarChequeoAlarma(alarma) {
  if (alarmasActivas[alarma.id]) clearInterval(alarmasActivas[alarma.id]);
  const intervalo = setInterval(() => {
    const now = new Date();
    if (now.getHours()   === alarma.hora   &&
        now.getMinutes() === alarma.minuto &&
        now.getSeconds()  <  30) {
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
  // Tocar sonido 3 veces
  tocarSonidoRepetido(alarma.sonido || 'beep', 3, 1800);
  // Hablar después de 800ms para no solaparse con el sonido
  setTimeout(() => {
    _alarVoz(alarma.mensaje || `Alarma. Son las ${alarma.hora} y ${alarma.minuto} minutos.`);
  }, 800);
  _alarLog(`[ALARMA] ${icono} DISPARADA sonido:${alarma.sonido} "${alarma.mensaje}"`);
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

function listarAlarmasPorVoz() {
  const lista = getAlarmas().filter(a => a.activa);
  if (lista.length === 0) { _alarVoz('No tienes alarmas activas.'); return; }
  const res = lista.map(a => {
    const h = String(a.hora).padStart(2,'0');
    const m = String(a.minuto).padStart(2,'0');
    return `${a.tipo} a las ${h}:${m}${a.mensaje ? ', ' + a.mensaje : ''}`;
  }).join('. ');
  _alarVoz(`Tienes ${lista.length} alarma${lista.length > 1 ? 's' : ''}: ${res}.`);
}

function cancelarTodasAlarmas() {
  Object.values(alarmasActivas).forEach(iv => clearInterval(iv));
  alarmasActivas = {};
  saveAlarmas([]);
  renderizarListaAlarmas();
  _alarVoz('Todas las alarmas han sido canceladas.');
}

// ══════════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN VOZ → UI
// Cuando un comando de voz crea una alarma, actualiza visualmente
// los campos del panel para que el usuario vea qué se programó
// ══════════════════════════════════════════════════════════════════════

function sincronizarUIDesdeVoz({ hora, minuto, tipo, mensaje, repetir, sonido }) {
  const elHora    = document.getElementById('alarmHora');
  const elMin     = document.getElementById('alarmMin');
  const elTipo    = document.getElementById('alarmTipo');
  const elMsg     = document.getElementById('alarmMsg');
  const elRepetir = document.getElementById('alarmRepetir');

  if (elHora)    { elHora.value    = hora;    resaltarCampo(elHora); }
  if (elMin)     { elMin.value     = minuto;  resaltarCampo(elMin); }
  if (elTipo)    { elTipo.value    = tipo;    resaltarCampo(elTipo); }
  if (elMsg)     { elMsg.value     = mensaje || ''; resaltarCampo(elMsg); }
  if (elRepetir) elRepetir.checked = repetir || false;

  // Actualizar selector de sonido en la UI
  const s = sonido || SONIDO_POR_TIPO[tipo] || 'beep';
  seleccionarSonidoUI(s);

  // Abrir el panel si está cerrado
  const panel = document.getElementById('alarmaPanel');
  if (panel && panel.style.display === 'none') {
    togglePanel('alarmaPanel');
  }
}

function resaltarCampo(el) {
  if (!el) return;
  el.style.transition = 'border-color .3s, box-shadow .3s';
  el.style.borderColor = 'var(--glow)';
  el.style.boxShadow   = '0 0 0 3px var(--glow-dim)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 2000);
}

// ══════════════════════════════════════════════════════════════════════
// PARSER DE VOZ MEJORADO
// ══════════════════════════════════════════════════════════════════════

function parsearAlarmaVoz(comando) {
  // Normalizar — quitar tildes para matching más robusto
  const c = comando.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ü/g,'u').replace(/ñ/g,'n');

  // ── 1. Extraer hora y minuto ──────────────────────────────────────
  let hora = null, minuto = 0;

  // "7 y media" → 7:30
  const mediaM = c.match(/(\d{1,2})\s*y\s*media/);
  if (mediaM) { hora = parseInt(mediaM[1]); minuto = 30; }

  // "7 y cuarto" → 7:15
  if (hora === null) {
    const cuartoM = c.match(/(\d{1,2})\s*y\s*cuarto/);
    if (cuartoM) { hora = parseInt(cuartoM[1]); minuto = 15; }
  }

  // "7 y 45" | "7:45" | "7 con 45"
  if (hora === null) {
    const fullM = c.match(/(\d{1,2})\s*(?:y|con|:|\.)\s*(\d{1,2})/);
    if (fullM) { hora = parseInt(fullM[1]); minuto = parseInt(fullM[2]); }
  }

  // Solo hora "a las 7" | "las 7" | "7 en punto"
  if (hora === null) {
    const soloM = c.match(/(?:a\s+las?|las?|para\s+las?)\s*(\d{1,2})\s*(?:en\s+punto)?/);
    if (soloM) { hora = parseInt(soloM[1]); minuto = 0; }
  }
  // Último recurso — cualquier número de 1-2 dígitos
  if (hora === null) {
    const anyM = c.match(/\b(\d{1,2})\b/);
    if (anyM) { hora = parseInt(anyM[1]); minuto = 0; }
  }

  if (hora === null || hora > 23) return null;

  // ── 2. AM / PM ───────────────────────────────────────────────────
  const esTarde  = c.includes('tarde') || c.includes('noche') || c.includes('pm');
  const esMañana = c.includes('manana') || c.includes('madrugada') || c.includes('am');
  if (esTarde  && hora < 12) hora += 12;
  if (esMañana && hora === 12) hora = 0;
  // Heurística: sin contexto, horas 1-6 → PM (más probable en uso doméstico)
  if (!esMañana && !esTarde && hora > 0 && hora <= 6) hora += 12;
  if (hora >= 24) hora %= 24;
  if (minuto >= 60) minuto = 0;

  // ── 3. Tipo ──────────────────────────────────────────────────────
  let tipo = 'alarma';
  let msg  = '';

  const esMed = c.includes('pastilla') || c.includes('medicamento') ||
                c.includes('medicina')  || c.includes('jarabe') ||
                c.includes('capsula')   || c.includes('comprimido') ||
                c.includes('dosis')     || c.includes('inyeccion');

  const esRec = c.includes('recuerdame') || c.includes('recordatorio') ||
                c.includes('recuerda')   || c.includes('avisame') ||
                c.includes('no olvides') || c.includes('notificame');

  const esDes = c.includes('despiertame') || c.includes('despertarme') ||
                c.includes('levantame')   || c.includes('levantarme');

  if (esMed) {
    tipo = 'medicamento';
    // Extraer nombre del medicamento si lo menciona
    const medM = c.match(/(?:tomar?|toma|tome)\s+((?:el?|la|los|las|un[ao]?)?\s*\w+)/);
    const medN = medM ? medM[1].trim() : '';
    msg = medN && medN.length > 2 && !['la','el','un','una','los','las'].includes(medN)
      ? `Es hora de tomar ${medN}.`
      : 'Es hora de tomar tu medicamento.';
  } else if (esRec) {
    tipo = 'recordatorio';
    // Extraer mensaje entre trigger y "a las"
    const pats = [
      /recuerdame\s+(.+?)\s+(?:a\s+las?|para\s+las?|en)/i,
      /avisame\s+(?:de\s+|sobre\s+)?(.+?)\s+(?:a\s+las?|para)/i,
      /recordatorio\s+(?:de\s+|sobre\s+)?(.+?)\s+(?:a\s+las?|para)/i,
    ];
    for (const pat of pats) {
      const m = c.match(pat);
      if (m && m[1].trim().length > 1) { msg = m[1].trim(); break; }
    }
    if (!msg) msg = 'Tienes un recordatorio.';
    msg = msg.charAt(0).toUpperCase() + msg.slice(1);
    if (!msg.endsWith('.')) msg += '.';
  } else if (esDes) {
    tipo  = 'alarma';
    msg   = '¡Buenos días! Es hora de levantarse.';
  }

  // ── 4. Repetir ───────────────────────────────────────────────────
  const repetir = c.includes('todos los dias') || c.includes('cada dia') ||
                  c.includes('diario')          || c.includes('siempre') ||
                  c.includes('cada manana')     || c.includes('de lunes a viernes');

  // ── 5. Sonido automático según tipo ──────────────────────────────
  const sonido = SONIDO_POR_TIPO[tipo] || 'beep';

  return { hora, minuto, tipo, mensaje: msg, repetir, sonido };
}

// ══════════════════════════════════════════════════════════════════════
// UI PANEL
// ══════════════════════════════════════════════════════════════════════

function guardarAlarmaUI() {
  const hora    = parseInt(document.getElementById('alarmHora')?.value);
  const minuto  = parseInt(document.getElementById('alarmMin')?.value);
  const tipo    = document.getElementById('alarmTipo')?.value  || 'alarma';
  const msg     = document.getElementById('alarmMsg')?.value.trim() || '';
  const repetir = document.getElementById('alarmRepetir')?.checked || false;
  const sonOn   = document.getElementById('alarmSonidoOn')?.checked;
  sonidoActivado = sonOn !== undefined ? sonOn : true;

  if (isNaN(hora) || hora < 0 || hora > 23) { alert('Hora inválida (0-23)'); return; }
  if (isNaN(minuto) || minuto < 0 || minuto > 59) { alert('Minutos inválidos (0-59)'); return; }

  const defMsg = tipo === 'medicamento' ? 'Es hora de tomar tu medicamento.' :
                 tipo === 'recordatorio' ? 'Tienes un recordatorio.' : '';

  crearAlarma({ hora, minuto, tipo, mensaje: msg || defMsg, repetir, sonido: sonidoSeleccionado });
}

function toggleSonido() {
  sonidoActivado = !sonidoActivado;
  const cb = document.getElementById('alarmSonidoOn');
  if (cb) cb.checked = sonidoActivado;
}

function renderizarListaAlarmas() {
  const el = document.getElementById('alarmaLista');
  if (!el) return;
  const lista = getAlarmas();
  if (lista.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.75rem;text-align:center;padding:10px;">Sin alarmas guardadas</p>';
    return;
  }

  const ICONOS_SONIDO = { beep:'◉', urgente:'▲', suave:'♪', digital:'⌁', campana:'♔', medicina:'✦' };

  el.innerHTML = lista.map(a => {
    const h      = String(a.hora).padStart(2,'0');
    const m      = String(a.minuto).padStart(2,'0');
    const icono  = a.tipo === 'medicamento' ? '💊' : a.tipo === 'recordatorio' ? '📌' : '⏰';
    const sIcon  = ICONOS_SONIDO[a.sonido] || '◉';
    const repLbl = a.repetir ? ' · diario' : '';
    return `
      <div class="alarm-item ${a.activa ? '' : 'alarm-inactive'}">
        <span style="font-size:1rem;flex-shrink:0;">${icono}</span>
        <div class="alarm-item-info" style="flex:1;min-width:0;">
          <strong style="display:flex;align-items:center;gap:5px;">
            ${h}:${m}
            <span style="font-size:.6rem;color:var(--text-muted);font-family:var(--font-mono);">${sIcon} ${a.sonido || 'beep'}${repLbl}</span>
          </strong>
          <small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${a.mensaje || a.tipo}</small>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <button onclick="tocarSonido('${a.sonido || 'beep'}')"
            style="background:none;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:3px 7px;cursor:pointer;font-size:.7rem;"
            title="Escuchar sonido">▶</button>
          <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:.68rem;color:var(--text-muted);">
            <input type="checkbox" ${a.activa ? 'checked' : ''} onchange="toggleAlarma(${a.id})">
            ${a.activa ? 'ON' : 'OFF'}
          </label>
          <button onclick="eliminarAlarma(${a.id})"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.9rem;padding:0 2px;"
            title="Eliminar">✕</button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════
// CALENDARIO MINI
// ══════════════════════════════════════════════════════════════════════

function renderCalendario() {
  const el = document.getElementById('alarmCalendar');
  if (!el) return;
  const hoy  = new Date();
  const año  = hoy.getFullYear();
  const mes  = hoy.getMonth();
  const dias = new Date(año, mes + 1, 0).getDate();
  const ini  = new Date(año, mes, 1).getDay();
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const alarmasDia = {};
  getAlarmas().filter(a => a.activa).forEach(a => {
    const key = a.dia || 0;
    alarmasDia[key] = (alarmasDia[key] || 0) + 1;
  });

  el.innerHTML = `
    <div class="cal-header">${MESES[mes]} ${año}</div>
    <div class="cal-grid">
      ${['D','L','M','X','J','V','S'].map(d => `<div class="cal-cell cal-day-name">${d}</div>`).join('')}
      ${Array(ini).fill('<div class="cal-cell"></div>').join('')}
      ${Array.from({length: dias}, (_, i) => {
        const d = i + 1;
        const esHoy = d === hoy.getDate();
        return `<div class="cal-cell ${esHoy ? 'cal-hoy' : ''}">${d}</div>`;
      }).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// TEMPORIZADOR
// ══════════════════════════════════════════════════════════════════════

function iniciarTimer(segundos) {
  if (timerInterval) clearInterval(timerInterval);
  timerSegundos = segundos;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  _alarVoz(`Temporizador de ${min > 0 ? min + ' minuto' + (min > 1 ? 's' : '') : ''}${seg > 0 ? (min > 0 ? ' y ' : '') + seg + ' segundo' + (seg > 1 ? 's' : '') : ''} iniciado.`);
  _alarLog(`[TIMER] ⏱ ${segundos}s iniciado`);
  mostrarToastTimer(segundos);
  timerInterval = setInterval(() => {
    timerSegundos--;
    actualizarToastTimer(timerSegundos);
    if (timerSegundos <= 0) {
      clearInterval(timerInterval); timerInterval = null;
      tocarSonidoRepetido('urgente', 2, 1000);
      setTimeout(() => _alarVoz('¡El temporizador terminó!'), 600);
      _alarLog('[TIMER] ✅ Completado');
      if (Notification.permission === 'granted')
        new Notification('SCALL ⏱', { body: '¡Temporizador completado!' });
      ocultarToastTimer();
    }
  }, 1000);
}

function parsearTimer(c) {
  let total = 0;
  const h = c.match(/(\d+)\s*hora/);
  const m = c.match(/(\d+)\s*minuto/);
  const s = c.match(/(\d+)\s*segundo/);
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

// ══════════════════════════════════════════════════════════════════════
// CRONÓMETRO
// ══════════════════════════════════════════════════════════════════════

function iniciarCronometro() {
  if (cronometroActivo) { _alarVoz('El cronómetro ya está corriendo.'); return; }
  cronometroSeg = 0; cronometroActivo = true;
  cronometroInt = setInterval(() => { cronometroSeg++; actualizarToastCronometro(); }, 1000);
  _alarVoz('Cronómetro iniciado.');
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

// ══════════════════════════════════════════════════════════════════════
// TOASTS
// ══════════════════════════════════════════════════════════════════════

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
        · ${alarma.sonido || 'beep'}${alarma.repetir ? ' · diario' : ''}
      </small>
    </div>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;">✕</button>`;
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
    border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:16px 20px;
    z-index:19998;color:var(--text,#f8fafc);box-shadow:0 8px 32px rgba(0,0,0,0.4);
    text-align:center;font-family:var(--font-display,monospace);`;
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
  cronToast.style.cssText = `position:fixed;bottom:90px;right:16px;
    width:min(240px,calc(100vw - 32px));background:var(--surface,#1e293b);
    border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:16px 20px;
    z-index:19997;color:var(--text,#f8fafc);box-shadow:0 8px 32px rgba(0,0,0,0.4);
    text-align:center;font-family:var(--font-display,monospace);`;
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

// ══════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════

function pedirPermisoNotificacion() {
  if ('Notification' in window && Notification.permission === 'default')
    Notification.requestPermission();
}

// togglePanel centralizado — reemplaza el de ui.js si existe
window.togglePanel = function(id) {
  const paneles = ['alarmaPanel','noticiasPanel','climaPanel','tradPanel','corpusPanel'];
  const target  = document.getElementById(id);
  if (!target) return;
  const visible = target.style.display !== 'none';
  paneles.forEach(p => {
    const pe = document.getElementById(p);
    if (pe) pe.style.display = 'none';
  });
  if (!visible) {
    target.style.display = 'flex';
    if (id === 'alarmaPanel') { renderCalendario(); renderizarListaAlarmas(); }
  }
};

window.addEventListener('load', () => {
  pedirPermisoNotificacion();
  const alarmas = getAlarmas().filter(a => a.activa);
  alarmas.forEach(a => iniciarChequeoAlarma(a));
  if (alarmas.length > 0) _alarLog(`[ALARMA] ♻ ${alarmas.length} alarma(s) reactivada(s)`);
});

function _alarLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _alarVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }
