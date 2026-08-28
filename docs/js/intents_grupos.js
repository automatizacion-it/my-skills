// =====================================================================
// GRUPOS DE INTENTS — SCALL
// Capa que agrupa un "intent principal" (ej: "pon música") con su familia
// de sub-intents (electrónica, relajante, salsa, ...) en un archivo de
// texto (JSON) separado, fácil de leer/editar sin tocar código.
//
// Cuando se dice la frase genérica ("pon música" a secas), en vez de
// asumir un género por defecto, SCALL PREGUNTA — como un menú de contact
// center — y la SIGUIENTE frase que digas se interpreta como la
// respuesta a esa pregunta, no como un comando nuevo cualquiera.
//
// Este archivo es intencionalmente pequeño y genérico: agregar un nuevo
// grupo (radio, clima, etc. en el futuro) es agregar un .json + una línea
// en cargarTodosLosGrupos(), sin tocar esta lógica central.
//
// Nota para el futuro: la pregunta hoy es 100% hablada (responderVoz).
// Mostrar además las opciones en pantalla, o hacerlo 100% visual sin
// voz, son modos que se pueden agregar después leyendo un modo guardado
// en localStorage — se dejó como posible mejora, no se construyó aún.
// =====================================================================

if (window._SCALL_INTENTS_GRUPOS_LOADED) {
  console.warn('[GRUPOS] Ya cargado');
} else {
window._SCALL_INTENTS_GRUPOS_LOADED = true;

var GRUPOS_INTENTS  = {};    // id de grupo → { pregunta, opciones: [...] }
var grupoPendiente   = null;  // id del grupo esperando respuesta, o null

function cargarGrupoIntents(id, url) {
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      GRUPOS_INTENTS[id] = data;
      _grpLog('[GRUPOS] Cargado "' + id + '" con ' + data.opciones.length + ' opciones');
    })
    .catch(function(e) {
      _grpLog('[GRUPOS] ⚠️ No se pudo cargar ' + url + ': ' + e.message);
    });
}

function cargarTodosLosGrupos() {
  cargarGrupoIntents('musica', 'data/intents_musica.json');
  // Futuro: cargarGrupoIntents('radio', 'data/intents_radio.json'); etc.
}

// Hace la pregunta de un grupo y deja marcado que se espera respuesta
function preguntarGrupo(id) {
  var grupo = GRUPOS_INTENTS[id];
  if (!grupo) {
    _grpLog('[GRUPOS] ⚠️ Grupo no cargado todavía: ' + id);
    return;
  }
  grupoPendiente = id;
  _grpLog('[GRUPOS] Preguntando grupo "' + id + '"');
  if (typeof responderVoz === 'function') responderVoz(grupo.pregunta);
}

// Ejecuta la acción real para la opción elegida de un grupo.
// Centralizado aquí para no repetir un switch en cada sitio que use grupos.
function ejecutarOpcionGrupo(idGrupo, opcion) {
  if (idGrupo === 'musica') {
    if (typeof reproducirMusica === 'function') reproducirMusica(opcion.query);
  }
  // Futuro: más grupos aquí (radio, clima, etc.)
}

// Se llama ANTES que cualquier otro intent, con la frase tal cual la dijo
// el usuario. Si había una pregunta pendiente, la resuelve y devuelve
// true (el pipeline normal de intents NO debe seguir con esta frase).
// Si no había nada pendiente, devuelve false y todo sigue igual que hoy.
function resolverRespuestaGrupo(texto) {
  if (!grupoPendiente) return false;

  var idGrupo = grupoPendiente;
  grupoPendiente = null; // se consume pase lo que pase — nunca queda atascado

  var grupo = GRUPOS_INTENTS[idGrupo];
  if (!grupo) return false;

  var c = texto.toLowerCase();
  var opcion = grupo.opciones.find(function(o) {
    return o.palabras.some(function(p) { return c.includes(p); });
  });

  if (!opcion) {
    _grpLog('[GRUPOS] No matcheó ninguna opción de "' + idGrupo + '" con: "' + texto + '"');
    if (typeof responderVoz === 'function') {
      responderVoz('No te entendí bien. Dime de nuevo, por ejemplo: pon música.');
    }
    return true;
  }

  _grpLog('[GRUPOS] "' + idGrupo + '" → opción "' + opcion.id + '"');
  ejecutarOpcionGrupo(idGrupo, opcion);
  return true;
}

function _grpLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

window.addEventListener('load', cargarTodosLosGrupos);

} // fin guard _SCALL_INTENTS_GRUPOS_LOADED
