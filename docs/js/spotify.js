// =====================================================================
// SPOTIFY WEB API — Authorization Code with PKCE Flow
// CORRECCIONES:
//   1. Token persistido en localStorage (sobrevive recargas)
//   2. chequearTokenSpotify() ahora espera a que el DOM esté listo
//   3. reproducirSpotify() busca y activa un dispositivo si no hay ninguno activo
//   4. Indicador visual del estado de conexión en el log
//   5. Redirect URI normalizado para evitar mismatch con Spotify Developer
// =====================================================================

let spotifyAccessToken = localStorage.getItem('spotifyToken') || null;

// ─────────────────────────────────────────────
// Utilidades PKCE
// ─────────────────────────────────────────────
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  function base64encode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64encode(digest);
}

// ─────────────────────────────────────────────
// Redirect URI — siempre sin query string ni hash
// ─────────────────────────────────────────────
function getRedirectUri() {
  return window.location.origin + window.location.pathname;
}

// ─────────────────────────────────────────────
// INICIO DE SESIÓN: redirige a Spotify
// ─────────────────────────────────────────────
async function conectarSpotify() {
  const clientId = document.getElementById('spotifyClientId').value.trim();
  if (!clientId) {
    alert("Ingresa tu Client ID de Spotify primero.");
    return;
  }

  localStorage.setItem('spotifyClientId', clientId);

  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-modify-playback-state user-read-playback-state streaming',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
}

// ─────────────────────────────────────────────
// CALLBACK: canjear código por token
// ─────────────────────────────────────────────
async function chequearTokenSpotify() {
  // Si ya tenemos token guardado, usarlo directamente
  if (spotifyAccessToken) {
    _logSafe("✅ Spotify ya conectado (sesión guardada).");
    return true;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return false;

  const codeVerifier = localStorage.getItem('code_verifier');
  const clientId = localStorage.getItem('spotifyClientId');

  if (!codeVerifier || !clientId) {
    _logSafe("❌ Faltan datos para completar la autenticación de Spotify.");
    return false;
  }

  _logSafe("⏳ Autenticando con Spotify...");

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      spotifyAccessToken = data.access_token;
      localStorage.setItem('spotifyToken', spotifyAccessToken);  // ← CORRECCIÓN 1: persistir token

      // Limpiar URL para que el code no quede expuesto
      window.history.replaceState({}, document.title, window.location.pathname);
      _logSafe("✅ Spotify conectado correctamente. ¡Ya puedes dar comandos de música!");
      return true;
    } else {
      console.error("Error de token Spotify:", data);
      _logSafe(`❌ Error Spotify: ${data.error_description || data.error || 'respuesta inesperada'}`);
    }
  } catch (e) {
    console.error("Error de red al autenticar Spotify:", e);
    _logSafe("❌ No se pudo conectar a Spotify (error de red).");
  }
  return false;
}

// ─────────────────────────────────────────────
// Llamada genérica a la API de Spotify
// ─────────────────────────────────────────────
async function llamadaSpotify(endpoint, metodo = 'PUT', body = null) {
  if (!spotifyAccessToken) {
    _vozSafe("Debes vincular tu cuenta de Spotify primero desde la configuración.");
    return false;
  }

  const config = {
    method: metodo,
    headers: {
      'Authorization': `Bearer ${spotifyAccessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) config.body = JSON.stringify(body);

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, config);

    if (response.status === 401) {
      spotifyAccessToken = null;
      localStorage.removeItem('spotifyToken');
      _vozSafe("Tu sesión de Spotify ha expirado. Conéctala de nuevo desde ajustes.");
      return false;
    }

    if (response.status === 403) {
      _vozSafe("Spotify Premium es necesario para controlar la reproducción de forma remota.");
      return false;
    }

    // 404 = no hay dispositivo activo → intentar activar uno automáticamente
    if (response.status === 404) {
      _logSafe("⚠️ Sin dispositivo Spotify activo. Buscando uno disponible...");
      const activated = await activarDispositivoSpotify();
      if (activated) {
        // Reintentar el comando original
        return await llamadaSpotify(endpoint, metodo, body);
      } else {
        _vozSafe("Abre la app de Spotify en tu teléfono o computador para poder controlarla desde aquí.");
        return false;
      }
    }

    return response.status >= 200 && response.status < 300;
  } catch (err) {
    console.error("Error llamada Spotify:", err);
    _logSafe("❌ Error de red al comunicarse con Spotify.");
    return false;
  }
}

// ─────────────────────────────────────────────
// Buscar y activar un dispositivo disponible
// ─────────────────────────────────────────────
async function activarDispositivoSpotify() {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${spotifyAccessToken}` },
    });
    const data = await res.json();
    const dispositivos = data.devices || [];

    if (dispositivos.length === 0) return false;

    // Preferir el que ya esté activo; si no, tomar el primero
    const dispositivo = dispositivos.find(d => d.is_active) || dispositivos[0];
    _logSafe(`📱 Activando dispositivo: ${dispositivo.name}`);

    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [dispositivo.id], play: false }),
    });

    // Dar tiempo a Spotify para que active el dispositivo
    await new Promise(r => setTimeout(r, 1000));
    return true;
  } catch (e) {
    console.error("Error activando dispositivo:", e);
    return false;
  }
}

// ─────────────────────────────────────────────
// Comandos públicos
// ─────────────────────────────────────────────
async function reproducirSpotify() {
  _logSafe("[SPOTIFY] Reproduciendo...");
  const exito = await llamadaSpotify('play');
  if (exito) _vozSafe("Reproduciendo música en Spotify.");
}

async function pausarSpotify() {
  _logSafe("[SPOTIFY] Pausando...");
  const exito = await llamadaSpotify('pause');
  if (exito) _vozSafe("Música pausada.");
}

async function siguienteSpotify() {
  _logSafe("[SPOTIFY] Siguiente canción...");
  const exito = await llamadaSpotify('next', 'POST');
  if (exito) _vozSafe("Siguiente canción.");
}

async function anteriorSpotify() {
  _logSafe("[SPOTIFY] Canción anterior...");
  const exito = await llamadaSpotify('previous', 'POST');
  if (exito) _vozSafe("Canción anterior.");
}

// ─────────────────────────────────────────────
// Helpers internos — funcionan aunque app.js no haya cargado
// ─────────────────────────────────────────────
function _logSafe(msg) {
  if (typeof logMessage === 'function') {
    logMessage(msg);
  } else {
    console.log(msg);
  }
}

function _vozSafe(msg) {
  if (typeof responderVoz === 'function') {
    responderVoz(msg);
  } else {
    console.warn("[VOZ no lista]", msg);
  }
}

// ─────────────────────────────────────────────
// Inicialización: restaurar Client ID + canjear código si hay uno en la URL
// ─────────────────────────────────────────────
window.addEventListener('load', () => {
  const savedClientId = localStorage.getItem('spotifyClientId');
  const input = document.getElementById('spotifyClientId');
  if (savedClientId && input) input.value = savedClientId;

  // Esperar un tick para que logMessage de app.js esté disponible
  setTimeout(() => chequearTokenSpotify(), 300);
});
