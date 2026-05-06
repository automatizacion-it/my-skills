// =====================================================================
// MÓDULO DE RADIO — Emisoras colombianas + Podcasts
// Mini player flotante sincronizado con el estilo SCALL
// =====================================================================

// ── Catálogo de emisoras ──────────────────────────────────────────────
const EMISORAS = {
  // Noticias
  'w radio':          { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/WRADIOAAC.aac',      emoji: '📻', ciudad: 'Nacional' },
  'caracol radio':    { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CARACOLRADIOA.aac',  emoji: '🎙️', ciudad: 'Nacional' },
  'rcn radio':        { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RCNRADIOA.aac',      emoji: '📡', ciudad: 'Nacional' },
  'blu radio':        { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/BLURADIOA.aac',      emoji: '🔵', ciudad: 'Nacional' },
  'la fm':            { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_FMAAC.aac',       emoji: '🎵', ciudad: 'Nacional' },
  'todelar':          { url: 'https://s4.voscast.com:8096/stream',                                                   emoji: '📻', ciudad: 'Nacional' },

  // Música
  'los 40':           { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40COLOMBIA.aac', emoji: '🔥', ciudad: 'Nacional' },
  'oxígeno':          { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/OXIGENORADIO.aac',  emoji: '💚', ciudad: 'Nacional' },
  'tropicana':        { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TROPICANA.aac',     emoji: '🌴', ciudad: 'Bogotá' },
  'rumba':            { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RUMBAESTEREO.aac',  emoji: '💃', ciudad: 'Nacional' },
  'olímpica':         { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/OLIMPICAEST.aac',   emoji: '🏅', ciudad: 'Nacional' },
  'amor':             { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AMORESTEREO.aac',   emoji: '❤️', ciudad: 'Nacional' },
  'candela':          { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CANDELA.aac',       emoji: '🕯️', ciudad: 'Bogotá' },
  'radio uno':        { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIOUNO.aac',      emoji: '1️⃣', ciudad: 'Nacional' },

  // Regionales / clásicas
  'javeriana':        { url: 'https://stream.javeriana.edu.co:8000/jestéreo',                                       emoji: '🎓', ciudad: 'Bogotá' },
  'un radio':         { url: 'https://unradio.unal.edu.co/stream',                                                  emoji: '🎓', ciudad: 'Bogotá' },
  'radio nacional':   { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIONACIONAL.aac', emoji: '🇨🇴', ciudad: 'Nacional' },
};

// ── Estado interno ────────────────────────────────────────────────────
let radioPlayer    = null;
let radioActual    = null;   // clave del objeto EMISORAS
let radioPlaying   = false;
let radioRetrying  = false;

// ── Crear el mini player una sola vez ────────────────────────────────
function crearRadioPlayer() {
  if (document.getElementById('radio-player-container')) return;

  const container = document.createElement('div');
  container.id = 'radio-player-container';
  container.innerHTML = `
    <div class="radio-player-inner">

      <div class="radio-player-signal" id="radioSignal">
        <span></span><span></span><span></span><span></span><span></span>
      </div>

      <div class="radio-player-info">
        <span class="radio-emoji" id="radioEmoji">📻</span>
        <div class="radio-meta">
          <strong id="radioName">Sin emisora</strong>
          <small id="radioCity">—</small>
        </div>
      </div>

      <div class="radio-player-controls">
        <button id="radioPrevBtn"  onclick="radioAnterior()"  title="Anterior">⏮</button>
        <button id="radioPlayBtn"  onclick="radioTogglePlay()" title="Play/Pausa">⏸</button>
        <button id="radioNextBtn"  onclick="radioSiguiente()" title="Siguiente">⏭</button>
        <button id="radioCloseBtn" onclick="detenerRadio(true)" title="Cerrar">✕</button>
      </div>

      <input type="range" id="radioVolume" min="0" max="1" step="0.05" value="1"
             title="Volumen" oninput="setRadioVolume(this.value)">
    </div>
  `;

  document.body.appendChild(container);
  injectRadioStyles();
}

// ── Inyectar estilos del player ───────────────────────────────────────
function injectRadioStyles() {
  if (document.getElementById('radio-player-styles')) return;
  const style = document.createElement('style');
  style.id = 'radio-player-styles';
  style.textContent = `
    #radio-player-container {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      width: min(400px, calc(100vw - 24px));
      z-index: 10001;
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
      pointer-events: none;
    }
    #radio-player-container.visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: all;
    }
    .radio-player-inner {
      background: linear-gradient(135deg, #0f2027 0%, #1a3a4a 50%, #0f2027 100%);
      border: 1px solid rgba(56,189,248,0.3);
      border-radius: 20px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.1);
      backdrop-filter: blur(20px);
    }

    /* Barras de señal animadas */
    .radio-player-signal {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 24px;
      flex-shrink: 0;
    }
    .radio-player-signal span {
      display: block;
      width: 3px;
      border-radius: 2px;
      background: #38bdf8;
      animation: none;
      height: 4px;
      transition: height 0.2s;
    }
    #radio-player-container.playing .radio-player-signal span:nth-child(1) { animation: bar 0.8s ease-in-out infinite; }
    #radio-player-container.playing .radio-player-signal span:nth-child(2) { animation: bar 0.8s ease-in-out 0.15s infinite; }
    #radio-player-container.playing .radio-player-signal span:nth-child(3) { animation: bar 0.8s ease-in-out 0.3s infinite; }
    #radio-player-container.playing .radio-player-signal span:nth-child(4) { animation: bar 0.8s ease-in-out 0.45s infinite; }
    #radio-player-container.playing .radio-player-signal span:nth-child(5) { animation: bar 0.8s ease-in-out 0.6s infinite; }

    @keyframes bar {
      0%, 100% { height: 4px; }
      50%       { height: 22px; }
    }

    /* Info */
    .radio-player-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .radio-emoji { font-size: 1.5rem; flex-shrink: 0; }
    .radio-meta  { display: flex; flex-direction: column; min-width: 0; }
    .radio-meta strong {
      font-size: 0.82rem;
      color: #f8fafc;
      font-family: 'Orbitron', sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .radio-meta small { font-size: 0.68rem; color: #64748b; }

    /* Controles */
    .radio-player-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .radio-player-controls button {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: #f8fafc;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .radio-player-controls button:hover { background: rgba(56,189,248,0.2); border-color: #38bdf8; }
    #radioCloseBtn { color: #64748b; }
    #radioCloseBtn:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.1); }

    /* Volumen */
    #radioVolume {
      width: 70px;
      flex-shrink: 0;
      accent-color: #38bdf8;
      cursor: pointer;
    }

    /* Desktop: esquina inferior izquierda */
    @media (min-width: 900px) {
      #radio-player-container {
        left: 24px;
        bottom: 24px;
        transform: translateY(100px);
        width: 360px;
      }
      #radio-player-container.visible {
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// ── Utilidades del player ─────────────────────────────────────────────
function mostrarRadioPlayer() {
  const c = document.getElementById('radio-player-container');
  if (c) { c.classList.add('visible'); c.classList.add('playing'); }
}

function ocultarRadioPlayer() {
  const c = document.getElementById('radio-player-container');
  if (c) { c.classList.remove('visible'); c.classList.remove('playing'); }
  setTimeout(() => {
    const el = document.getElementById('radio-player-container');
    if (el) el.remove();
  }, 500);
}

function actualizarInfoPlayer(clave) {
  const emisora = EMISORAS[clave];
  if (!emisora) return;
  const nameEl  = document.getElementById('radioName');
  const cityEl  = document.getElementById('radioCity');
  const emojiEl = document.getElementById('radioEmoji');
  if (nameEl)  nameEl.textContent  = clave.charAt(0).toUpperCase() + clave.slice(1);
  if (cityEl)  cityEl.textContent  = emisora.ciudad;
  if (emojiEl) emojiEl.textContent = emisora.emoji;
}

function setRadioVolume(val) {
  if (radioPlayer) radioPlayer.volume = parseFloat(val);
}

function radioTogglePlay() {
  if (!radioPlayer) return;
  const btn = document.getElementById('radioPlayBtn');
  const c   = document.getElementById('radio-player-container');
  if (radioPlaying) {
    radioPlayer.pause();
    radioPlaying = false;
    if (btn) btn.textContent = '▶';
    if (c)   c.classList.remove('playing');
  } else {
    radioPlayer.play();
    radioPlaying = true;
    if (btn) btn.textContent = '⏸';
    if (c)   c.classList.add('playing');
  }
}

// ── Navegación entre emisoras ─────────────────────────────────────────
const LISTA_EMISORAS = Object.keys(EMISORAS);

function radioSiguiente() {
  if (!radioActual) return;
  const idx = LISTA_EMISORAS.indexOf(radioActual);
  const siguiente = LISTA_EMISORAS[(idx + 1) % LISTA_EMISORAS.length];
  reproducirEmisora(siguiente);
  responderVoz(`Siguiente: ${siguiente}.`);
}

function radioAnterior() {
  if (!radioActual) return;
  const idx = LISTA_EMISORAS.indexOf(radioActual);
  const anterior = LISTA_EMISORAS[(idx - 1 + LISTA_EMISORAS.length) % LISTA_EMISORAS.length];
  reproducirEmisora(anterior);
  responderVoz(`Anterior: ${anterior}.`);
}

// ── API pública ───────────────────────────────────────────────────────
function reproducirEmisora(nombre) {
  // Buscar emisora por nombre parcial
  const clave = Object.keys(EMISORAS).find(k =>
    nombre.toLowerCase().includes(k) || k.includes(nombre.toLowerCase().trim())
  );

  if (!clave) {
    _radioVoz(`No tengo configurada la emisora ${nombre}. Las disponibles son: ${LISTA_EMISORAS.join(', ')}.`);
    return;
  }

  const emisora = EMISORAS[clave];

  // Detener la anterior sin cerrar el player
  if (radioPlayer) {
    radioPlayer.pause();
    radioPlayer.src = '';
  }

  radioPlayer          = new Audio();
  radioPlayer.crossOrigin = 'anonymous';
  radioPlayer.src      = emisora.url;
  radioPlayer.volume   = parseFloat(document.getElementById('radioVolume')?.value || '1');
  radioActual          = clave;
  radioPlaying         = true;

  radioPlayer.onerror = () => {
    if (!radioRetrying) {
      radioRetrying = true;
      _radioLog(`[RADIO] ⚠️ Error cargando stream. Reintentando en 3s...`);
      setTimeout(() => { radioRetrying = false; radioPlayer && radioPlayer.load(); radioPlayer && radioPlayer.play(); }, 3000);
    }
  };

  crearRadioPlayer();
  actualizarInfoPlayer(clave);
  mostrarRadioPlayer();

  radioPlayer.play().catch(err => {
    _radioLog(`[RADIO] ❌ ${err.message}`);
  });

  _radioLog(`[RADIO] ▶️ ${clave} — ${emisora.url}`);
  _radioVoz(`Sintonizando ${clave}.`);

  if (typeof updateActivityState === 'function') updateActivityState('radioPlaying', true);

  // Actualizar botón play
  const btn = document.getElementById('radioPlayBtn');
  if (btn) btn.textContent = '⏸';
}

function detenerRadio(cerrarPlayer = true) {
  if (radioPlayer) {
    radioPlayer.pause();
    radioPlayer.src = '';
    radioPlayer     = null;
  }
  radioActual  = null;
  radioPlaying = false;
  if (cerrarPlayer) ocultarRadioPlayer();
  _radioLog('[RADIO] ⏹ Detenida.');
  if (typeof updateActivityState === 'function') updateActivityState('radioPlaying', false);
}

function listarEmisoras() {
  const lista = LISTA_EMISORAS.map((k, i) => `${i + 1}. ${EMISORAS[k].emoji} ${k}`).join('\n');
  _radioLog('[RADIO] Emisoras disponibles:\n' + lista);
  _radioVoz('Las emisoras disponibles son: ' + LISTA_EMISORAS.join(', ') + '.');
}

// ── Helpers ───────────────────────────────────────────────────────────
function _radioLog(msg) { typeof logMessage === 'function' ? logMessage(msg) : console.log(msg); }
function _radioVoz(msg) { typeof responderVoz === 'function' ? responderVoz(msg) : console.warn('[VOZ]', msg); }
