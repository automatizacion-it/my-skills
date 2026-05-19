// =====================================================================
// MÓDULO RUTAS — SCALL
// Navegación desde tu casa hasta donde el usuario indique
// Motor: Leaflet + OpenStreetMap + OSRM (todo gratuito, sin API Key)
// =====================================================================

// ── Origen fijo: tu casa ─────────────────────────────────────────────
// Cambia estas coordenadas a las tuyas una sola vez
const CASA_LAT  = parseFloat(localStorage.getItem('scall_casa_lat'))  || 4.7110;
const CASA_LNG  = parseFloat(localStorage.getItem('scall_casa_lng'))  || -74.0721;
const CASA_NOMBRE = localStorage.getItem('scall_casa_nombre') || 'Mi casa';

// Estado del módulo
let mapaPanel    = null;
let leafletMap   = null;
let rutaLayer    = null;
let leafletReady = false;
let marcadorCasa = null;
let marcadorDest = null;

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — abre el panel y traza la ruta
// destino: string con dirección o "lat,lng"
// ══════════════════════════════════════════════════════════════════════

async function navegarA(destino) {
  if (!destino || destino.trim().length < 3) {
    _rutaVoz('¿A dónde quieres ir? Di la dirección completa.');
    return;
  }

  _rutaLog(`[RUTAS] 🗺 Navegando a: "${destino}"`);
  _rutaVoz(`Buscando ruta hacia ${destino}.`);

  mostrarPanelRutas();

  // Geocodificar destino con Nominatim (OpenStreetMap, gratuito)
  const coords = await geocodificar(destino);
  if (!coords) {
    _rutaVoz(`No encontré la dirección: ${destino}. Intenta ser más específico.`);
    mostrarMensajePanel('No se encontró la dirección. Intenta incluir ciudad o barrio.');
    return;
  }

  await esperarLeaflet();
  trazarRuta(CASA_LAT, CASA_LNG, coords.lat, coords.lng, destino, coords.display);
}

// ══════════════════════════════════════════════════════════════════════
// GEOCODIFICACIÓN — Nominatim (OpenStreetMap)
// ══════════════════════════════════════════════════════════════════════

async function geocodificar(direccion) {
  // Si ya es "lat,lng" parsear directamente
  const coordMatch = direccion.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), display: direccion };
  }

  // Agregar país para mejorar precisión
  const pais = localStorage.getItem('scall_pais_rutas') || 'Colombia';
  const query = encodeURIComponent(`${direccion}, ${pais}`);
  const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

  try {
    mostrarMensajePanel('Buscando dirección...');
    const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name
    };
  } catch (e) {
    _rutaLog(`[RUTAS] ❌ Error geocodificando: ${e.message}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════
// RUTA — OSRM (Open Source Routing Machine, gratuito)
// ══════════════════════════════════════════════════════════════════════

async function obtenerRutaOSRM(oLat, oLng, dLat, dLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=false`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const ruta = data.routes[0];
    return {
      coords:    ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distancia: (ruta.distance / 1000).toFixed(1),
      duracion:  Math.round(ruta.duration / 60)
    };
  } catch (e) {
    _rutaLog(`[RUTAS] ❌ Error OSRM: ${e.message}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════
// PANEL FLOTANTE DE MAPA
// ══════════════════════════════════════════════════════════════════════

function mostrarPanelRutas(forzar = false) {
  if (!mapaPanel) crearPanelRutas();
  mapaPanel.style.display = 'flex';
  if (!leafletReady) inicializarLeaflet();
}

function cerrarPanelRutas() {
  if (mapaPanel) mapaPanel.style.display = 'none';
}

function crearPanelRutas() {
  mapaPanel = document.createElement('div');
  mapaPanel.id = 'rutasPanel';
  mapaPanel.style.cssText = `
    position: fixed;
    top: 64px; left: 12px; right: 12px;
    max-width: 680px; margin: 0 auto;
    height: calc(100dvh - 80px);
    background: var(--surface, #111827);
    border: 1px solid rgba(0,212,255,0.2);
    border-radius: 18px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6);
    z-index: 1100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-body, sans-serif);
  `;

  mapaPanel.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);
                flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="rgba(0,212,255,0.8)" stroke-width="1.5" stroke-linecap="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        <span style="font-family:var(--font-mono,monospace);font-size:.78rem;
                     letter-spacing:.06em;color:var(--text,#e2e8f0);">NAVEGACIÓN</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="rutaGmapsBtn" onclick="abrirEnGoogleMaps()"
          style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);
                 color:rgba(0,212,255,0.8);border-radius:8px;padding:5px 10px;
                 cursor:pointer;font-size:.7rem;font-family:var(--font-mono,monospace);">
          Google Maps ↗
        </button>
        <button onclick="cerrarPanelRutas()"
          style="background:var(--surface2,#1a2236);border:1px solid rgba(255,255,255,0.08);
                 color:var(--text-muted,#64748b);width:28px;height:28px;border-radius:8px;
                 cursor:pointer;font-size:.85rem;">✕</button>
      </div>
    </div>

    <!-- Info de ruta -->
    <div id="rutaInfo" style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);
                               flex-shrink:0;min-height:42px;">
      <span id="rutaInfoTexto" style="font-size:.78rem;color:var(--text-muted,#64748b);
                                       font-family:var(--font-mono,monospace);">
        Iniciando mapa...
      </span>
    </div>

    <!-- Buscador manual -->
    <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);
                flex-shrink:0;display:flex;gap:8px;">
      <input id="rutaInputDir" type="text" placeholder="Escribe una dirección..."
        style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
               color:var(--text,#e2e8f0);border-radius:8px;padding:8px 12px;
               font-size:.82rem;font-family:var(--font-body,sans-serif);"
        onkeydown="if(event.key==='Enter') buscarDesdeCampo()">
      <button onclick="buscarDesdeCampo()"
        style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);
               color:rgba(0,212,255,0.9);border-radius:8px;padding:8px 14px;
               cursor:pointer;font-size:.78rem;white-space:nowrap;">
        Ir
      </button>
      <button onclick="usarMiUbicacion()"
        style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);
               color:rgba(16,185,129,0.9);border-radius:8px;padding:8px 10px;
               cursor:pointer;font-size:.78rem;" title="Usar mi ubicación actual">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
        </svg>
      </button>
    </div>

    <!-- Mapa -->
    <div id="leafletMap" style="flex:1;min-height:0;"></div>
  `;

  document.body.appendChild(mapaPanel);

  // Cargar Leaflet CSS
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id   = 'leaflet-css';
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

// ── Inicializar Leaflet ───────────────────────────────────────────────

function inicializarLeaflet() {
  if (typeof L !== 'undefined') {
    _initMapa();
    return;
  }
  const script = document.createElement('script');
  script.src   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => _initMapa();
  document.head.appendChild(script);
}

function _initMapa() {
  if (leafletMap) return;
  const el = document.getElementById('leafletMap');
  if (!el) return;

  leafletMap = L.map('leafletMap', { zoomControl: true }).setView([CASA_LAT, CASA_LNG], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap);

  // Marcador de casa
  const iconoCasa = L.divIcon({
    html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;
                        border:2px solid white;box-shadow:0 0 6px rgba(16,185,129,0.6);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], className: ''
  });
  marcadorCasa = L.marker([CASA_LAT, CASA_LNG], { icon: iconoCasa })
    .addTo(leafletMap)
    .bindPopup(`<b>${CASA_NOMBRE}</b><br>Punto de partida`);

  leafletReady = true;
  _rutaLog('[RUTAS] ✅ Mapa Leaflet inicializado');
}

function esperarLeaflet() {
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (leafletReady && leafletMap) { clearInterval(check); resolve(); }
    }, 200);
    setTimeout(() => { clearInterval(check); resolve(); }, 8000);
  });
}

// ── Trazar ruta en el mapa ────────────────────────────────────────────

async function trazarRuta(oLat, oLng, dLat, dLng, nombreDest, displayDest) {
  mostrarMensajePanel('Calculando ruta...');

  // Actualizar marcador de destino
  if (marcadorDest) marcadorDest.remove();
  const iconoDest = L.divIcon({
    html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;
                        border:2px solid white;box-shadow:0 0 6px rgba(239,68,68,0.6);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], className: ''
  });
  marcadorDest = L.marker([dLat, dLng], { icon: iconoDest })
    .addTo(leafletMap)
    .bindPopup(`<b>${nombreDest}</b>`);

  // Obtener ruta OSRM
  const ruta = await obtenerRutaOSRM(oLat, oLng, dLat, dLng);

  if (ruta) {
    // Limpiar ruta anterior
    if (rutaLayer) rutaLayer.remove();
    rutaLayer = L.polyline(ruta.coords, {
      color: '#00d4ff', weight: 4, opacity: 0.85,
      dashArray: null
    }).addTo(leafletMap);

    // Ajustar vista
    leafletMap.fitBounds(rutaLayer.getBounds(), { padding: [40, 40] });

    // Mostrar info
    const info = `📍 ${CASA_NOMBRE} → ${nombreDest} · ${ruta.distancia} km · ~${ruta.duracion} min`;
    document.getElementById('rutaInfoTexto').textContent = info;

    // Voz con la info
    _rutaVoz(`Ruta lista. ${ruta.distancia} kilómetros, aproximadamente ${ruta.duracion} minutos en carro.`);
    _rutaLog(`[RUTAS] ✅ Ruta: ${ruta.distancia}km, ${ruta.duracion}min`);

    // Guardar para abrir en Google Maps
    window._rutaDestLat = dLat;
    window._rutaDestLng = dLng;
    window._rutaDestNombre = nombreDest;

  } else {
    // Sin ruta OSRM — trazar línea recta de referencia
    if (rutaLayer) rutaLayer.remove();
    rutaLayer = L.polyline([[oLat, oLng], [dLat, dLng]], {
      color: '#f59e0b', weight: 2, opacity: 0.7, dashArray: '8 6'
    }).addTo(leafletMap);
    leafletMap.fitBounds(rutaLayer.getBounds(), { padding: [40, 40] });
    document.getElementById('rutaInfoTexto').textContent =
      `📍 ${nombreDest} (ruta aproximada — sin datos de carretera)`;
    _rutaVoz('Encontré la ubicación pero no pude calcular la ruta exacta. Te muestro la dirección en el mapa.');

    window._rutaDestLat = dLat;
    window._rutaDestLng = dLng;
    window._rutaDestNombre = nombreDest;
  }
}

// ── Buscar desde el campo manual ──────────────────────────────────────

async function buscarDesdeCampo() {
  const input = document.getElementById('rutaInputDir');
  if (!input || !input.value.trim()) return;
  await navegarA(input.value.trim());
}

// ── Usar ubicación actual del dispositivo ────────────────────────────

function usarMiUbicacion() {
  if (!navigator.geolocation) {
    _rutaVoz('Tu dispositivo no soporta geolocalización.');
    return;
  }
  mostrarMensajePanel('Obteniendo tu ubicación GPS...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      localStorage.setItem('scall_casa_lat', lat);
      localStorage.setItem('scall_casa_lng', lng);
      if (leafletMap) {
        leafletMap.setView([lat, lng], 15);
        if (marcadorCasa) marcadorCasa.setLatLng([lat, lng]);
      }
      mostrarMensajePanel(`📍 Ubicación actualizada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      _rutaVoz('Ubicación GPS actualizada. Ahora uso tu posición actual como punto de partida.');
      _rutaLog(`[RUTAS] 📍 GPS: ${lat}, ${lng}`);
    },
    (err) => {
      mostrarMensajePanel('No se pudo obtener la ubicación GPS.');
      _rutaVoz('No pude obtener tu ubicación. Verifica los permisos del navegador.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ── Abrir en Google Maps ──────────────────────────────────────────────

function abrirEnGoogleMaps(destino) {
  const dLat  = window._rutaDestLat;
  const dLng  = window._rutaDestLng;
  const oLat  = parseFloat(localStorage.getItem('scall_casa_lat')) || CASA_LAT;
  const oLng  = parseFloat(localStorage.getItem('scall_casa_lng')) || CASA_LNG;

  let url;
  if (dLat && dLng) {
    url = `https://www.google.com/maps/dir/${oLat},${oLng}/${dLat},${dLng}`;
  } else if (destino) {
    url = `https://www.google.com/maps/dir/${oLat},${oLng}/${encodeURIComponent(destino)}`;
  } else {
    url = `https://www.google.com/maps/@${oLat},${oLng},15z`;
  }
  window.open(url, '_blank');
  _rutaLog(`[RUTAS] ↗ Abriendo Google Maps`);
}

// ── Configurar coordenadas de casa ───────────────────────────────────

function configurarCasa(lat, lng, nombre) {
  localStorage.setItem('scall_casa_lat', lat);
  localStorage.setItem('scall_casa_lng', lng);
  if (nombre) localStorage.setItem('scall_casa_nombre', nombre);
  _rutaVoz(`Punto de partida actualizado a ${nombre || 'tu casa'}.`);
  _rutaLog(`[RUTAS] 🏠 Casa: ${lat}, ${lng}`);
}

// ── Helpers ───────────────────────────────────────────────────────────

function mostrarMensajePanel(msg) {
  const el = document.getElementById('rutaInfoTexto');
  if (el) el.textContent = msg;
}

function _rutaLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _rutaVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }
