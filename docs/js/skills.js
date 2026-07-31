// =====================================================================
// SKILLS.JS — SCALL
// Alarmas · Noticias · Clima · Traductor · Corpus Log
// =====================================================================

// ══════════════════════════════════════════════════════════════════════
// UTILIDADES PANEL
// ══════════════════════════════════════════════════════════════════════

// togglePanel/initPanel: la definición activa vive en alarms.js (se carga después
// y la reemplaza). Se deja fuera de aquí para no mantener dos copias.

function switchTab(tabId, panelId, btn) {
  const panel = document.getElementById(panelId);
  panel.querySelectorAll('.skill-tab-content').forEach(t => t.classList.remove('active'));
  panel.querySelectorAll('.skill-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

function _sv(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn(m); }
function _sl(m) { typeof logMessage   === 'function' ? logMessage(m)   : console.log(m); }

// ══════════════════════════════════════════════════════════════════════
// 📰 NOTICIAS
// ══════════════════════════════════════════════════════════════════════

const EMISORAS_NOTICIAS = [
  { name:'W Radio',      emoji:'📻', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/WRADIOAAC.aac' },
  { name:'Caracol Radio',emoji:'🎙️', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/CARACOLRADIOA.aac' },
  { name:'Blu Radio',    emoji:'🔵', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/BLURADIOA.aac' },
  { name:'RCN Radio',    emoji:'📡', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/RCNRADIOA.aac' },
  { name:'La FM',        emoji:'🎵', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_FMAAC.aac' },
  { name:'Radio Nal.',   emoji:'🇨🇴', url:'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIONACIONAL.aac' },
];

const RSS_FEEDS = {
  general:    'https://www.eltiempo.com/rss/colombia.xml',
  tecnologia: 'https://www.eltiempo.com/rss/tecnosfera.xml',
  economia:   'https://www.eltiempo.com/rss/economia.xml',
  deportes:   'https://www.eltiempo.com/rss/deportes.xml',
};

let noticiaRadioPlayer = null;
let noticiaRadioActual  = null;
let rssCache = {};

function initNoticiasPanel() {
  renderEmisoras();
}

function renderEmisoras() {
  const grid = document.getElementById('newsRadioGrid');
  if (!grid) return;
  grid.innerHTML = EMISORAS_NOTICIAS.map((e, i) => `
    <div class="news-radio-card ${noticiaRadioActual===i?'playing':''}" onclick="toggleEmisora(${i})" id="newsCard${i}">
      <span class="news-radio-emoji">${e.emoji}</span>
      <span class="news-radio-name">${e.name}</span>
      <span class="news-radio-status" id="newsStatus${i}">${noticiaRadioActual===i?'▶ ON':'○'}</span>
    </div>
  `).join('');
}

function toggleEmisora(idx) {
  if (noticiaRadioActual === idx) {
    detenerEmisora();
  } else {
    if (noticiaRadioPlayer) { noticiaRadioPlayer.pause(); noticiaRadioPlayer.src=''; }
    noticiaRadioPlayer = new Audio(EMISORAS_NOTICIAS[idx].url);
    noticiaRadioPlayer.play().catch(()=>{});
    noticiaRadioActual = idx;
    _sv(`Sintonizando ${EMISORAS_NOTICIAS[idx].name}.`);
    _sl(`[NOTICIAS RADIO] ▶ ${EMISORAS_NOTICIAS[idx].name}`);
  }
  renderEmisoras();
}

function detenerEmisora() {
  if (noticiaRadioPlayer) { noticiaRadioPlayer.pause(); noticiaRadioPlayer.src=''; noticiaRadioPlayer=null; }
  noticiaRadioActual = null;
  renderEmisoras();
  _sv('Radio de noticias apagada.');
}

async function cargarRSS(cat, btn) {
  document.querySelectorAll('.rss-cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');

  const el = document.getElementById('rssList');
  el.innerHTML = '<p style="color:var(--text-muted);font-size:0.78rem;padding:16px;text-align:center;">Cargando...</p>';

  if (rssCache[cat] && Date.now()-rssCache[cat].ts < 600000) { renderRSS(rssCache[cat].items); return; }

  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_FEEDS[cat])}`;
    const res   = await fetch(proxy);
    const data  = await res.json();
    const xml   = new DOMParser().parseFromString(data.contents,'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0,8).map(i=>({
      title: i.querySelector('title')?.textContent||'',
      desc:  (i.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,'').trim().slice(0,100),
      link:  i.querySelector('link')?.textContent||'#'
    }));
    rssCache[cat] = { items, ts: Date.now() };
    renderRSS(items);
  } catch(e) {
    el.innerHTML = '<p style="color:#ef4444;font-size:0.78rem;padding:16px;text-align:center;">Error al cargar noticias</p>';
  }
}

function renderRSS(items) {
  const el = document.getElementById('rssList');
  if (!el) return;
  el.innerHTML = items.map(n=>`
    <div class="rss-item" onclick="responderVoz('${n.title.replace(/'/g,"'").slice(0,120)}')">
      <div class="rss-title">${n.title}</div>
      <div class="rss-desc">${n.desc}...</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════════════
// 🌤 CLIMA
// ══════════════════════════════════════════════════════════════════════

const OWM_KEY_STORAGE  = 'scall_owm_key';
const OWM_CIUDAD_KEY   = 'scall_owm_ciudad';

const CIUDADES = [
  { name:'Bogotá',       q:'Bogota,CO' },
  { name:'Medellín',     q:'Medellin,CO' },
  { name:'Cali',         q:'Cali,CO' },
  { name:'Barranquilla', q:'Barranquilla,CO' },
  { name:'Cartagena',    q:'Cartagena,CO' },
  { name:'Bucaramanga',  q:'Bucaramanga,CO' },
  { name:'Pereira',      q:'Pereira,CO' },
  { name:'Manizales',    q:'Manizales,CO' },
];

function getOwmKey() {
  return (window.APP_CONFIG&&window.APP_CONFIG.owmApiKey) || localStorage.getItem(OWM_KEY_STORAGE) || '';
}

function guardarOwmKey() {
  const key = document.getElementById('owmKeyInput').value.trim();
  if (!key) return;
  localStorage.setItem(OWM_KEY_STORAGE, key);
  document.getElementById('owmKeyInput').value = '';
  const st = document.getElementById('owmStatus');
  if (st) { st.textContent = '✅ API Key guardada'; st.style.color='var(--green)'; }
  _sl('[CLIMA] ✅ OWM API Key guardada en localStorage');
}

function initClimaPanel() {
  const grid = document.getElementById('ciudadGrid');
  if (!grid) return;
  const ciudadActual = localStorage.getItem(OWM_CIUDAD_KEY) || 'Bogota,CO';
  grid.innerHTML = CIUDADES.map(c=>`
    <button class="ciudad-btn ${c.q===ciudadActual?'active':''}"
      onclick="seleccionarCiudad('${c.q}','${c.name}',this)">
      ${c.name}
    </button>
  `).join('');
  // Mostrar clima de ciudad activa
  consultarClima(ciudadActual);
}

function seleccionarCiudad(q, nombre, btn) {
  localStorage.setItem(OWM_CIUDAD_KEY, q);
  document.querySelectorAll('.ciudad-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  consultarClima(q);
}

async function consultarClima(ciudadQ) {
  const apiKey = getOwmKey();
  const ciudad = ciudadQ || localStorage.getItem(OWM_CIUDAD_KEY) || 'Bogota,CO';
  const el     = document.getElementById('climaResult');

  if (!apiKey) {
    if (el) el.innerHTML = '<p style="color:#f59e0b;font-size:0.78rem;">⚠️ Ingresa tu API Key de OpenWeatherMap arriba.</p>';
    _sv('Para el clima necesito una clave de OpenWeatherMap.');
    return;
  }

  if (el) el.innerHTML = '<p style="color:var(--text-muted);font-size:0.78rem;">Consultando...</p>';

  try {
    const url  = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${apiKey}&units=metric&lang=es`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.cod !== 200) {
      if (el) el.innerHTML = `<p style="color:#ef4444;font-size:0.78rem;">❌ ${data.message}</p>`;
      return;
    }

    const temp  = Math.round(data.main.temp);
    const sens  = Math.round(data.main.feels_like);
    const desc  = data.weather[0].description;
    const hum   = data.main.humidity;
    const viento= Math.round(data.wind.speed*3.6);
    const emoji = temp>25?'☀️':temp>18?'⛅':temp>10?'🌧':'🌨';

    if (el) el.innerHTML = `
      <div class="clima-card">
        <div class="clima-main">
          <span style="font-size:2.5rem">${emoji}</span>
          <div>
            <div class="clima-temp">${temp}°C</div>
            <div class="clima-desc">${desc}</div>
          </div>
        </div>
        <div class="clima-details">
          <span>💧 ${hum}%</span>
          <span>🌡 Sensación ${sens}°C</span>
          <span>💨 ${viento} km/h</span>
        </div>
      </div>
    `;

    const nombre = data.name;
    const msg = `En ${nombre} hay ${desc}. ${temp} grados, sensación de ${sens}.`;
    _sv(msg);
    _sl(`[CLIMA] ✅ ${nombre}: ${temp}°C ${desc}`);

  } catch(e) {
    if (el) el.innerHTML = '<p style="color:#ef4444;font-size:0.78rem;">❌ Error de conexión</p>';
  }
}

// ══════════════════════════════════════════════════════════════════════
// 🌍 TRADUCTOR
// ══════════════════════════════════════════════════════════════════════

async function traducirUI() {
  const texto = document.getElementById('tradInput').value.trim();
  const lang  = document.getElementById('tradLang').value;
  const el    = document.getElementById('tradResult');

  if (!texto) { _sv('Escribe el texto a traducir.'); return; }

  if (el) el.innerHTML = '<p style="color:var(--text-muted);font-size:0.78rem;">Traduciendo...</p>';

  try {
    const res  = await fetch('https://libretranslate.com/translate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ q: texto, source:'auto', target: lang, format:'text' })
    });
    const data = await res.json();

    if (data.translatedText) {
      if (el) el.innerHTML = `
        <div class="trad-card">
          <div class="trad-original">${texto}</div>
          <div class="trad-arrow">↓</div>
          <div class="trad-translated">${data.translatedText}</div>
        </div>
      `;
      _sv(`Traducción: ${data.translatedText}`);
      _sl(`[TRAD] "${texto}" → "${data.translatedText}"`);
    } else {
      throw new Error('Sin resultado');
    }
  } catch {
    // Fallback
    try {
      const res2 = await fetch('https://translate.argosopentech.com/translate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({q:texto,source:'auto',target:lang})
      });
      const d2 = await res2.json();
      if (d2.translatedText) {
        if (el) el.innerHTML = `<div class="trad-card"><div class="trad-original">${texto}</div><div class="trad-arrow">↓</div><div class="trad-translated">${d2.translatedText}</div></div>`;
        _sv(`Traducción: ${d2.translatedText}`);
      }
    } catch {
      if (el) el.innerHTML = '<p style="color:#ef4444;font-size:0.78rem;">❌ Sin conexión al traductor</p>';
    }
  }
}

// traducirTexto (comando de voz): la definición activa vive en traductor.js
// (más idiomas, más patrones de extracción, fallback también si la API
// responde con error además de si falla la red, y toast visual).

// ══════════════════════════════════════════════════════════════════════
// 📋 CORPUS DE ENTRENAMIENTO
// ══════════════════════════════════════════════════════════════════════

const CORPUS_KEY = 'scall_corpus';

function getCorpus() {
  try { return JSON.parse(localStorage.getItem(CORPUS_KEY)) || []; } catch { return []; }
}

function agregarAlCorpus(frase) {
  if (!frase || frase.trim().length < 3) return;
  const corpus = getCorpus();
  // No duplicar
  if (corpus.some(c => c.frase.toLowerCase() === frase.toLowerCase())) return;
  corpus.unshift({
    frase: frase.trim(),
    ts: new Date().toLocaleString('es-CO'),
    intents: 0
  });
  if (corpus.length > 200) corpus.pop(); // máximo 200 frases
  localStorage.setItem(CORPUS_KEY, JSON.stringify(corpus));
}

function renderCorpus() {
  const el = document.getElementById('corpusList');
  if (!el) return;
  const corpus = getCorpus();
  if (corpus.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:16px;">Sin frases aún. Habla comandos no reconocidos para generarlas.</p>';
    return;
  }
  el.innerHTML = corpus.map((c,i) => `
    <div class="corpus-item">
      <div class="corpus-frase">"${c.frase}"</div>
      <div class="corpus-meta">${c.ts}</div>
    </div>
  `).join('');
}

function exportarCorpus() {
  const corpus = getCorpus();
  if (corpus.length === 0) { _sv('No hay frases en el corpus todavía.'); return; }
  const txt  = corpus.map(c => `[${c.ts}] ${c.frase}`).join('\n');
  const blob = new Blob([txt], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `scall_corpus_${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  _sl(`[CORPUS] Exportado ${corpus.length} frases`);
}

function limpiarCorpus() {
  if (!confirm('¿Limpiar todo el corpus?')) return;
  localStorage.removeItem(CORPUS_KEY);
  renderCorpus();
}

// El listener de 'load' que reactiva alarmas y pide permiso de notificaciones
// vive en alarms.js — no se duplica aquí.
