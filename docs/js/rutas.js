// =====================================================================
// MÓDULO RUTAS — SCALL v2
// Panel de mapa con origen y destino claramente separados
// Motor: Leaflet + OpenStreetMap + OSRM (sin API Key, todo gratuito)
// =====================================================================

// ── Leer coordenadas siempre desde localStorage (dinámico) ───────────
function getCasaLat()    { return parseFloat(localStorage.getItem('scall_casa_lat'))    || 4.7110;  }
function getCasaLng()    { return parseFloat(localStorage.getItem('scall_casa_lng'))    || -74.0721; }
function getCasaNombre() { return localStorage.getItem('scall_casa_nombre') || 'Mi casa'; }
function getPais()       { return localStorage.getItem('scall_pais_rutas')  || 'Colombia'; }

// ── Estado del módulo ────────────────────────────────────────────────
let mapaPanel     = null;
let leafletMap    = null;
let rutaLayer     = null;
let leafletReady  = false;
let marcadorOrigen = null;
let marcadorDest   = null;
let _destinoActual = { lat: null, lng: null, nombre: '' };

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

async function navegarA(destino) {
  if (!destino || destino.trim().length < 3) {
    _rutaVoz('¿A dónde quieres ir? Di la dirección completa.');
    return;
  }
  _rutaLog(`[RUTAS] 🗺 Navegando a: "${destino}"`);

  mostrarPanelRutas();
  setInfoPanel('⏳ Buscando dirección...', '', '');

  // Actualizar campo de destino en la UI
  const inputDest = document.getElementById('rutaInputDest');
  if (inputDest) inputDest.value = destino;

  const coords = await geocodificar(destino);
  if (!coords) {
    setInfoPanel('❌ No se encontró la dirección', '', '');
    _rutaVoz(`No encontré la dirección: ${destino}. Intenta agregar el barrio o la ciudad.`);
    return;
  }

  _destinoActual = { lat: coords.lat, lng: coords.lng, nombre: destino };
  await esperarLeaflet();
  await trazarRuta(getCasaLat(), getCasaLng(), coords.lat, coords.lng, destino);
}

// ══════════════════════════════════════════════════════════════════════
// GEOCODIFICACIÓN — Nominatim
// ══════════════════════════════════════════════════════════════════════

async function geocodificar(dir) {
  const m = dir.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), display: dir };

  const q   = encodeURIComponent(`${dir}, ${getPais()}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1`;
  try {
    const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
  } catch (e) { _rutaLog(`[RUTAS] ❌ Geocoding: ${e.message}`); return null; }
}

// ══════════════════════════════════════════════════════════════════════
// ROUTING — OSRM
// ══════════════════════════════════════════════════════════════════════

async function obtenerRutaOSRM(oLat, oLng, dLat, dLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const r = data.routes[0];
    return {
      coords:    r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distancia: (r.distance / 1000).toFixed(1),
      duracion:  Math.round(r.duration / 60)
    };
  } catch (e) { _rutaLog(`[RUTAS] ❌ OSRM: ${e.message}`); return null; }
}

// ══════════════════════════════════════════════════════════════════════
// PANEL FLOTANTE — UI rediseñada
// ══════════════════════════════════════════════════════════════════════

function mostrarPanelRutas() {
  if (!mapaPanel) crearPanelRutas();
  mapaPanel.style.display = 'flex';
  // Sincronizar campo de origen con el valor guardado
  const inputOrigen = document.getElementById('rutaInputOrigen');
  if (inputOrigen) inputOrigen.value = getCasaNombre();
  if (!leafletReady) inicializarLeaflet();
}

function cerrarPanelRutas() {
  if (mapaPanel) mapaPanel.style.display = 'none';
}

function crearPanelRutas() {
  mapaPanel = document.createElement('div');
  mapaPanel.id = 'rutasPanel';
  mapaPanel.style.cssText = `
    position:fixed; top:60px; left:10px; right:10px;
    max-width:680px; margin:0 auto;
    height:calc(100dvh - 76px);
    background:#0d1117;
    border:1px solid rgba(0,212,255,0.18);
    border-radius:18px;
    box-shadow:0 20px 60px rgba(0,0,0,0.7);
    z-index:1100;
    display:flex; flex-direction:column;
    overflow:hidden;
    font-family:'Inter',sans-serif;
  `;

  mapaPanel.innerHTML = `

    <!-- ── Header ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 16px;background:rgba(0,212,255,0.05);
                border-bottom:1px solid rgba(0,212,255,0.12);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             stroke="rgba(0,212,255,0.85)" stroke-width="2" stroke-linecap="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        <span style="font-family:'DM Mono',monospace;font-size:.75rem;
                     letter-spacing:.1em;color:rgba(0,212,255,0.85);">NAVEGACIÓN · SCALL</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="abrirEnGoogleMaps()"
          style="background:transparent;border:1px solid rgba(0,212,255,0.25);
                 color:rgba(0,212,255,0.75);border-radius:7px;padding:4px 10px;
                 cursor:pointer;font-size:.68rem;font-family:'DM Mono',monospace;
                 letter-spacing:.05em;transition:all .2s;"
          onmouseover="this.style.background='rgba(0,212,255,0.1)'"
          onmouseout="this.style.background='transparent'">
          ↗ Google Maps
        </button>
        <button onclick="cerrarPanelRutas()"
          style="background:transparent;border:1px solid rgba(255,255,255,0.1);
                 color:rgba(255,255,255,0.45);width:28px;height:28px;border-radius:7px;
                 cursor:pointer;font-size:.85rem;transition:all .2s;"
          onmouseover="this.style.borderColor='rgba(239,68,68,.4)';this.style.color='#ef4444'"
          onmouseout="this.style.borderColor='rgba(255,255,255,.1)';this.style.color='rgba(255,255,255,.45)'">
          ✕
        </button>
      </div>
    </div>

    <!-- ── Origen / Destino ── -->
    <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;
                border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;
                background:rgba(0,0,0,0.2);">

      <!-- Origen -->
      <div style="display:flex;align-items:center;gap:10px;">
        <!-- Punto verde -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="width:12px;height:12px;border-radius:50%;
                      background:#10b981;border:2px solid rgba(255,255,255,0.8);
                      box-shadow:0 0 8px rgba(16,185,129,0.6);"></div>
        </div>
        <div style="flex:1;position:relative;">
          <input id="rutaInputOrigen" type="text"
            value="${getCasaNombre()}"
            placeholder="Punto de partida..."
            style="width:100%;background:rgba(16,185,129,0.08);
                   border:1px solid rgba(16,185,129,0.25);
                   color:#e2e8f0;border-radius:8px;padding:8px 36px 8px 12px;
                   font-size:.82rem;box-sizing:border-box;outline:none;
                   transition:border-color .2s;"
            onfocus="this.style.borderColor='rgba(16,185,129,0.6)'"
            onblur="this.style.borderColor='rgba(16,185,129,0.25)'"
            onkeydown="if(event.key==='Enter') actualizarOrigenManual()">
          <!-- Botón GPS -->
          <button onclick="usarMiUbicacion()"
            title="Usar mi ubicación GPS actual"
            style="position:absolute;right:6px;top:50%;transform:translateY(-50%);
                   background:none;border:none;cursor:pointer;
                   color:rgba(16,185,129,0.7);padding:2px;transition:color .2s;"
            onmouseover="this.style.color='#10b981'"
            onmouseout="this.style.color='rgba(16,185,129,0.7)'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <path d="M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Línea vertical conectora -->
      <div style="display:flex;align-items:center;gap:10px;padding-left:5px;">
        <div style="width:2px;height:14px;background:rgba(255,255,255,0.12);
                    border-radius:1px;margin-left:5px;"></div>
        <span style="font-size:.6rem;color:rgba(255,255,255,0.25);
                     font-family:'DM Mono',monospace;letter-spacing:.08em;">RUTA</span>
      </div>

      <!-- Destino -->
      <div style="display:flex;align-items:center;gap:10px;">
        <!-- Punto rojo -->
        <div style="flex-shrink:0;">
          <div style="width:12px;height:12px;border-radius:50%;
                      background:#ef4444;border:2px solid rgba(255,255,255,0.8);
                      box-shadow:0 0 8px rgba(239,68,68,0.6);"></div>
        </div>
        <div style="flex:1;display:flex;gap:6px;">
          <input id="rutaInputDest" type="text"
            placeholder="Escribe la dirección de destino..."
            style="flex:1;background:rgba(239,68,68,0.08);
                   border:1px solid rgba(239,68,68,0.25);
                   color:#e2e8f0;border-radius:8px;padding:8px 12px;
                   font-size:.82rem;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='rgba(239,68,68,0.6)'"
            onblur="this.style.borderColor='rgba(239,68,68,0.25)'"
            onkeydown="if(event.key==='Enter') buscarDesdeCampo()">
          <button onclick="buscarDesdeCampo()"
            style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);
                   color:rgba(0,212,255,0.9);border-radius:8px;padding:8px 14px;
                   cursor:pointer;font-size:.75rem;font-family:'DM Mono',monospace;
                   letter-spacing:.04em;white-space:nowrap;transition:all .2s;"
            onmouseover="this.style.background='rgba(0,212,255,0.18)'"
            onmouseout="this.style.background='rgba(0,212,255,0.1)'">
            Ir →
          </button>
        </div>
      </div>
    </div>

    <!-- ── Info de ruta ── -->
    <div id="rutaInfoBar" style="padding:8px 16px;flex-shrink:0;min-height:34px;
                                  border-bottom:1px solid rgba(255,255,255,0.05);
                                  display:flex;align-items:center;gap:12px;
                                  background:rgba(0,0,0,0.15);">
      <span id="rutaDistancia"
        style="font-family:'DM Mono',monospace;font-size:.7rem;
               color:rgba(0,212,255,0.7);display:none;">
      </span>
      <span id="rutaDuracion"
        style="font-family:'DM Mono',monospace;font-size:.7rem;
               color:rgba(16,185,129,0.7);display:none;">
      </span>
      <span id="rutaEstado"
        style="font-family:'DM Mono',monospace;font-size:.68rem;
               color:rgba(255,255,255,0.3);">
        Ingresa un destino para trazar la ruta
      </span>
    </div>

    <!-- ── Mapa ── -->
    <div id="leafletMap" style="flex:1;min-height:0;"></div>

    <!-- ── Leyenda ── -->
    <div style="padding:8px 16px;background:rgba(0,0,0,0.2);flex-shrink:0;
                border-top:1px solid rgba(255,255,255,0.05);
                display:flex;gap:16px;align-items:center;">
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#10b981;
                    border:1.5px solid white;"></div>
        <span style="font-size:.65rem;color:rgba(255,255,255,0.4);
                     font-family:'DM Mono',monospace;" id="leyendaOrigen">
          Origen
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;
                    border:1.5px solid white;"></div>
        <span style="font-size:.65rem;color:rgba(255,255,255,0.4);
                     font-family:'DM Mono',monospace;" id="leyendaDest">
          Destino
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-left:auto;">
        <div style="width:20px;height:2px;background:rgba(0,212,255,0.7);border-radius:1px;"></div>
        <span style="font-size:.65rem;color:rgba(255,255,255,0.4);
                     font-family:'DM Mono',monospace;">Ruta</span>
      </div>
    </div>
  `;

  document.body.appendChild(mapaPanel);

  // Leaflet CSS
  if (!document.getElementById('leaflet-css')) {
    const l = document.createElement('link');
    l.id = 'leaflet-css'; l.rel = 'stylesheet';
    l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(l);
  }

  // Estilos internos del mapa
  const style = document.createElement('style');
  style.textContent = `
    #rutasPanel .leaflet-control-attribution { font-size: 9px !important; }
    #rutasPanel .leaflet-popup-content-wrapper {
      background: #111827; color: #e2e8f0;
      border: 1px solid rgba(0,212,255,0.2); border-radius: 10px;
      font-family: 'Inter', sans-serif; font-size: 13px;
    }
    #rutasPanel .leaflet-popup-tip { background: #111827; }
    #rutasPanel .leaflet-popup-close-button { color: #64748b !important; }
    #rutasPanel .leaflet-tile { filter: brightness(0.88) saturate(0.7) hue-rotate(10deg); }
  `;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════════════════
// LEAFLET — inicialización y marcadores
// ══════════════════════════════════════════════════════════════════════

function inicializarLeaflet() {
  if (typeof L !== 'undefined') { _initMapa(); return; }
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.onload = () => _initMapa();
  document.head.appendChild(s);
}

function _mkIconOrigen() {
  return L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#10b981;border:2.5px solid white;
      box-shadow:0 0 10px rgba(16,185,129,0.8),0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize:[16,16], iconAnchor:[8,8], className:''
  });
}

function _mkIconDest() {
  return L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#ef4444;border:2.5px solid white;
      box-shadow:0 0 10px rgba(239,68,68,0.8),0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize:[16,16], iconAnchor:[8,8], className:''
  });
}

function _initMapa() {
  if (leafletMap) return;
  const el = document.getElementById('leafletMap');
  if (!el) return;

  const oLat = getCasaLat(), oLng = getCasaLng();

  leafletMap = L.map('leafletMap', {
    zoomControl: true,
    attributionControl: true
  }).setView([oLat, oLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://osm.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(leafletMap);

  // Marcador de origen
  marcadorOrigen = L.marker([oLat, oLng], { icon: _mkIconOrigen(), draggable: true })
    .addTo(leafletMap)
    .bindPopup(`<b>🏠 ${getCasaNombre()}</b><br>
      <span style="font-size:11px;color:#94a3b8;">Punto de partida</span><br>
      <span style="font-size:10px;color:#64748b;">${oLat.toFixed(5)}, ${oLng.toFixed(5)}</span>`);

  // Al arrastrar el marcador de origen → recalcular ruta
  marcadorOrigen.on('dragend', (e) => {
    const { lat, lng } = e.target.getLatLng();
    localStorage.setItem('scall_casa_lat', lat);
    localStorage.setItem('scall_casa_lng', lng);
    marcadorOrigen.setPopupContent(
      `<b>🏠 ${getCasaNombre()}</b><br>
       <span style="font-size:11px;color:#94a3b8;">Punto de partida (arrastrado)</span><br>
       <span style="font-size:10px;color:#64748b;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`
    );
    actualizarLeyendaOrigen(getCasaNombre());
    if (_destinoActual.lat) {
      trazarRuta(lat, lng, _destinoActual.lat, _destinoActual.lng, _destinoActual.nombre);
    }
    _rutaLog(`[RUTAS] 📍 Origen movido a: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  });

  leafletReady = true;
  _rutaLog('[RUTAS] ✅ Mapa inicializado');
}

function esperarLeaflet() {
  return new Promise(resolve => {
    const t = setInterval(() => {
      if (leafletReady && leafletMap) { clearInterval(t); resolve(); }
    }, 200);
    setTimeout(() => { clearInterval(t); resolve(); }, 10000);
  });
}

// ══════════════════════════════════════════════════════════════════════
// TRAZAR RUTA
// ══════════════════════════════════════════════════════════════════════

async function trazarRuta(oLat, oLng, dLat, dLng, nombreDest) {
  setEstado('Calculando ruta...');

  // Actualizar marcador de origen (por si cambió)
  if (marcadorOrigen) {
    marcadorOrigen.setLatLng([oLat, oLng]);
    marcadorOrigen.setPopupContent(
      `<b>🏠 ${getCasaNombre()}</b><br>
       <span style="font-size:11px;color:#94a3b8;">Punto de partida</span><br>
       <span style="font-size:10px;color:#64748b;">${oLat.toFixed(5)}, ${oLng.toFixed(5)}</span>`
    );
  }

  // Marcador de destino
  if (marcadorDest) marcadorDest.remove();
  marcadorDest = L.marker([dLat, dLng], { icon: _mkIconDest() })
    .addTo(leafletMap)
    .bindPopup(
      `<b>📍 ${nombreDest}</b><br>
       <span style="font-size:11px;color:#94a3b8;">Destino</span><br>
       <span style="font-size:10px;color:#64748b;">${dLat.toFixed(5)}, ${dLng.toFixed(5)}</span>`
    );

  actualizarLeyendaOrigen(getCasaNombre());
  actualizarLeyendaDest(nombreDest);

  // Ruta OSRM
  const ruta = await obtenerRutaOSRM(oLat, oLng, dLat, dLng);

  if (rutaLayer) { rutaLayer.remove(); rutaLayer = null; }

  if (ruta) {
    // Línea de ruta con borde para visibilidad
    const sombra = L.polyline(ruta.coords, { color: '#000', weight: 7, opacity: 0.25 }).addTo(leafletMap);
    rutaLayer    = L.polyline(ruta.coords, { color: '#00d4ff', weight: 4, opacity: 0.9 }).addTo(leafletMap);

    const bounds = rutaLayer.getBounds();
    leafletMap.fitBounds(bounds, { padding: [50, 50] });

    // Info bar
    mostrarInfoRuta(ruta.distancia, ruta.duracion, nombreDest);
    setEstado('');

    // Voz
    _rutaVoz(`Ruta lista. ${ruta.distancia} kilómetros, aproximadamente ${ruta.duracion} minutos en carro.`);
    _rutaLog(`[RUTAS] ✅ ${ruta.distancia}km · ${ruta.duracion}min → ${nombreDest}`);

    // Abrir popup del destino
    setTimeout(() => marcadorDest?.openPopup(), 600);

  } else {
    // Línea recta de referencia si OSRM falla
    rutaLayer = L.polyline([[oLat, oLng], [dLat, dLng]], {
      color: '#f59e0b', weight: 2.5, opacity: 0.7, dashArray: '10 6'
    }).addTo(leafletMap);
    leafletMap.fitBounds(rutaLayer.getBounds(), { padding: [50, 50] });
    setEstado('⚠️ Ruta aproximada — sin datos de carretera');
    _rutaVoz('Encontré la ubicación pero no pude calcular la ruta exacta. Te muestro el destino en el mapa.');
    setTimeout(() => marcadorDest?.openPopup(), 600);
  }

  // Guardar destino para Google Maps
  window._rutaDestLat = dLat;
  window._rutaDestLng = dLng;
  window._rutaDestNombre = nombreDest;
}

// ══════════════════════════════════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════════════════════════════════

function mostrarInfoRuta(distancia, duracion, dest) {
  const elDist = document.getElementById('rutaDistancia');
  const elDur  = document.getElementById('rutaDuracion');
  const elEst  = document.getElementById('rutaEstado');

  if (elDist) { elDist.textContent = `📏 ${distancia} km`; elDist.style.display = 'inline'; }
  if (elDur)  { elDur.textContent  = `⏱ ~${duracion} min`; elDur.style.display  = 'inline'; }
  if (elEst)  { elEst.textContent  = `→ ${dest}`; }
}

function setEstado(msg) {
  const el = document.getElementById('rutaEstado');
  if (el) el.textContent = msg;
  if (!msg) return;
  const elDist = document.getElementById('rutaDistancia');
  const elDur  = document.getElementById('rutaDuracion');
  if (elDist) elDist.style.display = 'none';
  if (elDur)  elDur.style.display  = 'none';
}

function actualizarLeyendaOrigen(nombre) {
  const el = document.getElementById('leyendaOrigen');
  if (el) el.textContent = nombre || 'Origen';
}

function actualizarLeyendaDest(nombre) {
  const el = document.getElementById('leyendaDest');
  if (el) el.textContent = nombre ? (nombre.length > 22 ? nombre.slice(0,22)+'…' : nombre) : 'Destino';
}

// ══════════════════════════════════════════════════════════════════════
// ACCIONES
// ══════════════════════════════════════════════════════════════════════

async function buscarDesdeCampo() {
  const inputDest = document.getElementById('rutaInputDest');
  const dest = inputDest?.value.trim();
  if (!dest) return;
  _destinoActual = { lat: null, lng: null, nombre: dest };
  await navegarA(dest);
}

async function actualizarOrigenManual() {
  const input = document.getElementById('rutaInputOrigen');
  const valor = input?.value.trim();
  if (!valor) return;

  setEstado('Buscando origen...');
  const coords = await geocodificar(valor);
  if (!coords) { setEstado('❌ No se encontró el origen'); return; }

  localStorage.setItem('scall_casa_lat', coords.lat);
  localStorage.setItem('scall_casa_lng', coords.lng);
  localStorage.setItem('scall_casa_nombre', valor);

  if (marcadorOrigen) {
    marcadorOrigen.setLatLng([coords.lat, coords.lng]);
    leafletMap.setView([coords.lat, coords.lng], 14);
  }
  setEstado('');
  actualizarLeyendaOrigen(valor);
  _rutaVoz(`Punto de partida actualizado a ${valor}.`);

  if (_destinoActual.lat) {
    await trazarRuta(coords.lat, coords.lng, _destinoActual.lat, _destinoActual.lng, _destinoActual.nombre);
  }
}

function usarMiUbicacion() {
  if (!navigator.geolocation) {
    _rutaVoz('Tu dispositivo no soporta geolocalización.');
    return;
  }
  setEstado('📡 Obteniendo GPS...');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      localStorage.setItem('scall_casa_lat', lat);
      localStorage.setItem('scall_casa_lng', lng);
      localStorage.setItem('scall_casa_nombre', 'Mi ubicación actual');

      const input = document.getElementById('rutaInputOrigen');
      if (input) input.value = 'Mi ubicación actual';

      if (marcadorOrigen) {
        marcadorOrigen.setLatLng([lat, lng]);
        marcadorOrigen.setPopupContent(
          `<b>📡 Mi ubicación actual</b><br>
           <span style="font-size:10px;color:#64748b;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`
        );
      }
      leafletMap?.setView([lat, lng], 15);
      actualizarLeyendaOrigen('Mi ubicación actual');
      setEstado('');
      _rutaVoz('Ubicación GPS actualizada como punto de partida.');
      _rutaLog(`[RUTAS] 📡 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

      if (_destinoActual.lat) {
        await trazarRuta(lat, lng, _destinoActual.lat, _destinoActual.lng, _destinoActual.nombre);
      }
    },
    () => {
      setEstado('❌ No se pudo obtener el GPS');
      _rutaVoz('No pude obtener tu ubicación. Verifica los permisos del navegador.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function abrirEnGoogleMaps() {
  const oLat = getCasaLat(), oLng = getCasaLng();
  const dLat = window._rutaDestLat, dLng = window._rutaDestLng;
  const nombre = window._rutaDestNombre;

  let url;
  if (dLat && dLng) {
    url = `https://www.google.com/maps/dir/${oLat},${oLng}/${dLat},${dLng}`;
  } else {
    url = `https://www.google.com/maps/@${oLat},${oLng},15z`;
  }
  window.open(url, '_blank');
  _rutaLog(`[RUTAS] ↗ Abriendo Google Maps`);
}

function configurarCasa(lat, lng, nombre) {
  localStorage.setItem('scall_casa_lat', lat);
  localStorage.setItem('scall_casa_lng', lng);
  if (nombre) localStorage.setItem('scall_casa_nombre', nombre);
  _rutaVoz(`Punto de partida actualizado${nombre ? ' a ' + nombre : ''}.`);
}

function _rutaLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _rutaVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }
