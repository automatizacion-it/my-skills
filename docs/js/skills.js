// =====================================================================
// SKILLS.JS — SCALL
// Alarmas · Noticias · Clima · Traductor · Corpus Log
// =====================================================================

// ══════════════════════════════════════════════════════════════════════
// UTILIDADES PANEL
// ══════════════════════════════════════════════════════════════════════

function togglePanel(id) {
  const panels = document.querySelectorAll('.skill-panel');
  panels.forEach(p => {
    if (p.id === id) {
      const visible = p.style.display !== 'none';
      p.style.display = visible ? 'none' : 'block';
      if (!visible) initPanel(id);
    } else {
      p.style.display = 'none';
    }
  });
}

function initPanel(id) {
  if (id === 'alarmaPanel')   initAlarmaPanel();
  if (id === 'noticiasPanel') initNoticiasPanel();
  if (id === 'climaPanel')    initClimaPanel();
  if (id === 'corpusPanel')   renderCorpus();
}

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
// ⏰ ALARMAS
// ══════════════════════════════════════════════════════════════════════

const ALARMAS_KEY  = 'scall_alarmas';
const SONIDO_KEY   = 'scall_sonido';
let alarmasActivas = {};
let sonidoOn       = true;

function getSonido() { return localStorage.getItem(SONIDO_KEY) !== 'off'; }
function toggleSonido() {
  sonidoOn = !sonidoOn;
  localStorage.setItem(SONIDO_KEY, sonidoOn ? 'on' : 'off');
  const btn = document.getElementById('soundToggle');
  if (btn) { btn.textContent = sonidoOn ? 'ON' : 'OFF'; btn.className = 'sound-toggle ' + (sonidoOn ? 'on' : 'off'); }
}

function getAlarmas() {
  try { return JSON.parse(localStorage.getItem(ALARMAS_KEY)) || []; } catch { return []; }
}
function saveAlarmas(l) { localStorage.setItem(ALARMAS_KEY, JSON.stringify(l)); }

// Calendario
function initAlarmaPanel() {
  sonidoOn = getSonido();
  const btn = document.getElementById('soundToggle');
  if (btn) { btn.textContent = sonidoOn ? 'ON' : 'OFF'; btn.className = 'sound-toggle ' + (sonidoOn ? 'on' : 'off'); }
  renderCalendario();
  renderAlarmaLista();
  pedirPermisoNotificacion();
}

function renderCalendario() {
  const el = document.getElementById('alarmCalendar');
  if (!el) return;
  const hoy  = new Date();
  const year = hoy.getFullYear();
  const month= hoy.getMonth();
  const MESES= ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const DIAS = ['D','L','M','X','J','V','S'];
  const primer = new Date(year, month, 1).getDay();
  const total  = new Date(year, month + 1, 0).getDate();

  let html = `<div class="cal-header">${MESES[month]} ${year}</div>`;
  html += '<div class="cal-grid">';
  DIAS.forEach(d => html += `<div class="cal-cell cal-day-name">${d}</div>`);
  for (let i = 0; i < primer; i++) html += '<div class="cal-cell"></div>';
  for (let d = 1; d <= total; d++) {
    const isHoy = d === hoy.getDate();
    html += `<div class="cal-cell${isHoy ? ' cal-hoy' : ''}" onclick="seleccionarDia(${d})" id="calDia${d}">${d}</div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

let diaSeleccionado = new Date().getDate();
function seleccionarDia(d) {
  document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-sel'));
  const el = document.getElementById('calDia' + d);
  if (el) el.classList.add('cal-sel');
  diaSeleccionado = d;
}

function guardarAlarmaUI() {
  const hora    = parseInt(document.getElementById('alarmHora').value);
  const minuto  = parseInt(document.getElementById('alarmMin').value);
  const tipo    = document.getElementById('alarmTipo').value;
  const mensaje = document.getElementById('alarmMsg').value.trim() || tipoMensaje(tipo);
  const repetir = document.getElementById('alarmRepetir').checked;

  crearAlarma({ hora, minuto, tipo, mensaje, repetir });
  document.getElementById('alarmMsg').value = '';
  renderAlarmaLista();
}

function tipoMensaje(tipo) {
  if (tipo === 'medicamento') return 'Es hora de tomar tu medicamento.';
  if (tipo === 'recordatorio') return 'Tienes un recordatorio.';
  return 'Alarma activa.';
}

function crearAlarma({ hora, minuto, tipo = 'alarma', mensaje, repetir = false }) {
  const lista = getAlarmas();
  const id    = Date.now();
  lista.push({ id, hora, minuto, mensaje, tipo, repetir, activa: true });
  saveAlarmas(lista);
  iniciarChequeoAlarma({ id, hora, minuto, mensaje, tipo, repetir });
  _sv(`Alarma de ${tipo} configurada para las ${hora} con ${minuto}.`);
  _sl(`[ALARMA] ✅ ${tipo} → ${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`);
}

function iniciarChequeoAlarma(a) {
  if (alarmasActivas[a.id]) clearInterval(alarmasActivas[a.id]);
  alarmasActivas[a.id] = setInterval(() => {
    const n = new Date();
    if (n.getHours() === a.hora && n.getMinutes() === a.minuto && n.getSeconds() < 20) {
      dispararAlarma(a);
      if (!a.repetir) {
        clearInterval(alarmasActivas[a.id]);
        delete alarmasActivas[a.id];
        saveAlarmas(getAlarmas().map(x => x.id === a.id ? { ...x, activa: false } : x));
        renderAlarmaLista();
      }
    }
  }, 10000);
}

function dispararAlarma(a) {
  const emojis = { alarma:'⏰', recordatorio:'📌', medicamento:'💊' };
  const e = emojis[a.tipo] || '⏰';
  if (sonidoOn) _sv(a.mensaje);
  _sl(`[ALARMA] ${e} DISPARADA: "${a.mensaje}"`);
  if (Notification.permission === 'granted')
    new Notification(`SCALL ${e}`, { body: a.mensaje, icon: '/favicon.ico' });

  const toast = document.createElement('div');
  toast.className = 'alarm-toast';
  toast.innerHTML = `<span style="font-size:1.8rem">${e}</span><div><strong>${a.mensaje}</strong><small>${String(a.hora).padStart(2,'0')}:${String(a.minuto).padStart(2,'0')}</small></div><button onclick="this.parentElement.remove()">✕</button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 15000);
}

function eliminarAlarma(id) {
  if (alarmasActivas[id]) { clearInterval(alarmasActivas[id]); delete alarmasActivas[id]; }
  saveAlarmas(getAlarmas().filter(a => a.id !== id));
  renderAlarmaLista();
}

function renderAlarmaLista() {
  const el = document.getElementById('alarmaLista');
  if (!el) return;
  const lista = getAlarmas();
  if (lista.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:12px;">Sin alarmas</p>'; return; }
  const emojis = { alarma:'⏰', recordatorio:'📌', medicamento:'💊' };
  el.innerHTML = lista.map(a => `
    <div class="alarm-item ${a.activa ? '' : 'alarm-inactive'}">
      <span>${emojis[a.tipo]||'⏰'}</span>
      <div class="alarm-item-info">
        <strong>${String(a.hora).padStart(2,'0')}:${String(a.minuto).padStart(2,'0')}</strong>
        <small>${a.mensaje}</small>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        ${a.repetir ? '<span style="font-size:0.6rem;color:var(--glow);font-family:monospace;">↺</span>' : ''}
        <button onclick="eliminarAlarma(${a.id})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.72rem;">✕</button>
      </div>
    </div>
  `).join('');
}

// Parser voz alarma
function parsearAlarmaVoz(cmd) {
  const m = cmd.match(/(\d{1,2})(?:\s*y\s*(\d{1,2}))?\s*(?:de\s+la\s+(mañana|tarde|noche))?/);
  if (!m) return null;
  let hora = parseInt(m[1]), min = parseInt(m[2]||'0');
  if (m[3]==='tarde'||m[3]==='noche') { if(hora<12) hora+=12; }
  let tipo='alarma', mensaje='';
  if (cmd.includes('medicamento')||cmd.includes('pastilla')) { tipo='medicamento'; mensaje='Toma tu medicamento.'; }
  else if (cmd.includes('recordatorio')||cmd.includes('recuérdame')) { tipo='recordatorio'; mensaje='Tienes un recordatorio.'; }
  else if (cmd.includes('despierta')) { mensaje='¡Buenos días! Hora de levantarse.'; }
  return { hora, minuto: min, tipo, mensaje, repetir: cmd.includes('todos los días') };
}

// Temporizador
let timerInt = null, timerSeg = 0;
function iniciarTimer(seg) {
  if (timerInt) clearInterval(timerInt);
  timerSeg = seg;
  _sv(`Temporizador de ${formatSeg(seg)} iniciado.`);
  timerInt = setInterval(() => {
    timerSeg--;
    if (timerSeg <= 0) {
      clearInterval(timerInt); timerInt = null;
      _sv('¡El temporizador terminó!');
      if (Notification.permission==='granted') new Notification('SCALL ⏱',{body:'¡Terminó!'});
    }
  }, 1000);
}
function parsearTimer(cmd) {
  let t = 0;
  const h=cmd.match(/(\d+)\s*hora/), m=cmd.match(/(\d+)\s*minuto/), s=cmd.match(/(\d+)\s*segundo/);
  if(h) t+=parseInt(h[1])*3600; if(m) t+=parseInt(m[1])*60; if(s) t+=parseInt(s[1]);
  return t;
}
function formatSeg(s) {
  const m=Math.floor(s/60), sec=s%60;
  return `${m>0?m+' minutos ':''} ${sec>0?sec+' segundos':''}`.trim();
}

// Cronómetro
let cronInt=null, cronSeg=0, cronActivo=false;
function iniciarCronometro() {
  if(cronActivo){_sv('El cronómetro ya corre.');return;}
  cronSeg=0; cronActivo=true;
  cronInt=setInterval(()=>cronSeg++,1000);
  _sv('Cronómetro iniciado.');
}
function pausarCronometro() { if(cronInt){clearInterval(cronInt);cronInt=null;} cronActivo=false; _sv(`Cronómetro pausado en ${formatSeg(cronSeg)}.`); }
function reiniciarCronometro() { pausarCronometro(); cronSeg=0; _sv('Cronómetro reiniciado.'); }
function leerCronometro() { _sv(`El cronómetro lleva ${formatSeg(cronSeg)}.`); }

function pedirPermisoNotificacion() {
  if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
}

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

// Desde voz
const IDIOMAS_VOZ = { 'inglés':'en','ingles':'en','francés':'fr','frances':'fr','portugués':'pt','portugues':'pt','alemán':'de','aleman':'de','italiano':'it','chino':'zh','japonés':'ja','japones':'ja' };

async function traducirTexto(cmd) {
  let texto = '', lang = 'en';
  for (const [nombre, cod] of Object.entries(IDIOMAS_VOZ)) {
    if (cmd.includes(nombre)) { lang = cod; break; }
  }
  const m = cmd.match(/traduce?\s+(.+?)\s+al?\s+\w+/i) || cmd.match(/cómo\s+se\s+dice\s+(.+?)\s+en/i);
  if (m) texto = m[1].trim();
  if (!texto) { _sv('¿Qué quieres traducir? Di por ejemplo: traduce hola al inglés.'); return; }

  try {
    const res  = await fetch('https://libretranslate.com/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:texto,source:'auto',target:lang,format:'text'})});
    const data = await res.json();
    if (data.translatedText) _sv(`${texto} en ese idioma se dice: ${data.translatedText}`);
  } catch { _sv('No pude conectarme al traductor.'); }
}

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

// ══════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
  pedirPermisoNotificacion();
  sonidoOn = getSonido();
  // Reactivar alarmas guardadas
  getAlarmas().filter(a=>a.activa).forEach(a=>iniciarChequeoAlarma(a));
});
