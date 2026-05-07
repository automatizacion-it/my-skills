// =====================================================================
// UI.JS — SCALL
// Dark/Light toggle + Panel Dispositivos + Historial conversaciones
// =====================================================================

// ── TEMA ─────────────────────────────────────────────────────────────

const THEME_KEY = 'scall_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── HISTORIAL ─────────────────────────────────────────────────────────

const HISTORY_KEY = 'scall_history';
const MAX_HISTORY = 50;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function addToHistory(role, text) {
  const history = getHistory();
  history.unshift({
    role,
    text,
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  });
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('historyList');
  if (!el) return;
  const history = getHistory();

  if (history.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:20px;">Sin conversaciones aún</p>';
    return;
  }

  el.innerHTML = history.map(h => `
    <div class="history-item">
      <span class="history-role ${h.role}">${h.role === 'user' ? 'Tú' : 'SCALL'}</span>
      <span class="history-text">${h.text}</span>
      <span class="history-time">${h.time}</span>
    </div>
  `).join('');
}

// ── PANEL DISPOSITIVOS ────────────────────────────────────────────────

const DEVICES_KEY = 'scall_devices';

const DEFAULT_DEVICES = [
  { id: 1, name: 'Luces Sala',    icon: '💡', location: 'Sala',    topic: 'casa/sala/luces',   on: false },
  { id: 2, name: 'Luces Cuarto',  icon: '💡', location: 'Cuarto',  topic: 'casa/cuarto/luces', on: false },
  { id: 3, name: 'Televisor',     icon: '📺', location: 'Sala',    topic: 'casa/sala/tv',      on: false },
  { id: 4, name: 'Persianas',     icon: '🪟', location: 'Sala',    topic: 'casa/persianas',    on: false },
  { id: 5, name: 'Aire Acond.',   icon: '❄️', location: 'Cuarto',  topic: 'casa/cuarto/aire',  on: false },
  { id: 6, name: 'Puerta',        icon: '🚪', location: 'Entrada', topic: 'casa/entrada/puerta',on: false },
];

function getDevices() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICES_KEY));
    return saved || DEFAULT_DEVICES;
  } catch { return DEFAULT_DEVICES; }
}

function saveDevices(devices) {
  localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

function toggleDevice(id) {
  const devices = getDevices();
  const dev = devices.find(d => d.id === id);
  if (!dev) return;

  dev.on = !dev.on;
  saveDevices(devices);

  const payload = dev.on ? 'ON' : 'OFF';
  if (typeof enviarComandoMQTT === 'function') {
    enviarComandoMQTT(dev.topic, payload);
  }
  if (typeof responderVoz === 'function') {
    responderVoz(`${dev.name} ${dev.on ? 'encendido' : 'apagado'}.`);
  }
  if (typeof addToHistory === 'function') {
    addToHistory('scall', `${dev.name} ${dev.on ? 'encendido' : 'apagado'}.`);
  }

  renderDevices();
}

// Actualizar estado desde MQTT entrante
function updateDeviceState(topic, payload) {
  const devices = getDevices();
  const dev = devices.find(d => d.topic === topic);
  if (!dev) return;
  dev.on = payload === 'ON' || payload === 'OPEN' || payload === '1';
  saveDevices(devices);
  renderDevices();
}

function renderDevices() {
  const grid = document.getElementById('devicesGrid');
  if (!grid) return;
  const devices = getDevices();

  grid.innerHTML = devices.map(dev => `
    <div class="device-card ${dev.on ? 'on' : ''}" onclick="toggleDevice(${dev.id})">
      <span class="device-icon">${dev.icon}</span>
      <span class="device-name">${dev.name}</span>
      <span class="device-location">${dev.location}</span>
      <span class="device-status">${dev.on ? '● ON' : '○ OFF'}</span>
    </div>
  `).join('');
}

function toggleDevicesPanel() {
  const header = document.querySelector('.devices-panel-header');
  const grid   = document.getElementById('devicesGrid');
  if (!grid) return;
  const isOpen = grid.style.display !== 'none';
  grid.style.display = isOpen ? 'none' : 'grid';
  if (header) header.classList.toggle('open', !isOpen);
}

function toggleHistoryPanel() {
  const header = document.querySelector('.history-panel .devices-panel-header');
  const list   = document.getElementById('historyList');
  if (!list) return;
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (header) header.classList.toggle('open', !isOpen);
}

// ── INIT ──────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initTheme();
  renderDevices();
  renderHistory();
});

// Hook en responderVoz para guardar en historial
const _origResponderVoz = window.responderVoz;
window.addEventListener('load', () => {
  const orig = window.responderVoz;
  if (orig) {
    window.responderVoz = function(msg) {
      orig(msg);
      addToHistory('scall', msg);
    };
  }
});
