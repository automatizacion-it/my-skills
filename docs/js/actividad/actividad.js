// =====================================================================
// ACTIVIDAD — SCALL
// Punto de entrada único que pregunta qué se quiere hacer y ofrece 3
// actividades, reusando infraestructura YA EXISTENTE en la app:
//   - Audiolibro / Clase → IA (Gemini o Claude, según getActiveIA())
//     genera el contenido (o se usa texto propio) y se narra con
//     ElevenLabs/WebSpeech (encolarVoz, ya en tts_elevenlabs.js).
//   - Video → busca en YouTube (buscarEnYouTube, ya en spotify.js) y lo
//     reproduce embebido; el reproductor de YouTube trae su propio botón
//     de Cast nativo, así que se envía al Smart TV sin código adicional.
// =====================================================================

if (window._SCALL_ACTIVIDAD_LOADED) {
  console.warn('[ACTIVIDAD] Ya cargado');
} else {
window._SCALL_ACTIVIDAD_LOADED = true;

var actPanel   = null;
var actVisible = false;
var actPaso    = 1;      // 1: elegir tipo | 2: elegir origen del contenido | 3: resultado
var actTipo    = null;   // 'audiolibro' | 'clase' | 'video'
var actModo    = null;   // 'ia' | 'texto' (para audiolibro/clase)
var actTextoGenerado = '';
var actParrafos = [];
var actReproduciendo = false;
var ytPlayerActividad = null;

// ── Espera a que la API de YouTube (cargada por spotify.js) esté lista ──
function esperarYT(callback, intentos) {
  intentos = intentos || 0;
  if (window.YT && window.YT.Player) { callback(); return; }
  if (intentos > 40) { // ~12s
    if (typeof _sv === 'function') _sv('No se pudo cargar el reproductor de YouTube.');
    return;
  }
  setTimeout(function() { esperarYT(callback, intentos + 1); }, 300);
}

// ── Generación de contenido con la IA activa (Gemini o Claude) ──
async function generarContenidoIA(tema, tipo) {
  var instruccion = (tipo === 'clase')
    ? 'Eres un profesor experto. Da una clase clara y estructurada sobre el tema, ' +
      'con introducción, 3 a 5 puntos clave explicados con ejemplos sencillos, y una ' +
      'conclusión breve. Escribe en párrafos cortos, en español, sin usar markdown ' +
      '(sin #, sin **, sin listas con guiones) porque el texto se va a leer en voz alta.'
    : 'Eres un narrador de audiolibros. Escribe un relato o texto informativo ameno ' +
      'sobre el tema, dividido en varios párrafos cortos, en español, sin usar markdown ' +
      '(sin #, sin **, sin listas con guiones) porque el texto se va a leer en voz alta.';

  var prompt = instruccion + '\n\nTEMA: ' + tema;
  var ia = (typeof getActiveIA === 'function') ? getActiveIA() : 'gemini';

  if (ia === 'claude') {
    var claudeKey = (typeof getClaudeKey === 'function') ? getClaudeKey() : '';
    if (!claudeKey) throw new Error('Falta configurar la API Key de Claude en ⚙️.');
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: (typeof getClaudeModel === 'function') ? getClaudeModel() : 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await resp.json();
    if (!resp.ok || data.error) throw new Error((data.error && data.error.message) || ('HTTP ' + resp.status));
    return (data.content && data.content[0] && data.content[0].text) || '';
  } else {
    var apiKey = (typeof getApiKey === 'function') ? getApiKey() : '';
    if (!apiKey) throw new Error('Falta configurar la API Key de Gemini en ⚙️.');
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
        })
      }
    );
    var d = await r.json();
    if (!r.ok || d.error) throw new Error((d.error && d.error.message) || ('HTTP ' + r.status));
    return d.candidates[0].content.parts[0].text || '';
  }
}

// ── Narración: parte el texto en párrafos y los encola en el motor de voz ──
function partirEnParrafos(texto) {
  return texto.split(/\n+/).map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
}

function reproducirNarracionActividad() {
  if (!actParrafos.length) return;
  actReproduciendo = true;
  actParrafos.forEach(function(p) {
    if (typeof encolarVoz === 'function') encolarVoz(p);
  });
  actualizarBotonesNarracion();
}

function detenerNarracionActividad() {
  if (typeof detenerVoz === 'function') detenerVoz();
  if (typeof colaVoz !== 'undefined') colaVoz.length = 0;
  actReproduciendo = false;
  actualizarBotonesNarracion();
}

function actualizarBotonesNarracion() {
  var play = document.getElementById('actPlayBtn');
  var stop = document.getElementById('actStopBtn');
  if (play) play.style.display = actReproduciendo ? 'none' : 'inline-flex';
  if (stop) stop.style.display = actReproduciendo ? 'inline-flex' : 'none';
}

// ── Flujo principal ──
async function crearActividad() {
  var tema = (document.getElementById('actTema').value || '').trim();
  if (!tema && actModo === 'ia') {
    if (typeof _sv === 'function') _sv('Dime sobre qué tema.');
    return;
  }

  if (actTipo === 'video') {
    actPaso = 3;
    renderActividad();
    if (typeof buscarEnYouTube !== 'function') {
      document.getElementById('actResultado').innerHTML = '<p class="skill-hint">buscarEnYouTube no está disponible (¿falta cargar spotify.js?).</p>';
      return;
    }
    document.getElementById('actResultado').innerHTML = '<p class="skill-hint">Buscando video sobre "' + tema + '"...</p>';
    var ids = await buscarEnYouTube(tema + ' explicación documental');
    if (!ids || !ids.length) {
      document.getElementById('actResultado').innerHTML = '<p class="skill-hint">No encontré ningún video. Revisa tu YouTube API Key en ⚙️.</p>';
      return;
    }
    mostrarVideoActividad(ids[0]);
    return;
  }

  // Audiolibro / Clase
  if (actModo === 'texto') {
    actTextoGenerado = (document.getElementById('actTextoPropio').value || '').trim();
    if (!actTextoGenerado) {
      if (typeof _sv === 'function') _sv('Pega el texto que quieres que lea.');
      return;
    }
    actParrafos = partirEnParrafos(actTextoGenerado);
    actPaso = 3;
    renderActividad();
    return;
  }

  // Modo IA
  actPaso = 3;
  renderActividad();
  document.getElementById('actResultado').innerHTML = '<p class="skill-hint">Generando ' + (actTipo === 'clase' ? 'la clase' : 'el audiolibro') + ' con IA sobre "' + tema + '"...</p>';
  try {
    actTextoGenerado = await generarContenidoIA(tema, actTipo);
    actParrafos = partirEnParrafos(actTextoGenerado);
    renderActividad();
  } catch (e) {
    document.getElementById('actResultado').innerHTML = '<p class="skill-hint">Error generando el contenido: ' + e.message + '</p>';
  }
}

function mostrarVideoActividad(videoId) {
  document.getElementById('actResultado').innerHTML =
    '<div id="actYtContainer" style="width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;"></div>' +
    '<p class="skill-hint" style="margin-top:6px;">Toca el ícono de Cast dentro del reproductor para enviarlo a tu Smart TV (Chromecast).</p>';
  esperarYT(function() {
    ytPlayerActividad = new YT.Player('actYtContainer', {
      videoId: videoId,
      playerVars: { autoplay: 1, rel: 0 }
    });
  });
}

// ── UI ──
function crearPanelActividad() {
  actPanel = document.createElement('div');
  actPanel.id = 'actividadPanel';
  actPanel.className = 'skill-panel';
  actPanel.style.display = 'none';
  document.body.appendChild(actPanel);
}

function renderActividad() {
  if (!actPanel) return;
  var atras = actPaso > 1
    ? '<button onclick="actIrAPaso(' + (actPaso - 1) + ')" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:.72rem;">‹ Atrás</button>'
    : '';

  var cuerpo = '';

  if (actPaso === 1) {
    cuerpo =
      '<p class="skill-hint">¿Qué quieres hacer?</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<button class="btn btn-primary" onclick="seleccionarTipoActividad(\'audiolibro\')">🎧 Audiolibro</button>' +
        '<button class="btn btn-primary" onclick="seleccionarTipoActividad(\'clase\')">📚 Clase sobre un tema</button>' +
        '<button class="btn btn-primary" onclick="seleccionarTipoActividad(\'video\')">🎬 Video para tu TV</button>' +
      '</div>';
  }

  else if (actPaso === 2 && actTipo === 'video') {
    cuerpo =
      '<p class="skill-hint">¿Sobre qué tema quieres el video?</p>' +
      '<input id="actTema" class="alarm-input" placeholder="Ej: el sistema solar" style="width:100%;box-sizing:border-box;">' +
      '<button class="btn btn-primary" onclick="crearActividad()" style="margin-top:8px;">Buscar video</button>';
  }

  else if (actPaso === 2) {
    cuerpo =
      '<div class="skill-tabs">' +
        '<button class="skill-tab' + (actModo === 'ia' ? ' active' : '') + '" onclick="seleccionarModoActividad(\'ia\')">Generar con IA</button>' +
        '<button class="skill-tab' + (actModo === 'texto' ? ' active' : '') + '" onclick="seleccionarModoActividad(\'texto\')">Pegar mi texto</button>' +
      '</div>' +
      (actModo === 'texto'
        ? '<textarea id="actTextoPropio" class="trad-textarea" rows="6" placeholder="Pega aquí el texto que quieres que lea..."></textarea>' +
          '<input id="actTema" type="hidden" value="">'
        : '<label class="skill-label" style="margin-top:6px;display:block;">Tema</label>' +
          '<input id="actTema" class="alarm-input" placeholder="Ej: la historia del café" style="width:100%;box-sizing:border-box;margin-top:4px;">'
      ) +
      '<button class="btn btn-primary" onclick="crearActividad()" style="margin-top:8px;">' +
        (actTipo === 'clase' ? 'Empezar la clase' : 'Crear audiolibro') +
      '</button>';
  }

  else if (actPaso === 3) {
    if (actTipo === 'video') {
      cuerpo = '<div id="actResultado"></div>';
    } else {
      cuerpo =
        '<div id="actResultado" style="max-height:220px;overflow-y:auto;">' +
          (actTextoGenerado
            ? '<p style="font-size:.8rem;line-height:1.55;color:var(--text);white-space:pre-line;">' + actTextoGenerado + '</p>'
            : '<p class="skill-hint">Generando...</p>') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button id="actPlayBtn" class="btn btn-primary" style="width:auto;padding:9px 16px;display:inline-flex;" onclick="reproducirNarracionActividad()">▶ Reproducir</button>' +
          '<button id="actStopBtn" class="btn" style="width:auto;padding:9px 16px;display:none;background:#ef4444;color:#fff;" onclick="detenerNarracionActividad()">⏹ Detener</button>' +
        '</div>';
    }
  }

  actPanel.innerHTML =
    '<div class="skill-panel-header">' +
      '<span>' + atras + ' Actividad</span>' +
      '<button onclick="cerrarActividad()">✕</button>' +
    '</div>' +
    '<div class="skill-panel-body">' + cuerpo + '</div>';
}

function actIrAPaso(paso) {
  actPaso = paso;
  if (paso === 1) { actTipo = null; actModo = null; }
  renderActividad();
}

function seleccionarTipoActividad(tipo) {
  actTipo = tipo;
  actModo = 'ia';
  actPaso = 2;
  renderActividad();
}

function seleccionarModoActividad(modo) {
  actModo = modo;
  renderActividad();
}

function abrirActividad() {
  if (!actPanel) crearPanelActividad();
  actPanel.style.display = 'flex';
  actVisible = true;
  actPaso = 1; actTipo = null; actModo = null; actTextoGenerado = ''; actParrafos = [];
  renderActividad();
}
function cerrarActividad() {
  if (actPanel) actPanel.style.display = 'none';
  actVisible = false;
  detenerNarracionActividad();
}
function toggleActividad() {
  if (actVisible) cerrarActividad(); else abrirActividad();
}

} // fin guard _SCALL_ACTIVIDAD_LOADED
