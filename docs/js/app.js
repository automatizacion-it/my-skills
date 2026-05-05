const orbBtn = document.getElementById('orbBtn');
const statusText = document.getElementById('statusText');
const transcriptText = document.getElementById('transcriptText');
const systemLog = document.getElementById('systemLog');

// ===== ESTADO DE ACTIVIDADES PARA EL TOGGLE =====
let activityState = {
  musicPlaying: false,
  lightsOn: false,
  tvOn: false,
  currentCommand: ''
};

function updateActivityState(type, value) {
  activityState[type] = value;
  updateToggleDisplay();
}

function updateToggleDisplay() {
  const { commandToggle, toggleLabel, toggleStateText } = getToggleElements();
  if (!commandToggle) return;

  let status = [];
  if (activityState.musicPlaying) status.push('🎵 Música ON');
  if (activityState.lightsOn) status.push('💡 Luces ON');
  if (activityState.tvOn) status.push('📺 TV ON');
  if (activityState.currentCommand) status.push(`↳ ${activityState.currentCommand}`);

  const displayText = status.length > 0 ? status.join(' | ') : 'Sistema activo';
  if (toggleLabel) toggleLabel.innerText = displayText;
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
      <label style="display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
        <input type="checkbox" id="toggleAction" checked>
        <span id="toggleStateText">Activado</span>
      </label>
      <button onclick="hideCommandToggle()" style="background: none; border: none; color: #000; font-size: 18px; cursor: pointer; margin-left: 10px;">×</button>
    `;
    document.body.appendChild(commandToggle);
  }
  const toggleAction = document.getElementById('toggleAction');
  const toggleLabel = document.getElementById('toggleLabel');
  const toggleStateText = document.getElementById('toggleStateText');
  return { commandToggle, toggleAction, toggleLabel, toggleStateText };
}

// 1. Verificación de permisos y capacidades
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  statusText.innerText = "Error: Tu navegador Chrome/Edge actual no soporta la API de Voz Nativa.";
  statusText.style.color = "red";
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false; // Se detiene al terminar de hablar la oración
  recognition.interimResults = true; // Va escribiendo a medida que hablas

  let isListening = false;

  // Evento del botón central
  orbBtn.addEventListener('click', () => {
    if (!isListening) {
      try {
        recognition.start(); // Esto pedirá permiso al micrófono la primera vez
        orbBtn.classList.add('listening');
        statusText.innerText = "Escuchando...";
        transcriptText.innerText = "";
        isListening = true;
      } catch(e) {
        console.error("No se pudo iniciar:", e);
      }
    } else {
      recognition.stop();
    }
  });

  // Recibir transcripción del micrófono en tiempo real
  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    transcriptText.innerText = finalTranscript || interimTranscript;
    console.log('Transcripción:', finalTranscript || interimTranscript);

    // Si la oración terminó y es final, se la enviamos a nuestras "Skills"
    if (finalTranscript) {
      console.log('Llamando ejecutarHabilidad con:', finalTranscript);
      ejecutarHabilidad(finalTranscript);
    }
  };

  // Manejo de finalización y errores
  recognition.onerror = (event) => {
    statusText.innerText = "Error de voz: " + event.error;
    orbBtn.classList.remove('listening');
    isListening = false;
  };

  recognition.onend = () => {
    statusText.innerText = "Procesando...";
    orbBtn.classList.remove('listening');
    isListening = false;
    setTimeout(() => {
      statusText.innerText = "Presiona el orbe para hablar";
    }, 2000);
  };
}

// ======================================================================
// 2. CEREBRO Y ENRUTADOR DE HABILIDADES (IA PROFUNDA + INTENTS)
// ======================================================================
function showCommandToggle(message = 'Acción recibida') {
  console.log('Intentando mostrar toggle con mensaje:', message);
  const { commandToggle, toggleAction, toggleLabel, toggleStateText } = getToggleElements();
  console.log('Elementos obtenidos:', { commandToggle, toggleAction, toggleLabel, toggleStateText });
  if (!commandToggle || !toggleAction || !toggleLabel || !toggleStateText) {
    console.error('Faltan elementos del toggle');
    return;
  }
  
  activityState.currentCommand = message;
  updateToggleDisplay();
  
  toggleAction.checked = true;
  commandToggle.classList.remove('hidden');
  commandToggle.style.display = 'flex';
  console.log('Toggle mostrado');
  logMessage('[TOGGLE UI] Visible');
}}

function hideCommandToggle() {
  const { commandToggle } = getToggleElements();
  if (!commandToggle) return;
  commandToggle.classList.add('hidden');
  commandToggle.style.display = 'none';
  logMessage('[TOGGLE UI] Oculto');
}

// Función para ocultar el toggle después de un tiempo
function autoHideToggle(delay = 5000) {
  setTimeout(() => {
    hideCommandToggle();
  }, delay);
}

function prepareToggleListener() {
  const { toggleAction, toggleStateText } = getToggleElements();
  if (!toggleAction) return;
  toggleAction.addEventListener('change', () => {
    const checked = toggleAction.checked;
    if (toggleStateText) {
      toggleStateText.innerText = checked ? 'Activado' : 'Desactivado';
    }
    logMessage(`[TOGGLE] ${checked ? 'Activado' : 'Desactivado'}`);
    if (!checked && typeof pausarMusica === 'function') {
      pausarMusica();
    }
    if (checked && typeof reanudarMusica === 'function') {
      reanudarMusica();
    }
  });
}

prepareToggleListener();

// Función global para pruebas
window.testToggle = function(msg) {
  console.log('Función testToggle llamada');
  showCommandToggle(msg || 'Prueba desde consola');
};

function logMessage(msg) {
  systemLog.innerHTML += `<br>> ${msg}`;
  systemLog.scrollTop = systemLog.scrollHeight;
}

// Cargar configuración guardada
window.onload = () => {
  // Rellenar menú desplegable
  const dropdown = document.getElementById('intentDropdown');
  if (dropdown && typeof intents !== 'undefined') {
    intents.forEach(intent => {
      const option = document.createElement('option');
      option.value = intent.name;
      option.textContent = intent.description || intent.name;
      dropdown.appendChild(option);
    });
    
    dropdown.addEventListener('change', (e) => {
      if (e.target.value) {
        const selectedIntent = intents.find(i => i.name === e.target.value);
        if (selectedIntent) {
          logMessage(`Ejecutando desde menú: [${selectedIntent.name}]`);
          selectedIntent.action();
        }
        dropdown.value = ""; // Reset
      }
    });
  }

  if(localStorage.getItem('assistantName')) {
    const name = localStorage.getItem('assistantName');
    document.getElementById('assistantName').value = name;
    document.getElementById('displayName').innerText = name;
  } else {
    document.getElementById('assistantName').value = 'SCALL';
    document.getElementById('displayName').innerText = 'SCALL';
  }
  if(localStorage.getItem('assistantApiKey')) {
    document.getElementById('assistantApiKey').value = localStorage.getItem('assistantApiKey');
  }
  hideCommandToggle();

  // Prueba inmediata del toggle
  setTimeout(() => {
    console.log('Probando toggle inmediato');
    showCommandToggle('Prueba de toggle');
    // No ocultar automáticamente
  }, 2000);
};

function saveAssistantConfig() {
  const name = document.getElementById('assistantName').value.trim() || 'SCALL';
  const key = document.getElementById('assistantApiKey').value.trim();
  
  localStorage.setItem('assistantName', name);
  document.getElementById('displayName').innerText = name;
  
  if(key) {
    localStorage.setItem('assistantApiKey', key);
    alert(`¡IA Avanzada activada! Ahora el asistente se llama ${name} y puede hablar de todo.`);
  }
  document.getElementById('configModal').style.display = 'none';
}

async function ejecutarHabilidad(texto) {
  console.log('ejecutarHabilidad llamado con:', texto);
  showCommandToggle(`Comando: ${texto}`);
  logMessage(`Usuario dijo: "${texto}"`);
  const apiKey = localStorage.getItem('assistantApiKey');
  const name = localStorage.getItem('assistantName') || 'SCALL';

  // === SI HAY API KEY, USAMOS LA IA PROFUNDA (GEMINI) ===
  if (apiKey) {
    logMessage(`Consultando Cerebro IA...`);
    transcriptText.innerText = "Pensando...";
    
    // El Prompt Maestro que le da vida y habilidades técnicas al Asistente
    const systemPrompt = `INSTRUCCIONES DE SISTEMA OBLIGATORIAS:
Eres ${name}, un asistente personal inteligente, amigable y muy capaz. Tu trabajo es hablar con el usuario sobre cualquier tema, responder preguntas, hacer chistes o ayudarle en lo que necesite.
Además, tienes habilidades domóticas. Si el usuario te pide encender, apagar o controlar hardware (luces, ventiladores, puertas), DEBES responder de forma natural y servicial, pero OBLIGATORIAMENTE debes incluir al puro final de tu respuesta el comando técnico en el formato exacto: MQTT[topic|payload].
Ejemplo 1 (Usuario: "Hola, ¿quién eres?"): "¡Hola! Soy ${name}, tu asistente personal. ¿En qué te ayudo?"
Ejemplo 2 (Usuario: "Enciende las luces de la sala"): "Claro, enseguida enciendo las luces. MQTT[casa/sala/luces|ON]"
Ejemplo 3 (Usuario: "Apaga la luz"): "Entendido, apagando luz. MQTT[casa/sala/luces|OFF]"

MENSAJE DEL USUARIO: "${texto}"`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      let aiResponse = data.candidates[0].content.parts[0].text;
      
      // Magia: Extraer comandos MQTT ocultos en la respuesta de la IA
      const mqttRegex = /MQTT\[(.*?)\]/g;
      let match;
      while ((match = mqttRegex.exec(aiResponse)) !== null) {
        const cmd = match[1].split('|'); // Ejemplo: casa/sala/luces|ON
        if (cmd.length === 2) {
          enviarComandoMQTT(cmd[0], cmd[1]);
        }
      }
      
      // Limpiar la etiqueta MQTT del texto final para que el asistente no la diga en voz alta
      aiResponse = aiResponse.replace(/MQTT\[.*?\]/g, '').trim();
      responderVoz(aiResponse);

    } catch (err) {
      logMessage(`Error IA: ${err.message}`);
      responderVoz("Hubo un error de conexión con mi cerebro de Inteligencia Artificial.");
    }
    return;
  }

  // === FALLBACK: SKILLS BÁSICOS Y SISTEMA DE INTENTS LOCAL ===
  const comando = texto.toLowerCase();

  let intentEncontrado = false;

  // Evaluar todos los intents registrados en intents.js
  if (typeof intents !== 'undefined') {
    for (let intent of intents) {
      if (intent.match(comando)) {
        logMessage(`Intent local detectado: [${intent.name}]`);
        intent.action(comando);
        intentEncontrado = true;
        break; // Detener la búsqueda tras encontrar la primera coincidencia
      }
    }
  } else {
    console.error("El archivo intents.js no se ha cargado correctamente.");
  }

  // Respuesta si no entiende el comando local
  if (!intentEncontrado) {
    responderVoz("Lo siento, en mi modo local actual no tengo registrado ese comando. Por favor intenta con otra instrucción.");
  }
}

// ======================================================================
// 3. CAPA DE COMUNICACIÓN (MQTT)
// ======================================================================
function enviarComandoMQTT(topic, payload) {
  // AQUÍ ESTÁ EL SANDBOX: A futuro reemplazaremos este log con la librería MQTT.js
  // que se conectará vía WebSockets a tu Broker (ej. Mosquitto).
  logMessage(`[MQTT PUBLISH] Topic: <span style="color:yellow">${topic}</span> | Payload: <span style="color:yellow">${payload}</span>`);
  
  // Actualizar estado del toggle según el comando
  if (topic.includes('luces')) {
    updateActivityState('lightsOn', payload === 'ON');
  }
  if (topic.includes('tv')) {
    updateActivityState('tvOn', payload === 'ON');
  }
  
  // Feedback visual adicional
  transcriptText.innerText = `Enviando paquete MQTT a: ${topic}...`;
  transcriptText.style.color = "#10b981";
  setTimeout(() => { transcriptText.style.color = "var(--text)"; }, 2000);
}}

// ======================================================================
// 4. RESPUESTA DE VOZ (Texto a Voz del Navegador)
// ======================================================================
function responderVoz(mensaje) {
  logMessage(`[VOZ] Asistente dice: "${mensaje}"`);
  // Usamos la API nativa de Síntesis de Voz del navegador
  const speech = new SpeechSynthesisUtterance(mensaje);
  speech.lang = 'es-ES';
  speech.rate = 1.0;  // Velocidad
  speech.pitch = 1.0; // Tono
  window.speechSynthesis.speak(speech);
}
