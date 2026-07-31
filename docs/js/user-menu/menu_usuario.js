// =====================================================================
// MENÚ DE USUARIO — SCALL
// Permite crear accesos personalizados desde la propia app:
//   nombre del ítem + acción existente a ejecutar + frase de voz (intent)
// Los intents creados aquí se inyectan en el arreglo global `intents`
// (definido en intents.js) para que el motor de reconocimiento de voz
// ya existente los detecte sin necesidad de tocar ese archivo.
// =====================================================================

if (window._SCALL_MENU_USUARIO_LOADED) {
  console.warn('[MENU_USUARIO] Ya cargado');
} else {
window._SCALL_MENU_USUARIO_LOADED = true;

var MENU_USUARIO_KEY = 'scall_menu_usuario';
var muPanel        = null;
var muVisible       = false;
var muFormAbierto   = false;

// Catálogo de acciones ya existentes en la app que un ítem personalizado
// puede disparar. Todas son funciones sin parámetros, ya probadas.
var ACCIONES_DISPONIBLES = [
  { id:'alarmas',   label:'Alarmas',                run:function(){ if (typeof togglePanel==='function') togglePanel('alarmaPanel'); } },
  { id:'noticias',  label:'Noticias',                run:function(){ if (typeof togglePanel==='function') togglePanel('noticiasPanel'); } },
  { id:'clima',     label:'Clima',                   run:function(){ if (typeof togglePanel==='function') togglePanel('climaPanel'); } },
  { id:'traductor', label:'Traductor',               run:function(){ if (typeof togglePanel==='function') togglePanel('tradPanel'); } },
  { id:'corpus',    label:'Corpus de entrenamiento', run:function(){ if (typeof togglePanel==='function') togglePanel('corpusPanel'); } },
  { id:'rutas',     label:'Navegación / Rutas',      run:function(){ if (typeof mostrarPanelRutas==='function') mostrarPanelRutas(); } },
  { id:'bluetooth', label:'Bluetooth',               run:function(){ if (typeof abrirPanelBluetooth==='function') abrirPanelBluetooth(); } },
  { id:'drive',     label:'Google Drive',            run:function(){ if (typeof abrirPanelDrive==='function') abrirPanelDrive(); } },
  { id:'eq',        label:'Ecualizador estándar',    run:function(){ if (typeof toggleEQ==='function') toggleEQ(); } },
  { id:'beq',       label:'Ecualizador Botellas',    run:function(){ if (typeof toggleBEQ==='function') toggleBEQ(); } },
  { id:'viz',       label:'Ecualizador Humano',      run:function(){ if (typeof toggleViz==='function') toggleViz(); } },
  { id:'colombia',  label:'Colombia',                run:function(){ if (typeof abrirPanelColombia==='function') abrirPanelColombia(); } },
  { id:'sismos',    label:'Sismos',                  run:function(){ if (typeof abrirPanelSismos==='function') abrirPanelSismos(); } },
  { id:'config',    label:'Configuración',           run:function(){ var m=document.getElementById('configModal'); if (m) m.style.display='flex'; } },
  { id:'asistente', label:'Asistente (inicio)',      run:function(){ if (typeof abrirAsistente==='function') abrirAsistente(); } },
  { id:'sos',       label:'SOS',                     run:function(){ if (typeof activarSOS==='function') activarSOS(); } }
];

function accionPorId(id) {
  for (var i = 0; i < ACCIONES_DISPONIBLES.length; i++) {
    if (ACCIONES_DISPONIBLES[i].id === id) return ACCIONES_DISPONIBLES[i];
  }
  return null;
}

function getMenuUsuario() {
  try { return JSON.parse(localStorage.getItem(MENU_USUARIO_KEY)) || []; }
  catch (e) { return []; }
}
function saveMenuUsuario(items) {
  localStorage.setItem(MENU_USUARIO_KEY, JSON.stringify(items));
}

// ── Puente con el motor de voz ──
// Quita los intents de usuario previamente registrados y vuelve a
// insertarlos desde localStorage. Se llama al cargar la página y cada
// vez que se agrega/elimina un ítem, para que quede sincronizado sin
// tener que recargar.
function registrarIntentsUsuario() {
  if (typeof intents === 'undefined' || !Array.isArray(intents)) return;
  for (var i = intents.length - 1; i >= 0; i--) {
    if (intents[i] && intents[i]._usuario) intents.splice(i, 1);
  }
  getMenuUsuario().forEach(function(item) {
    var accion = accionPorId(item.accionId);
    var frase  = (item.intent || '').toLowerCase().trim();
    if (!accion || !frase) return;
    intents.push({
      name: 'usuario_' + item.id,
      description: item.nombre + ' — personalizado ("' + item.intent + '")',
      _usuario: true,
      match: (function(f) { return function(c) { return c.includes(f); }; })(frase),
      action: accion.run
    });
  });
}

// ── UI: panel flotante (mismo patrón que bottle_eq.js / visualizer.js) ──
function crearPanelMenuUsuario() {
  muPanel = document.createElement('div');
  muPanel.id = 'miMenuPanel';
  muPanel.className = 'skill-panel';
  muPanel.style.display = 'none';

  var opciones = ACCIONES_DISPONIBLES.map(function(a) {
    return '<option value="' + a.id + '">' + a.label + '</option>';
  }).join('');

  muPanel.innerHTML =
    '<div class="skill-panel-header">' +
      '<span>Mi Menú</span>' +
      '<div style="display:flex;gap:6px;">' +
        '<button id="muAddBtn" onclick="toggleMuForm()" title="Agregar ítem">+</button>' +
        '<button onclick="cerrarMenuUsuario()">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="skill-panel-body">' +
      '<p class="skill-hint">Crea accesos personalizados: nombre, la acción de la app que deben ejecutar, y la frase que los activa por voz.</p>' +
      '<div id="muForm" style="display:none;flex-direction:column;gap:8px;">' +
        '<div>' +
          '<label class="skill-label">Nombre del ítem</label>' +
          '<input id="muNombre" class="alarm-input" placeholder="Ej: Mi rincón favorito" style="width:100%;margin-top:4px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
          '<label class="skill-label">Acción a ejecutar</label>' +
          '<select id="muAccion" class="alarm-input" style="width:100%;margin-top:4px;">' + opciones + '</select>' +
        '</div>' +
        '<div>' +
          '<label class="skill-label">Frase de voz (intent)</label>' +
          '<input id="muIntent" class="alarm-input" placeholder="Ej: abre mi rincón favorito" style="width:100%;margin-top:4px;box-sizing:border-box;">' +
          '<p class="skill-hint" style="margin-top:3px;">Al decir esta frase, o al tocar el ítem en la lista, se ejecuta la acción elegida.</p>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="guardarItemMenuUsuario()">Guardar</button>' +
      '</div>' +
      '<div id="muLista" class="alarm-list" style="margin-top:4px;"></div>' +
    '</div>';

  document.body.appendChild(muPanel);
}

function toggleMuForm() {
  var form = document.getElementById('muForm');
  if (!form) return;
  muFormAbierto = !muFormAbierto;
  form.style.display = muFormAbierto ? 'flex' : 'none';
}

function guardarItemMenuUsuario() {
  var nombreEl = document.getElementById('muNombre');
  var intentEl = document.getElementById('muIntent');
  var accionId = document.getElementById('muAccion').value;
  var nombre   = (nombreEl.value || '').trim();
  var intentTxt = (intentEl.value || '').trim();

  if (!nombre || !intentTxt) {
    if (typeof _sv === 'function') _sv('Falta el nombre o la frase de voz.');
    else alert('Falta el nombre o la frase de voz.');
    return;
  }

  var items = getMenuUsuario();
  items.push({ id: 'u' + Date.now(), nombre: nombre, accionId: accionId, intent: intentTxt });
  saveMenuUsuario(items);
  registrarIntentsUsuario();

  nombreEl.value = '';
  intentEl.value = '';
  toggleMuForm();
  renderMenuUsuario();
}

function eliminarItemMenuUsuario(id) {
  var items = getMenuUsuario().filter(function(i) { return i.id !== id; });
  saveMenuUsuario(items);
  registrarIntentsUsuario();
  renderMenuUsuario();
}

function ejecutarItemMenuUsuario(id) {
  var items = getMenuUsuario();
  var item = null;
  for (var i = 0; i < items.length; i++) { if (items[i].id === id) { item = items[i]; break; } }
  if (!item) return;
  var accion = accionPorId(item.accionId);
  if (accion) accion.run();
}

function renderMenuUsuario() {
  var cont = document.getElementById('muLista');
  if (!cont) return;
  var items = getMenuUsuario();
  if (!items.length) {
    cont.innerHTML = '<p class="skill-hint">Todavía no has agregado ningún ítem. Usa el botón "+" de arriba.</p>';
    return;
  }
  cont.innerHTML = items.map(function(item) {
    var accion = accionPorId(item.accionId);
    var accionLabel = accion ? accion.label : '(acción no encontrada)';
    return '<div class="alarm-item">' +
      '<div class="alarm-item-info" style="cursor:pointer;" onclick="ejecutarItemMenuUsuario(\'' + item.id + '\')">' +
        '<strong>' + item.nombre + '</strong>' +
        '<small>' + accionLabel + ' · "' + item.intent + '"</small>' +
      '</div>' +
      '<button onclick="eliminarItemMenuUsuario(\'' + item.id + '\')" ' +
        'style="background:transparent;border:1px solid rgba(239,68,68,.3);color:#ef4444;width:26px;height:26px;border-radius:7px;cursor:pointer;flex-shrink:0;">✕</button>' +
    '</div>';
  }).join('');
}

function abrirMenuUsuario() {
  if (!muPanel) crearPanelMenuUsuario();
  muPanel.style.display = 'flex';
  muVisible = true;
  renderMenuUsuario();
}
function cerrarMenuUsuario() {
  if (muPanel) muPanel.style.display = 'none';
  muVisible = false;
}
function toggleMenuUsuario() {
  if (muVisible) cerrarMenuUsuario(); else abrirMenuUsuario();
}

// Registrar los intents guardados apenas la página termine de cargar
// (necesita que intents.js ya haya definido `intents`).
window.addEventListener('load', registrarIntentsUsuario);

} // fin guard _SCALL_MENU_USUARIO_LOADED
