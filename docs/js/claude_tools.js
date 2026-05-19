// =====================================================================
// CLAUDE TOOLS — SCALL
// Tool Use / Function Calling para Claude API
// Claude decide qué hacer, JavaScript lo ejecuta
// =====================================================================

if (window._SCALL_CLAUDE_TOOLS_LOADED) {
  console.warn('[CLAUDE_TOOLS] Ya cargado');
} else {
window._SCALL_CLAUDE_TOOLS_LOADED = true;

// ══════════════════════════════════════════════════════════════════════
// DEFINICIÓN DE HERRAMIENTAS — lo que Claude puede hacer en SCALL
// ══════════════════════════════════════════════════════════════════════

const SCALL_TOOLS = [

  // ── NAVEGACIÓN ──────────────────────────────────────────────────
  {
    name: 'abrir_navegacion',
    description: 'Abre el panel de navegación y traza una ruta desde la casa del usuario hasta el destino. Úsalo cuando el usuario quiera ir a algún lugar.',
    input_schema: {
      type: 'object',
      properties: {
        destino: {
          type: 'string',
          description: 'Dirección o nombre del lugar de destino'
        },
        narrar: {
          type: 'boolean',
          description: 'Si true, narra la ruta completa por voz (origen, destino, tiempo, novedades)'
        }
      },
      required: ['destino']
    }
  },

  {
    name: 'informar_ruta',
    description: 'Informa por voz la distancia y tiempo estimado de la ruta activa.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // ── VOZ ──────────────────────────────────────────────────────────
  {
    name: 'hablar',
    description: 'Hace que SCALL diga un texto en voz alta. Úsalo para respuestas, confirmaciones o cualquier mensaje al usuario.',
    input_schema: {
      type: 'object',
      properties: {
        texto: {
          type: 'string',
          description: 'Texto que SCALL dirá en voz alta'
        }
      },
      required: ['texto']
    }
  },

  // ── MENÚ LATERAL ─────────────────────────────────────────────────
  {
    name: 'activar_menu',
    description: 'Activa y abre una sección del menú lateral de SCALL.',
    input_schema: {
      type: 'object',
      properties: {
        seccion: {
          type: 'string',
          enum: ['asistente', 'alarmas', 'navegacion', 'dispositivos', 'bluetooth', 'noticias', 'clima', 'config'],
          description: 'Sección del menú a activar'
        }
      },
      required: ['seccion']
    }
  },

  // ── ALARMAS ──────────────────────────────────────────────────────
  {
    name: 'crear_alarma',
    description: 'Crea una alarma, recordatorio o recordatorio de medicamento.',
    input_schema: {
      type: 'object',
      properties: {
        hora:     { type: 'integer', description: 'Hora en formato 24h (0-23)' },
        minuto:   { type: 'integer', description: 'Minutos (0-59)' },
        tipo:     { type: 'string', enum: ['alarma', 'recordatorio', 'medicamento'], description: 'Tipo de alarma' },
        mensaje:  { type: 'string', description: 'Mensaje que se mostrará cuando suene' },
        repetir:  { type: 'boolean', description: 'Si true, se repite todos los días' },
        sonido:   { type: 'string', enum: ['beep', 'urgente', 'suave', 'digital', 'campana', 'medicina'], description: 'Sonido de la alarma' },
        dia:      { type: 'integer', description: 'Día del mes (1-31) si es para una fecha específica' },
        mes:      { type: 'integer', description: 'Mes del año (1-12) si es para una fecha específica' },
        anio:     { type: 'integer', description: 'Año (ej: 2026) si es para una fecha específica' }
      },
      required: ['hora', 'minuto']
    }
  },

  {
    name: 'listar_alarmas',
    description: 'Lista las alarmas activas del usuario.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  {
    name: 'cancelar_alarmas',
    description: 'Cancela todas las alarmas activas.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // ── TIMER ────────────────────────────────────────────────────────
  {
    name: 'iniciar_timer',
    description: 'Inicia un temporizador con cuenta regresiva.',
    input_schema: {
      type: 'object',
      properties: {
        segundos: { type: 'integer', description: 'Duración total en segundos' }
      },
      required: ['segundos']
    }
  },

  // ── MÚSICA ───────────────────────────────────────────────────────
  {
    name: 'controlar_musica',
    description: 'Controla la reproducción de música: reproducir, pausar, siguiente, anterior, cambiar volumen.',
    input_schema: {
      type: 'object',
      properties: {
        accion: {
          type: 'string',
          enum: ['reproducir', 'pausar', 'siguiente', 'anterior', 'detener', 'subir_volumen', 'bajar_volumen'],
          description: 'Acción a ejecutar'
        },
        query: {
          type: 'string',
          description: 'Si accion=reproducir, qué buscar (artista, género, canción)'
        }
      },
      required: ['accion']
    }
  },

  // ── RADIO ────────────────────────────────────────────────────────
  {
    name: 'controlar_radio',
    description: 'Sintoniza o controla la radio colombiana.',
    input_schema: {
      type: 'object',
      properties: {
        accion:  { type: 'string', enum: ['reproducir', 'detener', 'siguiente', 'anterior'], description: 'Acción' },
        emisora: { type: 'string', description: 'Nombre de la emisora (ej: Caracol, W Radio, Blu)' }
      },
      required: ['accion']
    }
  },

  // ── BLUETOOTH ────────────────────────────────────────────────────
  {
    name: 'bluetooth',
    description: 'Abre el panel Bluetooth o ajusta el amplificador de volumen.',
    input_schema: {
      type: 'object',
      properties: {
        accion: {
          type: 'string',
          enum: ['abrir_panel', 'escanear', 'amplificar_max', 'amplificar_normal'],
          description: 'Acción Bluetooth'
        },
        ganancia: {
          type: 'number',
          description: 'Nivel de ganancia 0.5 a 3.0 (1.0 = normal, 3.0 = máximo)'
        }
      },
      required: ['accion']
    }
  },

  // ── DISPOSITIVOS IoT / MQTT ──────────────────────────────────────
  {
    name: 'controlar_dispositivo',
    description: 'Controla dispositivos del hogar via MQTT (luces, TV, persianas, ventiladores).',
    input_schema: {
      type: 'object',
      properties: {
        dispositivo: {
          type: 'string',
          enum: ['luz_sala', 'luz_cuarto', 'luces_general', 'television', 'persianas', 'ventilador'],
          description: 'Dispositivo a controlar'
        },
        estado: {
          type: 'string',
          enum: ['encender', 'apagar', 'abrir', 'cerrar'],
          description: 'Estado deseado'
        }
      },
      required: ['dispositivo', 'estado']
    }
  },

  // ── SOS ──────────────────────────────────────────────────────────
  {
    name: 'sos',
    description: 'Activa o cancela una alerta de emergencia SOS.',
    input_schema: {
      type: 'object',
      properties: {
        accion: {
          type: 'string',
          enum: ['activar', 'cancelar'],
          description: 'Activar o cancelar la alerta'
        }
      },
      required: ['accion']
    }
  },

  // ── CLIMA ────────────────────────────────────────────────────────
  {
    name: 'consultar_clima',
    description: 'Abre el panel de clima y consulta el tiempo.',
    input_schema: {
      type: 'object',
      properties: {
        ciudad: { type: 'string', description: 'Ciudad colombiana a consultar (opcional)' }
      }
    }
  },

  // ── NOTICIAS ─────────────────────────────────────────────────────
  {
    name: 'ver_noticias',
    description: 'Abre el panel de noticias.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // ── SISTEMA ──────────────────────────────────────────────────────
  {
    name: 'info_sistema',
    description: 'Obtiene información del estado actual del sistema SCALL (IA activa, alarmas, MQTT, etc).',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

// ══════════════════════════════════════════════════════════════════════
// EJECUTOR DE HERRAMIENTAS — JS ejecuta lo que Claude pidió
// ══════════════════════════════════════════════════════════════════════

function ejecutarHerramienta(nombre, input) {
  _toolLog('[TOOL] Ejecutando: ' + nombre + ' → ' + JSON.stringify(input));

  switch (nombre) {

    // ── Navegación ──────────────────────────────────────────────────
    case 'abrir_navegacion': {
      var btnNav = document.getElementById('smNavegacion');
      if (btnNav && typeof sideMenuActivar === 'function') sideMenuActivar(btnNav);
      if (input.narrar && typeof narrarRutaCompleta === 'function') {
        narrarRutaCompleta(input.destino, input.destino);
      } else if (typeof navegarA === 'function') {
        navegarA(input.destino);
      }
      return { ok: true, mensaje: 'Navegación abierta hacia ' + input.destino };
    }

    case 'informar_ruta': {
      if (typeof informarRutaVoz === 'function') informarRutaVoz();
      return { ok: true };
    }

    // ── Voz ─────────────────────────────────────────────────────────
    case 'hablar': {
      if (typeof responderVoz === 'function') responderVoz(input.texto);
      return { ok: true };
    }

    // ── Menú lateral ────────────────────────────────────────────────
    case 'activar_menu': {
      var ids = {
        asistente:   'smAsistente',
        alarmas:     'smAlarmas',
        navegacion:  'smNavegacion',
        dispositivos:'smDispositivos',
        bluetooth:   'smBluetooth',
        noticias:    'smNoticias',
        clima:       'smClima',
        config:      'smConfig'
      };
      var paneles = {
        alarmas:    'alarmaPanel',
        noticias:   'noticiasPanel',
        clima:      'climaPanel'
      };
      var btnId = ids[input.seccion];
      var btn   = btnId ? document.getElementById(btnId) : null;
      if (btn && typeof sideMenuActivar === 'function') sideMenuActivar(btn);
      if (input.seccion === 'navegacion' && typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (input.seccion === 'bluetooth'  && typeof abrirPanelBluetooth === 'function') abrirPanelBluetooth();
      if (input.seccion === 'config') document.getElementById('configModal') && (document.getElementById('configModal').style.display='flex');
      if (paneles[input.seccion] && typeof togglePanel === 'function') togglePanel(paneles[input.seccion]);
      return { ok: true, seccion: input.seccion };
    }

    // ── Alarmas ─────────────────────────────────────────────────────
    case 'crear_alarma': {
      if (typeof crearAlarma === 'function') {
        crearAlarma({
          hora:    input.hora,
          minuto:  input.minuto,
          tipo:    input.tipo    || 'alarma',
          mensaje: input.mensaje || '',
          repetir: input.repetir || false,
          sonido:  input.sonido  || (input.tipo === 'medicamento' ? 'medicina' : 'beep'),
          dia:     input.dia     || null,
          mes:     input.mes     || null,
          anio:    input.anio    || null
        });
        // Sincronizar UI del panel de alarmas
        if (typeof sincronizarUIDesdeVoz === 'function') {
          sincronizarUIDesdeVoz({
            hora: input.hora, minuto: input.minuto,
            tipo: input.tipo || 'alarma',
            mensaje: input.mensaje || '',
            repetir: input.repetir || false,
            dia: input.dia || null, mes: input.mes || null, anio: input.anio || null
          });
        }
      }
      var fechaStr = input.dia && input.mes ? ' el ' + input.dia + '/' + input.mes : '';
      return { ok: true, hora: input.hora + ':' + String(input.minuto).padStart(2,'0') + fechaStr };
    }

    case 'listar_alarmas': {
      if (typeof listarAlarmasPorVoz === 'function') listarAlarmasPorVoz();
      var alarmas = typeof getAlarmas === 'function' ? getAlarmas() : [];
      return { ok: true, total: alarmas.length };
    }

    case 'cancelar_alarmas': {
      if (typeof cancelarTodasAlarmas === 'function') cancelarTodasAlarmas();
      return { ok: true };
    }

    // ── Timer ────────────────────────────────────────────────────────
    case 'iniciar_timer': {
      if (typeof iniciarTimer === 'function') iniciarTimer(input.segundos);
      return { ok: true, segundos: input.segundos };
    }

    // ── Música ───────────────────────────────────────────────────────
    case 'controlar_musica': {
      var acc = input.accion;
      if (acc === 'reproducir'    && typeof reproducirMusica   === 'function') reproducirMusica(input.query || 'música popular');
      if (acc === 'pausar'        && typeof pausarMusica       === 'function') pausarMusica();
      if (acc === 'siguiente'     && typeof siguienteMusica    === 'function') siguienteMusica();
      if (acc === 'anterior'      && typeof anteriorMusica     === 'function') anteriorMusica();
      if (acc === 'detener'       && typeof detenerMusica      === 'function') detenerMusica();
      if (acc === 'subir_volumen' && typeof subirVolumen       === 'function') subirVolumen();
      if (acc === 'bajar_volumen' && typeof bajarVolumen       === 'function') bajarVolumen();
      return { ok: true, accion: acc };
    }

    // ── Radio ────────────────────────────────────────────────────────
    case 'controlar_radio': {
      var raccion = input.accion;
      if (raccion === 'reproducir' && typeof reproducirEmisora === 'function') reproducirEmisora(input.emisora || '');
      if (raccion === 'detener'    && typeof detenerRadio      === 'function') detenerRadio(true);
      if (raccion === 'siguiente'  && typeof radioSiguiente    === 'function') radioSiguiente();
      if (raccion === 'anterior'   && typeof radioAnterior     === 'function') radioAnterior();
      return { ok: true };
    }

    // ── Bluetooth ────────────────────────────────────────────────────
    case 'bluetooth': {
      var baccion = input.accion;
      if (baccion === 'abrir_panel'       && typeof abrirPanelBluetooth === 'function') abrirPanelBluetooth();
      if (baccion === 'escanear'          && typeof escanearBluetooth   === 'function') { abrirPanelBluetooth(); setTimeout(escanearBluetooth, 400); }
      if (baccion === 'amplificar_max'    && typeof setGain             === 'function') setGain(3.0);
      if (baccion === 'amplificar_normal' && typeof setGain             === 'function') setGain(1.0);
      if (input.ganancia !== undefined    && typeof setGain             === 'function') setGain(input.ganancia);
      return { ok: true };
    }

    // ── Dispositivos IoT ─────────────────────────────────────────────
    case 'controlar_dispositivo': {
      var topicMap = {
        luz_sala:      'casa/sala/luces',
        luz_cuarto:    'casa/cuarto/luces',
        luces_general: 'casa/general/luces',
        television:    'casa/sala/tv',
        persianas:     'casa/persianas',
        ventilador:    'casa/sala/ventilador'
      };
      var payloadMap = {
        encender: 'ON',  apagar: 'OFF',
        abrir:    'OPEN', cerrar: 'CLOSE'
      };
      var topic   = topicMap[input.dispositivo];
      var payload = payloadMap[input.estado];
      if (topic && payload && typeof enviarComandoMQTT === 'function') {
        enviarComandoMQTT(topic, payload);
      }
      return { ok: true, topic: topic, payload: payload };
    }

    // ── SOS ──────────────────────────────────────────────────────────
    case 'sos': {
      if (input.accion === 'activar'  && typeof activarSOS  === 'function') activarSOS();
      if (input.accion === 'cancelar' && typeof cancelarSOS === 'function') cancelarSOS();
      return { ok: true };
    }

    // ── Clima ────────────────────────────────────────────────────────
    case 'consultar_clima': {
      if (typeof togglePanel    === 'function') togglePanel('climaPanel');
      if (typeof consultarClima === 'function') consultarClima(input.ciudad || null);
      return { ok: true };
    }

    // ── Noticias ─────────────────────────────────────────────────────
    case 'ver_noticias': {
      if (typeof togglePanel === 'function') togglePanel('noticiasPanel');
      return { ok: true };
    }

    // ── Info sistema ─────────────────────────────────────────────────
    case 'info_sistema': {
      var ia      = typeof getActiveIA  === 'function' ? getActiveIA()  : 'desconocida';
      var alarmas = typeof getAlarmas   === 'function' ? getAlarmas().filter(function(a){return a.activa;}).length : 0;
      var mqtt    = document.getElementById('mqttStatusLabel') ? document.getElementById('mqttStatusLabel').textContent : 'N/A';
      return {
        ok:           true,
        ia_activa:    ia,
        alarmas:      alarmas,
        mqtt:         mqtt,
        hora:         new Date().toLocaleTimeString('es-CO'),
        fecha:        new Date().toLocaleDateString('es-CO')
      };
    }

    default:
      _toolLog('[TOOL] Herramienta desconocida: ' + nombre);
      return { ok: false, error: 'Herramienta no reconocida: ' + nombre };
  }
}

// ══════════════════════════════════════════════════════════════════════
// LLAMADA A CLAUDE CON TOOL USE
// Reemplaza llamarClaude() en app.js cuando tools están activos
// ══════════════════════════════════════════════════════════════════════

async function llamarClaudeConTools(texto, nombre) {
  var apiKey = typeof getClaudeKey === 'function' ? getClaudeKey() : '';
  if (!apiKey) {
    if (typeof responderVoz === 'function') responderVoz('Configura tu Claude API Key en configuración.');
    return;
  }

  var model      = typeof getClaudeModel === 'function' ? getClaudeModel() : 'claude-sonnet-4-20250514';
  var nombre_bot = nombre || localStorage.getItem('assistantName') || 'SCALL';

  var systemPrompt =
    'Eres ' + nombre_bot + ', el asistente personal inteligente del sistema SCALL desarrollado por IIT. ' +
    'Tienes acceso completo a todos los módulos: navegación, alarmas, música, radio, bluetooth, ' +
    'dispositivos del hogar (IoT via MQTT), clima, noticias y SOS. ' +
    '\n\nCUANDO EL USUARIO PIDA ALGO:' +
    '\n1. Usa las herramientas disponibles para ejecutar la acción.' +
    '\n2. SIEMPRE usa la herramienta "hablar" para confirmar lo que hiciste.' +
    '\n3. Para navegación: usa abrir_navegacion con narrar=true.' +
    '\n4. Para alarmas: extrae hora y minuto del texto.' +
    '\n5. Para dispositivos: usa controlar_dispositivo.' +
    '\n\nPERSONALIDAD: Amigable, directo, español colombiano informal. ' +
    'Máximo 2 oraciones en hablar(). Nunca digas que eres Claude o Anthropic. ' +
    'Si te preguntan qué eres: Soy ' + nombre_bot + ', tu asistente personal de IIT.';

  // ── Validar y limpiar historial antes de cada llamada ────────────
  // Regla API: cada tool_use DEBE tener su tool_result inmediatamente después
  // Si el historial está corrupto, limpiarlo para evitar error 400
  if (!window._scallChatHistory) window._scallChatHistory = [];

  function historialeValido(hist) {
    for (var i = 0; i < hist.length; i++) {
      var msg = hist[i];
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        var tieneToolUse = msg.content.some(function(b) { return b.type === 'tool_use'; });
        if (tieneToolUse) {
          // El siguiente mensaje debe ser user con tool_result
          var next = hist[i + 1];
          if (!next || next.role !== 'user' || !Array.isArray(next.content) ||
              !next.content.some(function(b) { return b.type === 'tool_result'; })) {
            return false; // historial corrupto
          }
        }
      }
    }
    return true;
  }

  if (!historialeValido(window._scallChatHistory)) {
    _toolLog('[CLAUDE_TOOLS] ⚠️ Historial corrupto detectado — limpiando');
    window._scallChatHistory = [];
  }

  // Mantener máximo 10 turnos (20 mensajes)
  window._scallChatHistory.push({ role: 'user', content: texto });
  if (window._scallChatHistory.length > 20) {
    window._scallChatHistory = window._scallChatHistory.slice(-20);
    // Asegurar que empiece con 'user'
    while (window._scallChatHistory.length > 0 &&
           window._scallChatHistory[0].role !== 'user') {
      window._scallChatHistory.shift();
    }
  }

  _toolLog('[CLAUDE_TOOLS] Enviando a Claude con ' + SCALL_TOOLS.length + ' herramientas...');
  if (window.scallOrb) window.scallOrb.setState('processing');

  // Snapshot del historial antes de la llamada — para rollback si falla
  var histSnapshot = JSON.parse(JSON.stringify(window._scallChatHistory));

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               apiKey,
        'anthropic-version':       '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      model,
        max_tokens: 1024,
        system:     systemPrompt,
        tools:      SCALL_TOOLS,
        messages:   window._scallChatHistory
      })
    });

    var data = await response.json();

    if (!response.ok) {
      _toolLog('[CLAUDE_TOOLS] Error ' + response.status + ': ' + (data.error && data.error.message));
      // Rollback al snapshot antes del error
      window._scallChatHistory = histSnapshot.slice(0, -1); // quitar el mensaje que causó el error
      if (typeof responderVoz === 'function') responderVoz('Error al conectar con Claude.');
      if (window.scallOrb) window.scallOrb.setState('idle');
      return;
    }

    // ── Agregar respuesta del asistente al historial ──────────────
    var assistantMsg = { role: 'assistant', content: data.content };
    window._scallChatHistory.push(assistantMsg);

    var toolResults    = [];
    var textoRespuesta = '';

    // ── Procesar bloques de la respuesta ─────────────────────────
    for (var i = 0; i < data.content.length; i++) {
      var bloque = data.content[i];

      if (bloque.type === 'text') {
        textoRespuesta += bloque.text;
      }

      if (bloque.type === 'tool_use') {
        _toolLog('[CLAUDE_TOOLS] Tool: ' + bloque.name + ' → ' + JSON.stringify(bloque.input));
        var resultado = ejecutarHerramienta(bloque.name, bloque.input);
        // CRÍTICO: guardar tool_result con el mismo id del tool_use
        toolResults.push({
          type:        'tool_result',
          tool_use_id: bloque.id,
          content:     JSON.stringify(resultado)
        });
      }
    }

    // ── Si hubo tool_use, SIEMPRE enviar tool_results de vuelta ──
    if (toolResults.length > 0) {
      // Agregar tool_results al historial (mismo turno user)
      window._scallChatHistory.push({ role: 'user', content: toolResults });

      var response2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':            'application/json',
          'x-api-key':               apiKey,
          'anthropic-version':       '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model:      model,
          max_tokens: 512,
          system:     systemPrompt,
          tools:      SCALL_TOOLS,
          messages:   window._scallChatHistory
        })
      });

      var data2 = await response2.json();

      if (!response2.ok) {
        _toolLog('[CLAUDE_TOOLS] Error en segunda llamada: ' + (data2.error && data2.error.message));
        // No limpiar el historial aquí — los tool_results están correctos
      } else if (data2.content) {
        window._scallChatHistory.push({ role: 'assistant', content: data2.content });

        for (var j = 0; j < data2.content.length; j++) {
          var b2 = data2.content[j];
          if (b2.type === 'text') {
            textoRespuesta += b2.text;
          }
          if (b2.type === 'tool_use') {
            // Claude pidió otra herramienta en la segunda vuelta
            var r2 = ejecutarHerramienta(b2.name, b2.input);
            _toolLog('[CLAUDE_TOOLS] Tool2: ' + b2.name + ' → ' + JSON.stringify(r2));
            // Agregar tool_result para mantener historial válido
            window._scallChatHistory.push({
              role: 'user',
              content: [{
                type:        'tool_result',
                tool_use_id: b2.id,
                content:     JSON.stringify(r2)
              }]
            });
          }
        }
      }
    }

    // ── Hablar respuesta de texto si no usó herramienta "hablar" ─
    if (textoRespuesta.trim() && typeof responderVoz === 'function') {
      var usoHablar = data.content.some(function(b) {
        return b.type === 'tool_use' && b.name === 'hablar';
      });
      if (!usoHablar) responderVoz(textoRespuesta.trim());
    }

    _toolLog('[CLAUDE_TOOLS] Completado. Stop: ' + data.stop_reason +
             ' | Historial: ' + window._scallChatHistory.length + ' mensajes');
    if (window.scallOrb) window.scallOrb.setState('idle');

  } catch (err) {
    _toolLog('[CLAUDE_TOOLS] Excepción: ' + err.message);
    // Rollback al snapshot — deshacer cambios al historial
    window._scallChatHistory = histSnapshot.slice(0, -1);
    if (typeof responderVoz === 'function') responderVoz('No pude conectar con Claude. Revisa tu conexión.');
    if (window.scallOrb) window.scallOrb.setState('idle');
  }
}

// ══════════════════════════════════════════════════════════════════════
// LIMPIAR HISTORIAL DE CONVERSACIÓN
// ══════════════════════════════════════════════════════════════════════

function limpiarHistorialClaude() {
  window._scallChatHistory = [];
  _toolLog('[CLAUDE_TOOLS] Historial limpiado');
  if (typeof responderVoz === 'function') responderVoz('Conversación reiniciada.');
}

// Exponer globalmente
window.llamarClaudeConTools  = llamarClaudeConTools;
window.limpiarHistorialClaude = limpiarHistorialClaude;
window.SCALL_TOOLS            = SCALL_TOOLS;

function _toolLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

_toolLog('[CLAUDE_TOOLS] Módulo listo — ' + SCALL_TOOLS.length + ' herramientas registradas');

} // fin guard _SCALL_CLAUDE_TOOLS_LOADED
