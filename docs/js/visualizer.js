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

    // ── FONDO: cielo nocturno ────────────────────────────────────────
    var skyGrad = c2.createLinearGradient(0,0,0,H2);
    skyGrad.addColorStop(0,'#000510');
    skyGrad.addColorStop(0.5,'#010d14');
    skyGrad.addColorStop(1,'#000a08');
    c2.fillStyle = skyGrad;
    c2.fillRect(0,0,W2,H2);

    // ── ESTRELLAS fijas ──────────────────────────────────────────────
    if (!vizPanel._stars) {
      vizPanel._stars = [];
      for (var si=0; si<120; si++) {
        vizPanel._stars.push({
          x: Math.random()*W2, y: Math.random()*H2*0.85,
          r: Math.random()*1.2+0.2,
          tw: Math.random()*6+2, ph: Math.random()*Math.PI*2
        });
      }
    }
    vizPanel._stars.forEach(function(st) {
      var twinkle = 0.4 + Math.sin(vizT2*st.tw+st.ph)*0.4 + vizSmooth.energy*0.2;
      c2.globalAlpha = twinkle;
      c2.fillStyle   = '#fff';
      c2.beginPath(); c2.arc(st.x, st.y, st.r, 0, Math.PI*2); c2.fill();
    });
    c2.globalAlpha = 1;

    // ── AURORA BOREAL ────────────────────────────────────────────────
    // 5 bandas de luz ondulante en el cielo
    var auroraColors = [
      [0,  255, 150],  // verde esmeralda
      [0,  200, 255],  // cyan hielo
      [120,  0, 255],  // violeta profundo
      [0,  255, 200],  // turquesa
      [180, 80, 255]   // lila
    ];
    var auroraEnergy = 0.45 + vizSmooth.energy*0.55 + vizSmooth.bass*0.3;

    for (var ai=0; ai<5; ai++) {
      var col = auroraColors[ai];
      var bandY  = H2*(0.08 + ai*0.09);
      var bandH2 = H2*(0.18 + vizSmooth.mid*0.12 + ai*0.02);
      var phase2 = ai*1.26 + vizT2*(0.12+ai*0.04);
      var alpha2 = (0.10 + vizSmooth.energy*0.18 + Math.sin(vizT2*0.3+ai*0.8)*0.06) * auroraEnergy;

      for (var col2=0; col2<3; col2++) {
        var xOff = col2 * W2/3;
        var wOff = W2/3 + W2*0.1;

        // Cortina de luz: múltiples líneas verticales suavizadas
        for (var xi=0; xi<W2; xi+=3) {
          var nx   = xi/W2;
          var wave =
            Math.sin(nx*4.2 + phase2)*0.5 +
            Math.sin(nx*7.8 + phase2*1.3 + ai)*0.25 +
            Math.sin(nx*12  + phase2*0.7 + col2)*0.15 +
            Math.sin(nx*2.1 + vizT2*0.5)*vizSmooth.bass*0.3;

          var topY  = bandY + wave*30*auroraEnergy;
          var botY  = topY + bandH2*(0.5 + Math.sin(nx*3+phase2)*0.3 + vizSmooth.mid*0.3);
          var lineA = alpha2*(0.5+Math.sin(nx*5+phase2)*0.5);

          var lg = c2.createLinearGradient(0, topY, 0, botY);
          lg.addColorStop(0,'rgba('+col[0]+','+col[1]+','+col[2]+',0)');
          lg.addColorStop(0.25,'rgba('+col[0]+','+col[1]+','+col[2]+','+lineA.toFixed(3)+')');
          lg.addColorStop(0.6,'rgba('+col[0]+','+col[1]+','+col[2]+','+(lineA*0.6).toFixed(3)+')');
          lg.addColorStop(1,'rgba('+col[0]+','+col[1]+','+col[2]+',0)');

          c2.fillStyle = lg;
          c2.fillRect(xi, topY, 3, botY-topY);
        }
      }
    }

    // Resplandor central de la aurora — se intensifica con el beat
    var auroraGlow = c2.createRadialGradient(W2/2, H2*0.3, 0, W2/2, H2*0.3, W2*0.7);
    var glowA = 0.03 + vizSmooth.energy*0.06 + vizFlash*0.1;
    auroraGlow.addColorStop(0,'rgba(0,255,160,'+glowA.toFixed(3)+')');
    auroraGlow.addColorStop(0.4,'rgba(80,0,255,'+(glowA*0.5).toFixed(3)+')');
    auroraGlow.addColorStop(1,'transparent');
    c2.fillStyle = auroraGlow;
    c2.fillRect(0,0,W2,H2);

    // ── Flash beat ───────────────────────────────────────────────────
    if (vizFlash > 0.01) {
      c2.fillStyle = 'rgba(100,255,200,' + (vizFlash*0.4).toFixed(3) + ')';
      c2.fillRect(0, 0, W2, H2);
    }

    // ── NIEVE / PARTÍCULAS flotantes ─────────────────────────────────
    if (!vizPanel._particles) {
      vizPanel._particles = [];
      for (var pi=0; pi<40; pi++) {
        vizPanel._particles.push({
          x: Math.random()*W2, y: Math.random()*H2,
          vx: (Math.random()-0.5)*0.3, vy: Math.random()*0.4+0.1,
          r: Math.random()*1.5+0.3, ph: Math.random()*Math.PI*2
        });
      }
    }
    vizPanel._particles.forEach(function(p) {
      p.x += p.vx + Math.sin(vizT2*0.5+p.ph)*0.4;
      p.y += p.vy + vizSmooth.energy*0.3;
      if (p.y > H2) { p.y = -5; p.x = Math.random()*W2; }
      if (p.x < 0) p.x = W2; if (p.x > W2) p.x = 0;
      c2.globalAlpha = 0.35 + vizSmooth.air*0.3;
      c2.fillStyle   = 'rgba(180,240,255,0.8)';
      c2.beginPath(); c2.arc(p.x, p.y, p.r, 0, Math.PI*2); c2.fill();
    });
    c2.globalAlpha = 1;

    // ── REFLEJO EN SUELO HELADO ──────────────────────────────────────
    var groundY = H2*0.86;
    var iceGrad = c2.createLinearGradient(0, groundY, 0, H2);
    iceGrad.addColorStop(0,'rgba(0,40,60,0.5)');
    iceGrad.addColorStop(1,'rgba(0,10,20,0.8)');
    c2.fillStyle = iceGrad;
    c2.fillRect(0, groundY, W2, H2-groundY);

    // Línea del horizonte helado
    c2.strokeStyle = 'rgba(0,200,180,0.15)';
    c2.lineWidth   = 1;
    c2.beginPath(); c2.moveTo(0,groundY); c2.lineTo(W2,groundY); c2.stroke();

    // Reflejo de aurora en el hielo
    c2.save();
    c2.globalAlpha = 0.12;
    c2.scale(1,-0.25);
    c2.translate(0, -H2*4.44);
    for (var ari=0; ari<5; ari++) {
      var rcol = auroraColors[ari];
      var rphase = ari*1.26 + vizT2*(0.12+ari*0.04);
      c2.strokeStyle = 'rgba('+rcol[0]+','+rcol[1]+','+rcol[2]+',0.3)';
      c2.lineWidth = 2;
      c2.beginPath();
      for (var rx=0; rx<=W2; rx+=4) {
        var rnx = rx/W2;
        var ry  = H2*0.3 + Math.sin(rnx*4.2+rphase)*25 + Math.sin(rnx*8+rphase*1.3+ari)*12;
        rx===0?c2.moveTo(rx,ry):c2.lineTo(rx,ry);
      }
      c2.stroke();
    }
    c2.restore();

    // ── ONDA DE SUELO ────────────────────────────────────────────────
    c2.strokeStyle='rgba(0,220,180,0.18)'; c2.lineWidth=1.2;
    c2.beginPath();
    for(var x2=0;x2<=W2;x2+=2){
      var wy=groundY+Math.sin(x2*0.025+vizT2*2)*4*vizSmooth.bass+Math.sin(x2*0.05+vizT2*3)*2*vizSmooth.mid;
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
