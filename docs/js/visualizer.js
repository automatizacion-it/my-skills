// =====================================================================
// HUMAN VISUALIZER — SCALL
// Figuras humanas generativas reactivas al audio real
// =====================================================================

if (window._SCALL_VIZ_LOADED) {
  console.warn('[VIZ] Módulo ya cargado');
} else {
window._SCALL_VIZ_LOADED = true;

var vizPanel   = null;
var vizAnimId  = null;
var vizT       = 0;
var vizVisible = false;
var vizMode    = 'dance';
var vizAnalyser = null;
var vizFdata    = null;

var vizBands  = {sub:0,bass:0,mid:0,high:0,air:0,energy:0};
var vizSmooth = {sub:0,bass:0,mid:0,high:0,air:0,energy:0};
var vizEnergyHist = new Array(20).fill(0);
var vizBeatCool   = 0;
var vizFlash      = 0;
var vizT2         = 0; // t interno del frame

// ══════════════════════════════════════════════════════════════════════
// AUDIO
// ══════════════════════════════════════════════════════════════════════

function vizConectar() {
  if (window.scallAudioAnalyser) {
    vizAnalyser = window.scallAudioAnalyser;
    try { vizAnalyser.fftSize = 2048; } catch(e) {}
    vizFdata = new Uint8Array(vizAnalyser.frequencyBinCount);
    _vizLog('[VIZ] Conectado a scallAudioAnalyser ✅');
    return;
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio:true, video:false })
      .then(function(stream) {
        var ctx     = new (window.AudioContext || window.webkitAudioContext)();
        var src     = ctx.createMediaStreamSource(stream);
        vizAnalyser = ctx.createAnalyser();
        vizAnalyser.fftSize = 2048;
        vizAnalyser.smoothingTimeConstant = 0.85;
        src.connect(vizAnalyser);
        vizFdata = new Uint8Array(vizAnalyser.frequencyBinCount);
        window.scallAudioAnalyser = vizAnalyser;
        _vizLog('[VIZ] AnalyserNode propio creado ✅');
      }).catch(function() { _vizLog('[VIZ] Sin micrófono — modo demo'); });
  }
}

function vizLeer() {
  if (!vizAnalyser || !vizFdata) {
    // Demo
    vizBands.sub    = 0.3 + Math.sin(vizT2*0.8)*0.25;
    vizBands.bass   = 0.4 + Math.sin(vizT2*0.6+0.5)*0.3;
    vizBands.mid    = 0.35 + Math.sin(vizT2*0.9+1)*0.25;
    vizBands.high   = 0.2 + Math.sin(vizT2*1.2+2)*0.18;
    vizBands.energy = (vizBands.sub+vizBands.bass+vizBands.mid)/3;
    return;
  }
  vizAnalyser.getByteFrequencyData(vizFdata);
  function avg(s,e) {
    var x=0, cnt=Math.min(e,vizFdata.length-1)-s+1;
    for(var i=s;i<=Math.min(e,vizFdata.length-1);i++) x+=vizFdata[i];
    return x/(cnt*255);
  }
  vizBands.sub    = avg(1,4);
  vizBands.bass   = avg(4,16);
  vizBands.mid    = avg(16,60);
  vizBands.high   = avg(60,200);
  vizBands.air    = avg(200,400);
  vizBands.energy = (vizBands.sub*1.5+vizBands.bass*1.2+vizBands.mid+vizBands.high*0.7)/4.4;
}

function vizSuavizar() {
  var a = 0.76;
  for (var k in vizBands) { vizSmooth[k] = vizSmooth[k]*a + vizBands[k]*(1-a); }
}

function vizDetectBeat() {
  var avg = vizEnergyHist.reduce(function(a,b){return a+b},0)/vizEnergyHist.length;
  vizEnergyHist.shift(); vizEnergyHist.push(vizSmooth.bass);
  if (vizBeatCool > 0) { vizBeatCool--; return false; }
  if (vizSmooth.bass > avg*1.38 && vizSmooth.bass > 0.22) { vizBeatCool=8; return true; }
  return false;
}

// ══════════════════════════════════════════════════════════════════════
// DIBUJAR FIGURA HUMANA
// ══════════════════════════════════════════════════════════════════════

function drawFigura(ctx, W, H, cx, cy, scale, phase, hue, energy, modo) {
  var e  = energy;
  var s  = scale;
  var beatP = vizSmooth.bass > 0.35 ? (vizSmooth.bass-0.35)*3 : 0;
  var armL, armR, legL, legR, lean, bounce;

  if (modo === 'dance') {
    armL   = -0.8 + Math.sin(vizT2*2.1+phase)*0.9*e + beatP*0.4;
    armR   =  0.8 - Math.sin(vizT2*2.1+phase+1)*0.9*e - beatP*0.4;
    legL   = -0.3 + Math.sin(vizT2*2.1+phase+0.5)*0.6*e;
    legR   =  0.3 - Math.sin(vizT2*2.1+phase+0.5)*0.6*e;
    lean   = Math.sin(vizT2*1.1+phase)*0.12*e;
    bounce = Math.abs(Math.sin(vizT2*3.2+phase))*12*e + beatP*8;
  } else if (modo === 'wave') {
    armL   = -1.2 + Math.sin(vizT2*1.5+phase)*0.6;
    armR   =  0.2 + Math.sin(vizT2*1.5+phase+0.8)*0.9;
    legL   = -0.15 + Math.sin(vizT2*0.8+phase)*0.1;
    legR   =  0.15;
    lean   = Math.sin(vizT2*0.6+phase)*0.08;
    bounce = Math.sin(vizT2*1.5+phase)*6*e;
  } else if (modo === 'crowd') {
    armL   = -0.6 + Math.sin(vizT2*4+phase)*0.7*e;
    armR   =  0.6 - Math.cos(vizT2*4+phase)*0.7*e;
    legL   = -0.2 + Math.sin(vizT2*4+phase+1)*0.3*e;
    legR   =  0.2 - Math.sin(vizT2*4+phase+1)*0.3*e;
    lean   = Math.sin(vizT2*2+phase)*0.15*e;
    bounce = beatP*15;
  } else { // mirror
    armL   = -0.9 + Math.sin(vizT2*2.5+phase)*e;
    armR   =  0.9 - Math.sin(vizT2*2.5+phase)*e;
    legL   = -0.4 + Math.sin(vizT2*2.5+phase)*0.5*e;
    legR   =  0.4 - Math.sin(vizT2*2.5+phase)*0.5*e;
    lean   = 0;
    bounce = Math.abs(Math.sin(vizT2*2.5+phase))*10*e;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  ctx.translate(0, -bounce);

  var bri   = 55 + Math.floor(e*40);
  var color = 'hsl('+Math.floor(hue)+',100%,'+bri+'%)';
  var glow  = 8 + e*22 + beatP*16;

  ctx.shadowColor = color; ctx.shadowBlur = glow;
  ctx.strokeStyle = color; ctx.fillStyle  = color;
  ctx.globalAlpha = 0.85 + e*0.15;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Cabeza
  var hr = s*(0.13+e*0.03+beatP*0.04);
  ctx.beginPath(); ctx.arc(0,-s*0.82,hr,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.beginPath(); ctx.arc(0,-s*0.82,hr*2.8,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.85+e*0.15; ctx.fillStyle = color;

  var lw = s*(0.042+e*0.014); ctx.lineWidth = lw;

  // Torso
  ctx.beginPath(); ctx.moveTo(0,-s*0.68); ctx.lineTo(0,-s*0.22); ctx.stroke();

  // Brazo L
  var a1x=-s*0.08,a1y=-s*0.58;
  var a2x=a1x+Math.cos(armL-Math.PI/2)*s*0.38, a2y=a1y+Math.sin(armL-Math.PI/2)*s*0.38;
  var a3x=a2x+Math.cos(armL-Math.PI/2+0.4)*s*0.32, a3y=a2y+Math.sin(armL-Math.PI/2+0.4)*s*0.32;
  ctx.beginPath(); ctx.moveTo(a1x,a1y); ctx.lineTo(a2x,a2y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(a2x,a2y); ctx.lineTo(a3x,a3y); ctx.stroke();

  // Brazo R
  var b1x=s*0.08,b1y=-s*0.58;
  var b2x=b1x+Math.cos(armR-Math.PI/2)*s*0.38, b2y=b1y+Math.sin(armR-Math.PI/2)*s*0.38;
  var b3x=b2x+Math.cos(armR-Math.PI/2-0.4)*s*0.32, b3y=b2y+Math.sin(armR-Math.PI/2-0.4)*s*0.32;
  ctx.beginPath(); ctx.moveTo(b1x,b1y); ctx.lineTo(b2x,b2y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b2x,b2y); ctx.lineTo(b3x,b3y); ctx.stroke();

  // Pierna L
  var l1x=-s*0.06,l1y=-s*0.22;
  var l2x=l1x+Math.sin(legL)*s*0.42, l2y=l1y+Math.cos(Math.abs(legL))*s*0.42;
  var l3x=l2x+Math.sin(legL*0.5)*s*0.38, l3y=l2y+Math.cos(Math.abs(legL*0.5))*s*0.38;
  ctx.beginPath(); ctx.moveTo(l1x,l1y); ctx.lineTo(l2x,l2y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(l2x,l2y); ctx.lineTo(l3x,l3y); ctx.stroke();

  // Pierna R
  var r1x=s*0.06,r1y=-s*0.22;
  var r2x=r1x+Math.sin(legR)*s*0.42, r2y=r1y+Math.cos(Math.abs(legR))*s*0.42;
  var r3x=r2x+Math.sin(legR*0.5)*s*0.38, r3y=r2y+Math.cos(Math.abs(legR*0.5))*s*0.38;
  ctx.beginPath(); ctx.moveTo(r1x,r1y); ctx.lineTo(r2x,r2y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r2x,r2y); ctx.lineTo(r3x,r3y); ctx.stroke();

  // Partículas de beat
  if (beatP > 0.08 || e > 0.45) {
    for (var p=0; p<6; p++) {
      var pa = (vizT2*3+phase+p*1.05)%(Math.PI*2);
      var pr = s*(0.28+beatP*0.55+e*0.22);
      ctx.globalAlpha = (beatP+e*0.25)*0.55;
      ctx.beginPath(); ctx.arc(Math.cos(pa)*pr, Math.sin(pa)*pr-s*0.5, s*0.022, 0, Math.PI*2);
      ctx.fill();
    }
  }

  ctx.globalAlpha=1; ctx.shadowBlur=0;
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════
// CREAR PANEL
// ══════════════════════════════════════════════════════════════════════

function crearPanelViz() {
  vizPanel = document.createElement('div');
  vizPanel.id = 'scall-viz-panel';
  vizPanel.style.cssText = [
    'position:fixed','top:50px','left:50%','transform:translateX(-50%)',
    'width:560px','max-width:98vw',
    'background:#000',
    'border:1px solid rgba(0,212,255,0.15)',
    'border-radius:18px',
    'box-shadow:0 0 80px rgba(0,212,255,0.06),0 30px 80px rgba(0,0,0,0.9)',
    'z-index:2500',
    'display:none','flex-direction:column',
    'overflow:hidden'
  ].join(';');

  vizPanel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:10px 16px 8px;background:rgba(0,0,0,.5);">' +
      '<span style="font-size:10px;letter-spacing:.18em;color:rgba(0,212,255,.45);font-family:DM Mono,monospace;">SCALL — HUMAN VISUALIZER</span>' +
      '<button onclick="cerrarViz()" style="background:transparent;border:1px solid rgba(255,255,255,.1);' +
        'color:rgba(255,255,255,.35);width:26px;height:26px;border-radius:7px;cursor:pointer;">✕</button>' +
    '</div>' +
    '<canvas id="viz-main-c" style="width:100%;display:block;"></canvas>' +
    '<div style="display:flex;gap:6px;padding:8px 14px;background:rgba(0,0,0,.6);flex-wrap:wrap;">' +
      '<button class="viz-mode-btn" id="vb-dance"  onclick="cambiarModoViz(\'dance\')"  style="' + vizBtnStyle(true)  + '">DANZA</button>' +
      '<button class="viz-mode-btn" id="vb-wave"   onclick="cambiarModoViz(\'wave\')"   style="' + vizBtnStyle(false) + '">ONDA</button>' +
      '<button class="viz-mode-btn" id="vb-crowd"  onclick="cambiarModoViz(\'crowd\')"  style="' + vizBtnStyle(false) + '">MULTITUD</button>' +
      '<button class="viz-mode-btn" id="vb-mirror" onclick="cambiarModoViz(\'mirror\')" style="' + vizBtnStyle(false) + '">ESPEJO</button>' +
      '<span id="viz-live" style="margin-left:auto;font-size:8px;font-family:DM Mono,monospace;' +
            'color:rgba(255,255,255,.2);align-self:center;letter-spacing:.1em;">DEMO</span>' +
    '</div>';

  document.body.appendChild(vizPanel);
}

function vizBtnStyle(active) {
  var base = 'font-size:9px;letter-spacing:.1em;padding:5px 11px;border-radius:6px;cursor:pointer;' +
    'font-family:DM Mono,monospace;transition:all .2s;';
  if (active) return base + 'background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.4);color:#00d4ff;';
  return base + 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);';
}

function cambiarModoViz(m) {
  vizMode = m;
  document.querySelectorAll('.viz-mode-btn').forEach(function(b) {
    b.style.background   = 'rgba(255,255,255,.04)';
    b.style.borderColor  = 'rgba(255,255,255,.1)';
    b.style.color        = 'rgba(255,255,255,.4)';
  });
  var btn = document.getElementById('vb-'+m);
  if (btn) {
    btn.style.background  = 'rgba(0,212,255,.12)';
    btn.style.borderColor = 'rgba(0,212,255,.4)';
    btn.style.color       = '#00d4ff';
  }
  if (typeof responderVoz === 'function') {
    var nombres = {dance:'modo danza',wave:'modo onda',crowd:'multitud',mirror:'espejo'};
    responderVoz('Cambiando a ' + (nombres[m]||m));
  }
}

var CONFIGS_VIZ = {
  dance:  [{x:.5,y:.74,s:130,ph:0,hs:0}],
  wave:   [{x:.18,y:.72,s:90,ph:0,hs:0},{x:.5,y:.74,s:105,ph:.8,hs:60},{x:.82,y:.72,s:90,ph:1.6,hs:120}],
  crowd:  [{x:.12,y:.8,s:68,ph:0,hs:0},{x:.28,y:.76,s:82,ph:.6,hs:45},
           {x:.5,y:.73,s:100,ph:1.2,hs:90},{x:.72,y:.76,s:82,ph:1.8,hs:140},{x:.88,y:.8,s:68,ph:2.4,hs:200}],
  mirror: [{x:.28,y:.73,s:110,ph:0,hs:0},{x:.72,y:.73,s:110,ph:0,hs:180}]
};

// ══════════════════════════════════════════════════════════════════════
// ANIMACIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

function iniciarViz() {
  var canvas = document.getElementById('viz-main-c');
  if (!canvas) return;

  var PR2  = window.devicePixelRatio || 1;
  var W2   = canvas.parentElement.clientWidth || 560;
  var H2   = Math.round(W2 * 0.6);
  canvas.width  = W2 * PR2; canvas.height = H2 * PR2;
  canvas.style.height = H2 + 'px';
  var c2 = canvas.getContext('2d');
  c2.scale(PR2, PR2);

  function frame() {
    vizT2 += 0.022;
    vizLeer(); vizSuavizar();
    var beat = vizDetectBeat();
    if (beat) vizFlash = 0.13; else vizFlash *= 0.83;

    // Fondo trail
    c2.fillStyle = 'rgba(0,0,0,0.32)';
    c2.fillRect(0, 0, W2, H2);

    // Flash beat
    if (vizFlash > 0.01) {
      c2.fillStyle = 'rgba(255,255,255,' + vizFlash.toFixed(3) + ')';
      c2.fillRect(0, 0, W2, H2);
    }

    // Partículas de fondo
    for (var i=0; i<3; i++) {
      var px = (Math.sin(vizT2*0.3+i*2.1)*0.38+0.5)*W2;
      var py = (Math.cos(vizT2*0.22+i*1.7)*0.3+0.5)*H2;
      var pr = 25 + vizSmooth.energy*70;
      var gr = c2.createRadialGradient(px,py,0,px,py,pr);
      var hh = (vizT2*22+i*120)%360;
      gr.addColorStop(0,'hsla('+hh+',100%,60%,0.035)'); gr.addColorStop(1,'transparent');
      c2.fillStyle=gr; c2.beginPath(); c2.arc(px,py,pr,0,Math.PI*2); c2.fill();
    }

    // Onda de suelo
    c2.strokeStyle='rgba(0,212,255,0.12)'; c2.lineWidth=1;
    c2.beginPath();
    for(var x2=0;x2<=W2;x2+=2){
      var wy=H2*0.88+Math.sin(x2*0.025+vizT2*2)*5*vizSmooth.bass+Math.sin(x2*0.05+vizT2*3)*3*vizSmooth.mid;
      x2===0?c2.moveTo(x2,wy):c2.lineTo(x2,wy);
    }
    c2.stroke();

    // Figuras humanas
    var cfg2 = CONFIGS_VIZ[vizMode];
    var baseHue = (vizT2*18)%360;
    cfg2.forEach(function(cf){
      drawFigura(c2,W2,H2,cf.x*W2,cf.y*H2,cf.s*W2/560,cf.ph,(baseHue+cf.hs)%360,0.4+vizSmooth.energy*0.85,vizMode);
    });

    // Reflejo espejo
    if (vizMode==='mirror') {
      c2.save(); c2.scale(1,-0.3); c2.translate(0,-H2*2.93); c2.globalAlpha=0.12;
      cfg2.forEach(function(cf){
        drawFigura(c2,W2,H2,cf.x*W2,cf.y*H2,cf.s*W2/560,cf.ph,(baseHue+cf.hs)%360,0.4+vizSmooth.energy*0.85,vizMode);
      });
      c2.restore(); c2.globalAlpha=1;
    }

    // Live indicator
    var liveEl = document.getElementById('viz-live');
    if (liveEl) {
      var hasAudio = !!(vizAnalyser && vizFdata);
      liveEl.textContent = hasAudio ? (vizSmooth.energy > 0.05 ? '● LIVE' : '○ SILENCIO') : 'DEMO';
      liveEl.style.color = hasAudio && vizSmooth.energy > 0.05 ? 'rgba(0,212,255,.6)' : 'rgba(255,255,255,.18)';
    }

    if (vizVisible) vizAnimId = requestAnimationFrame(frame);
  }

  if (vizAnimId) cancelAnimationFrame(vizAnimId);
  vizAnimId = requestAnimationFrame(frame);
}

// ══════════════════════════════════════════════════════════════════════
// ABRIR / CERRAR
// ══════════════════════════════════════════════════════════════════════

function abrirViz() {
  if (!vizPanel) crearPanelViz();
  vizPanel.style.display = 'flex';
  vizVisible = true;
  vizConectar();
  setTimeout(iniciarViz, 50);
  _vizLog('[VIZ] Visualizador abierto');
}

function cerrarViz() {
  if (vizPanel) vizPanel.style.display = 'none';
  vizVisible = false;
  if (vizAnimId) { cancelAnimationFrame(vizAnimId); vizAnimId = null; }
}

function toggleViz() { if (vizVisible) cerrarViz(); else abrirViz(); }

// ══════════════════════════════════════════════════════════════════════
// EXPONER
// ══════════════════════════════════════════════════════════════════════

window.abrirViz       = abrirViz;
window.cerrarViz      = cerrarViz;
window.toggleViz      = toggleViz;
window.cambiarModoViz = cambiarModoViz;

window.addEventListener('load', function() {
  _vizLog('[VIZ] Human Visualizer listo');
});

function _vizLog(m) { if (typeof logMessage==='function') logMessage(m); else console.log(m); }

} // fin guard
