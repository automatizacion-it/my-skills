// =====================================================================
// EQUALIZER NEURAL — SCALL v2
// Reactivo al micrófono/audio real via Web Audio API AnalyserNode
// =====================================================================

if (window._SCALL_EQ_LOADED) {
  console.warn('[EQ] Módulo ya cargado');
} else {
window._SCALL_EQ_LOADED = true;

var eqPanel   = null;
var eqAnimId  = null;
var eqT       = 0;
var eqVisible = false;
var eqAnalyser = null;
var eqDataArr  = null;

// Bandas de frecuencia mapeadas al AnalyserNode (fftSize 2048 → 1024 bins a ~23Hz c/u)
var EQ_BANDS = [
  { label:'SUB',   hz:'60',   color:'#7c3aed', brain:'δ', binStart:1,  binEnd:4,  val:0, peak:0, smooth:0 },
  { label:'GRAVE', hz:'250',  color:'#0ea5e9', brain:'θ', binStart:5,  binEnd:14, val:0, peak:0, smooth:0 },
  { label:'MEDIO', hz:'1K',   color:'#10b981', brain:'α', binStart:15, binEnd:54, val:0, peak:0, smooth:0 },
  { label:'AGUDO', hz:'4K',   color:'#f59e0b', brain:'β', binStart:55, binEnd:180,val:0, peak:0, smooth:0 },
  { label:'AIRE',  hz:'14K',  color:'#ef4444', brain:'γ', binStart:181,binEnd:400,val:0, peak:0, smooth:0 }
];

var EQ_PRESETS = [
  { name:'AUTO',      vals:[0,0,0,0,0] },
  { name:'MEDITACIÓN',vals:[4,-2,6,-4,-6] },
  { name:'FOCUS',     vals:[-2,0,4,6,2] },
  { name:'SUEÑO',     vals:[6,4,-2,-6,-8] },
  { name:'ENERGÍA',   vals:[-4,2,0,8,10] },
  { name:'DEEP',      vals:[10,6,0,-4,-8] }
];

var EQ_BRAIN = [
  { freq:.8,  amp:22, color:'#7c3aed', phase:0 },
  { freq:1.8, amp:16, color:'#0ea5e9', phase:1.2 },
  { freq:3.2, amp:20, color:'#10b981', phase:.5 },
  { freq:7.5, amp:10, color:'#f59e0b', phase:2.1 },
  { freq:18,  amp:6,  color:'#ef4444', phase:.8 }
];

var eqPresetOffsets = [0,0,0,0,0]; // offsets manuales sobre los valores reales

// ══════════════════════════════════════════════════════════════════════
// CONECTAR AL ANALYSER REAL
// ══════════════════════════════════════════════════════════════════════

function conectarAnalyser() {
  // Prioridad 1: usar el analyser del micrófono de SCALL (ya existe)
  if (window.scallAudioAnalyser) {
    eqAnalyser = window.scallAudioAnalyser;
    // Aumentar fftSize para más resolución de frecuencias
    try { eqAnalyser.fftSize = 2048; } catch(e) {}
    eqDataArr  = new Uint8Array(eqAnalyser.frequencyBinCount);
    _eqLog('[EQ] Conectado al AnalyserNode del micrófono ✅');
    return true;
  }

  // Prioridad 2: crear nuestro propio analyser pidiendo micrófono
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(function(stream) {
        var ctx      = new (window.AudioContext || window.webkitAudioContext)();
        var src      = ctx.createMediaStreamSource(stream);
        eqAnalyser   = ctx.createAnalyser();
        eqAnalyser.fftSize = 2048;
        eqAnalyser.smoothingTimeConstant = 0.82;
        src.connect(eqAnalyser);
        eqDataArr    = new Uint8Array(eqAnalyser.frequencyBinCount);
        window.scallAudioAnalyser = eqAnalyser;
        _eqLog('[EQ] AnalyserNode propio creado ✅');
      })
      .catch(function(e) {
        _eqLog('[EQ] Sin micrófono — modo simulado');
      });
  }
  return false;
}

// Leer energía real de cada banda desde el analyser
function leerBandasReales() {
  if (!eqAnalyser || !eqDataArr) return false;
  try { eqAnalyser.getByteFrequencyData(eqDataArr); } catch(e) { return false; }

  EQ_BANDS.forEach(function(b, i) {
    var sum = 0;
    var end = Math.min(b.binEnd, eqDataArr.length - 1);
    for (var k = b.binStart; k <= end; k++) { sum += eqDataArr[k]; }
    var avg   = sum / (end - b.binStart + 1); // 0–255
    var norm  = avg / 255;                    // 0–1

    // Smooth
    b.smooth = b.smooth * 0.72 + norm * 0.28;

    // Convertir a dB relativos (-12 a +12) + offset manual
    var dB = (b.smooth * 24) - 12 + eqPresetOffsets[i];
    dB = Math.max(-12, Math.min(12, dB));
    b.val = dB;

    // Peak hold
    if (b.smooth > b.peak) { b.peak = b.smooth; }
    else { b.peak = b.peak * 0.985; }
  });
  return true;
}

// Modo simulado — cuando no hay audio real
function simularBandas() {
  EQ_BANDS.forEach(function(b, i) {
    var base  = Math.sin(eqT * (0.4 + i * 0.18) + i * 1.2) * 0.35 +
                Math.sin(eqT * (0.9 + i * 0.07)) * 0.2 +
                Math.sin(eqT * (1.7 + i * 0.31) + i * 0.5) * 0.15;
    b.smooth  = 0.25 + base * 0.22 + eqPresetOffsets[i] / 48;
    b.val     = (b.smooth * 24) - 12 + eqPresetOffsets[i];
    b.val     = Math.max(-12, Math.min(12, b.val));
    b.peak    = Math.max(b.peak * 0.97, b.smooth);
  });
}

// ══════════════════════════════════════════════════════════════════════
// PANEL UI
// ══════════════════════════════════════════════════════════════════════

function crearPanelEQ() {
  eqPanel = document.createElement('div');
  eqPanel.id = 'scall-eq-panel';
  eqPanel.style.cssText = [
    'position:fixed','bottom:70px','right:70px',
    'width:430px',
    'background:#050a12',
    'border:1px solid rgba(0,212,255,0.18)',
    'border-radius:18px',
    'box-shadow:0 0 80px rgba(0,212,255,0.06),0 30px 80px rgba(0,0,0,0.85)',
    'z-index:1800',
    'display:none',
    'flex-direction:column',
    'overflow:hidden',
    'font-family:DM Mono,monospace'
  ].join(';');

  eqPanel.innerHTML =
    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:12px 16px 8px;border-bottom:1px solid rgba(0,212,255,0.07);">' +
      '<div>' +
        '<div style="font-size:10px;letter-spacing:.18em;color:rgba(0,212,255,.5);">SCALL — NEURAL EQUALIZER</div>' +
        '<div id="eq-state-txt" style="font-size:8px;color:rgba(255,255,255,.22);letter-spacing:.1em;margin-top:2px;">ESPERANDO AUDIO...</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div id="eq-live-dot" style="width:6px;height:6px;border-radius:50%;background:#475569;" title="Estado audio"></div>' +
        '<button onclick="cerrarEQ()" ' +
          'style="background:transparent;border:1px solid rgba(255,255,255,.1);' +
          'color:rgba(255,255,255,.3);width:26px;height:26px;border-radius:7px;cursor:pointer;">✕</button>' +
      '</div>' +
    '</div>' +

    // Canvas ondas cerebrales
    '<canvas id="eq-brain-c" style="width:100%;height:80px;display:block;"></canvas>' +

    // Labels
    '<div style="display:flex;justify-content:space-around;padding:3px 12px 5px;">' +
    [['δ','DELTA','0.5–4','#7c3aed'],['θ','THETA','4–8','#0ea5e9'],
     ['α','ALPHA','8–13','#10b981'],['β','BETA','13–30','#f59e0b'],
     ['γ','GAMMA','30+','#ef4444']].map(function(w) {
      return '<div style="text-align:center;padding:2px 5px;border-radius:4px;background:' + w[3] + '15;">' +
        '<div style="font-size:8px;color:' + w[3] + ';letter-spacing:.07em;">' + w[0] + ' ' + w[1] + '</div>' +
        '<div style="font-size:7px;color:' + w[3] + '77;">' + w[2] + ' Hz</div></div>';
    }).join('') + '</div>' +

    // Canvas barras EQ
    '<canvas id="eq-bars-c" style="width:100%;height:150px;display:block;"></canvas>' +

    // Sliders de ajuste (offset sobre el audio real)
    '<div id="eq-sliders" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:8px 14px 4px;"></div>' +

    // Presets
    '<div id="eq-presets" style="display:flex;gap:5px;flex-wrap:wrap;padding:6px 14px 10px;' +
    'border-top:1px solid rgba(255,255,255,.04);margin-top:2px;"></div>';

  document.body.appendChild(eqPanel);
  construirSliders();
  construirPresets();
}

function construirSliders() {
  var cont = document.getElementById('eq-sliders');
  if (!cont) return;
  EQ_BANDS.forEach(function(b, i) {
    var col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:8px;letter-spacing:.07em;color:' + b.color + ';text-align:center;';
    lbl.textContent = b.brain + ' ' + b.label;

    var hz = document.createElement('div');
    hz.style.cssText = 'font-size:7px;color:rgba(255,255,255,.18);text-align:center;';
    hz.textContent = b.hz + ' Hz';

    var sl = document.createElement('input');
    sl.type = 'range'; sl.min = -8; sl.max = 8; sl.step = 1; sl.value = 0;
    sl.style.cssText = [
      'writing-mode:vertical-lr','direction:rtl',
      '-webkit-appearance:none','appearance:none',
      'width:80px','height:5px',
      'background:rgba(255,255,255,.07)',
      'border-radius:3px','outline:none','cursor:pointer',
      'accent-color:' + b.color
    ].join(';');
    sl.oninput = (function(idx) {
      return function() {
        eqPresetOffsets[idx] = parseInt(this.value);
        var db = document.getElementById('eq-db-' + idx);
        if (db) db.textContent = (eqPresetOffsets[idx] >= 0 ? '+' : '') + eqPresetOffsets[idx] + ' dB';
        desactivarPresets(true);
      };
    })(i);

    var db = document.createElement('div');
    db.id  = 'eq-db-' + i;
    db.style.cssText = 'font-size:9px;font-weight:500;color:' + b.color + ';text-align:center;min-width:28px;';
    db.textContent = '0 dB';

    col.append(lbl, hz, sl, db);
    cont.appendChild(col);
  });
}

function construirPresets() {
  var cont = document.getElementById('eq-presets');
  if (!cont) return;
  EQ_PRESETS.forEach(function(p, i) {
    var btn = document.createElement('button');
    btn.id  = 'eq-pre-' + i;
    btn.style.cssText = [
      'font-size:8px','letter-spacing:.1em','padding:4px 9px',
      'border-radius:5px','cursor:pointer','font-family:DM Mono,monospace',
      'background:rgba(255,255,255,.04)','border:1px solid rgba(255,255,255,.1)',
      'color:rgba(255,255,255,.4)','transition:all .2s'
    ].join(';');
    btn.textContent = p.name;
    btn.onclick = function() { aplicarPreset(i); };
    cont.appendChild(btn);
  });
  aplicarPreset(0);
}

function aplicarPreset(idx) {
  var p = EQ_PRESETS[idx];
  p.vals.forEach(function(v, i) {
    eqPresetOffsets[i] = v;
    var sliders = document.querySelectorAll('#eq-sliders input[type=range]');
    if (sliders[i]) sliders[i].value = v;
    var db = document.getElementById('eq-db-' + i);
    if (db) db.textContent = (v >= 0 ? '+' : '') + v + ' dB';
  });
  desactivarPresets(false);
  var btn = document.getElementById('eq-pre-' + idx);
  if (btn) {
    btn.style.background   = 'rgba(0,212,255,.12)';
    btn.style.borderColor  = 'rgba(0,212,255,.4)';
    btn.style.color        = 'rgba(0,212,255,1)';
  }
}

function desactivarPresets(mantenerActivo) {
  if (mantenerActivo) return;
  EQ_PRESETS.forEach(function(_, i) {
    var btn = document.getElementById('eq-pre-' + i);
    if (btn) {
      btn.style.background  = 'rgba(255,255,255,.04)';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      btn.style.color       = 'rgba(255,255,255,.4)';
    }
  });
}

function actualizarEstado(tieneAudio) {
  var dot = document.getElementById('eq-live-dot');
  var txt = document.getElementById('eq-state-txt');
  var avg = EQ_BANDS.reduce(function(s, b) { return s + b.smooth; }, 0) / EQ_BANDS.length;

  var state, color;
  if (!tieneAudio)    { state = 'MODO DEMO — SIN MICRÓFONO'; color = '#475569'; }
  else if (avg < .05) { state = 'SILENCIO DETECTADO';        color = '#475569'; }
  else if (avg < .15) { state = 'ESTADO DELTA · sueño profundo';  color = '#7c3aed'; }
  else if (avg < .28) { state = 'ESTADO THETA · meditación';      color = '#0ea5e9'; }
  else if (avg < .42) { state = 'ESTADO ALPHA · calma';           color = '#10b981'; }
  else if (avg < .60) { state = 'ESTADO BETA · enfoque';          color = '#f59e0b'; }
  else                { state = 'ESTADO GAMMA · energía máxima';   color = '#ef4444'; }

  if (dot) { dot.style.background = color; dot.style.boxShadow = tieneAudio && avg > .05 ? '0 0 6px ' + color : 'none'; }
  if (txt) { txt.textContent = state; txt.style.color = color + 'aa'; }
}

// ══════════════════════════════════════════════════════════════════════
// ANIMACIÓN
// ══════════════════════════════════════════════════════════════════════

function iniciarAnimacionEQ() {
  var bc = document.getElementById('eq-brain-c');
  var ec = document.getElementById('eq-bars-c');
  if (!bc || !ec) return;
  var pr = window.devicePixelRatio || 1;

  function sz(canvas, h) {
    var w = canvas.parentElement.clientWidth;
    canvas.width  = w * pr; canvas.height = h * pr;
    var ctx = canvas.getContext('2d'); ctx.scale(pr, pr);
    return { w: w, h: h, ctx: ctx };
  }

  function frame() {
    eqT += 0.02;
    var tieneAudio = leerBandasReales();
    if (!tieneAudio) simularBandas();
    actualizarEstado(tieneAudio);

    // ── Canvas ondas cerebrales ─────────────────────────────────────
    var B = sz(bc, 80);
    B.ctx.fillStyle = '#050a12';
    B.ctx.fillRect(0, 0, B.w, B.h);

    EQ_BRAIN.forEach(function(wave, wi) {
      var inf = 0.6 + EQ_BANDS[wi].smooth * 1.4;
      var amp = wave.amp * inf;
      B.ctx.beginPath();
      for (var x = 0; x <= B.w; x++) {
        var nx = x / B.w;
        var y  = B.h / 2 +
          Math.sin(nx * wave.freq * Math.PI * 2 + eqT * wave.freq * 0.05 + wave.phase) * amp +
          Math.sin(nx * wave.freq * Math.PI * 3.8 + eqT * wave.freq * 0.03) * amp * 0.3 +
          Math.sin(nx * wave.freq * Math.PI * 7 + eqT * wave.freq * 0.02) * amp * 0.12;
        x === 0 ? B.ctx.moveTo(x, y) : B.ctx.lineTo(x, y);
      }
      B.ctx.strokeStyle    = wave.color;
      B.ctx.globalAlpha    = 0.4 + EQ_BANDS[wi].smooth * 0.55;
      B.ctx.lineWidth      = 1 + EQ_BANDS[wi].smooth * 0.8;
      B.ctx.shadowColor    = wave.color;
      B.ctx.shadowBlur     = 3 + EQ_BANDS[wi].smooth * 6;
      B.ctx.stroke();
      B.ctx.globalAlpha    = 1;
      B.ctx.shadowBlur     = 0;
    });

    // ── Canvas barras EQ ────────────────────────────────────────────
    var E = sz(ec, 150);
    E.ctx.fillStyle = '#050a12';
    E.ctx.fillRect(0, 0, E.w, E.h);

    var pad  = 18;
    var barW = Math.floor((E.w - pad * 2) / EQ_BANDS.length);
    var midY = E.h * 0.50;
    var maxH = midY - 10;

    // Líneas de referencia
    [-12, -6, 0, 6, 12].forEach(function(g) {
      var y = midY - (g / 12) * maxH;
      E.ctx.strokeStyle = 'rgba(255,255,255,' + (g === 0 ? .12 : .04) + ')';
      E.ctx.lineWidth   = g === 0 ? 1 : .4;
      E.ctx.setLineDash(g === 0 ? [] : [3, 7]);
      E.ctx.beginPath(); E.ctx.moveTo(pad, y); E.ctx.lineTo(E.w - pad, y); E.ctx.stroke();
      E.ctx.setLineDash([]);
    });

    // Barras
    EQ_BANDS.forEach(function(b, i) {
      var x   = pad + i * barW + barW * 0.12;
      var bw  = barW * 0.6;
      var bh  = (b.val / 12) * maxH;
      var y   = midY - bh;
      var abs = Math.abs(bh) || 2;
      var pos = bh >= 0;

      // Gradiente barra
      var gr = E.ctx.createLinearGradient(0, pos ? y : midY, 0, pos ? midY : y + abs);
      gr.addColorStop(0, b.color);
      gr.addColorStop(1, b.color + '22');
      E.ctx.fillStyle = gr;
      E.ctx.fillRect(x, pos ? y : midY, bw, abs);

      // Glow en la barra
      E.ctx.shadowColor = b.color;
      E.ctx.shadowBlur  = 4 + b.smooth * 8;
      E.ctx.fillStyle   = b.color + '44';
      E.ctx.fillRect(x, pos ? y : midY, bw, abs);
      E.ctx.shadowBlur  = 0;

      // Peak hold — línea en el pico máximo
      var peakY = midY - b.peak * maxH;
      E.ctx.strokeStyle = b.color;
      E.ctx.globalAlpha = 0.7;
      E.ctx.lineWidth   = 1.5;
      E.ctx.beginPath();
      E.ctx.moveTo(x, peakY); E.ctx.lineTo(x + bw, peakY); E.ctx.stroke();
      E.ctx.globalAlpha = 1;

      // Espectro inferior (estilo VU meter)
      var numSeg = 12;
      for (var s = 0; s < numSeg; s++) {
        var energy = b.smooth + Math.sin(eqT * 2.5 + s * 0.7 + i * 0.9) * 0.06;
        if (s / numSeg > energy + 0.05) continue;
        var sx = x + (bw / numSeg) * s;
        var sh = 8 + energy * 20;
        var sy = E.h - 3 - sh;
        var ratio = s / (numSeg - 1);
        E.ctx.globalAlpha = 0.25 + energy * 0.5;
        E.ctx.fillStyle   = b.color;
        E.ctx.fillRect(sx, sy, bw / numSeg - 1, sh);
      }
      E.ctx.globalAlpha = 1;

      // Dot pico de barra
      E.ctx.fillStyle   = '#fff';
      E.ctx.shadowColor = b.color;
      E.ctx.shadowBlur  = 6;
      E.ctx.beginPath();
      E.ctx.arc(x + bw / 2, y - (pos ? 3 : -3), 2.5, 0, Math.PI * 2);
      E.ctx.fill();
      E.ctx.shadowBlur  = 0;
    });

    // Curva de respuesta suavizada entre bandas
    E.ctx.strokeStyle = 'rgba(0,212,255,.3)';
    E.ctx.lineWidth   = 1.5;
    E.ctx.shadowColor = '#00d4ff';
    E.ctx.shadowBlur  = 5;
    E.ctx.beginPath();
    EQ_BANDS.forEach(function(b, i) {
      var cx = pad + i * barW + barW * 0.12 + barW * 0.6 / 2;
      var cy = midY - (b.val / 12) * maxH;
      i === 0 ? E.ctx.moveTo(cx, cy) : E.ctx.lineTo(cx, cy);
    });
    E.ctx.stroke();
    E.ctx.shadowBlur = 0;

    if (eqVisible) eqAnimId = requestAnimationFrame(frame);
  }

  if (eqAnimId) cancelAnimationFrame(eqAnimId);
  eqAnimId = requestAnimationFrame(frame);
}

function detenerAnimacionEQ() {
  if (eqAnimId) { cancelAnimationFrame(eqAnimId); eqAnimId = null; }
}

// ══════════════════════════════════════════════════════════════════════
// ABRIR / CERRAR
// ══════════════════════════════════════════════════════════════════════

function abrirEQ() {
  if (!eqPanel) crearPanelEQ();
  eqPanel.style.display = 'flex';
  eqVisible = true;
  conectarAnalyser();
  iniciarAnimacionEQ();
  _eqLog('[EQ] Panel abierto');
}

function cerrarEQ() {
  if (eqPanel) eqPanel.style.display = 'none';
  eqVisible = false;
  detenerAnimacionEQ();
}

function toggleEQ() {
  if (eqVisible) cerrarEQ(); else abrirEQ();
}

// ══════════════════════════════════════════════════════════════════════
// EXPONER
// ══════════════════════════════════════════════════════════════════════

window.abrirEQ   = abrirEQ;
window.cerrarEQ  = cerrarEQ;
window.toggleEQ  = toggleEQ;
window.EQ_BANDS  = EQ_BANDS;

window.addEventListener('load', function() {
  _eqLog('[EQ] Módulo ecualizador neural v2 listo — reactivo al audio real');
});

function _eqLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

} // fin guard
