// =====================================================================
// MÓDULO ALARMAS Y RECORDATORIOS — SCALL
// Gestiona alarmas, recordatorios y notificaciones programadas
// =====================================================================

const ALARMS_KEY = 'scall_alarms';
let alarmasActivas = {};  // id -> { alarm object + intervalId }
let alarmaSonando = false;

// ── CRUD ─────────────────────────────────────────────────────────────

function getAlarmas() {
  try { return JSON.parse(localStorage.getItem(ALARMS_KEY)) || []; }
  catch { return []; }
}

function saveAlarmas(lista) {
  localStorage.setItem(ALARMS_KEY, JSON.stringify(lista));
}

function agregarAlarm({ titulo, descripcion, hora, tipo = 'once', sonido = true }) {
  if (!titulo || !hora) {
    _alarmLog('⚠️ Faltan datos para agregar alarma.');
    return false;
  }

  const lista = getAlarmas();
  const id = Date.now();

  lista.push({
    id,
    titulo,
    descripcion: descripcion || '',
    hora,           // "HH:MM" o "en 5 minutos"
    tipo,           // 'once', 'diaria', 'cada_min'
    sonido,
    activa: true,
    creada: new Date().toISOString(),
    ultimaEjecucion: null
  });

  saveAlarmas(lista);
  _alarmLog(`✅ Alarma "${titulo}" creada para las ${hora}`);
  
  activarAlarm(id);
  return true;
}

function eliminarAlarm(id) {
  // Detener la alarma activa si existe
  if (alarmasActivas[id]) {
    clearInterval(alarmasActivas[id].intervalId);
    delete alarmasActivas[id];
  }

  const lista = getAlarmas().filter(a => a.id !== id);
  saveAlarmas(lista);
  _alarmLog(`🗑 Alarma eliminada.`);
  actualizarListaAlarmas();
}

function editarAlarm(id, cambios) {
  const lista = getAlarmas().map(a =>
    a.id === id ? { ...a, ...cambios } : a
  );
  saveAlarmas(lista);
  _alarmLog(`✏️ Alarma actualizada.`);
  
  // Reactivar si hubo cambios
  if (alarmasActivas[id]) {
    clearInterval(alarmasActivas[id].intervalId);
    delete alarmasActivas[id];
  }
  activarAlarm(id);
}

function toggleAlarm(id, activa) {
  const lista = getAlarmas().map(a =>
    a.id === id ? { ...a, activa } : a
  );
  saveAlarmas(lista);

  if (activa) {
    activarAlarm(id);
    _alarmLog(`▶️ Alarma activada.`);
  } else {
    if (alarmasActivas[id]) {
      clearInterval(alarmasActivas[id].intervalId);
      delete alarmasActivas[id];
    }
    _alarmLog(`⏸ Alarma desactivada.`);
  }
  actualizarListaAlarmas();
}

// ── Activación de alarmas ─────────────────────────────────────────

function activarAlarm(id) {
  const alarma = getAlarmas().find(a => a.id === id);
  if (!alarma || !alarma.activa) return;

  const intervalId = setInterval(() => {
    chequearAlarm(alarma);
  }, 10000);  // Chequear cada 10 segundos

  alarmasActivas[id] = { ...alarma, intervalId };
  _alarmLog(`🔔 Monitorear alarma: ${alarma.titulo}`);
  
  // Hacer chequeo inmediato
  chequearAlarm(alarma);
}

function chequearAlarm(alarma) {
  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  
  // Caso 1: Hora exacta (HH:MM)
  if (alarma.hora.includes(':')) {
    if (horaActual === alarma.hora) {
      dispararAlarm(alarma);
    }
  }
  // Caso 2: "en X minutos" o "en X horas"
  else if (alarma.hora.includes('en ')) {
    // Se ejecuta cuando se crea (ver agregarAlarmaPorVoz)
  }
}

function dispararAlarm(alarma) {
  // Evitar disparar múltiples veces en el mismo minuto
  const now = new Date().toISOString();
  const yaDisparo = alarma.ultimaEjecucion && 
                    new Date(now) - new Date(alarma.ultimaEjecucion) < 60000;
  if (yaDisparo) return;

  _alarmLog(`🔊 ¡ALARMA! ${alarma.titulo}`);
  alarmaSonando = true;

  // Respuesta de voz
  if (typeof responderVoz === 'function') {
    const msg = alarma.descripcion ? 
                `Alarma: ${alarma.titulo}. ${alarma.descripcion}` :
                `Alarma: ${alarma.titulo}`;
    responderVoz(msg);
  }

  // Sonido (usar Web Audio o notificación)
  if (alarma.sonido) reproducirSonidoAlarm();

  // Actualizar hora última ejecución
  const lista = getAlarmas().map(a =>
    a.id === alarma.id ? { ...a, ultimaEjecucion: now } : a
  );
  saveAlarmas(lista);

  // Mostrar modal de alarma
  mostrarModalAlarm(alarma);

  // Si es 'once', desactivar después
  if (alarma.tipo === 'once') {
    toggleAlarm(alarma.id, false);
  }
}

function reproducirSonidoAlarm() {
  // Usar oscilador de Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;  // Frecuencia en Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);

    _alarmLog('🔊 Sonido de alarma reproducido');
  } catch (e) {
    _alarmLog(`⚠️ Error reproduciendo sonido: ${e.message}`);
  }
}

function silenciarAlarma() {
  alarmaSonando = false;
  _alarmLog('🔇 Alarma silenciada');
  cerrarModalAlarm();
}

// ── Crear alarma por voz ──────────────────────────────────────────

function crearAlarmaDesdeVoz(comando) {
  // Ejemplos:
  // "Alarma para las 3 de la tarde"
  // "Recuérdame en 5 minutos"
  // "Alarma a las 15:30"

  let titulo = 'Recordatorio';
  let hora = null;
  let tipo = 'once';

  // Extraer hora (HH:MM o "X minutos/horas")
  const regex_hora = /(\d{1,2}):(\d{2})|(\d{1,2})\s*(minutos?|horas?|segundos?)/i;
  const match_hora = comando.match(regex_hora);

  if (match_hora) {
    if (match_hora[1]) {
      // Formato HH:MM
      const horas = parseInt(match_hora[1]);
      const mins = parseInt(match_hora[2]);
      hora = `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      titulo = `Alarma a las ${horas}:${String(mins).padStart(2, '0')}`;
    } else if (match_hora[3]) {
      // Formato "en X minutos/horas"
      const cantidad = parseInt(match_hora[3]);
      const unidad = match_hora[4].toLowerCase();
      const ms = unidad.includes('minuto') ? cantidad * 60000 :
                 unidad.includes('hora') ? cantidad * 3600000 :
                 cantidad * 1000;

      const futuro = new Date(Date.now() + ms);
      hora = `${String(futuro.getHours()).padStart(2, '0')}:${String(futuro.getMinutes()).padStart(2, '0')}`;
      titulo = `Recordatorio en ${cantidad} ${unidad}`;
    }
  }

  if (!hora) {
    if (typeof responderVoz === 'function')
      responderVoz('No entiendo la hora de la alarma. Intenta: alarma para las 3 de la tarde.');
    return false;
  }

  // Extraer descripción si existe
  const descripcion = comando
    .replace(/alarma|recordatorio|recuérdame/gi, '')
    .replace(/para las?|a las?|en/gi, '')
    .trim() || '';

  return agregarAlarm({
    titulo,
    descripcion: descripcion.slice(0, 100),
    hora,
    tipo,
    sonido: true
  });
}

// ── UI — Modal ────────────────────────────────────────────────────

function abrirModalAlarmas() {
  let modal = document.getElementById('alarmsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'alarmsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>🔔 Alarmas y Recordatorios</h3>
          <button class="modal-close" onclick="document.getElementById('alarmsModal').style.display='none'">✕</button>
        </div>
        
        <div class="form-group">
          <label>Nueva Alarma</label>
          <input type="text" id="alarmTitle" placeholder="Ej: Tomar medicina" maxlength="50">
          <input type="time" id="alarmTime" style="margin-top:8px;">
          <textarea id="alarmDesc" placeholder="Descripción (opcional)" maxlength="100" style="margin-top:8px;"></textarea>
          <button class="btn btn-primary" onclick="crearAlarmaUI()" style="margin-top:8px;">+ Crear Alarma</button>
        </div>

        <hr class="modal-divider">

        <div class="form-group">
          <label>Alarmas Activas</label>
          <div id="alarmsList" style="max-height:300px;overflow-y:auto;"></div>
        </div>

        <div class="modal-footer">
          <button class="btn" onclick="document.getElementById('alarmsModal').style.display='none'">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  actualizarListaAlarmas();
}

function crearAlarmaUI() {
  const titulo = document.getElementById('alarmTitle').value.trim();
  const hora = document.getElementById('alarmTime').value;
  const desc = document.getElementById('alarmDesc').value.trim();

  if (!titulo || !hora) {
    if (typeof responderVoz === 'function')
      responderVoz('Por favor rellena título y hora.');
    return;
  }

  if (agregarAlarm({ titulo, descripcion: desc, hora, tipo: 'once', sonido: true })) {
    document.getElementById('alarmTitle').value = '';
    document.getElementById('alarmTime').value = '';
    document.getElementById('alarmDesc').value = '';
    actualizarListaAlarmas();
    if (typeof responderVoz === 'function')
      responderVoz(`Alarma "${titulo}" creada para las ${hora.split(':').join(' y ')}`);
  }
}

function actualizarListaAlarmas() {
  const container = document.getElementById('alarmsList');
  if (!container) return;

  const alarmas = getAlarmas();
  if (alarmas.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Sin alarmas configuradas</p>';
    return;
  }

  container.innerHTML = alarmas.map(a => `
    <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${a.activa ? '#10b981' : '#666'};">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${a.titulo}</strong>
          <br>
          <small style="color:var(--text-muted);">⏰ ${a.hora} ${a.descripcion ? '| ' + a.descripcion : ''}</small>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" onclick="toggleAlarm(${a.id}, ${!a.activa})" style="padding:4px 8px;font-size:0.8rem;">
            ${a.activa ? '⏸' : '▶️'}
          </button>
          <button class="btn btn-sm" onclick="eliminarAlarm(${a.id})" style="padding:4px 8px;font-size:0.8rem;background:rgba(239,68,68,0.2);">
            🗑
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function mostrarModalAlarm(alarma) {
  const modal = document.createElement('div');
  modal.id = `alarm-firing-${alarma.id}`;
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div class="modal" style="background:linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%);border: 2px solid #ef4444;">
      <div class="modal-header">
        <h3>🔊 ¡ALARMA!</h3>
      </div>
      <div style="padding:20px;text-align:center;">
        <h2 style="font-size:2rem;color:#ef4444;margin:0 0 10px 0;">${alarma.titulo}</h2>
        <p style="font-size:1.2rem;margin:0 0 20px 0;">${alarma.descripcion || 'Es hora de tu recordatorio'}</p>
        <p style="color:var(--text-muted);margin-bottom:20px;">Hora: ${alarma.hora}</p>
        <button class="btn btn-primary" onclick="silenciarAlarma();document.getElementById('alarm-firing-${alarma.id}').remove();" style="padding:10px 30px;font-size:1.1rem;">
          ✓ Entendido
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Auto-cerrar después de 30 segundos
  setTimeout(() => {
    const m = document.getElementById(`alarm-firing-${alarma.id}`);
    if (m) m.remove();
  }, 30000);
}

function cerrarModalAlarm() {
  const modals = document.querySelectorAll('[id^="alarm-firing-"]');
  modals.forEach(m => m.remove());
}

// ── Logging ───────────────────────────────────────────────────────

function _alarmLog(mensaje) {
  const log = document.getElementById('systemLog');
  if (log) {
    log.innerHTML += `<div style="color:#fbbf24;">[ALARMAS] ${mensaje}</div>`;
    log.scrollTop = log.scrollHeight;
  }
  console.log(`[ALARMAS] ${mensaje}`);
}

// ── Inicialización ────────────────────────────────────────────────

function inicializarAlarmas() {
  _alarmLog('Inicializando módulo de alarmas...');
  
  // Activar todas las alarmas guardadas
  const alarmas = getAlarmas();
  alarmas.forEach(a => {
    if (a.activa) activarAlarm(a.id);
  });

  _alarmLog(`${alarmas.length} alarma(s) monitoreada(s)`);
}

// Inicializar cuando carga la página
window.addEventListener('load', () => {
  setTimeout(inicializarAlarmas, 1000);
});
