// =====================================================================
// MÓDULO NOTICIAS — RSS feeds Colombia via allorigins.win (CORS proxy)
// =====================================================================

const FEEDS = {
  general:   'https://www.eltiempo.com/rss/colombia.xml',
  tecnologia:'https://www.eltiempo.com/rss/tecnosfera.xml',
  economia:  'https://www.eltiempo.com/rss/economia.xml',
  deportes:  'https://www.eltiempo.com/rss/deportes.xml',
  bogota:    'https://www.eltiempo.com/rss/bogota.xml',
};

let noticiaCache = {};

async function consultarNoticias(categoria) {
  const cat  = categoria || 'general';
  const feed = FEEDS[cat] || FEEDS.general;

  // Caché de 10 minutos
  const cacheKey = `noticias_${cat}`;
  const cached   = noticiaCache[cacheKey];
  if (cached && (Date.now() - cached.ts) < 600000) {
    leerNoticia(cached.items);
    return;
  }

  _notLog(`[NOTICIAS] 📡 Obteniendo ${cat}...`);

  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(feed)}`;
    const res   = await fetch(proxy);
    const data  = await res.json();

    const parser  = new DOMParser();
    const xml     = parser.parseFromString(data.contents, 'text/xml');
    const items   = Array.from(xml.querySelectorAll('item')).slice(0, 5).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      desc:  item.querySelector('description')?.textContent?.replace(/<[^>]+>/g,'').trim().slice(0,120) || ''
    }));

    if (items.length === 0) {
      _notVoz('No encontré noticias en este momento.');
      return;
    }

    noticiaCache[cacheKey] = { items, ts: Date.now() };
    leerNoticia(items);

  } catch (e) {
    _notVoz('No pude obtener las noticias. Verifica tu conexión.');
    _notLog(`[NOTICIAS] ❌ ${e.message}`);
  }
}

let noticiaActual = [];
let noticiaIdx    = 0;

function leerNoticia(items) {
  noticiaActual = items;
  noticiaIdx    = 0;

  mostrarToastNoticias(items);
  _notVoz(`Tengo ${items.length} noticias. ${items[0].title}.`);
  _notLog(`[NOTICIAS] ✅ ${items.length} artículos cargados.`);
}

function siguienteNoticia() {
  if (noticiaActual.length === 0) { _notVoz('Primero pide las noticias.'); return; }
  noticiaIdx = (noticiaIdx + 1) % noticiaActual.length;
  _notVoz(`Noticia ${noticiaIdx + 1}: ${noticiaActual[noticiaIdx].title}.`);
}

function mostrarToastNoticias(items) {
  const existing = document.getElementById('noticiasToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'noticiasToast';
  toast.style.cssText = `
    position:fixed;bottom:90px;right:16px;
    width:min(320px,calc(100vw - 32px));
    background:var(--surface,#1e293b);
    border:1px solid var(--border,rgba(255,255,255,0.1));
    border-radius:16px;padding:0;z-index:19999;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    overflow:hidden;font-family:var(--font-body,sans-serif);
  `;

  toast.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.72rem;font-family:monospace;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">📰 Noticias Colombia</span>
      <button onclick="this.closest('#noticiasToast').remove()" style="background:none;border:none;color:#64748b;cursor:pointer;">✕</button>
    </div>
    <div style="max-height:280px;overflow-y:auto;">
      ${items.map((n, i) => `
        <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;"
             onclick="responderVoz('${n.title.replace(/'/g,"'").slice(0,100)}')">
          <div style="font-size:0.82rem;font-weight:600;color:var(--text,#f8fafc);line-height:1.3;margin-bottom:4px;">${n.title}</div>
          <div style="font-size:0.72rem;color:#64748b;line-height:1.4;">${n.desc.slice(0,90)}...</div>
        </div>
      `).join('')}
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 30000);
}

function _notLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _notVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn(m); }
