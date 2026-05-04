// Lógica de Spotify Web API (Implicit Grant Flow)

let spotifyAccessToken = null;

// Extraer el token de la URL si venimos redirigidos desde Spotify
function chequearTokenSpotify() {
  const hash = window.location.hash;
  if (hash) {
    const tokenParams = new URLSearchParams(hash.substring(1));
    const token = tokenParams.get('access_token');
    if (token) {
      spotifyAccessToken = token;
      // Limpiar la URL para que no quede el token expuesto
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
      setTimeout(() => {
        if(typeof logMessage === 'function') logMessage("✅ Cuenta de Spotify conectada correctamente.");
      }, 1000);
      return true;
    }
  }
  return false;
}

// Iniciar proceso de autenticación
function conectarSpotify() {
  const clientId = document.getElementById('spotifyClientId').value.trim();
  if (!clientId) {
    alert("Debes ingresar tu Client ID de Spotify primero.");
    return;
  }
  
  // Guardamos el Client ID en localStorage
  localStorage.setItem('spotifyClientId', clientId);
  
  // URL actual de GitHub Pages (o localhost) sin query params
  const redirectUri = window.location.origin + window.location.pathname;
  
  const scope = 'user-modify-playback-state user-read-playback-state';
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  
  // Redirigir a Spotify
  window.location.href = authUrl;
}

// Cargar Client ID guardado
window.addEventListener('load', () => {
  const savedClientId = localStorage.getItem('spotifyClientId');
  if (savedClientId) {
    const input = document.getElementById('spotifyClientId');
    if (input) input.value = savedClientId;
  }
  chequearTokenSpotify();
});

// Función centralizada para llamar a la API de Spotify
async function llamadaSpotify(endpoint, metodo = 'PUT', body = null) {
  if (!spotifyAccessToken) {
    if(typeof responderVoz === 'function') responderVoz("Debes vincular tu cuenta de Spotify primero desde la configuración.");
    return false;
  }
  
  try {
    const config = {
      method: metodo,
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) config.body = JSON.stringify(body);
    
    const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, config);
    
    if (response.status === 401) {
      if(typeof responderVoz === 'function') responderVoz("Tu sesión de Spotify ha expirado. Por favor conéctala de nuevo.");
      spotifyAccessToken = null;
      return false;
    }
    
    if (response.status === 404 || response.status === 403) {
      if(typeof responderVoz === 'function') responderVoz("Asegúrate de tener la app de Spotify abierta en algún dispositivo para poder controlarla.");
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error en Spotify:", err);
    return false;
  }
}

// Comandos
async function reproducirSpotify() {
  if(typeof logMessage === 'function') logMessage("[SPOTIFY] Reproduciendo...");
  const exito = await llamadaSpotify('play');
  if(exito && typeof responderVoz === 'function') responderVoz("Reproduciendo música en Spotify.");
}

async function pausarSpotify() {
  if(typeof logMessage === 'function') logMessage("[SPOTIFY] Pausando...");
  const exito = await llamadaSpotify('pause');
  if(exito && typeof responderVoz === 'function') responderVoz("Música pausada.");
}

async function siguienteSpotify() {
  if(typeof logMessage === 'function') logMessage("[SPOTIFY] Siguiente canción...");
  const exito = await llamadaSpotify('next', 'POST');
  if(exito && typeof responderVoz === 'function') responderVoz("Siguiente canción.");
}
