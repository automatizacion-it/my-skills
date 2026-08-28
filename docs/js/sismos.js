// =====================================================================
// MÓDULO SÍSMICO — SCALL
// Monitoreo en tiempo real USGS + SGC Colombia
// Alerta por voz + sonido + protocolo de emergencia
// =====================================================================

if (window._SCALL_SISMOS_LOADED) {
  console.warn('[SISMOS] Módulo ya cargado');
} else {
window._SCALL_SISMOS_LOADED = true;

// ── Configuración ─────────────────────────────────────────────────────
var SISMOS_CONFIG = {
  intervaloMs:      60000,     // Consultar cada 60 segundos
  magnitudMinima:   3.5,       // Alertar desde M 3.5
  magnitudCritica:  5.0,       // Protocolo de emergencia desde M 5.0
  radioKm:          500,       // Radio de monitoreo en km desde Colombia
  latColombia:      4.5709,    // Centro de Colombia
  lngColombia:     -74.2973,
  ultimoEventoId:   null,      // Para no repetir alertas
  activo:           false,
  intervalo:        null
};

// ── Estado ─────────────────────────────────────────────────────────────
var sismoPanel     = null;
var sismoLog       = [];
var sirenaSismica  = null;

// ══════════════════════════════════════════════════════════════════════
// SONIDO SÍSMICO — Web Audio API
// ══════════════════════════════════════════════════════════════════════

function getAudioCtxSismo() {
  if (!window._scallAudioCtx) {
    window._scallAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._scallAudioCtx;
}

function tocarAlertaSismica(magnitud) {
  try {
    var ctx  = getAudioCtxSismo();
    var t    = ctx.currentTime;
    var veces = magnitud >= SISMOS_CONFIG.magnitudCritica ? 6 : 3;

    for (var rep = 0; rep < veces; rep++) {
      var offset = rep * 0.9;

      // Tono grave descendente — sensación de alerta urgente
      var osc1 = ctx.createOscillator();
      var g1   = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, t + offset);
      osc1.frequency.linearRampToValueAtTime(110, t + offset + 0.6);
      g1.gain.setValueAtTime(0.7, t + offset);
      g1.gain.linearRampToValueAtTime(0, t + offset + 0.7);
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(t + offset);
      osc1.stop(t + offset + 0.7);

      // Pulso de alarma
      var osc2 = ctx.createOscillator();
      var g2   = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.value = 880;
      g2.gain.setValueAtTime(0, t + offset + 0.3);
      g2.gain.linearRampToValueAtTime(0.5, t + offset + 0.35);
      g2.gain.linearRampToValueAtTime(0, t + offset + 0.5);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(t + offset + 0.3);
      osc2.stop(t + offset + 0.7);
    }
    _sisLog('[SISMOS] Alerta sísmica sonando — M' + magnitud.toFixed(1));
  } catch(e) {
    _sisLog('[SISMOS] Error audio: ' + e.message);
  }
}

function detenerSirenaSismica() {
  if (sirenaSismica) {
    try { sirenaSismica.stop(); } catch(e) {}
    sirenaSismica = null;
  }
}

// ══════════════════════════════════════════════════════════════════════
// CONSULTA USGS — Earthquakes en tiempo real
// ══════════════════════════════════════════════════════════════════════

function consultarUSGS() {
  // API USGS: sismos de las últimas 24h, magnitud >= 2.5, cerca de Colombia
  var url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?' +
    'format=geojson&' +
    'starttime=' + new Date(Date.now() - 3600000).toISOString() + '&' + // última 1 hora
    'minmagnitude=' + SISMOS_CONFIG.magnitudMinima + '&' +
    'latitude=' + SISMOS_CONFIG.latColombia + '&' +
    'longitude=' + SISMOS_CONFIG.lngColombia + '&' +
    'maxradiuskm=' + SISMOS_CONFIG.radioKm + '&' +
    'orderby=time&limit=5';

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      procesarEventosUSGS(data);
    })
    .catch(function(err) {
      _sisLog('[SISMOS] Error consultando USGS: ' + err.message);
      // Intentar SGC como respaldo
      consultarSGC();
    });
}

function procesarEventosUSGS(data) {
  if (!data || !data.features || data.features.length === 0) return;

  var evento = data.features[0]; // El más reciente
  var id     = evento.id;

  // No repetir la misma alerta
  if (id === SISMOS_CONFIG.ultimoEventoId) return;
  SISMOS_CONFIG.ultimoEventoId = id;

  var props = evento.properties;
  var mag   = props.mag;
  var lugar = props.place || 'Zona cercana';
  var hora  = new Date(props.time).toLocaleTimeString('es-CO');

  // Agregar al log del módulo
  var entrada = {
    id: id, mag: mag, lugar: lugar, hora: hora,
    fecha: new Date(props.time).toLocaleDateString('es-CO'),
    fuente: 'USGS'
  };
  sismoLog.unshift(entrada);
  if (sismoLog.length > 20) sismoLog.pop();

  _sisLog('[SISMOS] Evento detectado: M' + mag.toFixed(1) + ' — ' + lugar);

  // Actualizar UI
  renderSismoPanel();
  actualizarBadgeSismo(mag);

  // Disparar alerta
  dispararAlertaSismica(mag, lugar, hora);
}

// Respaldo: SGC Colombia (sin CORS directo — usar proxy si está disponible)
function consultarSGC() {
  // El SGC no tiene API pública con CORS habilitado
  // Usamos el feed RSS de USGS filtrado para Colombia como alternativa
  _sisLog('[SISMOS] Usando USGS como única fuente (SGC sin API pública)');
}

// ══════════════════════════════════════════════════════════════════════
// DISPARAR ALERTA
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// INTERRUMPIR TODO — la alerta sísmica tiene prioridad sobre cualquier
// otra cosa que esté sonando (música, radio, audiolibro/clase de
// Actividad, cola de voz)
// ══════════════════════════════════════════════════════════════════════

function interrumpirTodoParaSismo() {
  // Cola de voz (ElevenLabs) y síntesis nativa del navegador
  if (typeof detenerVoz === 'function') { try { detenerVoz(); } catch(e) {} }
  if (typeof colaVoz !== 'undefined' && colaVoz && colaVoz.length) colaVoz.length = 0;
  if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch(e) {} }

  // Radio
  if (typeof detenerRadio === 'function') { try { detenerRadio(); } catch(e) {} }

  // Música (YouTube vía spotify.js)
  if (typeof detenerMusica === 'function') { try { detenerMusica(); } catch(e) {} }

  // Narración de Actividad (audiolibro/clase) y su video de YouTube
  if (typeof detenerNarracionActividad === 'function') { try { detenerNarracionActividad(); } catch(e) {} }
  if (typeof ytPlayerActividad !== 'undefined' && ytPlayerActividad && typeof ytPlayerActividad.pauseVideo === 'function') {
    try { ytPlayerActividad.pauseVideo(); } catch(e) {}
  }

  _sisLog('[SISMOS] ⏸ Todo interrumpido — la alerta sísmica tiene prioridad');
}

function dispararAlertaSismica(magnitud, lugar, hora) {
  interrumpirTodoParaSismo();
  tocarAlertaSismica(magnitud);

  var esCritico = magnitud >= SISMOS_CONFIG.magnitudCritica;
  var emoji     = esCritico ? '🚨' : '⚠️';

  // Mensaje de voz por magnitud
  var msg;
  if (magnitud < 4.0) {
    msg = 'Sismo leve detectado. Magnitud ' + magnitud.toFixed(1) + ' en ' + lugar +
          ' a las ' + hora + '. Sin riesgo mayor.';
  } else if (magnitud < 5.0) {
    msg = 'ALERTA SÍSMICA. Sismo moderado, magnitud ' + magnitud.toFixed(1) + ' en ' + lugar +
          '. Aléjate de ventanas y objetos que puedan caer.';
  } else if (magnitud < 6.0) {
    msg = '¡ALERTA SÍSMICA IMPORTANTE! Magnitud ' + magnitud.toFixed(1) + ' en ' + lugar +
          '. Cúbrete bajo una mesa sólida, aléjate de ventanas. ' +
          'Si estás en edificio, no uses el ascensor.';
  } else {
    msg = '¡ALERTA SÍSMICA CRÍTICA! Magnitud ' + magnitud.toFixed(1) + ' en ' + lugar +
          '. EVACÚA si estás en zona de riesgo. ' +
          'Cúbrete, protégete la cabeza. Activa el protocolo de emergencia.';
  }

  // Voz con orbe en modo SOS
  if (window.scallOrb) window.scallOrb.setState('speaking');
  if (typeof responderVoz === 'function') responderVoz(msg);

  // Notificación del navegador
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(emoji + ' SCALL — Alerta Sísmica M' + magnitud.toFixed(1), {
      body: lugar + ' · ' + hora,
      icon: '/favicon.ico',
      requireInteraction: esCritico  // no se cierra sola si es crítico
    });
  }

  // Si es crítico: mostrar el panel de inmediato y activar modo SOS de SCALL
  if (esCritico) {
    _sisLog('[SISMOS] CRÍTICO — abriendo panel y activando protocolo SOS');
    abrirPanelSismos();
    setTimeout(function() {
      if (typeof activarSOS === 'function') activarSOS();
    }, 4000);
  }
}

// ══════════════════════════════════════════════════════════════════════
// CONTROL DEL MÓDULO
// ══════════════════════════════════════════════════════════════════════

function activarMonitoreoSismico() {
  if (SISMOS_CONFIG.activo) {
    _sisLog('[SISMOS] Ya está activo');
    return;
  }
  SISMOS_CONFIG.activo = true;

  // Pedir permiso de notificaciones
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Primera consulta inmediata
  consultarUSGS();

  // Consultas periódicas
  SISMOS_CONFIG.intervalo = setInterval(consultarUSGS, SISMOS_CONFIG.intervaloMs);

  _sisLog('[SISMOS] ✅ Monitoreo sísmico activo — consultando cada ' +
          (SISMOS_CONFIG.intervaloMs / 1000) + 's');
  if (typeof responderVoz === 'function') {
    responderVoz('Monitoreo sísmico activado. Te alertaré si hay sismos en un radio de ' +
                 SISMOS_CONFIG.radioKm + ' kilómetros de Colombia.');
  }

  // Guardar estado
  localStorage.setItem('scall_sismos_activo', 'true');
  actualizarBtnMonitoreo(true);
}

function desactivarMonitoreoSismico() {
  if (!SISMOS_CONFIG.activo) return;
  SISMOS_CONFIG.activo = false;
  if (SISMOS_CONFIG.intervalo) {
    clearInterval(SISMOS_CONFIG.intervalo);
    SISMOS_CONFIG.intervalo = null;
  }
  localStorage.setItem('scall_sismos_activo', 'false');
  actualizarBtnMonitoreo(false);
  _sisLog('[SISMOS] Monitoreo desactivado');
  if (typeof responderVoz === 'function') {
    responderVoz('Monitoreo sísmico desactivado.');
  }
}

function simularSismo(magnitud) {
  magnitud = magnitud || 5.8;
  var lugar = 'Zona de prueba SCALL';
  var hora  = new Date().toLocaleTimeString('es-CO');
  _sisLog('[SISMOS] SIMULACIÓN — M' + magnitud);
  dispararAlertaSismica(magnitud, lugar, hora);
}

function ajustarMagnitudMinima(mag) {
  SISMOS_CONFIG.magnitudMinima = mag;
  localStorage.setItem('scall_sismos_mag_min', mag);
  _sisLog('[SISMOS] Magnitud mínima ajustada a M' + mag);
  if (typeof responderVoz === 'function') {
    responderVoz('Ahora te alertaré desde magnitud ' + mag + '.');
  }
}

// ══════════════════════════════════════════════════════════════════════
// PANEL DE SISMOS
// ══════════════════════════════════════════════════════════════════════

function abrirPanelSismos() {
  if (!sismoPanel) crearPanelSismos();
  sismoPanel.style.display = 'flex';
  renderSismoPanel();
}

function cerrarPanelSismos() {
  if (sismoPanel) sismoPanel.style.display = 'none';
}

function crearPanelSismos() {
  sismoPanel = document.createElement('div');
  sismoPanel.id = 'sismoPanel';
  sismoPanel.style.cssText = [
    'position:fixed', 'top:60px', 'right:200px',
    'width:320px', 'max-height:calc(100dvh - 80px)',
    'background:#0d1117',
    'border:1px solid rgba(239,68,68,0.3)',
    'border-radius:16px',
    'box-shadow:0 0 30px rgba(239,68,68,0.15), 0 20px 60px rgba(0,0,0,0.7)',
    'z-index:1200',
    'display:flex', 'flex-direction:column',
    'overflow:hidden',
    'font-family:DM Mono, monospace'
  ].join(';');

  sismoPanel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:12px 16px;background:rgba(239,68,68,0.08);' +
    'border-bottom:1px solid rgba(239,68,68,0.2);flex-shrink:0;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:1.1rem;">🌍</span>' +
        '<span style="font-size:.75rem;letter-spacing:.1em;color:rgba(239,68,68,0.9);">MONITOREO SÍSMICO</span>' +
      '</div>' +
      '<button onclick="cerrarPanelSismos()" ' +
        'style="background:transparent;border:1px solid rgba(255,255,255,0.1);' +
        'color:rgba(255,255,255,0.45);width:26px;height:26px;border-radius:6px;cursor:pointer;">✕</button>' +
    '</div>' +

    '<div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">' +
      '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
        '<button id="btnActivarSismo" onclick="activarMonitoreoSismico()" ' +
          'style="flex:1;padding:7px;border-radius:8px;cursor:pointer;font-size:.7rem;' +
          'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);' +
          'color:rgba(16,185,129,0.9);font-family:DM Mono,monospace;">▶ Activar</button>' +
        '<button id="btnDesactivarSismo" onclick="desactivarMonitoreoSismico()" ' +
          'style="flex:1;padding:7px;border-radius:8px;cursor:pointer;font-size:.7rem;' +
          'background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);' +
          'color:rgba(239,68,68,0.8);font-family:DM Mono,monospace;">■ Detener</button>' +
        '<button onclick="simularSismo(5.8)" ' +
          'style="flex:1;padding:7px;border-radius:8px;cursor:pointer;font-size:.7rem;' +
          'background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);' +
          'color:rgba(251,191,36,0.8);font-family:DM Mono,monospace;">⚡ Test</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:.62rem;color:rgba(255,255,255,0.3);">Mag. mínima:</span>' +
        '<input type="range" id="magSlider" min="2.5" max="6.0" step="0.5" value="3.5" ' +
          'oninput="ajustarMagnitudMinima(parseFloat(this.value)); document.getElementById(\'magVal\').textContent=this.value" ' +
          'style="flex:1;accent-color:rgba(239,68,68,0.8);">' +
        '<span id="magVal" style="font-size:.7rem;color:rgba(239,68,68,0.8);min-width:24px;">3.5</span>' +
      '</div>' +
      '<div style="margin-top:6px;display:flex;align-items:center;gap:6px;">' +
        '<span id="sismoEstadoDot" style="width:8px;height:8px;border-radius:50%;background:#475569;flex-shrink:0;"></span>' +
        '<span id="sismoEstadoTxt" style="font-size:.62rem;color:rgba(255,255,255,0.3);">Sin monitoreo activo</span>' +
      '</div>' +
    '</div>' +

    '<div style="padding:8px 14px;flex-shrink:0;">' +
      '<div style="font-size:.58rem;letter-spacing:.14em;color:rgba(255,255,255,0.2);margin-bottom:5px;">ÚLTIMOS EVENTOS</div>' +
      '<div id="sismoLista" style="overflow-y:auto;max-height:200px;"></div>' +
    '</div>' +

    '<div style="padding:8px 14px;border-top:1px solid rgba(255,255,255,0.05);flex-shrink:0;">' +
      '<p style="font-size:.58rem;color:rgba(255,255,255,0.18);text-align:center;margin:0;">' +
        'Fuente: USGS Earthquake Hazards Program · Actualiza cada 60s' +
      '</p>' +
    '</div>';

  document.body.appendChild(sismoPanel);
}

function renderSismoPanel() {
  var el = document.getElementById('sismoLista');
  if (!el) return;

  if (sismoLog.length === 0) {
    el.innerHTML = '<p style="font-size:.68rem;color:rgba(255,255,255,0.2);text-align:center;padding:10px;">Sin eventos recientes</p>';
    return;
  }

  el.innerHTML = sismoLog.map(function(s) {
    var color = s.mag >= 6 ? '#ef4444' : s.mag >= 5 ? '#f97316' : s.mag >= 4 ? '#eab308' : '#10b981';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;' +
           'border-bottom:1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size:.85rem;font-weight:700;color:' + color + ';min-width:36px;">M' + s.mag.toFixed(1) + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,0.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.lugar + '</div>' +
        '<div style="font-size:.58rem;color:rgba(255,255,255,0.25);">' + s.fecha + ' · ' + s.hora + ' · ' + s.fuente + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  actualizarBtnMonitoreo(SISMOS_CONFIG.activo);
}

function actualizarBadgeSismo(mag) {
  var dot = document.getElementById('sismoEstadoDot');
  var txt = document.getElementById('sismoEstadoTxt');
  if (dot) { dot.style.background = '#ef4444'; dot.style.boxShadow = '0 0 8px #ef4444'; }
  if (txt) txt.textContent = 'Último: M' + mag.toFixed(1) + ' · ' + new Date().toLocaleTimeString('es-CO');
}

function actualizarBtnMonitoreo(activo) {
  var dot = document.getElementById('sismoEstadoDot');
  var txt = document.getElementById('sismoEstadoTxt');
  if (activo) {
    if (dot) { dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 6px #10b981'; }
    if (txt) txt.textContent = 'Monitoreando — radio ' + SISMOS_CONFIG.radioKm + ' km';
  } else {
    if (dot) { dot.style.background = '#475569'; dot.style.boxShadow = 'none'; }
    if (txt) txt.textContent = 'Sin monitoreo activo';
  }
}

// ══════════════════════════════════════════════════════════════════════
// EXPONER GLOBALMENTE
// ══════════════════════════════════════════════════════════════════════

window.abrirPanelSismos        = abrirPanelSismos;
window.cerrarPanelSismos       = cerrarPanelSismos;
window.activarMonitoreoSismico  = activarMonitoreoSismico;
window.desactivarMonitoreoSismico = desactivarMonitoreoSismico;
window.simularSismo             = simularSismo;
window.ajustarMagnitudMinima    = ajustarMagnitudMinima;

// Auto-reactivar si estaba activo
window.addEventListener('load', function() {
  var estaba = localStorage.getItem('scall_sismos_activo');
  var magMin  = localStorage.getItem('scall_sismos_mag_min');
  if (magMin) SISMOS_CONFIG.magnitudMinima = parseFloat(magMin);
  if (estaba === 'true') {
    setTimeout(activarMonitoreoSismico, 2000);
  }
  _sisLog('[SISMOS] Módulo listo — M min=' + SISMOS_CONFIG.magnitudMinima);
});

function _sisLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

} // fin guard
