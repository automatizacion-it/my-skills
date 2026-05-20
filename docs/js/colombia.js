// =====================================================================
// MÓDULO COLOMBIA — SCALL
// Las 10 mejores cosas de mi Colombia — formulario + presentación IA
// =====================================================================

if (window._SCALL_COLOMBIA_LOADED) {
  console.warn('[COLOMBIA] Módulo ya cargado');
} else {
window._SCALL_COLOMBIA_LOADED = true;

var COLOMBIA_KEY  = 'scall_colombia_10';
var colombiaPanel = null;
var colombiaData  = null;

// ── Categorías sugeridas para cada campo ──────────────────────────────
var COLOMBIA_CAMPOS = [
  { id: 'c1',  emoji: '🍽️', label: 'Tu comida favorita de Colombia',       placeholder: 'Bandeja paisa, ajiaco, sancocho...' },
  { id: 'c2',  emoji: '🌄', label: 'Tu lugar o ciudad preferida',           placeholder: 'Cartagena, el Eje Cafetero, mi pueblo...' },
  { id: 'c3',  emoji: '🎵', label: 'La música que te mueve el alma',        placeholder: 'Vallenato, cumbia, salsa, ranchera...' },
  { id: 'c4',  emoji: '☕', label: 'Algo de Colombia que extrañarías',      placeholder: 'El tinto, el aguardiente, la fritanga...' },
  { id: 'c5',  emoji: '🌸', label: 'Una tradición o fiesta colombiana',     placeholder: 'Feria de Cali, carnaval, semana santa...' },
  { id: 'c6',  emoji: '🦅', label: 'Un colombiano que te llena de orgullo', placeholder: 'Gabriel García Márquez, Shakira, Radamel...' },
  { id: 'c7',  emoji: '🌿', label: 'Un paisaje natural que te enamora',     placeholder: 'Los Llanos, la Sierra Nevada, el Amazonas...' },
  { id: 'c8',  emoji: '💛', label: 'Una frase o dicho colombiano',           placeholder: 'Quiubo, parce, ¡eso es!, marica pa qué...' },
  { id: 'c9',  emoji: '🏘️', label: 'Lo que más te gusta del colombiano',   placeholder: 'La alegría, la verraquera, la hospitalidad...' },
  { id: 'c10', emoji: '⭐', label: 'Tu cosa favorita de Colombia #1',        placeholder: 'Lo mejor que tiene este país hermoso...' }
];

// ══════════════════════════════════════════════════════════════════════
// PANEL FORMULARIO
// ══════════════════════════════════════════════════════════════════════

function abrirPanelColombia() {
  if (!colombiaPanel) crearPanelColombia();
  colombiaPanel.style.display = 'flex';
  cargarDatosGuardados();
  _colLog('[COLOMBIA] Panel abierto');
}

function cerrarPanelColombia() {
  if (colombiaPanel) colombiaPanel.style.display = 'none';
}

function crearPanelColombia() {
  colombiaPanel = document.createElement('div');
  colombiaPanel.id = 'colombiaPanel';
  colombiaPanel.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'background:rgba(0,0,0,0.88)',
    'z-index:2000',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:16px',
    'backdrop-filter:blur(6px)'
  ].join(';');

  var campos_html = COLOMBIA_CAMPOS.map(function(campo, idx) {
    return '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">' +
      '<div style="font-size:1.3rem;margin-top:2px;flex-shrink:0;">' + campo.emoji + '</div>' +
      '<div style="flex:1;">' +
        '<label style="display:block;font-size:.62rem;letter-spacing:.1em;' +
                'color:rgba(255,210,0,0.6);font-family:DM Mono,monospace;' +
                'text-transform:uppercase;margin-bottom:3px;">' +
          (idx + 1) + '. ' + campo.label +
        '</label>' +
        '<input id="' + campo.id + '" type="text" ' +
               'placeholder="' + campo.placeholder + '" ' +
               'maxlength="120" ' +
               'style="width:100%;background:rgba(255,255,255,0.05);' +
               'border:1px solid rgba(255,210,0,0.2);border-radius:8px;' +
               'padding:8px 12px;color:#f0e6c0;font-size:.82rem;' +
               'font-family:Inter,sans-serif;outline:none;box-sizing:border-box;" ' +
               'onfocus="this.style.borderColor=\'rgba(255,210,0,0.6)\'" ' +
               'onblur="this.style.borderColor=\'rgba(255,210,0,0.2)\'">' +
      '</div>' +
    '</div>';
  }).join('');

  colombiaPanel.innerHTML =
    '<div style="width:100%;max-width:600px;max-height:calc(100dvh - 32px);' +
         'background:linear-gradient(160deg,#1a0a02 0%,#0d1a0d 50%,#030d1a 100%);' +
         'border:1px solid rgba(255,210,0,0.25);border-radius:20px;' +
         'display:flex;flex-direction:column;overflow:hidden;' +
         'box-shadow:0 0 60px rgba(255,210,0,0.1),0 40px 80px rgba(0,0,0,0.8);">' +

      '<div style="padding:18px 20px 14px;flex-shrink:0;' +
           'border-bottom:1px solid rgba(255,210,0,0.12);' +
           'background:rgba(255,210,0,0.04);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-size:1.4rem;margin-bottom:2px;">🇨🇴</div>' +
            '<h2 style="margin:0;font-size:.9rem;font-weight:600;' +
                'color:rgba(255,210,0,0.9);letter-spacing:.06em;' +
                'font-family:DM Mono,monospace;">MIS 10 COSAS DE COLOMBIA</h2>' +
            '<p style="margin:0;font-size:.65rem;color:rgba(255,255,255,0.3);' +
                'font-family:DM Mono,monospace;">Cuéntame qué te enamora de tu tierra</p>' +
          '</div>' +
          '<button onclick="cerrarPanelColombia()" ' +
            'style="background:transparent;border:1px solid rgba(255,255,255,0.15);' +
            'color:rgba(255,255,255,0.4);width:30px;height:30px;border-radius:8px;' +
            'cursor:pointer;font-size:.9rem;">✕</button>' +
        '</div>' +
      '</div>' +

      '<div style="flex:1;overflow-y:auto;padding:16px 20px;scrollbar-width:thin;' +
           'scrollbar-color:rgba(255,210,0,0.2) transparent;">' +
        campos_html +
      '</div>' +

      '<div style="padding:14px 20px;flex-shrink:0;' +
           'border-top:1px solid rgba(255,210,0,0.1);' +
           'background:rgba(0,0,0,0.3);display:flex;gap:8px;">' +
        '<button onclick="guardarColombia()" ' +
          'style="flex:1;padding:10px;border-radius:10px;cursor:pointer;' +
          'background:rgba(255,210,0,0.08);' +
          'border:1px solid rgba(255,210,0,0.25);' +
          'color:rgba(255,210,0,0.8);font-size:.75rem;' +
          'font-family:DM Mono,monospace;letter-spacing:.06em;">💾 Guardar</button>' +
        '<button onclick="generarPresentacionColombia()" ' +
          'style="flex:2;padding:10px;border-radius:10px;cursor:pointer;' +
          'background:linear-gradient(135deg,rgba(255,210,0,0.25),rgba(255,80,0,0.2));' +
          'border:1px solid rgba(255,210,0,0.5);' +
          'color:#ffd200;font-size:.82rem;font-weight:600;' +
          'font-family:DM Mono,monospace;letter-spacing:.06em;">' +
          '🇨🇴 GENERAR PRESENTACIÓN CON IA ↗' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(colombiaPanel);
}

function cargarDatosGuardados() {
  try {
    var guardado = JSON.parse(localStorage.getItem(COLOMBIA_KEY));
    if (!guardado) return;
    COLOMBIA_CAMPOS.forEach(function(campo) {
      var el = document.getElementById(campo.id);
      if (el && guardado[campo.id]) el.value = guardado[campo.id];
    });
  } catch(e) {}
}

function guardarColombia() {
  var datos = {};
  COLOMBIA_CAMPOS.forEach(function(campo) {
    var el = document.getElementById(campo.id);
    if (el) datos[campo.id] = el.value.trim();
  });
  localStorage.setItem(COLOMBIA_KEY, JSON.stringify(datos));
  colombiaData = datos;
  _colLog('[COLOMBIA] Datos guardados');
  if (typeof responderVoz === 'function') responderVoz('Guardado, parcero. Ahora genera la presentación.');
}

// ══════════════════════════════════════════════════════════════════════
// GENERAR PRESENTACIÓN CON CLAUDE
// ══════════════════════════════════════════════════════════════════════

async function generarPresentacionColombia() {
  var datos = {};
  COLOMBIA_CAMPOS.forEach(function(campo) {
    var el = document.getElementById(campo.id);
    if (el) datos[campo.id] = el.value.trim();
  });

  var vacios = COLOMBIA_CAMPOS.filter(function(c) { return !datos[c.id]; });
  if (vacios.length > 7) {
    if (typeof responderVoz === 'function') {
      responderVoz('Parcero, llena al menos 3 campos para hacer la presentación.');
    }
    return;
  }

  guardarColombia();
  mostrarCargandoColombia();

  var apiKey = typeof getClaudeKey === 'function' ? getClaudeKey() : '';
  if (!apiKey) {
    if (typeof responderVoz === 'function') responderVoz('Necesito tu Claude API Key para generar la presentación.');
    cerrarCargando();
    return;
  }

  var listaDatos = COLOMBIA_CAMPOS
    .filter(function(c) { return datos[c.id]; })
    .map(function(c) { return c.emoji + ' ' + c.label + ': "' + datos[c.id] + '"'; })
    .join('\n');

  var prompt = 'Soy colombiano y estas son mis 10 cosas favoritas de Colombia:\n\n' +
    listaDatos + '\n\n' +
    'Genera una PRESENTACIÓN VISUAL ESPECTACULAR en HTML puro (sin DOCTYPE ni html/body). ' +
    'Debe ser:\n' +
    '- GRANDE y hermosa, que llene la pantalla\n' +
    '- Con los colores de la bandera colombiana: amarillo #FFD200, azul #003087, rojo #CE1126\n' +
    '- Con emojis, tipografía grande, secciones con bordes redondeados\n' +
    '- EMOTIVA, divertida, con frases que celebren Colombia\n' +
    '- Cada ítem como una tarjeta grande y colorida\n' +
    '- Con un título principal ENORME tipo "¡MI COLOMBIA HERMOSA!"\n' +
    '- Con frases colombianas intercaladas: "¡Eso sí es vida!, Parcero, ¡Qué chimba!, ¡A la orden!"\n' +
    '- Con sección final que diga por qué Colombia es única en el mundo\n' +
    '- USA font-family: serif o display para los títulos, sansserif para el cuerpo\n' +
    '- Fondo oscuro (#0a0a0a o similar) con tarjetas coloridas encima\n' +
    '- SOLO HTML y CSS inline, sin JavaScript, sin imports externos\n' +
    '- Que al verla dé orgullo colombiano y ganas de llorar de amor por la tierra\n\n' +
    'Responde ÚNICAMENTE con el HTML de la presentación. Nada más.';

  try {
    var model = typeof getClaudeModel === 'function' ? getClaudeModel() : 'claude-sonnet-4-20250514';
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var data = await resp.json();

    if (!resp.ok) {
      _colLog('[COLOMBIA] Error Claude: ' + (data.error && data.error.message));
      cerrarCargando();
      if (typeof responderVoz === 'function') responderVoz('Error al generar la presentación.');
      return;
    }

    var html = '';
    data.content.forEach(function(b) { if (b.type === 'text') html += b.text; });

    // Limpiar markdown si Claude lo envuelve
    html = html.replace(/^```html\n?/i, '').replace(/\n?```$/, '').trim();

    cerrarCargando();
    mostrarPresentacion(html);
    if (typeof responderVoz === 'function') {
      responderVoz('¡Parcero, aquí está tu Colombia hermosa! ¡Viva Colombia libre!');
    }

  } catch(err) {
    _colLog('[COLOMBIA] Error: ' + err.message);
    cerrarCargando();
    if (typeof responderVoz === 'function') responderVoz('No pude conectar. Intenta de nuevo.');
  }
}

// ══════════════════════════════════════════════════════════════════════
// PRESENTACIÓN OVERLAY
// ══════════════════════════════════════════════════════════════════════

function mostrarPresentacion(html) {
  var existing = document.getElementById('colombia-presentacion');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'colombia-presentacion';
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'background:#000',
    'z-index:3000',
    'display:flex', 'flex-direction:column',
    'overflow:hidden'
  ].join(';');

  var topbar = document.createElement('div');
  topbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
    'padding:10px 16px;background:rgba(255,210,0,0.1);' +
    'border-bottom:1px solid rgba(255,210,0,0.2);flex-shrink:0;';
  topbar.innerHTML =
    '<span style="color:#ffd200;font-family:DM Mono,monospace;font-size:.75rem;' +
    'letter-spacing:.1em;">🇨🇴 MI COLOMBIA HERMOSA</span>' +
    '<div style="display:flex;gap:8px;">' +
      '<button onclick="editarColombia()" ' +
        'style="background:transparent;border:1px solid rgba(255,210,0,0.3);' +
        'color:rgba(255,210,0,0.7);border-radius:7px;padding:5px 10px;' +
        'cursor:pointer;font-size:.68rem;font-family:DM Mono,monospace;">✏ Editar</button>' +
      '<button onclick="document.getElementById(\'colombia-presentacion\').remove()" ' +
        'style="background:transparent;border:1px solid rgba(255,255,255,0.15);' +
        'color:rgba(255,255,255,0.4);width:28px;height:28px;border-radius:7px;cursor:pointer;">✕</button>' +
    '</div>';

  var contenido = document.createElement('div');
  contenido.style.cssText = 'flex:1;overflow-y:auto;';
  contenido.innerHTML = html;

  overlay.appendChild(topbar);
  overlay.appendChild(contenido);
  document.body.appendChild(overlay);

  // Cerrar el formulario
  cerrarPanelColombia();
  _colLog('[COLOMBIA] Presentación mostrada');
}

function editarColombia() {
  var pres = document.getElementById('colombia-presentacion');
  if (pres) pres.remove();
  abrirPanelColombia();
}

// ══════════════════════════════════════════════════════════════════════
// LOADING STATE
// ══════════════════════════════════════════════════════════════════════

function mostrarCargandoColombia() {
  var ex = document.getElementById('colombia-loading');
  if (ex) return;

  var loading = document.createElement('div');
  loading.id = 'colombia-loading';
  loading.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'background:rgba(0,0,0,0.92)',
    'z-index:3500',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'gap:20px'
  ].join(';');

  loading.innerHTML =
    '<div style="font-size:3rem;animation:spin 2s linear infinite;">🇨🇴</div>' +
    '<div style="font-family:DM Mono,monospace;font-size:.9rem;' +
         'color:rgba(255,210,0,0.8);letter-spacing:.1em;text-align:center;">' +
      'GENERANDO TU COLOMBIA...<br>' +
      '<span style="font-size:.65rem;color:rgba(255,255,255,0.3);">' +
        'La IA está poniendo todo el amor por tu tierra' +
      '</span>' +
    '</div>' +
    '<style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>';

  document.body.appendChild(loading);
}

function cerrarCargando() {
  var el = document.getElementById('colombia-loading');
  if (el) el.remove();
}

// ══════════════════════════════════════════════════════════════════════
// EXPONER GLOBALMENTE
// ══════════════════════════════════════════════════════════════════════

window.abrirPanelColombia          = abrirPanelColombia;
window.cerrarPanelColombia         = cerrarPanelColombia;
window.guardarColombia             = guardarColombia;
window.generarPresentacionColombia = generarPresentacionColombia;
window.editarColombia              = editarColombia;

window.addEventListener('load', function() {
  _colLog('[COLOMBIA] Módulo listo — ¡Viva Colombia!');
});

function _colLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

} // fin guard
