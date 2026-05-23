// =====================================================================
// EQUALIZER NEURAL — SCALL
// Ecualizador de música con visualizador de ondas cerebrales
// =====================================================================

if (window._SCALL_EQ_LOADED) {
  console.warn('[EQ] Módulo ya cargado');
} else {
window._SCALL_EQ_LOADED = true;

var eqPanel   = null;
var eqAnimId  = null;
var eqT       = 0;
var eqVisible = false;

var EQ_BANDS = [
  { label:'SUB',   hz:'32',   color:'#7c3aed', brain:'δ', val:0 },
  { label:'GRAVE', hz:'125',  color:'#0ea5e9', brain:'θ', val:0 },
  { label:'MEDIO', hz:'500',  color:'#10b981', brain:'α', val:0 },
  { label:'AGUDO', hz:'2K',   color:'#f59e0b', brain:'β', val:0 },
  { label:'AIRE',  hz:'16K',  color:'#ef4444', brain:'γ', val:0 }
];

var EQ_PRESETS = [
  { name:'NORMAL',    vals:[0,0,0,0,0] },
  { name:'MEDITACIÓN',vals:[4,-2,6,-4,-6] },
  { name:'FOCUS',     vals:[-2,0,4,6,2] },
  { name:'SUEÑO',     vals:[6,4,-2,-6,-8] },
  { name:'ENERGÍA',   vals:[-4,2,0,8,10] },
  { name:'DEEP',      vals:[10,6,0,-4,-8] }
];

var EQ_BRAIN = [
  { freq:.8,  amp:28, color:'#7c3aed', phase:0 },
  { freq:1.8, amp:18, color:'#0ea5e9', phase:1.2 },
  { freq:3.2, amp:22, color:'#10b981', phase:.5 },
  { freq:7.5, amp:12, color:'#f59e0b', phase:2.1 },
  { freq:18,  amp:7,  color:'#ef4444', phase:.8 }
];

// ══════════════════════════════════════════════════════════════════════
// CREAR PANEL
// ══════════════════════════════════════════════════════════════════════

function crearPanelEQ() {
  eqPanel = document.createElement('div');
  eqPanel.id = 'scall-eq-panel';
  eqPanel.style.cssText = [
    'position:fixed', 'bottom:70px', 'right:70px',
    'width:420px',
    'background:#050a12',
    'border:1px solid rgba(0,212,255,0.2)',
    'border-radius:18px',
    'box-shadow:0 0 60px rgba(0,212,255,0.08), 0 30px 80px rgba(0,0,0,0.8)',
    'z-index:1800',
    'display:none',
    'flex-direction:column',
    'overflow:hidden',
    'font-family:DM Mono,monospace'
  ].join(';');

  eqPanel.innerHTML =
    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:12px 16px 8px;border-bottom:1px solid rgba(0,212,255,0.08);">' +
      '<div>' +
        '<div style="font-size:10px;letter-spacing:.18em;color:rgba(0,212,255,.5);">SCALL — NEURAL EQUALIZER</div>' +
        '<div id="eq-state-txt" style="font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.1em;margin-top:2px;">ESTADO ALPHA · 8–13 Hz α</div>' +
      '</div>' +
      '<button onclick="cerrarEQ()" ' +
        'style="background:transparent;border:1px solid rgba(255,255,255,.1);' +
        'color:rgba(255,255,255,.3);width:26px;height:26px;border-radius:7px;' +
        'cursor:pointer;font-size:14px;">✕</button>' +
    '</div>' +

    // Canvas ondas cerebrales
    '<canvas id="eq-brain-c" style="width:100%;height:90px;display:block;"></canvas>' +

    // Labels ondas
    '<div style="display:flex;justify-content:space-around;padding:4px 14px 6px;">' +
      [['δ','DELTA','0.5–4','#7c3aed'],['θ','THETA','4–8','#0ea5e9'],
       ['α','ALPHA','8–13','#10b981'],['β','BETA','13–30','#f59e0b'],
       ['γ','GAMMA','30–100','#ef4444']].map(function(w) {
        return '<div style="text-align:center;padding:3px 6px;border-radius:4px;' +
          'background:' + w[3] + '18;">' +
          '<div style="font-size:9px;color:' + w[3] + ';letter-spacing:.08em;">' + w[0] + ' ' + w[1] + '</div>' +
          '<div style="font-size:8px;color:' + w[3] + '88;">' + w[2] + ' Hz</div>' +
        '</div>';
      }).join('') +
    '</div>' +

    // Canvas ecualizador
    '<canvas id="eq-bars-c" style="width:100%;height:130px;display:block;"></canvas>' +

    // Sliders
    '<div id="eq-sliders" style="display:grid;grid-template-columns:repeat(5,1fr);' +
    'gap:6px;padding:8px 14px 4px;"></div>' +

    // Presets
    '<div id="eq-presets" style="display:flex;gap:5px;flex-wrap:wrap;' +
    'padding:6px 14px 12px;border-top:1px solid rgba(255,255,255,.04);margin-top:4px;"></div>';

  document.body.appendChild(eqPanel);
  construirSliders();
  construirPresets();
}

function construirSliders() {
  var cont = document.getElementById('eq-sliders');
  if (!cont) return;

  EQ_BANDS.forEach(function(b, i) {
    var col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:8px;letter-spacing:.08em;color:' + b.color + ';text-align:center;';
    lbl.textContent = b.brain + ' ' + b.label;

    var hz = document.createElement('div');
    hz.style.cssText = 'font-size:7px;color:rgba(255,255,255,.2);text-align:center;';
    hz.textContent = b.hz + ' Hz';

    var sl = document.createElement('input');
    sl.type = 'range';
    sl.min = -12; sl.max = 12; sl.step = 1; sl.value = b.val;
    sl.style.cssText = [
      'writing-mode:vertical-lr','direction:rtl',
      '-webkit-appearance:none','appearance:none',
      'width:80px','height:5px',
      'background:rgba(255,255,255,.07)',
      'border-radius:3px','outline:none','cursor:pointer',
      'accent-color:' + b.color
    ].join(';');

    var db = document.createElement('div');
    db.id  = 'eq-db-' + i;
    db.style.cssText = 'font-size:9px;font-weight:500;color:' + b.color + ';text-align:center;min-width:28px;';
    db.textContent = '0 dB';

    sl.oninput = function() {
      b.val = parseInt(this.value);
      db.textContent = (b.val >= 0 ? '+' : '') + b.val + ' dB';
      actualizarEstado();
      desactivarPresets();
    };

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
      'font-size:8px','letter-spacing:.1em',
      'padding:4px 9px','border-radius:5px',
      'cursor:pointer','font-family:DM Mono,monospace',
      'background:rgba(255,255,255,.04)',
      'border:1px solid rgba(255,255,255,.1)',
      'color:rgba(255,255,255,.4)',
      'transition:all .2s'
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
    EQ_BANDS[i].val = v;
    var sl = document.querySelector('#eq-sliders input:nth-child(1)');
    var sliders = document.querySelectorAll('#eq-sliders input[type=range]');
    if (sliders[i]) sliders[i].value = v;
    var db = document.getElementById('eq-db-' + i);
    if (db) db.textContent = (v >= 0 ? '+' : '') + v + ' dB';
  });
  desactivarPresets();
  var btn = document.getElementById('eq-pre-' + idx);
  if (btn) {
    btn.style.background = 'rgba(0,212,255,.12)';
    btn.style.borderColor = 'rgba(0,212,255,.4)';
    btn.style.color = 'rgba(0,212,255,1)';
  }
  actualizarEstado();
}

function desactivarPresets() {
  EQ_PRESETS.forEach(function(_, i) {
    var btn = document.getElementById('eq-pre-' + i);
    if (btn) {
      btn.style.background = 'rgba(255,255,255,.04)';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      btn.style.color = 'rgba(255,255,255,.4)';
    }
  });
}

function actualizarEstado() {
  var avg = EQ_BANDS.reduce(function(s, b) { return s + b.val; }, 0) / EQ_BANDS.length;
  var el  = document.getElementById('eq-state-txt');
  if (!el) return;
  var state, color;
  if (avg > 6)       { state = 'ENERGÍA MÁXIMA · 30–100 Hz γ'; color = '#ef4444'; }
  else if (avg > 2)  { state = 'ESTADO BETA · 13–30 Hz β';     color = '#f59e0b'; }
  else if (avg > -2) { state = 'ESTADO ALPHA · 8–13 Hz α';     color = '#10b981'; }
  else if (avg > -6) { state = 'ESTADO THETA · 4–8 Hz θ';      color = '#0ea5e9'; }
  else               { state = 'MEDITACIÓN DELTA · 0.5–4 Hz δ';color = '#7c3aed'; }
  el.textContent = state;
  el.style.color = color + 'bb';
}

// ══════════════════════════════════════════════════════════════════════
// ANIMACIÓN
// ══════════════════════════════════════════════════════════════════════

function iniciarAnimacionEQ() {
  var bc = document.getElementById('eq-brain-c');
  var ec = document.getElementById('eq-bars-c');
  if (!bc || !ec) return;

  var pr = window.devicePixelRatio || 1;

  function sz(canvas) {
    var w = canvas.parentElement.clientWidth;
    var h = parseInt(canvas.style.height);
    canvas.width  = w * pr;
    canvas.height = h * pr;
    var ctx = canvas.getContext('2d');
    ctx.scale(pr, pr);
    return { w: w, h: h, ctx: ctx };
  }

  function frame() {
    eqT += 0.018;
    var B = sz(bc), E = sz(ec);

    // ── Ondas cerebrales ─────────────────────────────────────────────
    B.ctx.fillStyle = '#050a12';
    B.ctx.fillRect(0, 0, B.w, B.h);

    var influence = EQ_BANDS.map(function(b) { return 1 + b.val / 24; });

    EQ_BRAIN.forEach(function(wave, wi) {
      var inf = influence[wi];
      var amp = wave.amp * (0.5 + inf * 0.9);
      var spd = wave.freq;
      B.ctx.beginPath();
      for (var x = 0; x <= B.w; x++) {
        var nx = x / B.w;
        var y  = B.h / 2 +
          Math.sin(nx * spd * Math.PI * 2 + eqT * wave.freq * 0.04 + wave.phase) * amp +
          Math.sin(nx * spd * Math.PI * 3.7 + eqT * wave.freq * 0.028 + wave.phase * 1.3) * amp * 0.3 +
          Math.sin(nx * spd * Math.PI * 6.1 + eqT * wave.freq * 0.019) * amp * 0.12;
        x === 0 ? B.ctx.moveTo(x, y) : B.ctx.lineTo(x, y);
      }
      B.ctx.strokeStyle = wave.color;
      B.ctx.globalAlpha = 0.5 + inf * 0.25;
      B.ctx.lineWidth   = 1 + inf * 0.4;
      B.ctx.shadowColor = wave.color;
      B.ctx.shadowBlur  = 3 + inf * 3;
      B.ctx.stroke();
      B.ctx.globalAlpha = 1;
      B.ctx.shadowBlur  = 0;
    });

    // ── Barras EQ ────────────────────────────────────────────────────
    E.ctx.fillStyle = '#050a12';
    E.ctx.fillRect(0, 0, E.w, E.h);

    var pad  = 20;
    var barW = Math.floor((E.w - pad * 2) / EQ_BANDS.length);
    var midY = E.h * 0.52;
    var maxH = midY - 14;

    // Líneas de referencia
    [-12,-6,0,6,12].forEach(function(g) {
      var y = midY - (g / 12) * maxH;
      E.ctx.strokeStyle = 'rgba(255,255,255,' + (g === 0 ? .1 : .04) + ')';
      E.ctx.lineWidth   = g === 0 ? .8 : .4;
      E.ctx.setLineDash(g === 0 ? [] : [3, 6]);
      E.ctx.beginPath();
      E.ctx.moveTo(pad, y); E.ctx.lineTo(E.w - pad, y); E.ctx.stroke();
      E.ctx.setLineDash([]);
    });

    // Barras y espectro inferior
    EQ_BANDS.forEach(function(b, i) {
      var x   = pad + i * barW + barW * 0.15;
      var bw  = barW * 0.55;
      var anim = b.val + Math.sin(eqT * 0.6 + i * 0.8) * 0.35;
      var bh  = (anim / 12) * maxH;
      var y   = midY - bh;
      var abs = Math.abs(bh) || 2;
      var pos = bh >= 0;

      // Barra principal
      var gr = E.ctx.createLinearGradient(0, pos ? y : midY, 0, pos ? midY : y + abs);
      gr.addColorStop(0, b.color);
      gr.addColorStop(1, b.color + '22');
      E.ctx.fillStyle = gr;
      E.ctx.fillRect(x, pos ? y : midY, bw, abs);

      // Espectro inferior animado
      for (var si = 0; si < 5; si++) {
        var sx = x + (bw / 5) * si;
        var sh = (16 + Math.abs(b.val) * 2) * (0.4 + Math.sin(eqT * 1.8 + si * 1.1 + i * 0.6) * 0.6);
        E.ctx.globalAlpha = .3 + Math.abs(b.val) / 30;
        E.ctx.fillStyle   = b.color;
        E.ctx.fillRect(sx, E.h - 4 - sh, bw / 5 - 1, sh);
      }
      E.ctx.globalAlpha = 1;

      // Dot en pico
      E.ctx.fillStyle   = b.color;
      E.ctx.shadowColor = b.color;
      E.ctx.shadowBlur  = 8;
      E.ctx.beginPath();
      E.ctx.arc(x + bw / 2, y - (pos ? 3 : -3), 2.5, 0, Math.PI * 2);
      E.ctx.fill();
      E.ctx.shadowBlur = 0;
    });

    // Curva de respuesta suavizada
    E.ctx.strokeStyle = 'rgba(0,212,255,.25)';
    E.ctx.lineWidth   = 1.5;
    E.ctx.shadowColor = '#00d4ff';
    E.ctx.shadowBlur  = 4;
    E.ctx.beginPath();
    EQ_BANDS.forEach(function(b, i) {
      var x    = pad + i * barW + barW * 0.15 + bw / 2;
      var anim = b.val + Math.sin(eqT * 0.6 + i * 0.8) * 0.35;
      var y    = midY - (anim / 12) * maxH;
      var bw2  = barW * 0.55;
      var cx   = pad + i * barW + barW * 0.15 + bw2 / 2;
      i === 0 ? E.ctx.moveTo(cx, y) : E.ctx.lineTo(cx, y);
    });
    E.ctx.stroke();
    E.ctx.shadowBlur = 0;

    if (eqVisible) eqAnimId = requestAnimationFrame(frame);
  }

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
  _eqLog('[EQ] Módulo ecualizador neural listo');
});

function _eqLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

} // fin guard
