// =====================================================================
// MÓDULO RUTAS — SCALL v4
// Google Maps Embed + Haversine + Historial + Narración IA completa
// Sin errores de sintaxis — strings con concatenación simple
// =====================================================================

if (window._SCALL_RUTAS_LOADED) {
  console.warn('[RUTAS] Módulo ya cargado');
} else {
window._SCALL_RUTAS_LOADED = true;

// ── Coordenadas dinámicas desde localStorage ─────────────────────────
function getCasaLat()    { return parseFloat(localStorage.getItem('scall_casa_lat'))  || 4.7110;   }
function getCasaLng()    { return parseFloat(localStorage.getItem('scall_casa_lng'))  || -74.0721; }
function getCasaNombre() { return localStorage.getItem('scall_casa_nombre') || 'Mi casa'; }
function getPais()       { return localStorage.getItem('scall_pais_rutas')  || 'Colombia'; }

// ── Estado ────────────────────────────────────────────────────────────
var mapaPanel      = null;
var _destinoActual = '';
var _origenActual  = '';

// ══════════════════════════════════════════════════════════════════════
// HISTORIAL DE DESTINOS RECURRENTES
// ══════════════════════════════════════════════════════════════════════

var DESTINOS_KEY = 'scall_destinos_recurrentes';

function getDestinosRecurrentes() {
  try { return JSON.parse(localStorage.getItem(DESTINOS_KEY)) || []; }
  catch(e) { return []; }
}

function guardarDestinoRecurrente(nombre, origen) {
  if (!nombre || nombre.length < 2) return;
  var lista = getDestinosRecurrentes();
  var idx   = -1;
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].nombre.toLowerCase() === nombre.toLowerCase()) { idx = i; break; }
  }
  if (idx >= 0) {
    lista[idx].veces++;
    lista[idx].ultimaVez = new Date().toLocaleDateString('es-CO');
    lista[idx].origen    = origen || getCasaNombre();
  } else {
    lista.unshift({
      nombre:    nombre,
      origen:    origen || getCasaNombre(),
      veces:     1,
      ultimaVez: new Date().toLocaleDateString('es-CO')
    });
  }
  lista.sort(function(a, b) { return b.veces - a.veces; });
  localStorage.setItem(DESTINOS_KEY, JSON.stringify(lista.slice(0, 10)));
  _rutaLog('[RUTAS] Destino guardado: ' + nombre + ' (' + (lista[0] ? lista[0].veces : 1) + ' veces)');
}

// ══════════════════════════════════════════════════════════════════════
// INTENTS GUARDADOS EN LOCALSTORGE
// Primera vez: IA procesa. Luego: ejecución local directa
// ══════════════════════════════════════════════════════════════════════

var INTENTS_RUTAS_KEY = 'scall_intents_rutas';

function getIntentsRutasGuardados() {
  try { return JSON.parse(localStorage.getItem(INTENTS_RUTAS_KEY)) || {}; }
  catch(e) { return {}; }
}

function guardarIntentRuta(frase, destino, distKm, minutos) {
  var intents = getIntentsRutasGuardados();
  var clave   = frase.toLowerCase().trim();
  intents[clave] = {
    destino:    destino,
    distancia:  distKm  ? distKm.toFixed(1)  : null,
    minutos:    minutos || null,
    fecha:      new Date().toLocaleDateString('es-CO'),
    veces:      (intents[clave] ? intents[clave].veces + 1 : 1)
  };
  localStorage.setItem(INTENTS_RUTAS_KEY, JSON.stringify(intents));
  _rutaLog('[RUTAS] Intent guardado: "' + clave + '" → ' + destino);
}

function buscarIntentRutaLocal(frase) {
  var intents = getIntentsRutasGuardados();
  var clave   = frase.toLowerCase().trim();
  // Búsqueda exacta primero
  if (intents[clave]) return intents[clave];
  // Búsqueda parcial — si la frase contiene una clave guardada
  for (var k in intents) {
    if (clave.includes(k) || k.includes(clave)) return intents[k];
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════
// HAVERSINE — distancia real entre dos puntos GPS
// ══════════════════════════════════════════════════════════════════════

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  var R    = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
             Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function estimarTiempoMin(km) { return Math.ceil((km / 30) * 60); }

function formatearDistancia(km) {
  if (km < 1) return Math.round(km * 1000) + ' metros';
  return km.toFixed(1) + ' kilómetros';
}

function formatearTiempo(min) {
  if (min < 60) return min + ' minuto' + (min !== 1 ? 's' : '');
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (m === 0) return h + ' hora' + (h !== 1 ? 's' : '');
  return h + ' hora' + (h !== 1 ? 's' : '') + ' y ' + m + ' minuto' + (m !== 1 ? 's' : '');
}

// ══════════════════════════════════════════════════════════════════════
// GEOCODIFICACIÓN — Nominatim (si red disponible)
// ══════════════════════════════════════════════════════════════════════

function geocodificar(dir) {
  var coordMatch = dir.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return Promise.resolve({ lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) });
  }
  var q   = encodeURIComponent(dir + ', ' + getPais());
  var url = 'https://nominatim.openstreetmap.org/search?q=' + q + '&format=json&limit=1';
  return fetch(url, { headers: { 'Accept-Language': 'es' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.length) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    })
    .catch(function() { return null; });
}

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — navegar
// ══════════════════════════════════════════════════════════════════════

function navegarA(destino) {
  if (!destino || destino.trim().length < 2) {
    _rutaVoz('Di la dirección de destino.');
    return;
  }
  _destinoActual = destino.trim();
  guardarDestinoRecurrente(_destinoActual, getCasaNombre());
  mostrarPanelRutas();
  var inputDest = document.getElementById('rutaInputDest');
  if (inputDest) inputDest.value = _destinoActual;
  cargarMapa();
  _rutaLog('[RUTAS] Navegando a: ' + _destinoActual);
}

// ══════════════════════════════════════════════════════════════════════
// NARRACIÓN COMPLETA — abre menú, panel, dice todo, guarda intent
// ══════════════════════════════════════════════════════════════════════

function narrarRutaCompleta(destino, fraseOriginal) {
  var oNombre = getCasaNombre();
  var oLat    = getCasaLat();
  var oLng    = getCasaLng();

  // 1. Activar ítem de menú lateral
  if (typeof sideMenuActivar === 'function') {
    var btnNav = document.getElementById('smNavegacion');
    if (btnNav) sideMenuActivar(btnNav);
  }

  // 2. Abrir panel y cargar mapa
  _destinoActual = destino;
  mostrarPanelRutas();
  var inputDest = document.getElementById('rutaInputDest');
  if (inputDest) inputDest.value = destino;
  cargarMapa();
  guardarDestinoRecurrente(destino, oNombre);

  // 3. Anunciar inmediatamente origen y destino
  _rutaVoz('Iniciando navegación. Origen: ' + oNombre + '. Destino: ' + destino + '.');

  // 4. Geocodificar para calcular distancia real
  geocodificar(destino).then(function(coords) {
    var distKm  = null;
    var minutos = null;

    if (coords) {
      window._rutaDestLat = coords.lat;
      window._rutaDestLng = coords.lng;
      distKm  = calcularDistanciaKm(oLat, oLng, coords.lat, coords.lng);
      minutos = estimarTiempoMin(distKm);
      setEstado('📏 ' + formatearDistancia(distKm) + ' · ⏱ ~' + formatearTiempo(minutos));

      // Guardar intent para uso futuro sin IA
      if (fraseOriginal) guardarIntentRuta(fraseOriginal, destino, distKm, minutos);
      guardarIntentRuta(destino, destino, distKm, minutos);
    }

    // 5. Decir distancia y tiempo (después de 3.5s)
    setTimeout(function() {
      if (distKm !== null) {
        _rutaVoz('Distancia aproximada: ' + formatearDistancia(distKm) +
                 '. Tiempo estimado en carro: ' + formatearTiempo(minutos) + '.');
      } else {
        _rutaVoz('Destino cargado en el mapa. Revisa la ruta en pantalla.');
      }
    }, 3500);

    // 6. Novedades del recorrido (después de 7.5s)
    setTimeout(function() {
      var novedad = '';
      if (distKm !== null) {
        if (distKm < 1.5) {
          novedad = 'El destino está muy cerca. Puedes llegar caminando en unos ' +
                    Math.ceil(distKm / 0.083) + ' minutos.';
        } else if (distKm < 5) {
          novedad = 'Ruta corta dentro de la ciudad. Tráfico moderado esperado. ' +
                    'Considera salir con 5 minutos adicionales.';
        } else if (distKm < 20) {
          novedad = 'Ruta intermedia en ciudad. En hora pico puede tardar el doble. ' +
                    'Presiona Abrir Maps para ver el tráfico en tiempo real.';
        } else if (distKm < 60) {
          novedad = 'Ruta larga. Verifica el estado de las vías antes de salir. ' +
                    'Se recomienda tanque lleno y salir fuera de hora pico.';
        } else {
          novedad = 'Ruta de largo recorrido. Planifica paradas cada 2 horas. ' +
                    'Consulta el estado de carreteras antes de salir.';
        }
      }
      if (novedad) _rutaVoz(novedad);
    }, 7500);
  });
}

// Ejecutar ruta guardada localmente SIN IA
function ejecutarRutaLocal(intentGuardado) {
  var destino = intentGuardado.destino;
  var dist    = intentGuardado.distancia;
  var min     = intentGuardado.minutos;

  // Activar menú
  if (typeof sideMenuActivar === 'function') {
    var btn = document.getElementById('smNavegacion');
    if (btn) sideMenuActivar(btn);
  }

  navegarA(destino);

  setTimeout(function() {
    var msg = 'Ruta frecuente activada. Desde ' + getCasaNombre() +
              ' hasta ' + destino + '.';
    if (dist) msg += ' Distancia: ' + dist + ' kilómetros.';
    if (min)  msg += ' Tiempo estimado: ' + formatearTiempo(parseInt(min)) + '.';
    _rutaVoz(msg);
  }, 800);

  _rutaLog('[RUTAS] Intent local ejecutado: ' + destino);
}

// ══════════════════════════════════════════════════════════════════════
// INFORMAR RUTA ACTIVA
// ══════════════════════════════════════════════════════════════════════

function informarRutaVoz() {
  if (!_destinoActual) {
    _rutaVoz('No hay destino activo. Di: llévame a, seguido de la dirección.');
    return;
  }
  var oNombre = getCasaNombre();
  var oLat    = getCasaLat();
  var oLng    = getCasaLng();
  var dLat    = window._rutaDestLat;
  var dLng    = window._rutaDestLng;

  if (dLat && dLng) {
    var distKm  = calcularDistanciaKm(oLat, oLng, dLat, dLng);
    var minutos = estimarTiempoMin(distKm);
    var el = document.getElementById('rutaEstado');
    if (el) el.textContent = '📏 ' + formatearDistancia(distKm) + ' · ⏱ ~' + formatearTiempo(minutos);
    _rutaVoz('Ruta desde ' + oNombre + ' hasta ' + _destinoActual + '. ' +
             'Distancia: ' + formatearDistancia(distKm) + '. ' +
             'Tiempo estimado: ' + formatearTiempo(minutos) + '.');
  } else {
    _rutaVoz('Ruta activa hacia ' + _destinoActual + '. Abre el mapa para ver detalles.');
  }
}

function listarDestinosRecurrentesVoz() {
  var lista = getDestinosRecurrentes();
  if (lista.length === 0) {
    _rutaVoz('No tienes destinos guardados aún.');
    return;
  }
  var top = lista.slice(0, 3).map(function(d) {
    return d.nombre + ' — ' + d.veces + ' vez' + (d.veces > 1 ? 'es' : '');
  }).join(', ');
  _rutaVoz('Tus destinos más frecuentes son: ' + top + '.');
}

// ══════════════════════════════════════════════════════════════════════
// PANEL FLOTANTE
// ══════════════════════════════════════════════════════════════════════

function mostrarPanelRutas() {
  if (!mapaPanel) crearPanelRutas();
  mapaPanel.style.display = 'flex';
  var inputOrigen = document.getElementById('rutaInputOrigen');
  if (inputOrigen) inputOrigen.value = getCasaNombre();
  if (!_destinoActual) cargarMapa();
  renderDestinosRecurrentes();
}

function cerrarPanelRutas() {
  if (mapaPanel) mapaPanel.style.display = 'none';
}

function renderDestinosRecurrentes() {
  var el = document.getElementById('rutaDestinosList');
  if (!el) return;
  var lista = getDestinosRecurrentes();
  if (lista.length === 0) {
    el.innerHTML = '<span style="font-size:.62rem;color:rgba(255,255,255,0.18);' +
      'font-family:var(--font-mono,monospace);">Sin destinos aun</span>';
    return;
  }
  var html = '';
  for (var i = 0; i < Math.min(lista.length, 5); i++) {
    var d   = lista[i];
    var nom = d.nombre.length > 22 ? d.nombre.slice(0, 22) + '...' : d.nombre;
    // Escapar comillas simples para uso seguro en atributo onclick
    var safe = d.nombre.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    html += '<button onclick="navegarA(\'' + safe + '\')"' +
      ' style="display:inline-flex;align-items:center;gap:5px;' +
      'background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);' +
      'border-radius:6px;padding:4px 8px;cursor:pointer;font-size:.64rem;' +
      'font-family:var(--font-mono,monospace);color:rgba(0,212,255,0.7);' +
      'margin:0 4px 4px 0;">' +
      '<svg width="9" height="9" viewBox="0 0 24 24" fill="none"' +
      ' stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' +
      nom + '<span style="color:rgba(255,255,255,0.2);font-size:.55rem;">' + d.veces + 'x</span>' +
      '</button>';
  }
  el.innerHTML = html;
}

function crearPanelRutas() {
  mapaPanel = document.createElement('div');
  mapaPanel.id = 'rutasPanel';
  mapaPanel.style.cssText = [
    'position:fixed','top:60px','left:10px','right:10px',
    'max-width:680px','margin:0 auto',
    'height:calc(100dvh - 76px)',
    'background:#0d1117',
    'border:1px solid rgba(0,212,255,0.18)',
    'border-radius:18px',
    'box-shadow:0 20px 60px rgba(0,0,0,0.7)',
    'z-index:1100',
    'display:flex','flex-direction:column',
    'overflow:hidden',
    'font-family:Inter,sans-serif'
  ].join(';');

  mapaPanel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:12px 16px;background:rgba(0,212,255,0.05);' +
    'border-bottom:1px solid rgba(0,212,255,0.12);flex-shrink:0;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"' +
        ' stroke="rgba(0,212,255,0.85)" stroke-width="2" stroke-linecap="round">' +
          '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' +
        '</svg>' +
        '<span style="font-family:DM Mono,monospace;font-size:.75rem;' +
        'letter-spacing:.1em;color:rgba(0,212,255,0.85);">NAVEGACIÓN · SCALL</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
        '<button onclick="abrirEnGoogleMaps()"' +
        ' style="background:transparent;border:1px solid rgba(0,212,255,0.25);' +
        'color:rgba(0,212,255,0.75);border-radius:7px;padding:5px 10px;' +
        'cursor:pointer;font-size:.68rem;font-family:DM Mono,monospace;">↗ Abrir Maps</button>' +
        '<button onclick="cerrarPanelRutas()"' +
        ' style="background:transparent;border:1px solid rgba(255,255,255,0.1);' +
        'color:rgba(255,255,255,0.45);width:28px;height:28px;border-radius:7px;' +
        'cursor:pointer;font-size:.85rem;">✕</button>' +
      '</div>' +
    '</div>' +

    '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:7px;' +
    'border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;' +
    'background:rgba(0,0,0,0.25);">' +

      '<div style="display:flex;align-items:center;gap:9px;">' +
        '<div style="width:12px;height:12px;border-radius:50%;flex-shrink:0;' +
        'background:#10b981;border:2px solid rgba(255,255,255,0.85);' +
        'box-shadow:0 0 8px rgba(16,185,129,0.7);"></div>' +
        '<div style="flex:1;display:flex;gap:6px;">' +
          '<input id="rutaInputOrigen" type="text" value="' + getCasaNombre() + '"' +
          ' placeholder="Punto de partida..."' +
          ' style="flex:1;background:rgba(16,185,129,0.07);' +
          'border:1px solid rgba(16,185,129,0.22);color:#e2e8f0;' +
          'border-radius:8px;padding:7px 10px;font-size:.81rem;outline:none;"' +
          ' onkeydown="if(event.key===\'Enter\') actualizarOrigenManual()">' +
          '<button onclick="usarMiUbicacion()" title="GPS"' +
          ' style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);' +
          'color:rgba(16,185,129,0.85);border-radius:8px;padding:7px 9px;cursor:pointer;">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
            ' stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
              '<circle cx="12" cy="12" r="3"/>' +
              '<path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div style="padding-left:5px;display:flex;align-items:center;gap:8px;">' +
        '<div style="width:1.5px;height:12px;background:rgba(255,255,255,0.1);' +
        'border-radius:1px;margin-left:5px;"></div>' +
        '<span style="font-size:.58rem;color:rgba(255,255,255,0.2);' +
        'font-family:DM Mono,monospace;letter-spacing:.08em;">VÍA</span>' +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:9px;">' +
        '<div style="width:12px;height:12px;border-radius:50%;flex-shrink:0;' +
        'background:#ef4444;border:2px solid rgba(255,255,255,0.85);' +
        'box-shadow:0 0 8px rgba(239,68,68,0.7);"></div>' +
        '<div style="flex:1;display:flex;gap:6px;">' +
          '<input id="rutaInputDest" type="text"' +
          ' placeholder="¿A dónde vas? Escribe la dirección..."' +
          ' style="flex:1;background:rgba(239,68,68,0.07);' +
          'border:1px solid rgba(239,68,68,0.22);color:#e2e8f0;' +
          'border-radius:8px;padding:7px 10px;font-size:.81rem;outline:none;"' +
          ' onkeydown="if(event.key===\'Enter\') buscarDesdeCampo()">' +
          '<button onclick="buscarDesdeCampo()"' +
          ' style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.28);' +
          'color:rgba(0,212,255,0.9);border-radius:8px;padding:7px 14px;' +
          'cursor:pointer;font-size:.75rem;font-family:DM Mono,monospace;white-space:nowrap;">Ir →</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="padding:6px 14px;flex-shrink:0;background:rgba(0,0,0,0.15);' +
    'border-bottom:1px solid rgba(255,255,255,0.04);">' +
      '<span id="rutaEstado"' +
      ' style="font-family:DM Mono,monospace;font-size:.67rem;color:rgba(255,255,255,0.28);">' +
        'Ingresa un destino para trazar la ruta' +
      '</span>' +
    '</div>' +

    '<iframe id="rutaIframe" src="about:blank"' +
    ' style="flex:1;min-height:0;border:none;display:block;"' +
    ' allowfullscreen loading="lazy"></iframe>' +

    '<div id="rutaDestRecurrentes"' +
    ' style="padding:8px 14px;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-family:DM Mono,monospace;font-size:.58rem;' +
      'letter-spacing:.14em;color:rgba(255,255,255,0.2);margin-bottom:5px;">DESTINOS FRECUENTES</div>' +
      '<div id="rutaDestinosList"></div>' +
    '</div>' +

    '<div style="padding:7px 14px;background:rgba(0,0,0,0.25);flex-shrink:0;' +
    'border-top:1px solid rgba(255,255,255,0.05);' +
    'display:flex;gap:14px;align-items:center;">' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:9px;height:9px;border-radius:50%;' +
        'background:#10b981;border:1.5px solid rgba(255,255,255,0.7);"></div>' +
        '<span id="leyendaOrigen" style="font-size:.62rem;color:rgba(255,255,255,0.38);' +
        'font-family:DM Mono,monospace;">' + getCasaNombre() + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;">' +
        '<div style="width:9px;height:9px;border-radius:50%;' +
        'background:#ef4444;border:1.5px solid rgba(255,255,255,0.7);"></div>' +
        '<span id="leyendaDest" style="font-size:.62rem;color:rgba(255,255,255,0.38);' +
        'font-family:DM Mono,monospace;">Destino</span>' +
      '</div>' +
      '<div style="margin-left:auto;">' +
        '<span style="font-size:.6rem;color:rgba(255,255,255,0.2);' +
        'font-family:DM Mono,monospace;">© Google Maps</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(mapaPanel);
  setTimeout(function() { cargarMapa(); }, 300);
}

// ══════════════════════════════════════════════════════════════════════
// MAPA — Google Maps Embed
// ══════════════════════════════════════════════════════════════════════

function cargarMapa() {
  var origen  = _origenActual || (getCasaLat() + ',' + getCasaLng());
  var destino = _destinoActual;
  var iframe  = document.getElementById('rutaIframe');
  var estado  = document.getElementById('rutaEstado');
  var legDest = document.getElementById('leyendaDest');
  var legOrig = document.getElementById('leyendaOrigen');

  if (legOrig) legOrig.textContent = getCasaNombre();

  if (!destino) {
    var urlBase = 'https://maps.google.com/maps?q=' +
      encodeURIComponent(origen) + '&output=embed&z=14&hl=es';
    if (iframe) iframe.src = urlBase;
    if (estado) estado.textContent = 'Ingresa un destino para trazar la ruta';
    return;
  }

  var url = 'https://maps.google.com/maps?saddr=' +
    encodeURIComponent(origen) + '&daddr=' +
    encodeURIComponent(destino) + '&output=embed&hl=es';

  if (iframe) {
    iframe.src = 'about:blank';
    setTimeout(function() {
      iframe.src = url;
      if (legDest) legDest.textContent = destino.length > 28
        ? destino.slice(0, 28) + '...'
        : destino;
      // Calcular distancia si tenemos coords
      var dLat = window._rutaDestLat;
      var dLng = window._rutaDestLng;
      if (dLat && dLng && estado) {
        var oLat   = getCasaLat();
        var oLng   = getCasaLng();
        var distKm = calcularDistanciaKm(oLat, oLng, dLat, dLng);
        var min    = estimarTiempoMin(distKm);
        estado.textContent = '📍 ' + getCasaNombre() + ' → ' + destino +
          ' · 📏 ' + formatearDistancia(distKm) + ' · ⏱ ~' + formatearTiempo(min);
      } else if (estado) {
        estado.textContent = '📍 ' + getCasaNombre() + ' → ' + destino;
      }
    }, 100);
  }
}

function setEstado(msg) {
  var el = document.getElementById('rutaEstado');
  if (el) el.textContent = msg;
}

// ══════════════════════════════════════════════════════════════════════
// ACCIONES
// ══════════════════════════════════════════════════════════════════════

function buscarDesdeCampo() {
  var input = document.getElementById('rutaInputDest');
  var dest  = input ? input.value.trim() : '';
  if (!dest) return;
  _destinoActual = dest;
  guardarDestinoRecurrente(dest, getCasaNombre());
  cargarMapa();
  _rutaVoz('Mostrando ruta hacia ' + dest + '.');
}

function actualizarOrigenManual() {
  var input = document.getElementById('rutaInputOrigen');
  var valor = input ? input.value.trim() : '';
  if (!valor) return;
  _origenActual = valor;
  localStorage.setItem('scall_casa_nombre', valor);
  cargarMapa();
  _rutaVoz('Punto de partida actualizado a ' + valor + '.');
}

function usarMiUbicacion() {
  if (!navigator.geolocation) {
    _rutaVoz('Tu dispositivo no soporta geolocalización.');
    return;
  }
  setEstado('📡 Obteniendo GPS...');
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      localStorage.setItem('scall_casa_lat', lat);
      localStorage.setItem('scall_casa_lng', lng);
      localStorage.setItem('scall_casa_nombre', 'Mi ubicación actual');
      _origenActual = lat + ',' + lng;
      var input = document.getElementById('rutaInputOrigen');
      if (input) input.value = 'Mi ubicación actual';
      cargarMapa();
      _rutaVoz('Ubicación GPS actualizada como punto de partida.');
    },
    function() { setEstado('❌ No se pudo obtener el GPS'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function abrirEnGoogleMaps() {
  var oLat  = getCasaLat();
  var oLng  = getCasaLng();
  var dLat  = window._rutaDestLat;
  var dLng  = window._rutaDestLng;
  var dest  = _destinoActual;
  var url;
  if (dLat && dLng) {
    url = 'https://www.google.com/maps/dir/' + oLat + ',' + oLng + '/' + dLat + ',' + dLng;
  } else if (dest) {
    url = 'https://www.google.com/maps/dir/' + oLat + ',' + oLng + '/' + encodeURIComponent(dest);
  } else {
    url = 'https://www.google.com/maps/@' + oLat + ',' + oLng + ',15z';
  }
  window.open(url, '_blank');
}

// Registrar para el stub del <head>
window._rutasPanelListo = mostrarPanelRutas;

function _rutaLog(m) { if (typeof logMessage  === 'function') logMessage(m);  else console.log(m); }
function _rutaVoz(m) { if (typeof responderVoz === 'function') responderVoz(m); else console.warn('[VOZ]', m); }

} // fin guard _SCALL_RUTAS_LOADED
