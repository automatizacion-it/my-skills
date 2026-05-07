// =====================================================================
// MÓDULO CLIMA — OpenWeatherMap API
// Key desde formulario → localStorage o APP_CONFIG
// =====================================================================

function getOwmKey() {
  const fromConfig = window.APP_CONFIG && window.APP_CONFIG.owmApiKey;
  if (fromConfig && fromConfig.trim()) return fromConfig.trim();
  return localStorage.getItem('owmApiKey') || '';
}

// Ciudad por defecto — Bogotá
const CLIMA_CIUDAD_DEFAULT = 'Bogota,CO';
const CLIMA_KEY_STORAGE    = 'scall_clima_ciudad';

function getClimaCiudad() {
  return localStorage.getItem(CLIMA_KEY_STORAGE) || CLIMA_CIUDAD_DEFAULT;
}

async function consultarClima(ciudadInput) {
  const ciudad = ciudadInput || getClimaCiudad();
  const apiKey = getOwmKey();

  if (!apiKey) {
    _climaVoz('Para consultar el clima necesito una clave de OpenWeatherMap. Agrégala en configuración.');
    _climaLog('⚠️ OWM API Key no configurada.');
    return;
  }

  _climaLog(`[CLIMA] 🌤 Consultando: ${ciudad}...`);

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${apiKey}&units=metric&lang=es`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.cod !== 200) {
      _climaVoz(`No encontré información del clima para ${ciudad}.`);
      _climaLog(`[CLIMA] ❌ Error: ${data.message}`);
      return;
    }

    const temp    = Math.round(data.main.temp);
    const sensacion = Math.round(data.main.feels_like);
    const desc    = data.weather[0].description;
    const humedad = data.main.humidity;
    const ciudad_ = data.name;
    const viento  = Math.round(data.wind.speed * 3.6); // m/s a km/h

    const msg = `En ${ciudad_} hay ${desc}. Temperatura de ${temp} grados, sensación de ${sensacion}. Humedad del ${humedad} por ciento y viento de ${viento} kilómetros por hora.`;

    _climaVoz(msg);
    mostrarToastClima({ ciudad: ciudad_, temp, desc, humedad, sensacion, viento });
    _climaLog(`[CLIMA] ✅ ${ciudad_}: ${temp}°C, ${desc}`);

  } catch (e) {
    _climaVoz('No pude conectarme al servicio de clima. Verifica tu conexión.');
    _climaLog(`[CLIMA] ❌ Error de red: ${e.message}`);
  }
}

function mostrarToastClima({ ciudad, temp, desc, humedad, sensacion, viento }) {
  const existing = document.getElementById('climaToast');
  if (existing) existing.remove();

  const emoji = temp > 25 ? '☀️' : temp > 15 ? '⛅' : temp > 8 ? '🌧' : '🌨';
  const toast = document.createElement('div');
  toast.id = 'climaToast';
  toast.style.cssText = `
    position:fixed;top:70px;left:50%;transform:translateX(-50%);
    width:min(340px,calc(100vw - 32px));
    background:linear-gradient(135deg,#0c1e3d,#0a2a4a);
    border:1px solid rgba(56,189,248,0.3);border-radius:16px;
    padding:16px 18px;z-index:20000;color:#f8fafc;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    animation:slideInDown 0.4s cubic-bezier(0.34,1.56,0.64,1);
    font-family:var(--font-body,sans-serif);
  `;
  toast.innerHTML = `
    <style>@keyframes slideInDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    <div style="display:flex;align-items:center;gap:14px;">
      <span style="font-size:2.5rem;">${emoji}</span>
      <div style="flex:1;">
        <div style="font-size:0.72rem;color:#64748b;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;">${ciudad}</div>
        <div style="font-size:2rem;font-weight:700;line-height:1;">${temp}°C</div>
        <div style="font-size:0.78rem;color:#94a3b8;text-transform:capitalize;">${desc}</div>
      </div>
      <div style="text-align:right;font-size:0.72rem;color:#64748b;line-height:1.8;">
        <div>💧 ${humedad}%</div>
        <div>🌡 ${sensacion}°C</div>
        <div>💨 ${viento} km/h</div>
      </div>
    </div>
    <button onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 10000);
}

function _climaLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _climaVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn(m); }
