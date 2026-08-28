// =====================================================================
// LOG DE ERRORES — SCALL
// Igual que el Corpus (skills.js) guarda frases no reconocidas para
// crear intents nuevos, este módulo guarda ERRORES TÉCNICOS (fallos de
// APIs, excepciones, etc.) de forma persistente en localStorage — para
// poder revisarlos después y corregirlos con calma (con o sin ayuda de
// IA), en vez de perderlos apenas se recarga la página.
// =====================================================================

if (window._SCALL_ERROR_LOG_LOADED) {
  console.warn('[ERROR_LOG] Ya cargado');
} else {
window._SCALL_ERROR_LOG_LOADED = true;

var ERROR_LOG_KEY = 'scall_error_log';
var errPanel = null;
var errVisible = false;

function getErrorLog() {
  try { return JSON.parse(localStorage.getItem(ERROR_LOG_KEY)) || []; }
  catch (e) { return []; }
}
function saveErrorLog(lista) {
  // máximo 200 errores guardados
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(lista.slice(-200)));
}

// Punto de entrada único para registrar un error desde cualquier módulo.
// origen: nombre corto del módulo/función donde ocurrió (ej: "TTS/ElevenLabs")
// mensaje: el texto del error (ej: e.message)
function registrarError(origen, mensaje) {
  if (!mensaje) return;
  var lista = getErrorLog();
  lista.push({
    origen: origen || 'desconocido',
    mensaje: String(mensaje),
    ts: new Date().toLocaleString('es-CO')
  });
  saveErrorLog(lista);
  renderErrorLog();
  actualizarBadgeErrores();
}

function limpiarErrorLog() {
  if (!confirm('¿Borrar todo el log de errores?')) return;
  localStorage.removeItem(ERROR_LOG_KEY);
  renderErrorLog();
  actualizarBadgeErrores();
}

function exportarErrorLog() {
  var lista = getErrorLog();
  if (!lista.length) {
    if (typeof _sv === 'function') _sv('No hay errores guardados todavía.');
    return;
  }
  var txt = lista.map(function(e) {
    return '[' + e.ts + '] (' + e.origen + ') ' + e.mensaje;
  }).join('\n');
  var blob = new Blob([txt], { type: 'text/plain' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'scall_errores_' + Date.now() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ── UI ──
function crearPanelErrores() {
  errPanel = document.createElement('div');
  errPanel.id = 'erroresPanel';
  errPanel.className = 'skill-panel';
  errPanel.style.display = 'none';
  errPanel.innerHTML =
    '<div class="skill-panel-header">' +
      '<span>Errores</span>' +
      '<button onclick="cerrarPanelErrores()">✕</button>' +
    '</div>' +
    '<div class="skill-panel-body">' +
      '<p class="skill-hint">Fallos técnicos (APIs, excepciones) guardados automáticamente para revisar y corregir después.</p>' +
      '<div id="erroresLista" class="corpus-list"></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button class="btn btn-primary" style="width:auto;padding:8px 14px;" onclick="exportarErrorLog()">Exportar .txt</button>' +
        '<button class="btn" style="width:auto;padding:8px 14px;background:#ef4444;color:#fff;" onclick="limpiarErrorLog()">Limpiar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(errPanel);
}

function renderErrorLog() {
  var el = document.getElementById('erroresLista');
  if (!el) return;
  var lista = getErrorLog();
  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.78rem;text-align:center;padding:16px;">Sin errores guardados. Buena señal.</p>';
    return;
  }
  // Más recientes primero
  el.innerHTML = lista.slice().reverse().map(function(e) {
    return '<div class="corpus-item">' +
      '<div class="corpus-frase">(' + e.origen + ') ' + e.mensaje + '</div>' +
      '<div class="corpus-meta">' + e.ts + '</div>' +
    '</div>';
  }).join('');
}

function actualizarBadgeErrores() {
  var dot = document.getElementById('erroresDot');
  if (!dot) return;
  var n = getErrorLog().length;
  dot.style.display = n > 0 ? 'inline-block' : 'none';
}

function abrirPanelErrores() {
  if (!errPanel) crearPanelErrores();
  errPanel.style.display = 'flex';
  errVisible = true;
  renderErrorLog();
}
function cerrarPanelErrores() {
  if (errPanel) errPanel.style.display = 'none';
  errVisible = false;
}
function togglePanelErrores() {
  if (errVisible) cerrarPanelErrores(); else abrirPanelErrores();
}

window.addEventListener('load', actualizarBadgeErrores);

} // fin guard _SCALL_ERROR_LOG_LOADED
