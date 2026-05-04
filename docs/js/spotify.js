// =====================================================================
// MÓDULO DE MÚSICA — YouTube iframe API (reemplaza Spotify)
// Gratis, sin Premium, sin OAuth.
// =====================================================================

let ytPlayer = null;
let ytReady = false;
let ytQueue = [];
let ytQueueIndex = 0;
let ytBuscando = false;

// ─────────────────────────────────────────────
// Cargar la API de YouTube iframe
// ─────────────────────────────────────────────
(function cargarYouTubeAPI() {
  if (document.getElementById('yt-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-iframe-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();

// Callback global requerido por YouTube
window.onYouTubeIframeAPIReady = function () {
  if (!document.getElementById('yt-player-container')) {
    const div = document.createElement('div');
    div.id = 'yt-player-container';
    div.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px',
      'width:300px', 'height:170px', 'border-radius:14px',
      'overflow:hidden', 'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'z-index:9999', 'display:none', 'background:#000'
    ].join(';');

    const inner = document.createElement('div');
    inner.id = 'yt-player';
    div.appendChild(inner);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = [
      'position:absolute', 'top:6px', 'right:8px',
      'background:rgba(0,0,0,0.7)', 'color:white', 'border:none',
      'border-radius:50%', 'width:24px', 'height:24px',
      'cursor:pointer', 'font-size:13px', 'z-index:10000',
      'display:flex', 'align-items:center', 'justify-content:center'
    ].join(';');
    closeBtn.onclick = () => { div.style.display = 'none'; };
    div.appendChild(closeBtn);

    document.body.appendChild(div);
  }

  ytPlayer = new YT.Player('yt-player', {
    height: '170',
    width: '300',
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        ytReady = true;
        _logSafe("🎵 Motor de música YouTube listo.");
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED && ytQueue.length > 1) {
          ytQueueIndex = (ytQueueIndex + 1) % ytQueue.length;
          ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
        }
      }
    }
  });
};

// ─────────────────────────────────────────────
// Buscar en YouTube (sin API key, vía proxy CORS)
// ─────────────────────────────────────────────
async function buscarEnYouTube(query) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`;
  const proxyUrl  = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

  try {
    const res  = await fetch(proxyUrl);
    const data = await res.json();
    const matches = data.contents.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    if (!matches) return null;
    return [...new Set(matches.map(m => m.replace(/"videoId":"|"/g, '')))].slice(0, 5);
  } catch (e) {
    console.error("Error buscando YouTube:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Comandos públicos
// ─────────────────────────────────────────────
async function reproducirMusica(query = '') {
  if (!ytReady) {
    _vozSafe("El motor de música todavía está cargando, espera un momento.");
    return;
  }
  if (ytBuscando) return;
  ytBuscando = true;

  const busqueda = query.trim() || 'música popular';
  _logSafe(`🔍 Buscando: "${busqueda}"`);
  _vozSafe(`Buscando ${busqueda}...`);

  const ids = await buscarEnYouTube(busqueda);
  ytBuscando = false;

  if (!ids || ids.length === 0) {
    _vozSafe("No encontré resultados. Intenta con otro nombre de canción o artista.");
    return;
  }

  ytQueue      = ids;
  ytQueueIndex = 0;

  document.getElementById('yt-player-container').style.display = 'block';
  ytPlayer.loadVideoById(ytQueue[0]);
  _logSafe(`▶️ Reproduciendo: https://youtu.be/${ytQueue[0]}`);
  setTimeout(() => _vozSafe(`Reproduciendo ${busqueda}.`), 800);
}

function pausarMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.pauseVideo();
  _logSafe("[MÚSICA] Pausada.");
  _vozSafe("Música pausada.");
}

function reanudarMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.playVideo();
  _logSafe("[MÚSICA] Reanudando.");
  _vozSafe("Reanudando música.");
}

function siguienteMusica() {
  if (!ytPlayer || !ytReady || ytQueue.length === 0) {
    _vozSafe("Pide una canción primero.");
    return;
  }
  ytQueueIndex = (ytQueueIndex + 1) % ytQueue.length;
  ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
  _logSafe(`⏭ Siguiente: ${ytQueue[ytQueueIndex]}`);
  _vozSafe("Siguiente canción.");
}

function anteriorMusica() {
  if (!ytPlayer || !ytReady || ytQueue.length === 0) return;
  ytQueueIndex = (ytQueueIndex - 1 + ytQueue.length) % ytQueue.length;
  ytPlayer.loadVideoById(ytQueue[ytQueueIndex]);
  _logSafe(`⏮ Anterior: ${ytQueue[ytQueueIndex]}`);
  _vozSafe("Canción anterior.");
}

function detenerMusica() {
  if (!ytPlayer || !ytReady) return;
  ytPlayer.stopVideo();
  document.getElementById('yt-player-container').style.display = 'none';
  ytQueue = [];
  _logSafe("[MÚSICA] Detenida.");
  _vozSafe("Música detenida.");
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

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────
function _logSafe(msg) {
  typeof logMessage === 'function' ? logMessage(msg) : console.log(msg);
}
function _vozSafe(msg) {
  typeof responderVoz === 'function' ? responderVoz(msg) : console.warn("[VOZ]", msg);
}

// Alias de compatibilidad con intents.js (no hay que tocar intents.js)
function reproducirSpotify() { reproducirMusica(); }
function pausarSpotify()     { pausarMusica(); }
function siguienteSpotify()  { siguienteMusica(); }
