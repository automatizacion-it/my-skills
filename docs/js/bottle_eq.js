// =====================================================================
// BOTTLE EQUALIZER — SCALL
// Botellas de aceite con escarcha reactivas al audio real
// =====================================================================

if (window._SCALL_BOTTLE_EQ_LOADED) {
  console.warn('[BOTTLE_EQ] Ya cargado');
} else {
window._SCALL_BOTTLE_EQ_LOADED = true;

var beqPanel   = null;
var beqAnimId  = null;
var beqT       = 0;
var beqVisible = false;
var beqMode    = 'shake';
var beqAnalyser = null;
var beqFdata    = null;
var beqSmooth   = {sub:0,bass:0,mid:0,high:0,air:0,energy:0};

var BEQ_BOTTLES = [
  { x:0, bx:0.14, bandKey:'sub',  col:[255,80,180],  col2:[255,180,80],  label:'SUB',  hz:'60Hz',  glitter:[] },
  { x:0, bx:0.30, bandKey:'bass', col:[80,180,255],  col2:[180,80,255],  label:'BASS', hz:'250Hz', glitter:[] },
  { x:0, bx:0.50, bandKey:'mid',  col:[80,255,150],  col2:[255,255,80],  label:'MID',  hz:'1KHz',  glitter:[] },
  { x:0, bx:0.70, bandKey:'high', col:[255,200,80],  col2:[80,255,255],  label:'HIGH', hz:'4KHz',  glitter:[] },
  { x:0, bx:0.86, bandKey:'air',  col:[200,80,255],  col2:[80,255,200],  label:'AIR',  hz:'14KHz', glitter:[] }
];

// ══════════════════════════════════════════════════════════════════════
// AUDIO
// ══════════════════════════════════════════════════════════════════════

function beqConectar() {
  if (window.scallAudioAnalyser) {
    beqAnalyser = window.scallAudioAnalyser;
    try { beqAnalyser.fftSize = 2048; } catch(e) {}
    beqFdata = new Uint8Array(beqAnalyser.frequencyBinCount);
    _beqLog('[BOTTLE_EQ] Conectado ✅');
    return;
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio:true, video:false })
      .then(function(stream) {
        var ctx     = new (window.AudioContext||window.webkitAudioContext)();
        var src     = ctx.createMediaStreamSource(stream);
        beqAnalyser = ctx.createAnalyser();
        beqAnalyser.fftSize = 2048;
        beqAnalyser.smoothingTimeConstant = 0.85;
        src.connect(beqAnalyser);
        beqFdata = new Uint8Array(beqAnalyser.frequencyBinCount);
        window.scallAudioAnalyser = beqAnalyser;
        _beqLog('[BOTTLE_EQ] AnalyserNode creado ✅');
      }).catch(function() { _beqLog('[BOTTLE_EQ] Sin micrófono — modo demo'); });
  }
}

function beqLeer() {
  if (!beqAnalyser || !beqFdata) {
    beqSmooth.sub    = 0.25 + Math.sin(beqT*0.9)*0.22 + Math.sin(beqT*1.7)*0.1;
    beqSmooth.bass   = 0.35 + Math.sin(beqT*0.7+0.5)*0.28;
    beqSmooth.mid    = 0.30 + Math.sin(beqT*1.1+1)*0.22;
    beqSmooth.high   = 0.18 + Math.sin(beqT*1.4+2)*0.15;
    beqSmooth.air    = 0.12 + Math.sin(beqT*1.8+3)*0.1;
    beqSmooth.energy = (beqSmooth.sub+beqSmooth.bass+beqSmooth.mid)/3;
    return;
  }
  beqAnalyser.getByteFrequencyData(beqFdata);
  function avg(s,e) {
    var x=0, n=Math.min(e,beqFdata.length-1)-s+1;
    for(var i=s;i<=Math.min(e,beqFdata.length-1);i++) x+=beqFdata[i];
    return x/(n*255);
  }
  var raw = { sub:avg(1,4), bass:avg(4,16), mid:avg(16,60), high:avg(60,200), air:avg(200,400) };
  var a   = 0.78;
  for (var k in raw) beqSmooth[k] = beqSmooth[k]*a + raw[k]*(1-a);
  beqSmooth.energy = (beqSmooth.sub*1.4+beqSmooth.bass*1.2+beqSmooth.mid+beqSmooth.high*0.7)/4.3;
}

// ══════════════════════════════════════════════════════════════════════
// INICIALIZAR ESCARCHA
// ══════════════════════════════════════════════════════════════════════

function inicializarGlitter(bot) {
  bot.glitter = [];
  for (var i=0; i<80; i++) {
    bot.glitter.push({
      x:    (Math.random()-0.5)*50,
      y:    Math.random(),
      vx:   (Math.random()-0.5)*0.4,
      vy:   (Math.random()-0.5)*0.2,
      r:    Math.random()*2.2+0.5,
      hue:  Math.random()*360,
      ph:   Math.random()*Math.PI*2,
      type: Math.random()>0.5?'star':'circle',
      spin: (Math.random()-0.5)*0.08
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// DIBUJAR BOTELLA
// ══════════════════════════════════════════════════════════════════════

function dibujarBotella(ctx, bot, W, H, energy) {
  var cx    = bot.x;
  var bw    = Math.max(40, W*0.07);
  var bh    = H * 0.5;
  var neck  = bw * 0.34;
  var neckH = bh * 0.18;
  var baseY = H - H*0.13;
  var topY  = baseY - bh - neckH;
  var fillLevel = 0.22 + energy * 0.68;
  var fillY = baseY - bh * fillLevel;

  ctx.save();
  ctx.shadowColor  = 'rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+',0.4)';
  ctx.shadowBlur   = 18 + energy*28;

  // Forma de la botella
  function bottlePath() {
    ctx.beginPath();
    ctx.moveTo(cx - bw/2 + 5, baseY);
    ctx.quadraticCurveTo(cx - bw/2, baseY, cx - bw/2, baseY - 5);
    ctx.lineTo(cx - bw/2, baseY - bh + 10);
    ctx.quadraticCurveTo(cx - bw/2, baseY - bh, cx - neck/2 - 2, baseY - bh);
    ctx.lineTo(cx - neck/2, topY + 7);
    ctx.quadraticCurveTo(cx - neck/2, topY, cx, topY);
    ctx.quadraticCurveTo(cx + neck/2, topY, cx + neck/2, topY + 7);
    ctx.lineTo(cx + neck/2 + 2, baseY - bh);
    ctx.quadraticCurveTo(cx + bw/2, baseY - bh, cx + bw/2, baseY - bh + 10);
    ctx.lineTo(cx + bw/2, baseY - 5);
    ctx.quadraticCurveTo(cx + bw/2, baseY, cx + bw/2 - 5, baseY);
    ctx.closePath();
  }

  // Vidrio de fondo
  bottlePath();
  ctx.fillStyle = 'rgba(200,230,255,0.055)';
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  bottlePath();
  ctx.clip();

  // Aceite — superficie ondulante
  var shakeX = 0;
  if (beqMode === 'shake') shakeX = Math.sin(beqT*8+cx)*energy*7;
  if (beqMode === 'storm') shakeX = Math.sin(beqT*13+cx)*energy*13;

  ctx.beginPath();
  ctx.moveTo(cx - bw/2, baseY);
  ctx.lineTo(cx - bw/2, fillY + shakeX);

  var steps = 20;
  for (var si=0; si<=steps; si++) {
    var sx  = cx - bw/2 + (bw/steps)*si;
    var wH  = 0;
    if (beqMode==='wave')   wH = Math.sin(si*0.8+beqT*5)*6*energy + Math.sin(si*1.6+beqT*3)*3*energy;
    if (beqMode==='shake')  wH = Math.sin(si*1.2+beqT*8)*8*energy;
    if (beqMode==='storm')  wH = Math.sin(si*2.1+beqT*12)*12*energy + Math.sin(si*3.5+beqT*9)*5*energy;
    if (beqMode==='bubble') wH = Math.sin(si*0.5+beqT*3)*4*energy;
    ctx.lineTo(sx, fillY + wH + shakeX*0.5);
  }
  ctx.lineTo(cx + bw/2, baseY);
  ctx.closePath();

  var oilGrad = ctx.createLinearGradient(cx, fillY, cx, baseY);
  oilGrad.addColorStop(0,   'rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+',0.52)');
  oilGrad.addColorStop(0.35,'rgba('+bot.col2[0]+','+bot.col2[1]+','+bot.col2[2]+',0.42)');
  oilGrad.addColorStop(0.7, 'rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+',0.58)');
  oilGrad.addColorStop(1,   'rgba('+bot.col2[0]+','+bot.col2[1]+','+bot.col2[2]+',0.32)');
  ctx.fillStyle = oilGrad;
  ctx.fill();

  // Escarcha
  bot.glitter.forEach(function(g) {
    var turb = energy * 0.04;
    if (beqMode==='shake')  { g.vx+=(Math.random()-.5)*turb*2; g.vy+=(Math.random()-.5)*turb*2; }
    if (beqMode==='bubble') { g.vy-=0.003+energy*0.007; g.vx+=Math.sin(beqT*2+g.ph)*0.01; }
    if (beqMode==='storm')  { g.vx+=Math.sin(beqT*5+g.ph)*turb*3; g.vy+=(Math.random()-.5)*turb*3; }
    else                    { g.vy -= (g.y > fillLevel) ? -0.005 : 0.004; }

    g.vx*=0.93; g.vy*=0.93;
    g.x+=g.vx; g.y-=g.vy*0.4; g.spin+=0.05;

    if (g.x<-bw/2+4)  { g.x=-bw/2+4;  g.vx*=-0.6; }
    if (g.x> bw/2-4)  { g.x= bw/2-4;  g.vx*=-0.6; }
    if (g.y<0.02)      { g.y=0.02;     g.vy*=-0.5; }
    if (g.y>0.98)      { g.y=0.98;     g.vy*=-0.5; }

    var gY = baseY - bh*g.y;
    var gX = cx + g.x;
    var inOil = gY > fillY;
    var gAlpha = inOil ? 0.88 : 0.2;
    var gHue   = (g.hue + beqT*30)%360;
    var gSize  = g.r*(1+energy*0.5);

    ctx.save();
    ctx.translate(gX, gY);
    ctx.rotate(g.spin);
    ctx.shadowColor = 'hsla('+gHue+',100%,70%,.9)';
    ctx.shadowBlur  = 4+energy*4;

    if (g.type==='star') {
      ctx.fillStyle = 'hsla('+gHue+',100%,72%,'+gAlpha+')';
      ctx.beginPath();
      for (var pt=0; pt<8; pt++) {
        var ang = (pt/8)*Math.PI*2;
        var rad = pt%2===0 ? gSize*1.9 : gSize*0.7;
        pt===0?ctx.moveTo(Math.cos(ang)*rad,Math.sin(ang)*rad):ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = 'hsla('+gHue+',100%,72%,'+gAlpha+')';
      ctx.beginPath(); ctx.arc(0,0,gSize,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(-gSize*.3,-gSize*.3,gSize*.35,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });

  // Burbujas
  if (beqMode==='bubble' && energy>0.12) {
    for (var bi=0; bi<3; bi++) {
      var bph = beqT*2+bi*2.1+cx;
      var bbx = cx+Math.sin(bph)*bw*0.25;
      var bby = fillY+(baseY-fillY)*(0.3+Math.sin(beqT+bi)*0.4);
      var bbr = 2+energy*4;
      ctx.beginPath(); ctx.arc(bbx,bby,bbr,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fill();
    }
  }

  ctx.restore();

  // Vidrio exterior
  bottlePath();
  var gs = ctx.createLinearGradient(cx-bw/2,0,cx+bw/2,0);
  gs.addColorStop(0,'rgba(255,255,255,.48)');
  gs.addColorStop(.3,'rgba(255,255,255,.12)');
  gs.addColorStop(.7,'rgba(255,255,255,.06)');
  gs.addColorStop(1,'rgba(255,255,255,.32)');
  ctx.strokeStyle=gs; ctx.lineWidth=1.5; ctx.stroke();

  // Reflejos de luz en el vidrio
  ctx.beginPath(); ctx.moveTo(cx-bw/2+6,baseY-20); ctx.lineTo(cx-bw/2+8,topY+55);
  ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-bw/2+14,baseY-50); ctx.lineTo(cx-bw/2+15,topY+80);
  ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1.2; ctx.stroke();

  // Tapón
  ctx.fillStyle='rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+',0.85)';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(cx-neck/2-1, topY-13, neck+2, 13, 3); ctx.fill();
  } else {
    ctx.fillRect(cx-neck/2-1, topY-13, neck+2, 13);
  }
  ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=1;
  ctx.strokeRect(cx-neck/2-1, topY-13, neck+2, 13);

  // Reflejo en suelo
  var refGrad = ctx.createRadialGradient(cx,baseY+5,0,cx,baseY+5,bw*0.7);
  refGrad.addColorStop(0,'rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+','+(0.15+energy*0.1)+')');
  refGrad.addColorStop(1,'transparent');
  ctx.fillStyle=refGrad;
  ctx.beginPath(); ctx.ellipse(cx,baseY+5,bw*0.55,10,0,0,Math.PI*2); ctx.fill();

  // ── NUBE DE AROMA — humo suave bañado por la aurora boreal ────────
  var aromaLevel = Math.max(0, energy - 0.06);

  // Inicializar partículas de humo persistentes por botella
  if (!bot.smokeParticles) {
    bot.smokeParticles = [];
    for (var spi=0; spi<22; spi++) {
      bot.smokeParticles.push({
        x: cx, y: topY,
        age:  Math.random(),
        vx:  (Math.random()-0.5)*0.3,
        vy:  -(Math.random()*0.5+0.2),
        r:    Math.random()*8+4,
        seed: Math.random()*100,
        auroraIdx: Math.floor(Math.random()*5)
      });
    }
  }

  // Colores de la aurora que tiñen el humo
  var ASMT = [[0,210,140],[0,180,220],[80,60,200],[0,220,180],[140,60,220]];

  if (aromaLevel > 0) {
    bot.smokeParticles.forEach(function(sp) {
      // Envejecer — más rápido cuanta más energía
      sp.age += 0.003 + aromaLevel * 0.014;

      if (sp.age >= 1) {
        // Renacer en la boca del tapón
        sp.x    = cx + (Math.random()-0.5) * neck * 0.7;
        sp.y    = topY - 2;
        sp.age  = 0;
        sp.vx   = (Math.random()-0.5) * 0.5;
        sp.vy   = -(Math.random()*0.4 + 0.15 + aromaLevel*0.45);
        sp.r    = Math.random()*7 + 4;
        sp.seed = Math.random()*100;
        sp.auroraIdx = Math.floor(Math.random()*5);
      }

      // Física: sube, deriva y oscila suavemente
      sp.x  += sp.vx + Math.sin(beqT*0.6 + sp.seed + sp.age*2.5) * (0.5 + aromaLevel*0.8);
      sp.y  += sp.vy * (1 + aromaLevel*0.6);
      sp.vx *= 0.993;
      sp.r  += 0.18 + aromaLevel*0.28; // crece al subir

      // Opacidad: nace, alcanza pico, desaparece suavemente
      var lifeA = sp.age < 0.12
        ? sp.age / 0.12
        : 1 - ((sp.age - 0.12) / 0.88);
      var baseA = lifeA * (0.055 + aromaLevel * 0.095);
      if (baseA < 0.003 || sp.r < 1) return;

      // Color: blanco casi puro + tinte aurora según qué tan alto está
      // El humo cambia de color conforme sube — como si la aurora lo coloreara
      var heightRatio = Math.max(0, Math.min(1, (topY - sp.y) / (bh * 0.6)));
      var ai2 = Math.floor(heightRatio * ASMT.length);
      ai2 = Math.min(ASMT.length-1, ai2);
      var ac = ASMT[ai2];

      // Humo blanco teñido muy suavemente por la aurora
      var sR = Math.min(255, Math.round(218 + ac[0]*0.06));
      var sG = Math.min(255, Math.round(222 + ac[1]*0.06));
      var sB = Math.min(255, Math.round(228 + ac[2]*0.06));

      // Gradiente radial — difuminado suave como humo real
      var sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r);
      sg.addColorStop(0,   'rgba('+sR+','+sG+','+sB+','+baseA+')');
      sg.addColorStop(0.45,'rgba('+sR+','+sG+','+sB+','+(baseA*0.5)+')');
      sg.addColorStop(1,   'rgba('+sR+','+sG+','+sB+',0)');

      ctx.save();
      // Reflejo sutil del color de la aurora en el humo
      ctx.shadowColor = 'rgba('+ac[0]+','+ac[1]+','+ac[2]+','+( baseA*0.8 )+')';
      ctx.shadowBlur  = sp.r * 0.9;
      ctx.fillStyle   = sg;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  } else {
    // Sin energía — detener las partículas
    if (bot.smokeParticles) {
      bot.smokeParticles.forEach(function(sp) { sp.age = 1; });
    }
  }

  // Halo suave en la boca — el punto de salida del aroma
  if (aromaLevel > 0.02) {
    var haloProg = (beqT * 0.85 + cx*0.004) % 1;
    var haloA    = (1 - haloProg) * aromaLevel * 0.12;
    var haloRad  = neck/2 + haloProg * (5 + aromaLevel*10);
    if (haloA > 0.003) {
      ctx.save();
      ctx.globalAlpha = haloA;
      ctx.strokeStyle = 'rgba(220,232,245,1)';
      ctx.lineWidth   = 0.7;
      ctx.shadowColor = 'rgba('+bot.col[0]+','+bot.col[1]+','+bot.col[2]+',0.4)';
      ctx.shadowBlur  = 4 + aromaLevel*5;
      ctx.beginPath();
      ctx.ellipse(cx, topY-3, Math.max(1,haloRad), Math.max(0.3,haloRad*0.25), 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Labels
  ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.font='bold '+Math.max(9,bw*0.18)+'px monospace';
  ctx.textAlign='center'; ctx.fillText(bot.label,cx,baseY+H*0.055);
  ctx.fillStyle='rgba(255,255,255,.22)';
  ctx.font=Math.max(8,bw*0.14)+'px monospace';
  ctx.fillText(bot.hz,cx,baseY+H*0.09);

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════
// CREAR PANEL
// ══════════════════════════════════════════════════════════════════════

function crearPanelBEQ() {
  beqPanel = document.createElement('div');
  beqPanel.id = 'scall-beq-panel';
  beqPanel.style.cssText = [
    'position:fixed','top:60px','right:10px',
    'width:480px','min-width:300px','min-height:200px',
    'background:#07060f',
    'border:1px solid rgba(180,100,255,0.2)',
    'border-radius:18px',
    'box-shadow:0 0 60px rgba(150,80,255,0.08),0 30px 80px rgba(0,0,0,0.85)',
    'z-index:2400','display:none','flex-direction:column',
    'overflow:hidden','resize:both','font-family:DM Mono,monospace'
  ].join(';');

  beqPanel.innerHTML =
    '<div id="beq-drag" style="display:flex;align-items:center;justify-content:space-between;' +
    'padding:8px 14px;background:rgba(0,0,0,.6);cursor:grab;user-select:none;flex-shrink:0;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="color:rgba(180,100,255,.3);font-size:10px;">⣿</span>' +
        '<span style="font-size:10px;letter-spacing:.16em;color:rgba(180,100,255,.55);">BOTTLE EQUALIZER</span>' +
      '</div>' +
      '<div style="display:flex;gap:5px;">' +
        '<button onclick="beqResize(280,220)" title="Mini" style="'+beqIcoBtn()+'">◱</button>' +
        '<button onclick="beqResize(480,360)" title="Normal" style="'+beqIcoBtn()+'">◰</button>' +
        '<button onclick="beqResize(720,500)" title="Grande" style="'+beqIcoBtn()+'">⛶</button>' +
        '<button onclick="cerrarBEQ()" style="background:transparent;border:1px solid rgba(255,255,255,.1);' +
          'color:rgba(255,255,255,.3);width:26px;height:26px;border-radius:7px;cursor:pointer;font-size:14px;">✕</button>' +
      '</div>' +
    '</div>' +
    '<canvas id="beq-main-c" style="width:100%;flex:1;display:block;"></canvas>' +
    '<div style="display:flex;gap:6px;padding:8px 14px;background:rgba(0,0,0,.5);flex-wrap:wrap;">' +
      '<button class="beq-mode-btn" id="beq-shake"  onclick="cambiarModoBEQ(\'shake\')"  style="'+beqBtnStyle(true)+'">AGITAR</button>' +
      '<button class="beq-mode-btn" id="beq-wave"   onclick="cambiarModoBEQ(\'wave\')"   style="'+beqBtnStyle(false)+'">OLAS</button>' +
      '<button class="beq-mode-btn" id="beq-bubble" onclick="cambiarModoBEQ(\'bubble\')" style="'+beqBtnStyle(false)+'">BURBUJAS</button>' +
      '<button class="beq-mode-btn" id="beq-storm"  onclick="cambiarModoBEQ(\'storm\')"  style="'+beqBtnStyle(false)+'">TORMENTA</button>' +
      '<span id="beq-live" style="margin-left:auto;font-size:8px;color:rgba(255,255,255,.2);align-self:center;letter-spacing:.1em;">DEMO</span>' +
    '</div>';

  document.body.appendChild(beqPanel);

  // Inicializar glitter con tamaño actual del canvas
  setTimeout(function() {
    var canvas = document.getElementById('beq-main-c');
    if (canvas) {
      var W2 = canvas.clientWidth || 480;
      BEQ_BOTTLES.forEach(function(b) {
        b.x = W2 * b.bx;
        inicializarGlitter(b);
      });
    }
    beqActivarDrag(beqPanel);
  }, 100);
}

function beqIcoBtn() {
  return 'background:transparent;border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3);' +
    'width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:13px;font-family:monospace;padding:0;';
}
function beqBtnStyle(on) {
  var base = 'font-size:9px;letter-spacing:.1em;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:DM Mono,monospace;transition:all .2s;';
  return on
    ? base+'background:rgba(180,100,255,.15);border:1px solid rgba(180,100,255,.45);color:rgba(200,150,255,1);'
    : base+'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);';
}

function cambiarModoBEQ(m) {
  beqMode = m;
  document.querySelectorAll('.beq-mode-btn').forEach(function(b) {
    b.style.background = 'rgba(255,255,255,.04)';
    b.style.borderColor= 'rgba(255,255,255,.1)';
    b.style.color      = 'rgba(255,255,255,.4)';
  });
  var btn = document.getElementById('beq-'+m);
  if (btn) {
    btn.style.background  = 'rgba(180,100,255,.15)';
    btn.style.borderColor = 'rgba(180,100,255,.45)';
    btn.style.color       = 'rgba(200,150,255,1)';
  }
}

function beqResize(w, h) {
  if (!beqPanel) return;
  beqPanel.style.width = w+'px';
  var canvas = document.getElementById('beq-main-c');
  if (canvas) canvas.style.height = h+'px';
  setTimeout(beqReiniciarCanvas, 60);
}

function beqActivarDrag(panel) {
  var bar = document.getElementById('beq-drag');
  if (!bar) return;
  var drag=false, sx=0, sy=0, sl=0, st2=0;

  function start(ex,ey) {
    drag=true; sx=ex; sy=ey;
    var r=panel.getBoundingClientRect(); sl=r.left; st2=r.top;
    panel.style.transform='none'; bar.style.cursor='grabbing';
  }
  function move(ex,ey) {
    if(!drag)return;
    var nl=Math.max(0,Math.min(sl+(ex-sx),window.innerWidth-panel.offsetWidth));
    var nt=Math.max(0,Math.min(st2+(ey-sy),window.innerHeight-40));
    panel.style.left=nl+'px'; panel.style.top=nt+'px';
  }
  function end() { drag=false; bar.style.cursor='grab'; }

  bar.addEventListener('mousedown',function(e){start(e.clientX,e.clientY);e.preventDefault();});
  document.addEventListener('mousemove',function(e){move(e.clientX,e.clientY);});
  document.addEventListener('mouseup',end);
  bar.addEventListener('touchstart',function(e){var t=e.touches[0];start(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',function(e){if(!drag)return;var t=e.touches[0];move(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  document.addEventListener('touchend',end);
}

// ══════════════════════════════════════════════════════════════════════
// ANIMACIÓN
// ══════════════════════════════════════════════════════════════════════

function beqReiniciarCanvas() {
  var canvas = document.getElementById('beq-main-c');
  if (!canvas) return;
  var PR2 = window.devicePixelRatio||1;
  var W2  = canvas.clientWidth  || 480;
  var H2  = canvas.clientHeight || 300;
  canvas.width  = W2*PR2; canvas.height = H2*PR2;
  var ctx = canvas.getContext('2d'); ctx.scale(PR2,PR2);

  // Actualizar posición X de botellas según nuevo ancho
  BEQ_BOTTLES.forEach(function(b) { b.x = W2 * b.bx; });
  return { ctx:ctx, W:W2, H:H2 };
}

function iniciarBEQ() {
  var setup = beqReiniciarCanvas();
  if (!setup) return;

  function frame() {
    beqT += 0.022;
    beqLeer();

    var canvas = document.getElementById('beq-main-c');
    if (!canvas) return;
    var PR2 = window.devicePixelRatio||1;
    var W2  = canvas.clientWidth  || 480;
    var H2  = canvas.clientHeight || 300;

    // Re-escalar si cambió el tamaño
    if (canvas.width !== W2*PR2 || canvas.height !== H2*PR2) {
      canvas.width = W2*PR2; canvas.height = H2*PR2;
      BEQ_BOTTLES.forEach(function(b){ b.x=W2*b.bx; });
    }
    var ctx = canvas.getContext('2d');
    ctx.save(); ctx.scale(PR2,PR2);

    // Fondo
    var bg = ctx.createLinearGradient(0,0,0,H2);
    bg.addColorStop(0,'#07060f'); bg.addColorStop(.7,'#0a0916'); bg.addColorStop(1,'#0d0820');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W2,H2);

    // Suelo
    var fl = ctx.createLinearGradient(0,H2-H2*.13,0,H2);
    fl.addColorStop(0,'rgba(30,20,60,.8)'); fl.addColorStop(1,'rgba(10,8,25,1)');
    ctx.fillStyle=fl; ctx.fillRect(0,H2-H2*.13,W2,H2*.13);
    ctx.strokeStyle='rgba(120,80,255,.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,H2-H2*.13); ctx.lineTo(W2,H2-H2*.13); ctx.stroke();

    // Luces de ambiente
    BEQ_BOTTLES.forEach(function(b) {
      var e2=beqSmooth[b.bandKey];
      if(e2<0.08)return;
      var glow=ctx.createRadialGradient(b.x,H2,0,b.x,H2,100+e2*80);
      glow.addColorStop(0,'rgba('+b.col[0]+','+b.col[1]+','+b.col[2]+','+(e2*.1)+')');
      glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow; ctx.fillRect(0,0,W2,H2);
    });

    // ── AURORA BOREAL DE FONDO ──────────────────────────────────────
    var ae = 0.4 + beqSmooth.energy*0.5 + beqSmooth.bass*0.2;

    // Estrellas fijas
    if (!beqPanel._stars) {
      beqPanel._stars = [];
      for (var si=0; si<100; si++) {
        beqPanel._stars.push({
          x: Math.random()*W2, y: Math.random()*H2*0.82,
          r: Math.random()*1.1+0.2, tw: Math.random()*5+2, ph: Math.random()*Math.PI*2
        });
      }
    }
    beqPanel._stars.forEach(function(st) {
      ctx.globalAlpha = 0.35 + Math.sin(beqT*st.tw+st.ph)*0.3 + beqSmooth.energy*0.15;
      ctx.fillStyle   = '#fff';
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 5 bandas de aurora — colores fríos y suaves
    var AURORA = [
      [0,210,140],   // verde menta
      [0,180,220],   // azul hielo
      [80,60,200],   // índigo
      [0,220,180],   // turquesa
      [140,60,220]   // lila suave
    ];
    AURORA.forEach(function(col, ai) {
      var bandY  = H2*(0.06 + ai*0.1);
      var bandH  = H2*(0.16 + beqSmooth.mid*0.1 + ai*0.02);
      var ph2    = ai*1.3 + beqT*(0.1 + ai*0.03);
      var alpha2 = (0.07 + beqSmooth.energy*0.12 + Math.sin(beqT*0.25+ai*0.9)*0.04) * ae;

      for (var xi=0; xi<W2; xi+=3) {
        var nx2  = xi/W2;
        var wave =
          Math.sin(nx2*3.8 + ph2)*0.5 +
          Math.sin(nx2*6.5 + ph2*1.2 + ai)*0.25 +
          Math.sin(nx2*11  + ph2*0.6)*0.15 +
          Math.sin(nx2*1.8 + beqT*0.4)*beqSmooth.bass*0.25;

        var tY  = bandY + wave*28*ae;
        var bY2 = tY + bandH*(0.5 + Math.sin(nx2*2.8+ph2)*0.25 + beqSmooth.mid*0.25);
        var lA  = alpha2*(0.4 + Math.sin(nx2*4.5+ph2)*0.4);

        var lg = ctx.createLinearGradient(0, tY, 0, bY2);
        lg.addColorStop(0,'rgba('+col[0]+','+col[1]+','+col[2]+',0)');
        lg.addColorStop(0.3,'rgba('+col[0]+','+col[1]+','+col[2]+','+lA.toFixed(3)+')');
        lg.addColorStop(0.65,'rgba('+col[0]+','+col[1]+','+col[2]+','+(lA*0.55).toFixed(3)+')');
        lg.addColorStop(1,'rgba('+col[0]+','+col[1]+','+col[2]+',0)');
        ctx.fillStyle = lg;
        ctx.fillRect(xi, tY, 3, Math.max(1, bY2-tY));
      }
    });

    // Resplandor central suave
    var gA = 0.025 + beqSmooth.energy*0.04;
    var grd = ctx.createRadialGradient(W2/2, H2*0.28, 0, W2/2, H2*0.28, W2*0.65);
    grd.addColorStop(0,'rgba(0,200,140,'+gA.toFixed(3)+')');
    grd.addColorStop(0.5,'rgba(60,40,180,'+(gA*0.5).toFixed(3)+')');
    grd.addColorStop(1,'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0,0,W2,H2);

    // Partículas de nieve — sutiles
    if (!beqPanel._snow) {
      beqPanel._snow = [];
      for (var pi2=0; pi2<30; pi2++) {
        beqPanel._snow.push({
          x:Math.random()*W2, y:Math.random()*H2,
          vx:(Math.random()-.5)*.25, vy:Math.random()*.35+0.08,
          r:Math.random()*1.2+0.2, ph:Math.random()*Math.PI*2
        });
      }
    }
    beqPanel._snow.forEach(function(p) {
      p.x += p.vx + Math.sin(beqT*0.4+p.ph)*0.3;
      p.y += p.vy + beqSmooth.energy*0.2;
      if (p.y > H2) { p.y = -4; p.x = Math.random()*W2; }
      if (p.x < 0) p.x = W2; if (p.x > W2) p.x = 0;
      ctx.globalAlpha = 0.25 + beqSmooth.air*0.2;
      ctx.fillStyle   = 'rgba(200,240,255,0.75)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Botellas
    BEQ_BOTTLES.forEach(function(b){
      dibujarBotella(ctx, b, W2, H2, beqSmooth[b.bandKey]);
    });

    // Live indicator
    var liveEl = document.getElementById('beq-live');
    if (liveEl) {
      var hasAudio = !!(beqAnalyser && beqFdata);
      liveEl.textContent = hasAudio && beqSmooth.energy>0.05 ? '● LIVE' : 'DEMO';
      liveEl.style.color = hasAudio && beqSmooth.energy>0.05 ? 'rgba(180,100,255,.6)' : 'rgba(255,255,255,.18)';
    }

    ctx.restore();
    if (beqVisible) beqAnimId = requestAnimationFrame(frame);
  }

  if (beqAnimId) cancelAnimationFrame(beqAnimId);
  beqAnimId = requestAnimationFrame(frame);
}

// ══════════════════════════════════════════════════════════════════════
// ABRIR / CERRAR
// ══════════════════════════════════════════════════════════════════════

function abrirBEQ() {
  if (!beqPanel) crearPanelBEQ();
  beqPanel.style.display = 'flex';
  beqVisible = true;
  beqConectar();
  setTimeout(iniciarBEQ, 80);
  _beqLog('[BOTTLE_EQ] Panel abierto');
}

function cerrarBEQ() {
  if (beqPanel) beqPanel.style.display = 'none';
  beqVisible = false;
  if (beqAnimId) { cancelAnimationFrame(beqAnimId); beqAnimId = null; }
}

function toggleBEQ() { if (beqVisible) cerrarBEQ(); else abrirBEQ(); }

window.abrirBEQ      = abrirBEQ;
window.cerrarBEQ     = cerrarBEQ;
window.toggleBEQ     = toggleBEQ;
window.cambiarModoBEQ = cambiarModoBEQ;

window.addEventListener('load', function() {
  _beqLog('[BOTTLE_EQ] Módulo listo 🍾');
});

function _beqLog(m) { if(typeof logMessage==='function')logMessage(m); else console.log(m); }

} // fin guard
