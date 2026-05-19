// =====================================================================
// MÓDULO BLUETOOTH — SCALL
// Escaneo Web Bluetooth API + Amplificador Web Audio + MediaSession
// Funciona en Chrome/Edge desktop y Android Chrome
// =====================================================================

const BT_KEY = 'scall_bt_dispositivos';

// Estado
let btDispositivo    = null;   // BluetoothDevice activo
let btConectado      = false;
let gainNode         = null;   // Nodo amplificador
let gainValor        = 1.0;    // 1.0 = normal, hasta 3.0
let btPanel          = null;

// ── Guardar historial de dispositivos ────────────────────────────────
function getBtHistorial() {
  try { return JSON.parse(localStorage.getItem(BT_KEY)) || []; }
  catch { return []; }
}
function saveBtHistorial(lista) {
  localStorage.setItem(BT_KEY, JSON.stringify(lista.slice(-10)));
}
function agregarAlHistorial(nombre, id) {
  const lista = getBtHistorial().filter(d => d.id !== id);
  lista.unshift({ id, nombre, fecha: new Date().toLocaleDateString('es-CO') });
  saveBtHistorial(lista);
}

// ══════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

function abrirPanelBluetooth() {
  if (!btPanel) crearPanelBluetooth();
  btPanel.style.display = 'flex';
  renderHistorial();
  actualizarEstadoBT();
}

function cerrarPanelBluetooth() {
  if (btPanel) btPanel.style.display = 'none';
}

function crearPanelBluetooth() {
  btPanel = document.createElement('div');
  btPanel.id = 'btPanel';
  btPanel.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width:min(360px, calc(100vw - 24px));
    max-height:calc(100dvh - 40px);
    background:rgba(6,14,28,0.92);
    border:1px solid rgba(0,180,255,0.22);
    border-radius:18px;
    backdrop-filter:blur(24px);
    -webkit-backdrop-filter:blur(24px);
    box-shadow:0 0 0 1px rgba(0,212,255,0.08) inset, 0 24px 64px rgba(0,0,0,0.7);
    z-index:2000;
    display:flex; flex-direction:column;
    overflow:hidden;
    font-family:var(--font-body,sans-serif);
  `;

  btPanel.innerHTML = `

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 16px;border-bottom:1px solid rgba(0,212,255,0.1);
                background:rgba(0,212,255,0.04);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:9px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="rgba(0,212,255,0.85)" stroke-width="1.8" stroke-linecap="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
        </svg>
        <span style="font-family:var(--font-mono,monospace);font-size:.75rem;
                     letter-spacing:.12em;color:rgba(0,212,255,0.85);">BLUETOOTH · AUDIO</span>
      </div>
      <button onclick="cerrarPanelBluetooth()"
        style="background:transparent;border:1px solid rgba(255,255,255,0.1);
               color:rgba(255,255,255,0.4);width:28px;height:28px;border-radius:7px;
               cursor:pointer;font-size:.85rem;transition:all .2s;"
        onmouseover="this.style.borderColor='rgba(239,68,68,.4)';this.style.color='#ef4444'"
        onmouseout="this.style.borderColor='rgba(255,255,255,.1)';this.style.color='rgba(255,255,255,.4)'">
        ✕
      </button>
    </div>

    <!-- Estado de conexión -->
    <div id="btEstadoCard" style="margin:12px 14px 0;padding:12px 14px;
      border-radius:10px;background:rgba(0,0,0,0.2);
      border:1px solid rgba(255,255,255,0.07);
      display:flex;align-items:center;gap:12px;flex-shrink:0;">
      <div id="btEstadoDot" style="width:10px;height:10px;border-radius:50%;
        background:#475569;flex-shrink:0;transition:all .3s;"></div>
      <div style="flex:1;">
        <div id="btEstadoNombre" style="font-size:.82rem;color:rgba(255,255,255,0.7);
          font-family:var(--font-mono,monospace);">Sin dispositivo</div>
        <div id="btEstadoSub" style="font-size:.65rem;color:rgba(255,255,255,0.3);
          margin-top:2px;font-family:var(--font-mono,monospace);">
          Empareja un dispositivo Bluetooth
        </div>
      </div>
      <button id="btDesconectarBtn" onclick="desconectarBT()"
        style="display:none;background:rgba(239,68,68,0.1);
               border:1px solid rgba(239,68,68,0.25);color:#ef4444;
               border-radius:7px;padding:4px 8px;cursor:pointer;
               font-size:.65rem;font-family:var(--font-mono,monospace);">
        Desconectar
      </button>
    </div>

    <!-- Botón escanear -->
    <div style="padding:12px 14px;flex-shrink:0;">
      <button onclick="escanearBluetooth()" id="btScanBtn"
        style="width:100%;padding:11px;border-radius:10px;
               background:rgba(0,212,255,0.08);
               border:1px solid rgba(0,212,255,0.28);
               color:rgba(0,212,255,0.9);cursor:pointer;
               font-family:var(--font-mono,monospace);font-size:.78rem;
               letter-spacing:.06em;display:flex;align-items:center;
               justify-content:center;gap:8px;transition:all .2s;"
        onmouseover="this.style.background='rgba(0,212,255,0.15)'"
        onmouseout="this.style.background='rgba(0,212,255,0.08)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
        </svg>
        <span id="btScanLabel">Buscar dispositivo Bluetooth</span>
      </button>
    </div>

    <!-- Amplificador de volumen -->
    <div style="padding:0 14px 12px;flex-shrink:0;">
      <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);
                  border-radius:10px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:10px;">
          <span style="font-family:var(--font-mono,monospace);font-size:.68rem;
                       letter-spacing:.12em;color:rgba(255,255,255,0.35);">
            🔊 AMPLIFICADOR
          </span>
          <span id="gainDisplay"
            style="font-family:var(--font-mono,monospace);font-size:.78rem;
                   color:rgba(0,212,255,0.8);letter-spacing:.05em;">
            100%
          </span>
        </div>

        <!-- Slider de ganancia -->
        <input type="range" id="gainSlider" min="0.5" max="3.0" step="0.1" value="1.0"
          oninput="ajustarGanancia(this.value)"
          style="width:100%;accent-color:rgba(0,212,255,0.8);cursor:pointer;">

        <!-- Botones rápidos -->
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button onclick="setGain(1.0)"
            style="flex:1;padding:6px;border-radius:7px;cursor:pointer;font-size:.68rem;
                   background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                   color:rgba(255,255,255,0.5);font-family:var(--font-mono,monospace);
                   transition:all .15s;" onmouseover="this.style.borderColor='rgba(0,212,255,0.3)'"
            onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'">
            Normal
          </button>
          <button onclick="setGain(1.5)"
            style="flex:1;padding:6px;border-radius:7px;cursor:pointer;font-size:.68rem;
                   background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                   color:rgba(255,255,255,0.5);font-family:var(--font-mono,monospace);
                   transition:all .15s;" onmouseover="this.style.borderColor='rgba(0,212,255,0.3)'"
            onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'">
            +50%
          </button>
          <button onclick="setGain(2.0)"
            style="flex:1;padding:6px;border-radius:7px;cursor:pointer;font-size:.68rem;
                   background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);
                   color:rgba(0,212,255,0.8);font-family:var(--font-mono,monospace);
                   transition:all .15s;" onmouseover="this.style.borderColor='rgba(0,212,255,0.5)'"
            onmouseout="this.style.borderColor='rgba(0,212,255,0.25)'">
            2×
          </button>
          <button onclick="setGain(3.0)"
            style="flex:1;padding:6px;border-radius:7px;cursor:pointer;font-size:.68rem;
                   background:rgba(123,97,255,0.1);border:1px solid rgba(123,97,255,0.3);
                   color:rgba(123,97,255,0.9);font-family:var(--font-mono,monospace);
                   transition:all .15s;" onmouseover="this.style.borderColor='rgba(123,97,255,0.6)'"
            onmouseout="this.style.borderColor='rgba(123,97,255,0.3)'">
            3× MAX
          </button>
        </div>
      </div>
    </div>

    <!-- Historial dispositivos -->
    <div style="padding:0 14px 14px;flex:1;overflow-y:auto;min-height:0;">
      <div style="font-family:var(--font-mono,monospace);font-size:.62rem;
                  letter-spacing:.14em;color:rgba(255,255,255,0.22);
                  margin-bottom:8px;">DISPOSITIVOS ANTERIORES</div>
      <div id="btHistorialLista"></div>
    </div>

    <!-- Nota de compatibilidad -->
    <div style="padding:8px 14px;border-top:1px solid rgba(255,255,255,0.05);
                flex-shrink:0;">
      <p style="font-size:.6rem;color:rgba(255,255,255,0.2);
                font-family:var(--font-mono,monospace);letter-spacing:.04em;
                text-align:center;margin:0;">
        Web Bluetooth · Chrome/Edge · Android Chrome
      </p>
    </div>
  `;

  document.body.appendChild(btPanel);
}

// ══════════════════════════════════════════════════════════════════════
// WEB BLUETOOTH API
// ══════════════════════════════════════════════════════════════════════

async function escanearBluetooth() {
  if (!navigator.bluetooth) {
    mostrarAlertaBT('Tu navegador no soporta Web Bluetooth.\nUsa Chrome o Edge en desktop/Android.');
    _btVoz('Tu navegador no soporta Bluetooth. Usa Chrome o Edge.');
    return;
  }

  const btn   = document.getElementById('btScanBtn');
  const label = document.getElementById('btScanLabel');
  if (label) label.textContent = 'Buscando...';
  if (btn)   btn.style.opacity = '0.7';

  try {
    // Solicitar cualquier dispositivo Bluetooth cercano
    // Incluye perfiles de audio (A2DP) y genéricos
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'battery_service',
        'device_information',
        'generic_access',
        'generic_attribute'
      ]
    });

    btDispositivo = device;
    btConectado   = true;

    // Escuchar desconexión automática
    device.addEventListener('gattserverdisconnected', onBTDesconectado);

    // Guardar en historial
    agregarAlHistorial(device.name || 'Dispositivo desconocido', device.id);

    actualizarEstadoBT();
    renderHistorial();

    // Activar MediaSession para controles del dispositivo
    activarMediaSession();

    // Conectar amplificador al reproductor YouTube si está activo
    conectarAmplificadorYT();

    _btVoz(`Dispositivo ${device.name || 'Bluetooth'} vinculado. Puedes amplificar el volumen hasta 3 veces.`);
    _btLog(`[BT] ✅ Vinculado: ${device.name} (${device.id})`);

  } catch (err) {
    if (err.name !== 'NotFoundError') {
      // NotFoundError = usuario canceló el selector, no es error real
      _btLog(`[BT] ❌ ${err.name}: ${err.message}`);
      _btVoz('No se pudo vincular el dispositivo.');
    }
  } finally {
    if (label) label.textContent = 'Buscar dispositivo Bluetooth';
    if (btn)   btn.style.opacity = '1';
  }
}

function onBTDesconectado() {
  btConectado = false;
  actualizarEstadoBT();
  _btLog('[BT] ⚠️ Dispositivo desconectado');
  _btVoz('El dispositivo Bluetooth se desconectó.');
}

function desconectarBT() {
  if (btDispositivo?.gatt?.connected) {
    btDispositivo.gatt.disconnect();
  }
  btDispositivo = null;
  btConectado   = false;
  actualizarEstadoBT();
  _btVoz('Bluetooth desconectado.');
  _btLog('[BT] 🔌 Desconectado manualmente');
}

// ══════════════════════════════════════════════════════════════════════
// AMPLIFICADOR — GainNode (Web Audio API)
// ══════════════════════════════════════════════════════════════════════

function getAudioCtxBT() {
  if (!window._scallAudioCtx) {
    window._scallAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._scallAudioCtx;
}

function conectarAmplificadorYT() {
  // Intenta conectar el GainNode al player de YouTube si existe
  try {
    const ctx = getAudioCtxBT();
    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.gain.value = gainValor;
      gainNode.connect(ctx.destination);
    }
    _btLog(`[BT] 🔊 Amplificador activo — ganancia: ${gainValor}x`);
  } catch(e) {
    _btLog(`[BT] ⚠️ Amplificador: ${e.message}`);
  }
}

function ajustarGanancia(valor) {
  gainValor = parseFloat(valor);
  const pct = Math.round(gainValor * 100);

  // Actualizar display
  const disp = document.getElementById('gainDisplay');
  if (disp) {
    disp.textContent = `${pct}%`;
    disp.style.color = gainValor > 2 ? 'rgba(123,97,255,0.9)' :
                       gainValor > 1 ? 'rgba(0,212,255,0.8)' :
                                       'rgba(255,255,255,0.5)';
  }

  // Aplicar al GainNode si existe
  if (gainNode) {
    gainNode.gain.setTargetAtTime(gainValor, getAudioCtxBT().currentTime, 0.05);
  }

  // Aplicar al player de YouTube si existe
  if (typeof ytPlayer !== 'undefined' && ytPlayer?.setVolume) {
    const volYT = Math.min(100, Math.round(gainValor * 50));
    ytPlayer.setVolume(volYT);
  }

  _btLog(`[BT] 🔊 Volumen: ${pct}% (${gainValor}x)`);
}

function setGain(valor) {
  gainValor = valor;
  const slider = document.getElementById('gainSlider');
  if (slider) slider.value = valor;
  ajustarGanancia(valor);
}

// ══════════════════════════════════════════════════════════════════════
// MEDIA SESSION API — controles del auricular Bluetooth
// ══════════════════════════════════════════════════════════════════════

function activarMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  'SCALL Audio',
    artist: 'IIT · Infraestructura',
    album:  'Asistente SCALL',
  });

  // Botones físicos del auricular BT → funciones de SCALL
  const handlers = {
    play:           () => { if (typeof reanudarMusica  === 'function') reanudarMusica();  },
    pause:          () => { if (typeof pausarMusica    === 'function') pausarMusica();    },
    nexttrack:      () => { if (typeof siguienteMusica === 'function') siguienteMusica(); },
    previoustrack:  () => { if (typeof anteriorMusica  === 'function') anteriorMusica();  },
    stop:           () => { if (typeof detenerMusica   === 'function') detenerMusica();   },
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); }
    catch(e) {}
  });

  _btLog('[BT] 🎧 MediaSession activa — controles del auricular vinculados');
}

// ══════════════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════════════

function actualizarEstadoBT() {
  const dot    = document.getElementById('btEstadoDot');
  const nombre = document.getElementById('btEstadoNombre');
  const sub    = document.getElementById('btEstadoSub');
  const btnDes = document.getElementById('btDesconectarBtn');
  const sideDot = document.getElementById('btSideDot');

  if (btConectado && btDispositivo) {
    if (dot)    { dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 8px #10b981'; }
    if (nombre) nombre.textContent = btDispositivo.name || 'Dispositivo BT';
    if (sub)    sub.textContent    = 'Conectado · controles de auricular activos';
    if (btnDes) btnDes.style.display = 'block';
    if (sideDot) { sideDot.style.background = '#10b981'; sideDot.style.boxShadow = '0 0 6px #10b981'; }
  } else {
    if (dot)    { dot.style.background = '#475569'; dot.style.boxShadow = 'none'; }
    if (nombre) nombre.textContent = 'Sin dispositivo';
    if (sub)    sub.textContent    = 'Empareja un dispositivo Bluetooth';
    if (btnDes) btnDes.style.display = 'none';
    if (sideDot) { sideDot.style.background = '#475569'; sideDot.style.boxShadow = 'none'; }
  }
}

function renderHistorial() {
  const el = document.getElementById('btHistorialLista');
  if (!el) return;
  const lista = getBtHistorial();

  if (lista.length === 0) {
    el.innerHTML = `<p style="font-size:.68rem;color:rgba(255,255,255,0.2);
      text-align:center;padding:8px;font-family:var(--font-mono,monospace);">
      Sin dispositivos anteriores
    </p>`;
    return;
  }

  el.innerHTML = lista.map(d => `
    <div style="display:flex;align-items:center;gap:10px;
                padding:8px 10px;border-radius:8px;margin-bottom:5px;
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="rgba(0,212,255,0.45)" stroke-width="2" stroke-linecap="round">
        <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
      </svg>
      <div style="flex:1;min-width:0;">
        <div style="font-size:.72rem;color:rgba(255,255,255,0.55);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          font-family:var(--font-mono,monospace);">${d.nombre}</div>
        <div style="font-size:.6rem;color:rgba(255,255,255,0.22);
          font-family:var(--font-mono,monospace);">${d.fecha}</div>
      </div>
    </div>
  `).join('');
}

function mostrarAlertaBT(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);
    width:min(320px,calc(100vw-32px));background:#1e293b;
    border:1px solid rgba(0,212,255,0.25);border-radius:12px;
    padding:14px 16px;z-index:9999;color:#f8fafc;font-size:.8rem;
    font-family:var(--font-mono,monospace);line-height:1.5;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

function _btLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _btVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn('[VOZ]', m); }

// Inicializar MediaSession al cargar (sin necesitar BT conectado)
window.addEventListener('load', () => {
  activarMediaSession();
  _btLog('[BT] 📡 Módulo Bluetooth listo');
});
