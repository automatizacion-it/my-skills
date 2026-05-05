// =====================================================================
// MÓDULO DE MÚSICA — YouTube Data API v3 + iframe Player
// =====================================================================

const YT_API_KEY = 'AIzaSyBUekBHuF5-mFIAyfm3DjxUCcm76Sl24kQ';

let ytPlayer     = null;
let ytReady      = false;
let ytQueue      = [];
let ytQueueIndex = 0;
let ytBuscando   = false;

// ─────────────────────────────────────────────
// Cargar YouTube iframe API
// ─────────────────────────────────────────────
(function cargarYouTubeAPI() {
  if (document.getElementById('yt-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id    = 'yt-iframe-api';
  tag.src   = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = function () {
  if (!document.getElementById('yt-player-container')) {
    const div = document.createElement('div');
    div.id = 'yt-player-container';
    div.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px',
      'width:320px', 'height:180px', 'border-radius:14px',
      'overflow:hidden', 'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'z-index:9999', 'display:none', 'background:#000'
    ].join(';');
    const inner = document.createElement('div');
    inner.id = 'yt-player';
    div.appendChild(inner);

    const btn = document.createElement('button');
    btn.innerText = '✕';
    btn.style.cssText = [
      'position:absolute', 'top:6px', 'right:8px',
      'background:rgba(0,0,0,0.7)', 'color:#fff', 'border:none',
      'border-radius:50%', 'width:24px', 'height:24px',
      'cursor:pointer', 'font-size:13px', 'z-index:10000',
      'line-height:24px', 'text-align:center'
    ].join(';');
    btn.onclick = () => { div.style.display = 'none'; };
    div.appendChild(btn);

    document.body.appendChild(div);
  }

  ytPlayer = new YT.Player('yt-player', {
    height: '170', width: '300',
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        ytReady = true;
        _logSafe('🎵 Motor de música YouTube listo.');
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED && ytQueue.length > 1) {
          ytQueueIndex = (ytQueueIndex + 1) % ytQueue.length;
          ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
        }
      }
    }
  });
};

// ─────────────────────────────────────────────
// Buscar con YouTube Data API v3
// ─────────────────────────────────────────────
async function buscarEnYouTube(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&type=video&maxResults=5` +
    `&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;

  _logSafe(`📡 Llamando API: ${url.split('&key')[0]}...`);

  try {
    const res  = await fetch(url);
    const data = await res.json();

    // Log del error exacto para diagnóstico
    if (data.error) {
      _logSafe(`❌ Error API YouTube [${data.error.code}]: ${data.error.message}`);
      if (data.error.code === 403) {
        _logSafe('⚠️ La YouTube Data API v3 no está habilitada en este proyecto. Ve a Google Cloud → Biblioteca → habilita "YouTube Data API v3".');
      }
      return null;
    }

    const ids = (data.items || []).map(i => i.id.videoId).filter(Boolean);
    _logSafe(`✅ Resultados encontrados: ${ids.length} videos.`);
    return ids.length ? ids : null;

  } catch (e) {
    _logSafe(`❌ Error de red: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Comandos públicos
// ─────────────────────────────────────────────
async function reproducirMusica(query = '') {
  if (!ytReady) {
    _vozSafe('El motor de música todavía está cargando, espera un momento.');
    return;
  }
  if (ytBuscando) return;
  ytBuscando = true;

  const busqueda = query.trim() || 'música popular';
  _logSafe(`🔍 Buscando: "${busqueda}"`);
  _vozSafe(`Buscando ${busqueda}...`);

  const ids = await buscarEnYouTube(busqueda);
  ytBuscando = false;

  if (!ids) {
    _vozSafe('No encontré resultados. Revisa el log del sistema para más detalles.');
    return;
  }

  ytQueue      = ids;
  ytQueueIndex = 0;

  document.getElementById('yt-player-container').style.display = 'block';
  ytPlayer.loadVideoById(ytQueue[0]);
  _logSafe(`▶️ Reproduciendo: https://youtu.be/${ytQueue[0]}`);
  setTimeout(() => _vozSafe(`Reproduciendo ${busqueda}.`), 800);
  
  // Actualizar estado en el toggle
  if (typeof updateActivityState === 'function') {
    updateActivityState('musicPlaying', true);
  }
}

function pausarMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.pauseVideo();
  _logSafe('[MÚSICA] Pausada.');
  _vozSafe('Música pausada.');
  
  // Actualizar estado en el toggle
  if (typeof updateActivityState === 'function') {
    updateActivityState('musicPlaying', false);
  }
}

function reanudarMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.playVideo();
  _logSafe('[MÚSICA] Reanudando.');
  _vozSafe('Reanudando música.');
  
  // Actualizar estado en el toggle
  if (typeof updateActivityState === 'function') {
    updateActivityState('musicPlaying', true);
  }
}

function siguienteMusica() {
  if (!ytPlayer || !ytReady || ytQueue.length === 0) {
    _vozSafe('Pide una canción primero.');
    return;
  }
  ytQueueIndex = (ytQueueIndex + 1) % ytQueue.length;
  ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
  _logSafe(`⏭ Siguiente: ${ytQueue[ytQueueIndex]}`);
  _vozSafe('Siguiente canción.');
}

function anteriorMusica() {
  if (!ytPlayer || !ytReady || ytQueue.length === 0) return;
  ytQueueIndex = (ytQueueIndex - 1 + ytQueue.length) % ytQueue.length;
  ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
  _logSafe(`⏮ Anterior: ${ytQueue[ytQueueIndex]}`);
  _vozSafe('Canción anterior.');
}

function detenerMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.stopVideo();
  document.getElementById('yt-player-container').style.display = 'none';
  ytQueue = [];
  _logSafe('[MÚSICA] Detenida.');
  _vozSafe('Música detenida.');
}

function subirVolumen() {
  if (!ytPlayer || !ytReady) return;
  const vol = Math.min(100, ytPlayer.getVolume() + 20);
  ytPlayer.setVolume(vol);
  _vozSafe(`Volumen al ${vol} por ciento.`);
}

function bajarVolumen() {
  if (!ytPlayer || !ytReady) return;
  const vol = Math.max(0, ytPlayer.getVolume() - 20);
  ytPlayer.setVolume(vol);
  _vozSafe(`Volumen al ${vol} por ciento.`);
}

// Helpers
function _logSafe(msg) {
  typeof logMessage === 'function' ? logMessage(msg) : console.log(msg);
}
function _vozSafe(msg) {
  typeof responderVoz === 'function' ? responderVoz(msg) : console.warn('[VOZ]', msg);
}

// Alias compatibilidad
function reproducirSpotify() { reproducirMusica(); }
function pausarSpotify()     { pausarMusica(); }
function siguienteSpotify()  { siguienteMusica(); }
