// =====================================================================
// MÓDULO RUTAS — SCALL v3
// Motor: Google Maps Embed (iframe) + Google Maps URL
// Sin API Key, sin fetch externo — funciona en cualquier red
// =====================================================================

// ── Leer coordenadas siempre dinámico desde localStorage ────────────
function getCasaLat()    { return parseFloat(localStorage.getItem('scall_casa_lat'))    || 4.7110;   }
function getCasaLng()    { return parseFloat(localStorage.getItem('scall_casa_lng'))    || -74.0721; }
function getCasaNombre() { return localStorage.getItem('scall_casa_nombre') || 'Mi casa'; }

const DESTINOS_KEY = 'scall_destinos_recurrentes';

// ── Historial de destinos recurrentes ────────────────────────────────
function getDestinosRecurrentes() {
  try { return JSON.parse(localStorage.getItem(DESTINOS_KEY)) || []; }
  catch { return []; }
}

function guardarDestinoRecurrente(nombre, origen) {
  const lista = getDestinosRecurrentes();
  const idx   = lista.findIndex(d =>
    d.nombre.toLowerCase() === nombre.toLowerCase()
  );
  if (idx >= 0) {
    lista[idx].veces++;
    lista[idx].ultimaVez = new Date().toLocaleDateString('es-CO');
    lista[idx].origen    = origen || getCasaNombre();
  } else {
    lista.unshift({
      nombre,
      origen:    origen || getCasaNombre(),
      veces:     1,
      ultimaVez: new Date().toLocaleDateString('es-CO')
    });
  }
  lista.sort((a, b) => b.veces - a.veces);
  localStorage.setItem(DESTINOS_KEY, JSON.stringify(lista.slice(0, 10)));
  _rutaLog('[RUTAS] Destino guardado: "' + nombre + '"');
}

// ── Haversine: distancia real entre dos puntos GPS ───────────────────
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
               Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 30 km/h promedio ciudad colombiana con tráfico
function estimarTiempoMin(distanciaKm) {
  return Math.ceil((distanciaKm / 30) * 60);
}

function formatearDistancia(km) {
  if (km < 1) return Math.round(km * 1000) + ' metros';
  return km.toFixed(1) + ' kilómetros';
}

function formatearTiempo(minutos) {
  if (minutos < 60) return minutos + ' minuto' + (minutos !== 1 ? 's' : '');
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return h + ' hora' + (h !== 1 ? 's' : '');
  return h + ' hora' + (h !== 1 ? 's' : '') + ' y ' + m + ' minuto' + (m !== 1 ? 's' : '');
}

// ── Informe completo de ruta por voz ────────────────────────────────
function informarRutaVoz() {
  const oNombre = getCasaNombre();
  if (!_destinoActual) {
    _rutaVoz('No hay destino activo. Di: llévame a, seguido de la dirección.');
    return;
  }
  const oLat = parseFloat(localStorage.getItem('scall_casa_lat')) || getCasaLat();
  const oLng = parseFloat(localStorage.getItem('scall_casa_lng')) || getCasaLng();
  const dLat = window._rutaDestLat;
  const dLng = window._rutaDestLng;

  let msg;
  if (dLat && dLng) {
    const distKm  = calcularDistanciaKm(oLat, oLng, dLat, dLng);
    const minutos = estimarTiempoMin(distKm);
    msg = 'Ruta desde ' + oNombre + ' hasta ' + _destinoActual + '. ' +
          'Distancia aproximada: ' + formatearDistancia(distKm) + '. ' +
          'Tiempo estimado en carro: ' + formatearTiempo(minutos) + ' con tráfico normal.';
    // Actualizar barra del panel
    const el = document.getElementById('rutaEstado');
    if (el) el.textContent = '📏 ' + formatearDistancia(distKm) + ' · ⏱ ~' + formatearTiempo(minutos);
    _rutaLog('[RUTAS] Informe: ' + formatearDistancia(distKm) + ' · ' + formatearTiempo(minutos));
  } else {
    msg = 'La ruta activa es desde ' + oNombre + ' hasta ' + _destinoActual + '. ' +
          'Abre el mapa y presiona Ir para calcular la distancia exacta.';
  }
  _rutaVoz(msg);
}

// ── Listar destinos recurrentes por voz ──────────────────────────────
function listarDestinosRecurrentesVoz() {
  const lista = getDestinosRecurrentes();
  if (lista.length === 0) {
    _rutaVoz('No tienes destinos guardados aún. Cada vez que navegues a un lugar lo recordaré.');
    return;
  }
  const top3 = lista.slice(0, 3)
    .map(d => d.nombre + ' — ' + d.veces + ' vez' + (d.veces > 1 ? 'es' : ''))
    .join(', ');
  _rutaVoz('Tus destinos más frecuentes son: ' + top3 + '.');
}


// ── Estado ───────────────────────────────────────────────────────────
let mapaPanel       = null;
let _destinoActual  = '';
let _origenActual   = '';

// ══════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

async function navegarA(destino) {
  if (!destino || destino.trim().length < 3) {
    _rutaVoz('¿A dónde quieres ir? Di la dirección completa.');
    return;
  }

  _destinoActual = destino.trim();
  guardarDestinoRecurrente(_destinoActual, getCasaNombre());
  _rutaLog(`[RUTAS] 🗺 Navegando a: "${_destinoActual}"`);

  mostrarPanelRutas();

  const inputDest = document.getElementById('rutaInputDest');
  if (inputDest) inputDest.value = _destinoActual;

  cargarMapa();
  _rutaVoz(`Mostrando ruta hacia ${_destinoActual}.`);
}

// ══════════════════════════════════════════════════════════════════════
// MOTOR DE MAPA — Google Maps Embed (sin API Key)
// ══════════════════════════════════════════════════════════════════════

function cargarMapa() {
  const origen  = _origenActual || `${getCasaLat()},${getCasaLng()}`;
  const destino = _destinoActual;
  const iframe  = document.getElementById('rutaIframe');
  const estado  = document.getElementById('rutaEstado');

  if (!destino) {
    // Solo mostrar el mapa centrado en el origen
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(origen)}&output=embed&z=14&hl=es`;
    if (iframe) iframe.src = url;
    if (estado) estado.textContent = 'Ingresa un destino para trazar la ruta';
    actualizarInfoBar('', '');
    return;
  }

  // URL de ruta embebida — Google Maps Directions embed
  const url = `https://maps.google.com/maps?saddr=${encodeURIComponent(origen)}&daddr=${encodeURIComponent(destino)}&output=embed&hl=es`;

  if (iframe) {
    iframe.src = 'about:blank';
    setTimeout(() => {
      iframe.src = url;
      // Calcular y mostrar distancia estimada
      const oLat  = parseFloat(localStorage.getItem('scall_casa_lat')) || getCasaLat();
      const oLng  = parseFloat(localStorage.getItem('scall_casa_lng')) || getCasaLng();
      const dLat  = window._rutaDestLat;
      const dLng  = window._rutaDestLng;
      if (dLat && dLng) {
        const distKm  = calcularDistanciaKm(oLat, oLng, dLat, dLng);
        const minutos = estimarTiempoMin(distKm);
        if (estado) estado.textContent =
          `📍 ${getCasaNombre()} → ${destino} · 📏 ${formatearDistancia(distKm)} · ⏱ ~${formatearTiempo(minutos)}`;
      } else {
        if (estado) estado.textContent = `📍 ${getCasaNombre()} → ${destino}`;
      }
    }, 100);
  }
  actualizarInfoBar(getCasaNombre(), destino);
}

function actualizarInfoBar(origen, destino) {
  const elOrig = document.getElementById('leyendaOrigen');
  const elDest = document.getElementById('leyendaDest');
  if (elOrig) elOrig.textContent = origen || getCasaNombre();
  if (elDest) elDest.textContent = destino
    ? (destino.length > 28 ? destino.slice(0,28)+'…' : destino)
    : 'Destino';
}

// ══════════════════════════════════════════════════════════════════════
// PANEL FLOTANTE
// ══════════════════════════════════════════════════════════════════════

function mostrarPanelRutas() {
  if (!mapaPanel) crearPanelRutas();
  mapaPanel.style.display = 'flex';
  const inputOrigen = document.getElementById('rutaInputOrigen');
  if (inputOrigen) inputOrigen.value = getCasaNombre();
  if (!_destinoActual) cargarMapa();
  renderDestinosRecurrentes();
}

function renderDestinosRecurrentes() {
  const el = document.getElementById('rutaDestinosList');
  if (!el) return;
  const lista = getDestinosRecurrentes();
  if (lista.length === 0) {
    el.innerHTML = '<span style="font-size:.62rem;color:rgba(255,255,255,0.18);' +
      'font-family:var(--font-mono,monospace);">Sin destinos aun</span>';
    return;
  }
  el.innerHTML = lista.slice(0, 5).map(function(d) {
    var nom = d.nombre.length > 22 ? d.nombre.slice(0,22)+'...' : d.nombre;
    var safe = d.nombre.replace(/"/g, '&quot;');
    return '<button onclick="navegarA(&quot;' + safe + '&quot;)" ' +
      'style="display:inline-flex;align-items:center;gap:5px;' +
      'background:rgba(0,212,255,0.06);' +
      'border:1px solid rgba(0,212,255,0.15);' +
      'border-radius:6px;padding:4px 8px;' +
      'cursor:pointer;font-size:.64rem;' +
      'font-family:var(--font-mono,monospace);' +
      'color:rgba(0,212,255,0.7);' +
      'margin:0 4px 4px 0;transition:all .15s;">' +
      '<svg width="9" height="9" viewBox="0 0 24 24" fill="none"' +
      ' stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' +
      nom +
      '<span style="color:rgba(255,255,255,0.2);font-size:.55rem;">' + d.veces + 'x</span>' +
      '</button>';
  }).join('');
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

    <!-- Header -->
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
      <div style="display:flex;gap:6px;align-items:center;">
        <button onclick="abrirEnGoogleMaps()"
          style="background:transparent;border:1px solid rgba(0,212,255,0.25);
                 color:rgba(0,212,255,0.75);border-radius:7px;padding:5px 10px;
                 cursor:pointer;font-size:.68rem;font-family:'DM Mono',monospace;">
          ↗ Abrir Maps
        </button>
        <button onclick="cerrarPanelRutas()"
          style="background:transparent;border:1px solid rgba(255,255,255,0.1);
                 color:rgba(255,255,255,0.45);width:28px;height:28px;border-radius:7px;
                 cursor:pointer;font-size:.85rem;">✕</button>
      </div>
    </div>

    <!-- Origen / Destino -->
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:7px;
                border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;
                background:rgba(0,0,0,0.25);">

      <!-- Origen -->
      <div style="display:flex;align-items:center;gap:9px;">
        <div style="flex-shrink:0;">
          <div style="width:12px;height:12px;border-radius:50%;
                      background:#10b981;border:2px solid rgba(255,255,255,0.85);
                      box-shadow:0 0 8px rgba(16,185,129,0.7);"></div>
        </div>
        <div style="flex:1;display:flex;gap:6px;">
          <input id="rutaInputOrigen" type="text"
            value="${getCasaNombre()}"
            placeholder="Punto de partida..."
            style="flex:1;background:rgba(16,185,129,0.07);
                   border:1px solid rgba(16,185,129,0.22);
                   color:#e2e8f0;border-radius:8px;padding:7px 10px;
                   font-size:.81rem;outline:none;"
            onkeydown="if(event.key==='Enter') actualizarOrigenManual()">
          <button onclick="usarMiUbicacion()" title="GPS actual"
            style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);
                   color:rgba(16,185,129,0.85);border-radius:8px;padding:7px 9px;
                   cursor:pointer;flex-shrink:0;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Conector visual -->
      <div style="padding-left:5px;display:flex;align-items:center;gap:8px;">
        <div style="width:1.5px;height:12px;background:rgba(255,255,255,0.1);
                    border-radius:1px;margin-left:5px;"></div>
        <span style="font-size:.58rem;color:rgba(255,255,255,0.2);
                     font-family:'DM Mono',monospace;letter-spacing:.08em;">VÍA</span>
      </div>

      <!-- Destino -->
      <div style="display:flex;align-items:center;gap:9px;">
        <div style="flex-shrink:0;">
          <div style="width:12px;height:12px;border-radius:50%;
                      background:#ef4444;border:2px solid rgba(255,255,255,0.85);
                      box-shadow:0 0 8px rgba(239,68,68,0.7);"></div>
        </div>
        <div style="flex:1;display:flex;gap:6px;">
          <input id="rutaInputDest" type="text"
            placeholder="¿A dónde vas? Escribe la dirección..."
            style="flex:1;background:rgba(239,68,68,0.07);
                   border:1px solid rgba(239,68,68,0.22);
                   color:#e2e8f0;border-radius:8px;padding:7px 10px;
                   font-size:.81rem;outline:none;"
            onkeydown="if(event.key==='Enter') buscarDesdeCampo()">
          <button onclick="buscarDesdeCampo()"
            style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.28);
                   color:rgba(0,212,255,0.9);border-radius:8px;padding:7px 14px;
                   cursor:pointer;font-size:.75rem;font-family:'DM Mono',monospace;
                   white-space:nowrap;flex-shrink:0;">
            Ir →
          </button>
        </div>
      </div>
    </div>

    <!-- Estado -->
    <div style="padding:6px 14px;flex-shrink:0;background:rgba(0,0,0,0.15);
                border-bottom:1px solid rgba(255,255,255,0.04);">
      <span id="rutaEstado"
        style="font-family:'DM Mono',monospace;font-size:.67rem;
               color:rgba(255,255,255,0.28);">
        Ingresa un destino para trazar la ruta
      </span>
    </div>

    <!-- Mapa iframe -->
    <iframe id="rutaIframe"
      src="about:blank"
      style="flex:1;min-height:0;border:none;display:block;"
      allowfullscreen
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>

    <!-- Destinos recurrentes -->
    <div id="rutaDestRecurrentes" style="padding:8px 14px;flex-shrink:0;
      border-top:1px solid rgba(255,255,255,0.05);max-height:110px;overflow-y:auto;">
      <div style="font-family:var(--font-mono,monospace);font-size:.58rem;
                  letter-spacing:.14em;color:rgba(255,255,255,0.2);margin-bottom:5px;">
        DESTINOS FRECUENTES
      </div>
      <div id="rutaDestinosList"></div>
    </div>

    <!-- Leyenda -->
    <div style="padding:7px 14px;background:rgba(0,0,0,0.25);flex-shrink:0;
                border-top:1px solid rgba(255,255,255,0.05);
                display:flex;gap:14px;align-items:center;">
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:9px;height:9px;border-radius:50%;
                    background:#10b981;border:1.5px solid rgba(255,255,255,0.7);"></div>
        <span id="leyendaOrigen" style="font-size:.62rem;color:rgba(255,255,255,0.38);
                                         font-family:'DM Mono',monospace;">${getCasaNombre()}</span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:9px;height:9px;border-radius:50%;
                    background:#ef4444;border:1.5px solid rgba(255,255,255,0.7);"></div>
        <span id="leyendaDest" style="font-size:.62rem;color:rgba(255,255,255,0.38);
                                       font-family:'DM Mono',monospace;">Destino</span>
      </div>
      <div style="margin-left:auto;">
        <span style="font-size:.6rem;color:rgba(255,255,255,0.2);
                     font-family:'DM Mono',monospace;">© Google Maps</span>
      </div>
    </div>
  `;

  document.body.appendChild(mapaPanel);

  // Cargar mapa con el origen inicial
  setTimeout(() => cargarMapa(), 300);
}

// ══════════════════════════════════════════════════════════════════════
// ACCIONES
// ══════════════════════════════════════════════════════════════════════

function buscarDesdeCampo() {
  const input = document.getElementById('rutaInputDest');
  const dest  = input?.value.trim();
  if (!dest) return;
  _destinoActual = dest;
  cargarMapa();
  _rutaVoz(`Mostrando ruta hacia ${dest}.`);
  _rutaLog(`[RUTAS] 🗺 Destino manual: "${dest}"`);
}

function actualizarOrigenManual() {
  const input = document.getElementById('rutaInputOrigen');
  const valor = input?.value.trim();
  if (!valor) return;
  _origenActual = valor;
  localStorage.setItem('scall_casa_nombre', valor);
  cargarMapa();
  actualizarInfoBar(valor, _destinoActual);
  _rutaVoz(`Punto de partida actualizado a ${valor}.`);
  _rutaLog(`[RUTAS] 🏠 Origen actualizado: "${valor}"`);
}

function usarMiUbicacion() {
  if (!navigator.geolocation) {
    _rutaVoz('Tu dispositivo no soporta geolocalización.');
    return;
  }
  const estado = document.getElementById('rutaEstado');
  if (estado) estado.textContent = '📡 Obteniendo GPS...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      localStorage.setItem('scall_casa_lat', lat);
      localStorage.setItem('scall_casa_lng', lng);
      localStorage.setItem('scall_casa_nombre', 'Mi ubicación actual');

      _origenActual = `${lat},${lng}`;

      const input = document.getElementById('rutaInputOrigen');
      if (input) input.value = 'Mi ubicación actual';

      actualizarInfoBar('Mi ubicación actual', _destinoActual);
      cargarMapa();

      _rutaVoz('Ubicación GPS detectada como punto de partida.');
      _rutaLog(`[RUTAS] 📡 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    },
    () => {
      if (estado) estado.textContent = '❌ No se pudo obtener el GPS';
      _rutaVoz('No pude obtener tu ubicación. Verifica los permisos del navegador.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function abrirEnGoogleMaps() {
  const origen  = _origenActual || `${getCasaLat()},${getCasaLng()}`;
  const destino = _destinoActual;
  let url;
  if (destino) {
    url = `https://www.google.com/maps/dir/${encodeURIComponent(origen)}/${encodeURIComponent(destino)}`;
  } else {
    url = `https://www.google.com/maps/search/${encodeURIComponent(origen)}`;
  }
  window.open(url, '_blank');
  _rutaLog('[RUTAS] ↗ Abriendo Google Maps');
}

function configurarCasa(lat, lng, nombre) {
  localStorage.setItem('scall_casa_lat', lat);
  localStorage.setItem('scall_casa_lng', lng);
  if (nombre) localStorage.setItem('scall_casa_nombre', nombre);
  _origenActual = `${lat},${lng}`;
  _rutaVoz(`Punto de partida actualizado${nombre ? ' a ' + nombre : ''}.`);
}

function _rutaLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _rutaVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }
