const orbBtn         = document.getElementById('orbBtn');
const statusText     = document.getElementById('statusText');
const transcriptText = document.getElementById('transcriptText');
const systemLog      = document.getElementById('systemLog');

function getApiKey() {
  const fromConfig = window.APP_CONFIG && window.APP_CONFIG.geminiApiKey;
  if (fromConfig && fromConfig.trim() !== '') return fromConfig.trim();
  const fromLocal = localStorage.getItem('geminiApiKey');
  if (fromLocal && fromLocal.trim() !== '') return fromLocal.trim();
  return '';
}
function isKeyPreConfigured() { return getApiKey() !== ''; }
function getYtApiKeyConfig() {
  const key = window.APP_CONFIG && window.APP_CONFIG.youtubeApiKey;
  return (key && key.trim() !== '') ? key.trim() : localStorage.getItem('youtubeApiKey') || '';
}
// ======================================================================
// SELECCIÓN DE IA — Gemini o Claude
// ======================================================================
function getActiveIA() {
  return localStorage.getItem('activeIA') || 'gemini';
}

function getClaudeKey() {
  const fromConfig = window.APP_CONFIG && window.APP_CONFIG.claudeApiKey;
  if (fromConfig && fromConfig.trim()) return fromConfig.trim();
  return localStorage.getItem('claudeApiKey') || '';
}

function getClaudeModel() {
  return localStorage.getItem('claudeModel') || 'claude-sonnet-4-20250514';
}

function seleccionarIA(nombre) {
  localStorage.setItem('activeIA', nombre);

  // UI del selector
  document.getElementById('aiBtnGemini').classList.toggle('active', nombre === 'gemini');
  document.getElementById('aiBtnClaude').classList.toggle('active', nombre === 'claude');
  document.getElementById('aiBtnClaude').classList.toggle('claude-active', nombre === 'claude');

  // Mostrar sección correspondiente
  document.getElementById('sectionGemini').style.display = nombre === 'gemini' ? '' : 'none';
  document.getElementById('sectionClaude').style.display = nombre === 'claude'  ? '' : 'none';

  updateAIStatusUI();
  logMessage(`[IA] Cerebro cambiado a: ${nombre === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}`);
}

// ======================================================================
// LLAMADA A CLAUDE API
// ======================================================================
// ======================================================================
// CLASIFICADOR DE INTENCIÓN
// Decide si el texto va a la IA o a los intents locales de SCALL.
// Retorna: 'local' | 'ia'
// ======================================================================
function clasificarIntencion(texto) {
  const c = texto.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');

  // Alarmas con fecha específica (nombre de mes) → siempre IA
  const mesesEs = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const esAlarmaConFecha = (c.includes('alarma') || c.includes('recordatorio') ||
                             c.includes('recuerdame') || c.includes('programa') ||
                             c.includes('cita') || c.includes('medicamento') ||
                             c.includes('pastilla')) &&
                            mesesEs.some(m => c.includes(m));
  if (esAlarmaConFecha) return 'ia';

  // ── Palabras que siempre van a intents locales ──────────────────
  // Palabras que activan SIEMPRE un intent local — NUNCA van a la IA
  // Regla: solo hardware, media y comandos sin respuesta de conversación
  const LOCAL_KEYWORDS = [
    // Música
    'pon musica','ponme musica','reproduce musica','pon algo de musica',
    'pon ','ponme ','reproduce ','coloca musica',
    'pausa la musica','para la musica','apaga la musica',
    'siguiente cancion','cancion anterior','sube volumen','baja volumen',
    // Radio
    'radio','emisora','sintoniza','caracol','blu radio','rcn','la fm','tropicana',
    'olimpica','w radio','los 40','oxigeno','rumba','amor stereo',
    // Alarmas SIN fecha (con fecha específica → Claude)
    // Nota: frases con nombre de mes se manejan en el filtro prioritario
    'alarma a las','pon alarma','ponme alarma','despiertame',
    'recuerdame tomar','pastilla a las','medicamento a las',
    'timer de','temporizador de','cronometro',
    // IoT / Dispositivos
    'enciende la luz','apaga la luz','enciende el televisor','apaga el televisor',
    'enciende las luces','apaga las luces','prende la luz',
    'abre la persiana','cierra la persiana','abre las cortinas',
    // Rutas — narración completa
    'navegacion','abrir navegacion','ver mapa','mapa',
    // Rutas
    'llevame a ','llevame al ','navega a ','navega al ',
    'ruta a ','ruta al ','ruta hasta ','dirigeme a ',
    'abre el mapa','muestra el mapa','ver mapa','abrir mapa',
    'cuanto tarda ir','cuanto demora ir','distancia al destino',
    'destinos frecuentes','mis destinos',
    // Bluetooth
    'conectar bluetooth','emparejar bluetooth','vincular bluetooth',
    // Utilidades puntuales
    'que hora es','dime la hora','que dia es hoy','fecha de hoy',
    'clima en','temperatura en',
    'auxilio','sos emergencia',
  ];

  if (LOCAL_KEYWORDS.some(k => c.includes(k))) return 'local';

  // ── Patrones de hora → siempre local ───────────────────────────
  if (/\d{1,2}\s*(y\s*\d{1,2}|y\s*media|y\s*cuarto|en\s*punto|de\s*la\s*(manana|tarde|noche))/.test(c)) return 'local';

  // ── Todo lo demás va a la IA ────────────────────────────────────
  return 'ia';
}

// ======================================================================
// LLAMADA A CLAUDE — encasillado como cerebro de SCALL
// ======================================================================
async function llamarClaude(texto, name) {
  const apiKey = getClaudeKey();
  if (!apiKey) {
    responderVoz('Configura tu Claude API Key en el panel de configuración.');
    if (window.scallOrb) window.scallOrb.setState('idle');
    return;
  }

  const model = getClaudeModel();

  // System prompt encasillado: Claude es SCALL y solo hace conversación
  const systemPrompt = `Eres ${name}, el asistente de voz personal del sistema SCALL desarrollado por IIT.

ROL ESTRICTO:
- Eres el cerebro de conversación de SCALL. Respondes preguntas, explicas conceptos, haces chistes, das consejos y charlas con el usuario en español colombiano.
- Eres conciso: máximo 2-3 oraciones por respuesta (es audio, no texto).
- Nunca ofreces hacer cosas que SCALL ya maneja localmente: música, alarmas, radio, luces, clima, noticias, traductor. Si el usuario lo pide, dile que lo active directamente con voz ("di 'pon música' para reproducir").
- Si el usuario menciona hardware domótico que requiere MQTT, responde naturalmente e incluye exactamente: MQTT[topic|payload]

PERSONALIDAD:
- Amigable, inteligente, directo. Hablas en español colombiano informal.
- Nunca dices que eres un modelo de lenguaje ni mencionas Anthropic ni Claude.
- Si te preguntan qué eres, dices: "Soy ${name}, tu asistente personal de IIT."

RESTRICCIONES:
- No generes listas largas ni texto formateado (es voz).
- No hagas promesas de funciones que no tienes.
- Si no sabes algo, dilo brevemente y ofrece ayuda alternativa.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               apiKey,
        'anthropic-version':       '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: 'user', content: texto }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      logMessage(`[CLAUDE] ❌ Error ${response.status}: ${data.error?.message || 'desconocido'}`);
      throw new Error(data.error?.message || response.status);
    }

    let aiResponse = data.content?.[0]?.text || '';

    // Extraer comandos MQTT si los hay
    const mqttRegex = /MQTT\[(.*?)\]/g;
    let match;
    while ((match = mqttRegex.exec(aiResponse)) !== null) {
      const cmd = match[1].split('|');
      if (cmd.length === 2) enviarComandoMQTT(cmd[0], cmd[1]);
    }
    aiResponse = aiResponse.replace(/MQTT\[.*?\]/g, '').trim();

    logMessage(`[CLAUDE] ✅ ${model} | intención: conversación`);
    if (window.scallOrb) window.scallOrb.setState('speaking');
    responderVoz(aiResponse);

  } catch (err) {
    logMessage(`[CLAUDE] ❌ ${err.message}`);
    if (window.scallOrb) window.scallOrb.setState('idle');
    // Fallback a intent local si Claude falla
    logMessage('[CLAUDE] ↩ Fallback a intent local');
    ejecutarIntentLocal(texto);
  }
}



function updateAIStatusUI() {
  const badge     = document.getElementById('aiStatusBadge');
  const card      = document.getElementById('aiStatusCard');
  const cardTitle = document.getElementById('aiStatusCardTitle');
  const cardDesc  = document.getElementById('aiStatusCardDesc');
  const hint      = document.getElementById('aiHint');
  const icon      = card && card.querySelector('.ai-status-icon');

  const ia        = getActiveIA();
  const hasGemini = isKeyPreConfigured();
  const hasClaude = !!getClaudeKey();
  const hasKey    = ia === 'claude' ? hasClaude : hasGemini;
  const iaLabel   = ia === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)';
  const iaCorto   = ia === 'claude' ? 'Claude' : 'Gemini';

  // ── Panel lateral SISTEMA — todos los elementos con estos IDs ──
  // aiStatusText  → fila "IA" del panel lateral
  // aiStatusDot   → punto verde/naranja del header del panel
  // ai-status-text dentro del badge → texto del badge inferior
  const sideIAText  = document.getElementById('aiStatusText');
  const sideIADot   = document.getElementById('aiStatusDot');
  const sideBadgeTexts = badge ? badge.querySelectorAll('.ai-status-text') : [];

  if (hasKey) {
    // Panel lateral — fila IA
    if (sideIAText) sideIAText.textContent = iaCorto;
    if (sideIAText) sideIAText.style.color = ia === 'claude' ? 'rgba(224,112,64,0.85)' : 'rgba(0,212,255,0.75)';

    // Punto del header
    if (sideIADot) {
      sideIADot.style.background  = ia === 'claude' ? '#e07040' : '#10b981';
      sideIADot.style.boxShadow   = ia === 'claude' ? '0 0 7px #e07040' : '0 0 7px #10b981';
    }

    // Badge inferior del panel SISTEMA
    if (badge) badge.className = 'side-ai-badge' + (ia === 'claude' ? ' claude-active' : '');
    sideBadgeTexts.forEach(el => el.textContent = iaLabel + ' · activo');

    // Panel de configuración (modal)
    if (card)      card.className = 'ai-status-card ready';
    if (icon)      icon.textContent = '✅';
    if (cardTitle) cardTitle.textContent = iaLabel + ' configurado';
    if (cardDesc)  cardDesc.textContent  = 'API Key guardada en tu navegador · lista para usar.';
    if (hint)      hint.style.display = 'none';

    logMessage('[IA] ✅ ' + iaLabel + ' activo');
  } else {
    // Panel lateral
    if (sideIAText) { sideIAText.textContent = 'Sin IA'; sideIAText.style.color = 'rgba(239,68,68,0.7)'; }
    if (sideIADot)  { sideIADot.style.background = '#ef4444'; sideIADot.style.boxShadow = '0 0 7px #ef4444'; }
    if (badge) badge.className = 'side-ai-badge';
    sideBadgeTexts.forEach(el => el.textContent = 'Sin IA · configurar en ⚙️');

    // Panel de configuración
    if (card)      card.className = 'ai-status-card warn';
    if (icon)      icon.textContent = '⚠️';
    if (cardTitle) cardTitle.textContent = 'Sin API Key configurada';
    if (cardDesc)  cardDesc.textContent  = 'Ingresa tu ' + iaLabel + ' API Key en Configuración.';
    if (hint)      { hint.style.display = 'block'; hint.textContent = 'Ve a ⚙️ Config → selecciona ' + iaLabel + ' → pega tu API Key.'; }
  }
}

/* ── MQTT ── */
let mqttClient = null;
function getMqttConfig() {
  const cfg = window.APP_CONFIG || {};
  return {
    host:     cfg.mqttHost     || localStorage.getItem('mqttHost')     || '',
    port:     cfg.mqttPort     || localStorage.getItem('mqttPort')     || '8884',
    user:     cfg.mqttUser     || localStorage.getItem('mqttUser')     || '',
    password: cfg.mqttPassword || localStorage.getItem('mqttPassword') || ''
  };
}
function conectarMQTT() {
  if (typeof mqtt === 'undefined') { logMessage('[MQTT] ⚠️ Librería MQTT.js no cargada.'); return; }
  const { host, port, user, password } = getMqttConfig();
  if (!host) { logMessage('[MQTT] ℹ️ Sin broker configurado. Usando simulación local.'); return; }
  const url = `wss://${host}:${port}/mqtt`;
  logMessage(`[MQTT] Conectando a ${host}:${port}...`);
  mqttClient = mqtt.connect(url, {
    clientId: 'scall_browser_' + Math.random().toString(16).substr(2, 8),
    username: user, password, clean: true, reconnectPeriod: 5000
  });
  mqttClient.on('connect', () => {
    logMessage('[MQTT] ✅ Conectado al broker. ESP32 listo.');
    statusText.innerText = 'MQTT Conectado';
    statusText.style.color = '#10b981';
    const dot = document.getElementById('mqttStatusDot');
    const lbl = document.getElementById('mqttStatusLabel');
    if (dot) dot.className   = 'mqtt-dot connected';
    if (lbl) lbl.textContent = 'ON';
    setTimeout(() => { statusText.innerText = 'Presiona el orbe para hablar'; statusText.style.color = ''; }, 3000);
    if (typeof iniciarListenerSOS === 'function') iniciarListenerSOS(mqttClient);
  });
  mqttClient.on('error',   err => { logMessage(`[MQTT] ❌ Error: ${err.message}`); const dot=document.getElementById('mqttStatusDot'); if(dot) dot.className='mqtt-dot error'; });
  mqttClient.on('offline', ()  => {
    logMessage('[MQTT] ⚠️ Broker desconectado. Reconectando...');
    const dot=document.getElementById('mqttStatusDot'), lbl=document.getElementById('mqttStatusLabel');
    if(dot) dot.className='mqtt-dot'; if(lbl) lbl.textContent='MQTT';
  });
}

/* ── Estado de actividades ── */
let activityState = { musicPlaying: false, lightsOn: false, tvOn: false, currentCommand: '' };
function updateActivityState(type, value) { activityState[type] = value; updateToggleDisplay(); }
function updateToggleDisplay() {
  const { commandToggle, toggleLabel, toggleStateText } = getToggleElements();
  if (!commandToggle) return;
  let status = [];
  if (activityState.musicPlaying)  status.push('🎵 Música ON');
  if (activityState.lightsOn)      status.push('💡 Luces ON');
  if (activityState.tvOn)          status.push('📺 TV ON');
  if (activityState.currentCommand) status.push(`↳ ${activityState.currentCommand}`);
  const txt = status.length > 0 ? status.join(' | ') : 'Sistema activo';
  if (toggleLabel)     toggleLabel.innerText     = txt;
  if (toggleStateText) toggleStateText.innerText = status.length > 0 ? 'Activo' : 'Inactivo';
}
function getToggleElements() {
  let commandToggle = document.getElementById('commandToggle');
  if (!commandToggle) {
    commandToggle = document.createElement('div');
    commandToggle.id = 'commandToggle';
    commandToggle.className = 'command-toggle hidden';
    commandToggle.innerHTML = `
      <span id="toggleLabel">Acción recibida</span>
      <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="toggleAction" checked>
        <span id="toggleStateText">Activado</span>
      </label>
      <button onclick="hideCommandToggle()" style="background:none;border:none;color:#000;font-size:18px;cursor:pointer;">×</button>`;
    document.body.appendChild(commandToggle);
  }
  return { commandToggle, toggleAction: document.getElementById('toggleAction'), toggleLabel: document.getElementById('toggleLabel'), toggleStateText: document.getElementById('toggleStateText') };
}

/* ── Reconocimiento de voz ── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  statusText.innerText = 'Error: Navegador no soporta API de Voz (usa Chrome o Edge).';
  statusText.style.color = 'red';
} else {
  // ── Reconocimiento de voz — configuración ─────────────────────────
  const recognition = new SpeechRecognition();
  recognition.lang           = 'es-ES';
  recognition.continuous     = true;   // continúa escuchando hasta que el usuario pare
  recognition.interimResults = true;   // muestra texto mientras habla
  recognition.maxAlternatives = 1;

  let isListening    = false;
  let fraseAcumulada = '';             // texto completo mientras habla
  let debounceTimer  = null;           // espera antes de procesar
  let barraTimer     = null;
  const DEBOUNCE_MS  = 4000;           // 4s de silencio → procesar

  // ── Web Audio para el orbe ─────────────────────────────────────────
  let audioCtx = null, analyserNode = null;
  async function iniciarAudioOrbe() {
    if (analyserNode) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioCtx     = new (window.AudioContext || window.webkitAudioContext)();
      const src    = audioCtx.createMediaStreamSource(stream);
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.75;
      src.connect(analyserNode);
      window.scallAudioAnalyser = analyserNode;
      logMessage('[ORBE] 🎙️ Audio conectado');
    } catch (e) {
      logMessage('[ORBE] ⚠️ Sin acceso al micrófono para el orbe');
    }
  }

  // ── Barra de progreso de espera ────────────────────────────────────
  function mostrarBarraEspera() {
    let barra = document.getElementById('scall-debounce-bar');
    if (!barra) {
      barra = document.createElement('div');
      barra.id = 'scall-debounce-bar';
      barra.style.cssText = [
        'position:fixed','bottom:0','left:0',
        'height:3px','width:0%',
        'background:rgba(0,212,255,0.8)',
        'transition:width ' + (DEBOUNCE_MS/1000) + 's linear',  // se actualiza con DEBOUNCE_MS
        'z-index:9999','pointer-events:none'
      ].join(';');
      document.body.appendChild(barra);
    }
    // Reset y animar
    barra.style.transition = 'none';
    barra.style.width = '0%';
    void barra.offsetWidth; // forzar reflow
    barra.style.transition = 'width ' + (DEBOUNCE_MS/1000) + 's linear'; // 4s
    barra.style.width = '100%';
  }

  function ocultarBarraEspera() {
    const barra = document.getElementById('scall-debounce-bar');
    if (barra) { barra.style.width = '0%'; barra.style.transition = 'none'; }
  }

  // ── Procesar frase completa ────────────────────────────────────────
  function procesarFraseCompleta() {
    const frase = fraseAcumulada.trim();
    fraseAcumulada = '';
    ocultarBarraEspera();

    if (!frase || frase.length < 2) return;

    logMessage('[VOZ] Frase completa: "' + frase + '"');
    transcriptText.innerText = frase;
    if (window.scallOrb) window.scallOrb.setState('processing');
    ejecutarHabilidad(frase);
  }

  // ── Botón del orbe ─────────────────────────────────────────────────
  orbBtn.addEventListener('click', () => {
    if (!isListening) {
      try {
        fraseAcumulada = '';
        clearTimeout(debounceTimer);
        ocultarBarraEspera();
        recognition.start();
        orbBtn.classList.add('listening');
        statusText.innerText = 'Escuchando... habla con naturalidad';
        transcriptText.innerText = '';
        isListening = true;
        if (window.scallOrb) window.scallOrb.setState('listening');
        iniciarAudioOrbe();
      } catch(e) { console.error('[VOZ] No se pudo iniciar:', e); }
    } else {
      // Parar manualmente → procesar lo que hay
      clearTimeout(debounceTimer);
      recognition.stop();
      if (fraseAcumulada.trim()) procesarFraseCompleta();
    }
  });

  // ── Resultado de voz ───────────────────────────────────────────────
  recognition.onresult = (event) => {
    let interimText = '';
    let finalText   = '';

    // Recorrer todos los resultados del evento
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) {
        finalText   += r[0].transcript + ' ';
      } else {
        interimText += r[0].transcript;
      }
    }

    // Acumular texto final
    if (finalText) {
      fraseAcumulada += finalText;
    }

    // Mostrar texto en pantalla (acumulado + interim)
    const textoMostrar = (fraseAcumulada + interimText).trim();
    transcriptText.innerText = textoMostrar || '...';

    // Reiniciar debounce — esperar silencio antes de procesar
    clearTimeout(debounceTimer);

    if (fraseAcumulada.trim()) {
      // Iniciar barra de progreso visual
      mostrarBarraEspera();
      statusText.innerText = 'Esperando... (habla más o espera)';

      debounceTimer = setTimeout(() => {
        procesarFraseCompleta();
        // Detener reconocimiento después de procesar
        recognition.stop();
      }, DEBOUNCE_MS);
    }
  };

  // ── Errores ────────────────────────────────────────────────────────
  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      // Sin voz detectada → procesar si hay frase acumulada
      if (fraseAcumulada.trim()) {
        clearTimeout(debounceTimer);
        procesarFraseCompleta();
      }
      return;
    }
    logMessage('[VOZ] Error: ' + event.error);
    statusText.innerText = 'Error de voz: ' + event.error;
    orbBtn.classList.remove('listening');
    isListening = false;
    fraseAcumulada = '';
    clearTimeout(debounceTimer);
    ocultarBarraEspera();
    if (window.scallOrb) window.scallOrb.setState('idle');
  };

  // ── Fin del reconocimiento ─────────────────────────────────────────
  recognition.onend = () => {
    orbBtn.classList.remove('listening');
    isListening = false;
    ocultarBarraEspera();
    clearTimeout(debounceTimer);
    setTimeout(() => {
      if (statusText.innerText.startsWith('Esperando') ||
          statusText.innerText.startsWith('Escuchando')) {
        statusText.innerText = 'Presiona el orbe para hablar';
      }
    }, 2500);
  };
}

/* ── Toggle UI ── */
function showCommandToggle(message = 'Acción recibida') {
  const { commandToggle, toggleAction, toggleLabel, toggleStateText } = getToggleElements();
  if (!commandToggle || !toggleAction || !toggleLabel || !toggleStateText) return;
  activityState.currentCommand = message;
  updateToggleDisplay();
  toggleAction.checked = true;
  commandToggle.classList.remove('hidden');
  commandToggle.style.display = 'flex';
  logMessage('[TOGGLE UI] Visible');
}
function hideCommandToggle() {
  const { commandToggle } = getToggleElements();
  if (!commandToggle) return;
  commandToggle.classList.add('hidden');
  commandToggle.style.display = 'none';
}
function autoHideToggle(delay = 5000) { setTimeout(() => hideCommandToggle(), delay); }
function prepareToggleListener() {
  const { toggleAction, toggleStateText } = getToggleElements();
  if (!toggleAction) return;
  toggleAction.addEventListener('change', () => {
    const checked = toggleAction.checked;
    if (toggleStateText) toggleStateText.innerText = checked ? 'Activado' : 'Desactivado';
    logMessage(`[TOGGLE] ${checked ? 'Activado' : 'Desactivado'}`);
    if (!checked && typeof pausarMusica  === 'function') pausarMusica();
    if ( checked && typeof reanudarMusica === 'function') reanudarMusica();
  });
}
function logMessage(msg) {
  systemLog.innerHTML += `<br>&gt; ${msg}`;
  systemLog.scrollTop  = systemLog.scrollHeight;
}

/* ── Guardar config ── */
function saveAssistantConfig() {
  const name = document.getElementById('assistantName').value.trim() || 'SCALL';
  localStorage.setItem('assistantName', name);
  document.getElementById('displayName').innerText = name;
  const keyInput = document.getElementById('geminiKeyInput');
  if (keyInput && keyInput.value.trim() !== '') {
    localStorage.setItem('geminiApiKey', keyInput.value.trim());
    keyInput.value = '';
    logMessage('[CONFIG] ✅ Gemini API Key guardada localmente.');
  }
  const claudeInput = document.getElementById('claudeKeyInput');
  if (claudeInput && claudeInput.value.trim() !== '') {
    localStorage.setItem('claudeApiKey', claudeInput.value.trim());
    claudeInput.value = '';
    logMessage('[CONFIG] ✅ Claude API Key guardada localmente.');
  }
  const claudeModelSel = document.getElementById('claudeModel');
  if (claudeModelSel) {
    localStorage.setItem('claudeModel', claudeModelSel.value);
    logMessage(`[CONFIG] Modelo Claude: ${claudeModelSel.value}`);
  }
  updateAIStatusUI();
  logMessage(`[CONFIG] Asistente: "${name}"`);
  document.getElementById('configModal').style.display = 'none';
}
function guardarYConectarMQTT() {
  const host     = document.getElementById('mqttHost').value.trim();
  const user     = document.getElementById('mqttUser').value.trim();
  const password = document.getElementById('mqttPassword').value.trim();
  if (!host) { alert('Ingresa el host del broker MQTT.'); return; }
  localStorage.setItem('mqttHost', host);
  localStorage.setItem('mqttUser', user);
  localStorage.setItem('mqttPassword', password);
  if (mqttClient) { try { mqttClient.end(true); } catch(e) {} }
  logMessage(`[MQTT] Guardando config y conectando a ${host}...`);
  conectarMQTT();
}
function conectarSpotify() {
  const key = document.getElementById('spotifyClientId') && document.getElementById('spotifyClientId').value.trim();
  if (key) localStorage.setItem('youtubeApiKey', key);
  logMessage('[MÚSICA] YouTube API Key guardada.');
}

/* ── Gemini + Intents ── */
let geminiCooldown = false;
async function ejecutarHabilidad(texto) {
  showCommandToggle(`Comando: ${texto}`);
  logMessage(`Usuario dijo: "${texto}"`);
  const apiKey = getApiKey();
  const name   = localStorage.getItem('assistantName') || 'SCALL';

  // ══════════════════════════════════════════════════════════════
  // FILTRO PREVIO — intents locales con prioridad sobre la IA
  // Música, radio, luces, TV y otros intents de hardware se
  // ejecutan directamente sin gastar la IA ni la cuota de API.
  // ══════════════════════════════════════════════════════════════
  const comandoLower = texto.toLowerCase();
  const INTENTS_PRIORITARIOS = [
    // Música
    'musica_play', 'musica_play_query', 'musica_electronica', 'musica_relajante',
    'musica_trabajar', 'musica_ejercicio', 'musica_salsa', 'musica_vallenato',
    'musica_reggaeton', 'musica_cumbia', 'musica_pop', 'musica_rock', 'musica_jazz',
    'musica_romantica', 'musica_instrumental', 'musica_popular',
    'musica_stop', 'musica_reanudar', 'musica_next', 'musica_anterior',
    'musica_volumen_subir', 'musica_volumen_bajar',
    // Radio
    'radio_play', 'radio_stop', 'radio_siguiente', 'radio_anterior', 'radio_lista',
    // Podcast
    'podcast_play',
    // Luces y dispositivos (MQTT)
    'encender_luz_sala', 'apagar_luz_sala', 'encender_luz_cuarto', 'apagar_luz_cuarto',
    'encender_luz_general', 'apagar_luz_general', 'encender_tv', 'apagar_tv',
    'abrir_persianas', 'cerrar_persianas',
    // Utilidades locales
    'hora', 'fecha',
    // Alarmas, recordatorios, medicamentos
    'alarma_crear', 'alarma_listar', 'alarma_cancelar_todas', 'alarma_abrir_panel',
    'recordatorio_crear', 'recordatorio_diario',
    'medicamento_crear', 'medicamento_diario', 'medicamento',
    // Timer y cronómetro
    'timer_iniciar', 'timer_cancelar',
    'cronometro', 'cronometro_iniciar', 'cronometro_pausar', 'cronometro_reiniciar', 'cronometro_leer',
    // SOS
    // Bluetooth
    'bt_abrir', 'bt_escanear', 'bt_volumen_max', 'bt_volumen_normal',
    // Rutas
    'ruta_narrar_completa', 'ruta_abrir_navegacion',
    'ruta_navegar', 'ruta_abrir_mapa', 'ruta_cerrar',
    'ruta_google_maps', 'ruta_mi_ubicacion', 'ruta_configurar_casa',
    'ruta_informar', 'ruta_destinos_frecuentes',
    // SOS
    'sos_activar', 'sos_cancelar', 'sos_contactos',
    // Otras utilidades
    'clima_consultar', 'noticias_consultar',
    'traducir', 'cumpleanos_abrir', 'cumpleanos_hoy', 'cumpleanos_proximo',
    'corpus_ver'
  ];

  // Intents de Bluetooth inline (no requieren archivo separado)
  const BT_INTENTS = [
    { name:'bt_abrir',       match: c => c.includes('bluetooth') || c.includes('audifono') || c.includes('auricular') || c.includes('parlante') || c.includes('bocina'),
      action: () => { if(typeof sideMenuActivar==='function') sideMenuActivar(document.getElementById('smBluetooth')); if(typeof abrirPanelBluetooth==='function') abrirPanelBluetooth(); } },
    { name:'bt_escanear',    match: c => (c.includes('conectar')||c.includes('emparejar')||c.includes('vincular')||c.includes('buscar')) && (c.includes('bluetooth')||c.includes('audifono')||c.includes('parlante')),
      action: () => { if(typeof abrirPanelBluetooth==='function') abrirPanelBluetooth(); setTimeout(()=>{if(typeof escanearBluetooth==='function') escanearBluetooth();},400); } },
    { name:'bt_volumen_max', match: c => c.includes('volumen maximo')||c.includes('amplifica')||(c.includes('mas fuerte')&&c.includes('maximo')),
      action: () => { if(typeof setGain==='function') setGain(3.0); responderVoz('Volumen al máximo.'); } },
    { name:'bt_normal',      match: c => c.includes('volumen normal')&&(c.includes('bluetooth')||c.includes('audifono')),
      action: () => { if(typeof setGain==='function') setGain(1.0); responderVoz('Volumen normal.'); } },
  ];
  for (const intent of BT_INTENTS) {
    if (intent.match(comandoLower)) {
      logMessage('[Intent BT] → [' + intent.name + ']');
      intent.action(comandoLower);
      if (window.scallOrb) window.scallOrb.setState('idle');
      return;
    }
  }

  // Intents de alarma con fecha específica → van SIEMPRE a Claude
  // El parser local no puede distinguir día=27 de hora=27
  const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const INTENTS_ALARMA = ['alarma_crear','recordatorio_crear','recordatorio_diario',
                           'medicamento_crear','medicamento_diario','medicamento'];
  const tieneMesEnFrase = MESES_ES.some(m => comandoLower.includes(m));

  if (typeof intents !== 'undefined') {
    for (const intent of intents) {
      // Si el intent es de alarma Y la frase tiene un mes → saltar al enrutador IA
      if (INTENTS_ALARMA.includes(intent.name) && tieneMesEnFrase) continue;

      if (INTENTS_PRIORITARIOS.includes(intent.name) && intent.match(comandoLower)) {
        logMessage(`[Intent local prioritario] → [${intent.name}]`);
        intent.action(comandoLower);
        if (window.scallOrb) window.scallOrb.setState('idle');
        return;  // ← No llama a la IA
      }
    }
  }

  // ── Diagnóstico del enrutador ──
  const iaActiva   = getActiveIA();
  const claudeKey  = getClaudeKey();
  const geminiKey  = apiKey;
  logMessage(`[ENRUTADOR] IA activa: ${iaActiva} | Claude key: ${claudeKey ? 'OK' : 'NO'} | Gemini key: ${geminiKey ? 'OK' : 'NO'}`);

  // Prioridad 1: Claude con Tool Use (acceso a todos los módulos)
  if (iaActiva === 'claude' && claudeKey) {
    logMessage('[IA] → Claude con Tools (acceso completo a módulos SCALL)');
    transcriptText.innerText = 'Pensando...';
    if (window.scallOrb) window.scallOrb.setState('processing');
    // Usar Tool Use si está disponible, sino fallback a llamarClaude simple
    if (typeof llamarClaudeConTools === 'function') {
      await llamarClaudeConTools(texto, name);
    } else {
      await llamarClaude(texto, name);
    }
    return;
  }

  // Prioridad 2: Respaldo — Claude sin tools si Gemini no tiene key
  if (iaActiva !== 'claude' && claudeKey && !geminiKey) {
    logMessage('[IA] ⚠️ Usando Claude como respaldo (sin Gemini key)');
    transcriptText.innerText = 'Pensando...';
    if (window.scallOrb) window.scallOrb.setState('processing');
    if (typeof llamarClaudeConTools === 'function') {
      await llamarClaudeConTools(texto, name);
    } else {
      await llamarClaude(texto, name);
    }
    return;
  }

  if (geminiKey) {
    if (geminiCooldown) { logMessage('[GEMINI] ⏳ Espera un momento.'); responderVoz('Un momento por favor.'); return; }
    geminiCooldown = true;
    setTimeout(() => { geminiCooldown = false; }, 3000);
    logMessage('Consultando Cerebro IA (Gemini)...');
    transcriptText.innerText = 'Pensando...';

    const systemPrompt = `INSTRUCCIONES DE SISTEMA OBLIGATORIAS:
Eres ${name}, un asistente personal inteligente, amigable y muy capaz. Tu trabajo es hablar con el usuario sobre cualquier tema, responder preguntas, hacer chistes o ayudarle en lo que necesite.
Además, tienes habilidades domóticas. Si el usuario te pide encender, apagar o controlar hardware (luces, ventiladores, puertas), DEBES responder de forma natural y servicial, pero OBLIGATORIAMENTE debes incluir al puro final de tu respuesta el comando técnico en el formato exacto: MQTT[topic|payload].
Ejemplo 1 (Usuario: "Hola, ¿quién eres?"): "¡Hola! Soy ${name}, tu asistente personal. ¿En qué te ayudo?"
Ejemplo 2 (Usuario: "Enciende las luces de la sala"): "Claro, enseguida enciendo las luces. MQTT[casa/sala/luces|ON]"
Ejemplo 3 (Usuario: "Apaga la luz"): "Entendido, apagando luz. MQTT[casa/sala/luces|OFF]"
MENSAJE DEL USUARIO: "${texto}"`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 256 } }) }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || response.status);
      if (data.error) throw new Error(data.error.message);

      let aiResponse = data.candidates[0].content.parts[0].text;
      const mqttRegex = /MQTT\[(.*?)\]/g;
      let match;
      while ((match = mqttRegex.exec(aiResponse)) !== null) {
        const cmd = match[1].split('|');
        if (cmd.length === 2) enviarComandoMQTT(cmd[0], cmd[1]);
      }
      aiResponse = aiResponse.replace(/MQTT\[.*?\]/g, '').trim();

      /* ── ORBE: speaking ── */
      if (window.scallOrb) window.scallOrb.setState('speaking');
      responderVoz(aiResponse);

    } catch (err) {
      geminiCooldown = false;
      /* ── ORBE: idle en error ── */
      if (window.scallOrb) window.scallOrb.setState('idle');
      if (err.message && err.message.includes('429')) {
        logMessage('[GEMINI] ⚠️ Límite de velocidad. Usando intents locales...');
        responderVoz('Estoy ocupado, usando modo local.');
        ejecutarIntentLocal(texto);
      } else {
        logMessage(`Error IA: ${err.message}`);
        responderVoz('Hubo un error de conexión con el cerebro de Inteligencia Artificial.');
      }
    }
    return;
  }

  // Sin IA disponible — modo local completo
  logMessage('[IA] ⚠️ Sin IA configurada — usando intents locales. Ve a Config ⚙️ para agregar una API Key.');
  responderVoz('No tengo IA configurada. Configura una API Key en el menú de ajustes para respuestas inteligentes.');
  ejecutarIntentLocal(texto);
}

function ejecutarIntentLocal(texto) {
  const comando = texto.toLowerCase();
  let found = false;
  if (typeof intents !== 'undefined') {
    for (const intent of intents) {
      if (intent.match(comando)) { logMessage(`Intent local: [${intent.name}]`); intent.action(comando); found = true; break; }
    }
  }
  if (!found) {
    if (typeof agregarAlCorpus === 'function') agregarAlCorpus(texto);
    logMessage(`[CORPUS] 📝 Frase guardada: "${texto}"`);
    responderVoz('No reconocí ese comando. Lo guardé para aprender.');
  }
}

function enviarComandoMQTT(topic, payload) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) logMessage(`[MQTT] ❌ Error: ${err.message}`);
      else     logMessage(`[MQTT] 📡 → <span style="color:yellow">${topic}</span> | <span style="color:yellow">${payload}</span>`);
    });
  } else {
    logMessage(`[MQTT SIM] <span style="color:yellow">${topic}</span> | <span style="color:yellow">${payload}</span>`);
  }
  if (topic.includes('luces')) updateActivityState('lightsOn', payload === 'ON');
  if (topic.includes('tv'))    updateActivityState('tvOn',     payload === 'ON');
  transcriptText.innerText = `Enviando: ${topic} → ${payload}`;
  transcriptText.style.color = '#10b981';
  setTimeout(() => { transcriptText.style.color = 'var(--text)'; }, 2000);
}

/* ── TTS ── */
const VOCES_MASCULINAS_ES = ['Microsoft Pablo','Microsoft Jorge','Google español','Diego','Carlos','Jorge','Pablo','Rodrigo'];
function elegirVozMasculina() {
  const voces = window.speechSynthesis.getVoices();
  if (!voces || voces.length === 0) return null;
  for (const n of VOCES_MASCULINAS_ES) {
    const v = voces.find(v => v.name.toLowerCase().includes(n.toLowerCase()));
    if (v) return v;
  }
  return voces.find(v => v.lang.startsWith('es')) || voces[0] || null;
}
function responderVoz(mensaje) {
  transcriptText.innerText = mensaje;
  logMessage(`[VOZ] "${mensaje}"`);

  /* ── ORBE: speaking mientras habla ── */
  if (window.scallOrb) window.scallOrb.setState('speaking');

  const speech  = new SpeechSynthesisUtterance(mensaje);
  speech.lang   = 'es-ES';
  speech.rate   = 1.0;
  speech.pitch  = 0.85;

  /* ── ORBE: idle al terminar ── */
  speech.onend = () => {
    if (window.scallOrb) window.scallOrb.setState('idle');
    logMessage('[ORBE] 🟢 Voz terminada → idle');
  };

  const voces   = window.speechSynthesis.getVoices();
  const asignar = () => {
    const voz = elegirVozMasculina();
    if (voz) { speech.voice = voz; logMessage(`[VOZ] Usando: ${voz.name}`); }
    window.speechSynthesis.speak(speech);
  };
  if (voces.length > 0) asignar();
  else window.speechSynthesis.onvoiceschanged = asignar;
}

/* ── Inicio ── */

// ══════════════════════════════════════════════════════════════════════
// PANELES LATERALES — lógica de menú y reloj
// ══════════════════════════════════════════════════════════════════════
function sideMenuActivar(el) {
  document.querySelectorAll('.side-menu-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

function abrirAsistente() {
  ['alarmaPanel','noticiasPanel','climaPanel','tradPanel','corpusPanel'].forEach(id => {
    const p = document.getElementById(id);
    if (p) p.style.display = 'none';
  });
}

function actualizarContadorAlarmas() {
  const el = document.getElementById('sideAlarmCount');
  if (!el || typeof getAlarmas !== 'function') return;
  el.textContent = getAlarmas().filter(a => a.activa).length;
}

(function initSideClock() {
  function tick() {
    const n   = new Date();
    const pad = v => String(v).padStart(2,'0');
    const DIAS  = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const clk = document.getElementById('sideClock');
    const dt  = document.getElementById('sideDate');
    if (clk) clk.textContent = pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());
    if (dt)  dt.textContent  = DIAS[n.getDay()]+' '+n.getDate()+' '+MESES[n.getMonth()];
  }
  tick(); setInterval(tick, 1000);
})();

window.onload = () => {
  const dropdown = document.getElementById('intentDropdown');
  if (dropdown && typeof intents !== 'undefined') {
    intents.forEach(intent => {
      const opt = document.createElement('option');
      opt.value = intent.name;
      opt.textContent = intent.description || intent.name;
      dropdown.appendChild(opt);
    });
    dropdown.addEventListener('change', (e) => {
      if (e.target.value) {
        const sel = intents.find(i => i.name === e.target.value);
        if (sel) { logMessage(`Ejecutando desde menú: [${sel.name}]`); sel.action(); }
        dropdown.value = '';
      }
    });
  }
  const savedName = localStorage.getItem('assistantName') || 'SCALL';
  const nameInput = document.getElementById('assistantName');
  if (nameInput) nameInput.value = savedName;
  document.getElementById('displayName').innerText = savedName;

  const savedHost = localStorage.getItem('mqttHost');
  if (savedHost) {
    const h = document.getElementById('mqttHost');
    const u = document.getElementById('mqttUser');
    const p = document.getElementById('mqttPassword');
    if (h) h.value = savedHost;
    if (u) u.value = localStorage.getItem('mqttUser') || '';
    if (p) p.value = localStorage.getItem('mqttPassword') || '';
  }

  // Restaurar selector de IA
  const savedIA = localStorage.getItem('activeIA') || 'gemini';
  seleccionarIA(savedIA);

  // Restaurar modelo Claude si fue guardado
  const savedModel = localStorage.getItem('claudeModel');
  const claudeModelSel = document.getElementById('claudeModel');
  if (savedModel && claudeModelSel) claudeModelSel.value = savedModel;

  // Mostrar placeholder si ya hay key guardada
  const geminiSaved = localStorage.getItem('geminiApiKey');
  if (geminiSaved) {
    const gi = document.getElementById('geminiKeyInput');
    if (gi) gi.placeholder = '●●●●●●●● (key guardada)';
  }
  const claudeSaved = localStorage.getItem('claudeApiKey');
  if (claudeSaved) {
    const ci = document.getElementById('claudeKeyInput');
    if (ci) ci.placeholder = '●●●●●●●● (key guardada)';
  }

  updateAIStatusUI();
  hideCommandToggle();
  actualizarContadorAlarmas();
  setTimeout(() => prepareToggleListener(), 100);
  setTimeout(() => conectarMQTT(), 500);
  setTimeout(() => showCommandToggle('Sistema listo'), 1500);

  // Registrar funciones reales con nombres que usan los stubs del <head>
  // IMPORTANTE: usar nombres distintos (_listo) para evitar recursión
  window._themeListo      = typeof toggleTheme            === 'function' ? toggleTheme            : null;
  window._cumpleanosListo = typeof abrirModalCumpleanosR  === 'function' ? abrirModalCumpleanosR  :
                            typeof abrirModalCumpleanos   === 'function' ? abrirModalCumpleanos   : null;
  window._sosListo        = typeof activarSOSReal         === 'function' ? activarSOSReal         :
                            typeof activarSOS             === 'function' ? activarSOS             : null;
  window._rutasPanelListo = typeof mostrarPanelRutasReal  === 'function' ? mostrarPanelRutasReal  :
                            typeof mostrarPanelRutas      === 'function' ? mostrarPanelRutas      : null;
  window._btPanelListo    = typeof abrirPanelBluetooth    === 'function' ? abrirPanelBluetooth    : null;
};
