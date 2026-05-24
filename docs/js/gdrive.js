// =====================================================================
// GOOGLE DRIVE — SCALL
// Integración OAuth2 PKCE (sin client_secret en frontend)
// Buscar, leer y subir archivos por voz
// =====================================================================

if (window._SCALL_GDRIVE_LOADED) {
  console.warn('[GDRIVE] Módulo ya cargado');
} else {
window._SCALL_GDRIVE_LOADED = true;

// ── Configuración ─────────────────────────────────────────────────────
var GDRIVE_CONFIG = {
  client_id:    '1072126141402-pprdrov0tvilq1l7hn6npddlfi4gur1k.apps.googleusercontent.com',
  redirect_uri: 'https://automatizacion-it.github.io/my-skills/',
  scope:        'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
  token_key:    'scall_gdrive_token',
  expiry_key:   'scall_gdrive_expiry'
};

var GDRIVE_API  = 'https://www.googleapis.com/drive/v3';
var GDRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// ── Estado ────────────────────────────────────────────────────────────
var gdriveToken   = null;
var gdrivePanel   = null;
var gdriveResults = [];

// ══════════════════════════════════════════════════════════════════════
// OAUTH2 — TOKEN IMPLÍCITO (PKCE no requiere secret)
// ══════════════════════════════════════════════════════════════════════

function gdriveGetToken() {
  // 1. Verificar token en memoria
  if (gdriveToken) return gdriveToken;
  // 2. Verificar token en localStorage (con expiración)
  var saved  = localStorage.getItem(GDRIVE_CONFIG.token_key);
  var expiry = parseInt(localStorage.getItem(GDRIVE_CONFIG.expiry_key) || '0');
  if (saved && Date.now() < expiry) {
    gdriveToken = saved;
    return gdriveToken;
  }
  // 3. Verificar si llegó en el hash (después del redirect OAuth)
  var hash = window.location.hash;
  if (hash.includes('access_token')) {
    var params = new URLSearchParams(hash.replace('#', '?'));
    var token  = params.get('access_token');
    var expin  = parseInt(params.get('expires_in') || '3600');
    if (token) {
      gdriveToken = token;
      localStorage.setItem(GDRIVE_CONFIG.token_key,  token);
      localStorage.setItem(GDRIVE_CONFIG.expiry_key, Date.now() + expin * 1000);
      // Limpiar hash de la URL
      history.replaceState(null, '', window.location.pathname);
      _gLog('[GDRIVE] ✅ Token recibido y guardado');
      actualizarUIGDrive(true);
      return token;
    }
  }
  return null;
}

function gdriveAutorizar() {
  var url = 'https://accounts.google.com/o/oauth2/v2/auth?' + [
    'client_id='     + encodeURIComponent(GDRIVE_CONFIG.client_id),
    'redirect_uri='  + encodeURIComponent(GDRIVE_CONFIG.redirect_uri),
    'response_type=token',
    'scope='         + encodeURIComponent(GDRIVE_CONFIG.scope),
    'prompt=consent',
    'include_granted_scopes=true'
  ].join('&');
  _gLog('[GDRIVE] Abriendo OAuth...');
  window.location.href = url;
}

function gdriveCerrarSesion() {
  gdriveToken = null;
  localStorage.removeItem(GDRIVE_CONFIG.token_key);
  localStorage.removeItem(GDRIVE_CONFIG.expiry_key);
  actualizarUIGDrive(false);
  _gLog('[GDRIVE] Sesión cerrada');
  if (typeof responderVoz === 'function') responderVoz('Google Drive desconectado.');
}

function gdriveConectado() {
  return !!gdriveGetToken();
}

// ══════════════════════════════════════════════════════════════════════
// API DRIVE — OPERACIONES
// ══════════════════════════════════════════════════════════════════════

async function gdriveRequest(endpoint, options) {
  var token = gdriveGetToken();
  if (!token) {
    if (typeof responderVoz === 'function') responderVoz('Primero conecta tu Google Drive en Config.');
    return null;
  }
  var opts = Object.assign({ method: 'GET', headers: {} }, options || {});
  opts.headers['Authorization'] = 'Bearer ' + token;
  try {
    var resp = await fetch(GDRIVE_API + endpoint, opts);
    if (resp.status === 401) {
      _gLog('[GDRIVE] Token expirado — reconectando');
      gdriveCerrarSesion();
      if (typeof responderVoz === 'function') responderVoz('Tu sesión de Drive expiró. Reconectando...');
      setTimeout(gdriveAutorizar, 1500);
      return null;
    }
    return await resp.json();
  } catch(e) {
    _gLog('[GDRIVE] Error: ' + e.message);
    return null;
  }
}

// Buscar archivos
async function gdriveBuscar(query) {
  _gLog('[GDRIVE] Buscando: ' + query);
  if (typeof logMessage === 'function') logMessage('[GDRIVE] Buscando: "' + query + '"');

  var q = "name contains '" + query.replace(/'/g, "\\'") + "' and trashed=false";
  var data = await gdriveRequest(
    '/files?q=' + encodeURIComponent(q) +
    '&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=10'
  );
  if (!data || !data.files) return [];
  gdriveResults = data.files;
  renderResultadosDrive(data.files);
  return data.files;
}

// Buscar por tipo
async function gdriveBuscarTipo(tipo) {
  var mimeMap = {
    'documentos': 'application/vnd.google-apps.document',
    'hojas':      'application/vnd.google-apps.spreadsheet',
    'sheets':     'application/vnd.google-apps.spreadsheet',
    'presentaciones':'application/vnd.google-apps.presentation',
    'pdfs':       'application/pdf',
    'imagenes':   'image/',
    'carpetas':   'application/vnd.google-apps.folder'
  };
  var mime = mimeMap[tipo] || tipo;
  var q = "mimeType contains '" + mime + "' and trashed=false";
  var data = await gdriveRequest(
    '/files?q=' + encodeURIComponent(q) +
    '&fields=files(id,name,mimeType,modifiedTime)&pageSize=10' +
    '&orderBy=modifiedTime desc'
  );
  if (!data || !data.files) return [];
  gdriveResults = data.files;
  renderResultadosDrive(data.files);
  return data.files;
}

// Archivos recientes
async function gdriveRecientes() {
  var data = await gdriveRequest(
    '/files?orderBy=modifiedTime desc' +
    '&fields=files(id,name,mimeType,modifiedTime)&pageSize=10' +
    '&q=trashed=false'
  );
  if (!data || !data.files) return [];
  gdriveResults = data.files;
  renderResultadosDrive(data.files);
  return data.files;
}

// Leer contenido de texto de un archivo
async function gdriveLeerArchivo(fileId) {
  var token = gdriveGetToken();
  if (!token) return null;
  // Para Google Docs → exportar como texto plano
  var resp = await fetch(GDRIVE_API + '/files/' + fileId + '/export?mimeType=text/plain', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) {
    // Para archivos normales → descargar directamente
    resp = await fetch(GDRIVE_API + '/files/' + fileId + '?alt=media', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
  }
  if (!resp.ok) return null;
  return await resp.text();
}

// Abrir archivo en nueva pestaña
function gdriveAbrirArchivo(fileId, nombre) {
  window.open('https://drive.google.com/file/d/' + fileId + '/view', '_blank');
  if (typeof responderVoz === 'function') responderVoz('Abriendo ' + (nombre || 'el archivo') + ' en Drive.');
}

// Subir archivo de texto
async function gdriveSubirTexto(nombre, contenido) {
  var token = gdriveGetToken();
  if (!token) return null;
  var boundary  = 'scall_boundary';
  var metadata  = JSON.stringify({ name: nombre, mimeType: 'text/plain' });
  var body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: text/plain\r\n\r\n' +
    contenido + '\r\n' +
    '--' + boundary + '--';

  var resp = await fetch(GDRIVE_UPLOAD + '/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary=' + boundary
    },
    body: body
  });
  if (!resp.ok) return null;
  var data = await resp.json();
  _gLog('[GDRIVE] Archivo subido: ' + data.name);
  return data;
}

// Info de la cuenta
async function gdriveInfoUsuario() {
  var data = await gdriveRequest('/about?fields=user,storageQuota');
  if (!data) return null;
  var user    = data.user;
  var quota   = data.storageQuota;
  var usadoGB = quota ? (parseInt(quota.usage||0)/(1024**3)).toFixed(2) : '?';
  var totalGB = quota && quota.limit ? (parseInt(quota.limit)/(1024**3)).toFixed(0) : '15';
  return { nombre: user.displayName, email: user.emailAddress, usadoGB, totalGB };
}

// ══════════════════════════════════════════════════════════════════════
// PANEL UI
// ══════════════════════════════════════════════════════════════════════

function abrirPanelDrive() {
  if (!gdrivePanel) crearPanelDrive();
  gdrivePanel.style.display = 'flex';
  actualizarUIGDrive(gdriveConectado());
  if (gdriveConectado()) gdriveRecientes();
}

function cerrarPanelDrive() {
  if (gdrivePanel) gdrivePanel.style.display = 'none';
}

function crearPanelDrive() {
  gdrivePanel = document.createElement('div');
  gdrivePanel.id = 'scall-drive-panel';
  gdrivePanel.style.cssText = [
    'position:fixed','top:60px','left:10px',
    'width:380px','max-height:calc(100dvh - 80px)',
    'background:#0d1117',
    'border:1px solid rgba(66,133,244,0.25)',
    'border-radius:16px',
    'box-shadow:0 0 40px rgba(66,133,244,0.08),0 20px 60px rgba(0,0,0,0.8)',
    'z-index:1900','display:none','flex-direction:column',
    'overflow:hidden','font-family:DM Mono,monospace'
  ].join(';');

  gdrivePanel.innerHTML =
    // Header
    '<div id="gdrive-drag" style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:12px 16px;background:rgba(66,133,244,0.06);border-bottom:1px solid rgba(66,133,244,0.12);' +
    'cursor:grab;user-select:none;flex-shrink:0;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<svg width="16" height="16" viewBox="0 0 87.3 78" style="flex-shrink:0">' +
          '<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>' +
          '<path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>' +
          '<path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>' +
          '<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>' +
          '<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>' +
          '<path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>' +
        '</svg>' +
        '<span style="font-size:10px;letter-spacing:.14em;color:rgba(66,133,244,.7);">GOOGLE DRIVE</span>' +
      '</div>' +
      '<button onclick="cerrarPanelDrive()" style="background:transparent;border:1px solid rgba(255,255,255,.1);' +
        'color:rgba(255,255,255,.3);width:26px;height:26px;border-radius:7px;cursor:pointer;">✕</button>' +
    '</div>' +

    // Estado conexión
    '<div id="gdrive-estado" style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;">' +
      '<div id="gdrive-no-conectado">' +
        '<p style="font-size:.72rem;color:rgba(255,255,255,.4);margin:0 0 10px;">Conecta tu cuenta para buscar y gestionar archivos por voz.</p>' +
        '<button onclick="gdriveAutorizar()" style="width:100%;padding:10px;border-radius:9px;cursor:pointer;' +
          'background:rgba(66,133,244,.15);border:1px solid rgba(66,133,244,.4);' +
          'color:rgba(100,160,255,1);font-size:.8rem;font-family:DM Mono,monospace;' +
          'letter-spacing:.06em;">🔗 Conectar Google Drive</button>' +
      '</div>' +
      '<div id="gdrive-si-conectado" style="display:none;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div id="gdrive-user-name" style="font-size:.78rem;color:rgba(255,255,255,.8);"></div>' +
            '<div id="gdrive-user-email" style="font-size:.65rem;color:rgba(255,255,255,.3);"></div>' +
          '</div>' +
          '<button onclick="gdriveCerrarSesion()" style="font-size:.65rem;padding:4px 9px;border-radius:6px;' +
            'background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);' +
            'color:rgba(255,120,120,.7);cursor:pointer;font-family:DM Mono,monospace;">Desconectar</button>' +
        '</div>' +
        '<div id="gdrive-quota" style="font-size:.62rem;color:rgba(255,255,255,.2);margin-top:4px;"></div>' +
      '</div>' +
    '</div>' +

    // Búsqueda
    '<div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;">' +
      '<div style="display:flex;gap:6px;">' +
        '<input id="gdrive-search-input" type="text" placeholder="Buscar en Drive..." ' +
          'style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);' +
          'border-radius:8px;padding:7px 10px;color:#e0e6f0;font-size:.78rem;' +
          'font-family:DM Mono,monospace;outline:none;" ' +
          'onkeydown="if(event.key===\'Enter\') gdriveBuscarUI()">' +
        '<button onclick="gdriveBuscarUI()" ' +
          'style="padding:7px 12px;border-radius:8px;cursor:pointer;' +
          'background:rgba(66,133,244,.15);border:1px solid rgba(66,133,244,.3);' +
          'color:rgba(100,160,255,.9);font-size:.75rem;font-family:DM Mono,monospace;">🔍</button>' +
      '</div>' +
      '<div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;">' +
        '<button onclick="gdriveRecientes().then(function(){actualizarUIGDrive(true);})" ' +
          'style="' + gdriveChipStyle() + '">Recientes</button>' +
        '<button onclick="gdriveBuscarTipo(\'documentos\')" style="' + gdriveChipStyle() + '">📄 Docs</button>' +
        '<button onclick="gdriveBuscarTipo(\'hojas\')"      style="' + gdriveChipStyle() + '">📊 Sheets</button>' +
        '<button onclick="gdriveBuscarTipo(\'pdfs\')"       style="' + gdriveChipStyle() + '">📕 PDFs</button>' +
        '<button onclick="gdriveBuscarTipo(\'imagenes\')"   style="' + gdriveChipStyle() + '">🖼 Imgs</button>' +
      '</div>' +
    '</div>' +

    // Resultados
    '<div id="gdrive-results" style="flex:1;overflow-y:auto;padding:8px 14px;scrollbar-width:thin;' +
    'scrollbar-color:rgba(66,133,244,.2) transparent;">' +
      '<p style="font-size:.68rem;color:rgba(255,255,255,.2);text-align:center;padding:20px 0;">Di "busca en Drive" o escribe arriba</p>' +
    '</div>';

  document.body.appendChild(gdrivePanel);
  gdriveActivarDrag(gdrivePanel);
}

function gdriveChipStyle() {
  return 'font-size:.68rem;padding:3px 9px;border-radius:5px;cursor:pointer;' +
    'font-family:DM Mono,monospace;background:rgba(255,255,255,.04);' +
    'border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);transition:all .2s;';
}

async function gdriveBuscarUI() {
  var input = document.getElementById('gdrive-search-input');
  if (!input || !input.value.trim()) return;
  var resultEl = document.getElementById('gdrive-results');
  if (resultEl) resultEl.innerHTML = '<p style="font-size:.68rem;color:rgba(255,255,255,.25);text-align:center;padding:20px 0;">Buscando...</p>';
  await gdriveBuscar(input.value.trim());
}

function renderResultadosDrive(files) {
  var el = document.getElementById('gdrive-results');
  if (!el) return;

  if (!files || files.length === 0) {
    el.innerHTML = '<p style="font-size:.68rem;color:rgba(255,255,255,.2);text-align:center;padding:20px 0;">Sin resultados</p>';
    return;
  }

  var iconMap = {
    'application/vnd.google-apps.document':     '📄',
    'application/vnd.google-apps.spreadsheet':  '📊',
    'application/vnd.google-apps.presentation': '📊',
    'application/vnd.google-apps.folder':       '📁',
    'application/pdf':                          '📕',
    'image/':                                   '🖼',
    'video/':                                   '🎬',
    'audio/':                                   '🎵'
  };

  function getIcon(mime) {
    for (var k in iconMap) { if (mime && mime.startsWith(k)) return iconMap[k]; }
    return '📎';
  }

  el.innerHTML = files.map(function(f, idx) {
    var fecha = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('es-CO') : '';
    var icon  = getIcon(f.mimeType);
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 6px;' +
      'border-radius:8px;cursor:pointer;border:0.5px solid transparent;margin-bottom:3px;' +
      'transition:all .15s;" ' +
      'onmouseover="this.style.background=\'rgba(66,133,244,.08)\';this.style.borderColor=\'rgba(66,133,244,.2)\'" ' +
      'onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'transparent\'" ' +
      'onclick="gdriveAbrirArchivo(\'' + f.id + '\',\'' + f.name.replace(/'/g,"\\'") + '\')">' +
      '<span style="font-size:1rem;flex-shrink:0;">' + icon + '</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:.72rem;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + f.name + '</div>' +
        '<div style="font-size:.6rem;color:rgba(255,255,255,.25);">' + fecha + '</div>' +
      '</div>' +
      '<button onclick="event.stopPropagation();gdriveAbrirArchivo(\'' + f.id + '\',\'' + f.name.replace(/'/g,"\\'") + '\')" ' +
        'style="background:transparent;border:none;color:rgba(66,133,244,.5);cursor:pointer;font-size:.65rem;' +
        'padding:2px 6px;border-radius:4px;" title="Abrir">↗</button>' +
    '</div>';
  }).join('');

  _gLog('[GDRIVE] ' + files.length + ' resultado(s) mostrados');
}

async function actualizarUIGDrive(conectado) {
  var noConn = document.getElementById('gdrive-no-conectado');
  var siConn = document.getElementById('gdrive-si-conectado');
  if (!noConn || !siConn) return;

  if (conectado) {
    noConn.style.display = 'none';
    siConn.style.display = 'block';
    // Cargar info del usuario
    var info = await gdriveInfoUsuario();
    if (info) {
      var nm = document.getElementById('gdrive-user-name');
      var em = document.getElementById('gdrive-user-email');
      var qu = document.getElementById('gdrive-quota');
      if (nm) nm.textContent = info.nombre;
      if (em) em.textContent = info.email;
      if (qu) qu.textContent = 'Usado: ' + info.usadoGB + ' GB de ' + info.totalGB + ' GB';
    }
  } else {
    noConn.style.display = 'block';
    siConn.style.display = 'none';
  }

  // Actualizar dot en menú lateral
  var dot = document.getElementById('gdriveDot');
  if (dot) {
    dot.style.background   = conectado ? '#10b981' : '#475569';
    dot.style.boxShadow    = conectado ? '0 0 5px #10b981' : 'none';
  }
}

// ── Drag ──────────────────────────────────────────────────────────────
function gdriveActivarDrag(panel) {
  var bar = document.getElementById('gdrive-drag');
  if (!bar) return;
  var drag=false, sx=0, sy=0, sl=0, st=0;
  function start(ex,ey){drag=true;sx=ex;sy=ey;var r=panel.getBoundingClientRect();sl=r.left;st=r.top;panel.style.transform='none';bar.style.cursor='grabbing';}
  function move(ex,ey){if(!drag)return;var nl=Math.max(0,Math.min(sl+(ex-sx),window.innerWidth-panel.offsetWidth));var nt=Math.max(0,Math.min(st+(ey-sy),window.innerHeight-40));panel.style.left=nl+'px';panel.style.top=nt+'px';}
  function end(){drag=false;bar.style.cursor='grab';}
  bar.addEventListener('mousedown',function(e){start(e.clientX,e.clientY);e.preventDefault();});
  document.addEventListener('mousemove',function(e){move(e.clientX,e.clientY);});
  document.addEventListener('mouseup',end);
  bar.addEventListener('touchstart',function(e){var t=e.touches[0];start(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',function(e){if(!drag)return;var t=e.touches[0];move(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  document.addEventListener('touchend',end);
}

// ══════════════════════════════════════════════════════════════════════
// EXPONER GLOBALMENTE
// ══════════════════════════════════════════════════════════════════════

window.abrirPanelDrive    = abrirPanelDrive;
window.cerrarPanelDrive   = cerrarPanelDrive;
window.gdriveAutorizar    = gdriveAutorizar;
window.gdriveCerrarSesion = gdriveCerrarSesion;
window.gdriveBuscar       = gdriveBuscar;
window.gdriveBuscarTipo   = gdriveBuscarTipo;
window.gdriveRecientes    = gdriveRecientes;
window.gdriveAbrirArchivo = gdriveAbrirArchivo;
window.gdriveSubirTexto   = gdriveSubirTexto;
window.gdriveBuscarUI     = gdriveBuscarUI;
window.gdriveConectado    = gdriveConectado;

// Verificar token al cargar (puede venir del redirect OAuth)
window.addEventListener('load', function() {
  gdriveGetToken();
  _gLog('[GDRIVE] Módulo listo — ' + (gdriveConectado() ? 'conectado ✅' : 'sin sesión'));
});

function _gLog(m) { if (typeof logMessage==='function') logMessage(m); else console.log(m); }

} // fin guard
