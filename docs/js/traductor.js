// =====================================================================
// MÓDULO TRADUCTOR — LibreTranslate (gratis, sin key)
// =====================================================================

const LIBRETRANSLATE_URL = 'https://libretranslate.com/translate';

const IDIOMAS = {
  'inglés':    'en', 'ingles':    'en', 'english':   'en',
  'español':   'es', 'espanol':   'es', 'spanish':   'es',
  'francés':   'fr', 'frances':   'fr', 'french':    'fr',
  'portugués': 'pt', 'portugues': 'pt', 'portuguese':'pt',
  'alemán':    'de', 'aleman':    'de', 'german':    'de',
  'italiano':  'it', 'italian':   'it',
  'chino':     'zh', 'chinese':   'zh',
  'japonés':   'ja', 'japones':   'ja', 'japanese':  'ja',
};

function detectarIdioma(comando) {
  for (const [nombre, codigo] of Object.entries(IDIOMAS)) {
    if (comando.includes(nombre)) return { nombre, codigo };
  }
  return { nombre: 'inglés', codigo: 'en' }; // default
}

async function traducirTexto(comando) {
  // Patrones: "traduce X al inglés", "cómo se dice X en inglés"
  let texto = '';
  let targetLang = detectarIdioma(comando);

  // Extraer texto a traducir
  const patrones = [
    /traduce?\s+(.+?)\s+(?:al?|en)\s+\w+/i,
    /cómo\s+se\s+dice\s+(.+?)\s+en\s+\w+/i,
    /(?:di|dime)\s+(.+?)\s+en\s+\w+/i,
  ];

  for (const patron of patrones) {
    const match = comando.match(patron);
    if (match) { texto = match[1].trim(); break; }
  }

  if (!texto) {
    _tradVoz('¿Qué quieres que traduzca? Di por ejemplo: traduce hola al inglés.');
    return;
  }

  _tradLog(`[TRADUCTOR] 🌍 "${texto}" → ${targetLang.nombre}`);

  try {
    const res = await fetch(LIBRETRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texto,
        source: 'auto',
        target: targetLang.codigo,
        format: 'text'
      })
    });

    const data = await res.json();

    if (data.error) {
      // Fallback a instancia alternativa
      await traducirFallback(texto, targetLang);
      return;
    }

    const traduccion = data.translatedText;
    _tradVoz(`${texto} en ${targetLang.nombre} se dice: ${traduccion}.`);
    mostrarToastTraduccion(texto, traduccion, targetLang.nombre);
    _tradLog(`[TRADUCTOR] ✅ "${texto}" → "${traduccion}"`);

  } catch (e) {
    await traducirFallback(texto, targetLang);
  }
}

async function traducirFallback(texto, targetLang) {
  // Instancia alternativa gratuita
  try {
    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texto, source: 'auto', target: targetLang.codigo })
    });
    const data = await res.json();
    const traduccion = data.translatedText || '';
    if (traduccion) {
      _tradVoz(`${texto} en ${targetLang.nombre} se dice: ${traduccion}.`);
      mostrarToastTraduccion(texto, traduccion, targetLang.nombre);
      return;
    }
  } catch {}
  _tradVoz('No pude conectarme al traductor. Intenta de nuevo.');
  _tradLog('[TRADUCTOR] ❌ Sin conexión a LibreTranslate');
}

function mostrarToastTraduccion(original, traduccion, idioma) {
  const existing = document.getElementById('tradToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'tradToast';
  toast.style.cssText = `
    position:fixed;top:70px;right:16px;
    width:min(300px,calc(100vw - 32px));
    background:var(--surface,#1e293b);
    border:1px solid rgba(123,97,255,0.3);
    border-radius:14px;padding:16px;z-index:20000;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    font-family:var(--font-body,sans-serif);
    animation:slideInRight 0.3s ease;
  `;
  toast.innerHTML = `
    <style>@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}</style>
    <div style="font-size:0.68rem;color:#64748b;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🌍 Traducción al ${idioma}</div>
    <div style="font-size:0.85rem;color:#64748b;margin-bottom:6px;">${original}</div>
    <div style="font-size:1.1rem;font-weight:700;color:var(--text,#f8fafc);">${traduccion}</div>
    <button onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#64748b;cursor:pointer;">✕</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 12000);
}

function _tradLog(m) { typeof logMessage  === 'function' ? logMessage(m)  : console.log(m); }
function _tradVoz(m) { typeof responderVoz === 'function' ? responderVoz(m) : console.warn(m); }
