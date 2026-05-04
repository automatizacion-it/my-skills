// Lógica de Spotify Web API (Authorization Code with PKCE Flow)

let spotifyAccessToken = null;

// Funciones utilitarias para PKCE
function generateRandomString(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  function base64encode(string) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64encode(digest);
}

// Intercambiar el código por un token de acceso
async function chequearTokenSpotify() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    const codeVerifier = localStorage.getItem('code_verifier');
    const clientId = localStorage.getItem('spotifyClientId');
    const redirectUri = window.location.origin + window.location.pathname;
    
    try {
      if(typeof logMessage === 'function') logMessage("⏳ Autenticando con Spotify...");
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        })
      });
      
      const data = await response.json();
      if (data.access_token) {
        spotifyAccessToken = data.access_token;
        // Limpiar la URL para que no quede el código expuesto
        window.history.pushState("", document.title, window.location.pathname);
        setTimeout(() => {
          if(typeof logMessage === 'function') logMessage("✅ Cuenta de Spotify conectada correctamente.");
        }, 1000);
        return true;
      } else {
        console.error("Error obteniendo token:", data);
        if(typeof logMessage === 'function') logMessage("❌ Error autenticando con Spotify.");
      }
    } catch(e) {
      console.error("Error exchanging code:", e);
    }
  }
  return false;
}

// Iniciar proceso de autenticación con PKCE
async function conectarSpotify() {
  const clientId = document.getElementById('spotifyClientId').value.trim();
  if (!clientId) {
    alert("Debes ingresar tu Client ID de Spotify primero.");
    return;
  }
  
  // Guardamos el Client ID en localStorage
  localStorage.setItem('spotifyClientId', clientId);
  
  // Generar y guardar el code_verifier
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  localStorage.setItem('code_verifier', codeVerifier);
  
  // URL actual sin query params
  const redirectUri = window.location.origin + window.location.pathname;
  const scope = 'user-modify-playback-state user-read-playback-state';
  
  const args = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });
  
  // Redirigir a Spotify
  window.location.href = 'https://accounts.spotify.com/authorize?' + args.toString();
}

// Cargar al iniciar la página
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
