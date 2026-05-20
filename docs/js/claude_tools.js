// =====================================================================
// CLAUDE TOOLS — SCALL v4
// Tool Use / Function Calling — 17 herramientas
// Archivo reconstruido limpio — sin errores de sintaxis
// =====================================================================

if (window._SCALL_CLAUDE_TOOLS_LOADED) {
  console.warn('[CLAUDE_TOOLS] Ya cargado');
} else {
window._SCALL_CLAUDE_TOOLS_LOADED = true;

// ══════════════════════════════════════════════════════════════════════
// 17 HERRAMIENTAS DE SCALL
// ══════════════════════════════════════════════════════════════════════

var SCALL_TOOLS = [
  {
    name: 'abrir_navegacion',
    description: 'Abre el panel de navegacion y traza una ruta desde la casa del usuario hasta el destino. Usalo cuando el usuario quiera ir a algun lugar.',
    input_schema: {
      type: 'object',
      properties: {
        destino: { type: 'string', description: 'Direccion o nombre del lugar de destino' },
        narrar:  { type: 'boolean', description: 'Si true, narra la ruta completa por voz' }
      },
      required: ['destino']
    }
  },
  {
    name: 'informar_ruta',
    description: 'Informa por voz la distancia y tiempo estimado de la ruta activa.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'hablar',
    description: 'Hace que SCALL diga un texto en voz alta. Usalo para respuestas y confirmaciones.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Texto que SCALL dira en voz alta' }
      },
      required: ['texto']
    }
  },
  {
    name: 'activar_menu',
    description: 'Activa y abre una seccion del menu lateral de SCALL.',
    input_schema: {
      type: 'object',
      properties: {
        seccion: {
          type: 'string',
          enum: ['asistente','alarmas','navegacion','dispositivos','bluetooth','noticias','clima','config'],
          description: 'Seccion del menu a activar'
        }
      },
      required: ['seccion']
    }
  },
  {
    name: 'crear_alarma',
    description: 'Crea una alarma, recordatorio o recordatorio de medicamento. SIEMPRE usa esta herramienta cuando el usuario pida programar alarma, cita, recordatorio o medicamento con fecha y hora.',
    input_schema: {
      type: 'object',
      properties: {
        hora:    { type: 'integer', description: 'Hora en formato 24h (0-23)' },
        minuto:  { type: 'integer', description: 'Minutos (0-59)' },
        tipo:    { type: 'string', enum: ['alarma','recordatorio','medicamento'], description: 'Tipo de alarma' },
        mensaje: { type: 'string', description: 'Mensaje que se mostrara cuando suene' },
        repetir: { type: 'boolean', description: 'Si true, se repite todos los dias' },
        sonido:  { type: 'string', enum: ['beep','urgente','suave','digital','campana','medicina'] },
        dia:     { type: 'integer', description: 'Dia del mes (1-31) para fecha especifica' },
        mes:     { type: 'integer', description: 'Mes (1-12) para fecha especifica' },
        anio:    { type: 'integer', description: 'Anio para fecha especifica' }
      },
      required: ['hora', 'minuto']
    }
  },
  {
    name: 'listar_alarmas',
    description: 'Lista las alarmas activas del usuario.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'cancelar_alarmas',
    description: 'Cancela todas las alarmas activas.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'iniciar_timer',
    description: 'Inicia un temporizador con cuenta regresiva.',
    input_schema: {
      type: 'object',
      properties: {
        segundos: { type: 'integer', description: 'Duracion total en segundos' }
      },
      required: ['segundos']
    }
  },
  {
    name: 'controlar_musica',
    description: 'Controla la reproduccion de musica.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['reproducir','pausar','siguiente','anterior','detener','subir_volumen','bajar_volumen'] },
        query:  { type: 'string', description: 'Si accion=reproducir, que buscar' }
      },
      required: ['accion']
    }
  },
  {
    name: 'controlar_radio',
    description: 'Sintoniza o controla la radio colombiana.',
    input_schema: {
      type: 'object',
      properties: {
        accion:  { type: 'string', enum: ['reproducir','detener','siguiente','anterior'] },
        emisora: { type: 'string', description: 'Nombre de la emisora' }
      },
      required: ['accion']
    }
  },
  {
    name: 'bluetooth',
    description: 'Abre el panel Bluetooth o ajusta el amplificador de volumen.',
    input_schema: {
      type: 'object',
      properties: {
        accion:   { type: 'string', enum: ['abrir_panel','escanear','amplificar_max','amplificar_normal'] },
        ganancia: { type: 'number', description: 'Nivel de ganancia 0.5 a 3.0' }
      },
      required: ['accion']
    }
  },
  {
    name: 'controlar_dispositivo',
    description: 'Controla dispositivos del hogar via MQTT.',
    input_schema: {
      type: 'object',
      properties: {
        dispositivo: { type: 'string', enum: ['luz_sala','luz_cuarto','luces_general','television','persianas','ventilador'] },
        estado:      { type: 'string', enum: ['encender','apagar','abrir','cerrar'] }
      },
      required: ['dispositivo','estado']
    }
  },
  {
    name: 'sos',
    description: 'Activa o cancela una alerta de emergencia SOS.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['activar','cancelar'] }
      },
      required: ['accion']
    }
  },
  {
    name: 'consultar_clima',
    description: 'Abre el panel de clima.',
    input_schema: {
      type: 'object',
      properties: {
        ciudad: { type: 'string', description: 'Ciudad a consultar (opcional)' }
      }
    }
  },
  {
    name: 'ver_noticias',
    description: 'Abre el panel de noticias.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'info_sistema',
    description: 'Obtiene informacion del estado actual del sistema SCALL.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'programar_cumpleanos',
    description: 'Registra el cumpleanos o evento especial de una persona.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre de la persona' },
        dia:    { type: 'integer', description: 'Dia del mes (1-31)' },
        mes:    { type: 'integer', description: 'Mes (1-12)' },
        anio:   { type: 'integer', description: 'Anio de nacimiento (opcional)' },
        tipo:   { type: 'string', enum: ['cumpleanos','aniversario','evento'] },
        nota:   { type: 'string', description: 'Nota adicional (opcional)' }
      },
      required: ['nombre','dia','mes']
    }
  }
];

// ══════════════════════════════════════════════════════════════════════
// EJECUTOR DE HERRAMIENTAS
// ══════════════════════════════════════════════════════════════════════

function ejecutarHerramienta(nombre, input) {
  _toolLog('[TOOL] ' + nombre + ' → ' + JSON.stringify(input));

  switch (nombre) {

    case 'abrir_navegacion': {
      var btnNav = document.getElementById('smNavegacion');
      if (btnNav && typeof sideMenuActivar === 'function') sideMenuActivar(btnNav);
      if (input.narrar && typeof narrarRutaCompleta === 'function') {
        narrarRutaCompleta(input.destino, input.destino);
      } else if (typeof navegarA === 'function') {
        navegarA(input.destino);
      }
      return { ok: true, mensaje: 'Navegacion hacia ' + input.destino };
    }

    case 'informar_ruta': {
      if (typeof informarRutaVoz === 'function') informarRutaVoz();
      return { ok: true };
    }

    case 'hablar': {
      if (typeof responderVoz === 'function') responderVoz(input.texto);
      return { ok: true };
    }

    case 'activar_menu': {
      var ids = {
        asistente:'smAsistente', alarmas:'smAlarmas', navegacion:'smNavegacion',
        dispositivos:'smDispositivos', bluetooth:'smBluetooth', noticias:'smNoticias',
        clima:'smClima', config:'smConfig'
      };
      var paneles = { alarmas:'alarmaPanel', noticias:'noticiasPanel', clima:'climaPanel' };
      var btn = ids[input.seccion] ? document.getElementById(ids[input.seccion]) : null;
      if (btn && typeof sideMenuActivar === 'function') sideMenuActivar(btn);
      if (input.seccion === 'navegacion' && typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (input.seccion === 'bluetooth' && typeof abrirPanelBluetooth === 'function') abrirPanelBluetooth();
      if (paneles[input.seccion] && typeof togglePanel === 'function') togglePanel(paneles[input.seccion]);
      return { ok: true, seccion: input.seccion };
    }

    case 'crear_alarma': {
      var alarmaData = {
        hora:    parseInt(input.hora),
        minuto:  parseInt(input.minuto || 0),
        tipo:    input.tipo    || 'alarma',
        mensaje: input.mensaje || '',
        repetir: input.repetir || false,
        sonido:  input.sonido  || (input.tipo === 'medicamento' ? 'medicina' : 'beep'),
        dia:     input.dia  ? parseInt(input.dia)  : null,
        mes:     input.mes  ? parseInt(input.mes)  : null,
        anio:    input.anio ? parseInt(input.anio) : null
      };

      // 1. Crear en localStorage
      var id = typeof crearAlarma === 'function' ? crearAlarma(alarmaData) : null;
      _toolLog('[TOOL] Alarma creada id=' + id);

      // 2. Activar menú lateral
      var smAl = document.getElementById('smAlarmas');
      if (smAl && typeof sideMenuActivar === 'function') sideMenuActivar(smAl);

      // 3. Abrir panel directamente
      var panelAl = document.getElementById('alarmaPanel');
      if (panelAl) {
        ['noticiasPanel','climaPanel','tradPanel','corpusPanel'].forEach(function(pid) {
          var pe = document.getElementById(pid);
          if (pe) pe.style.display = 'none';
        });
        panelAl.style.display = 'flex';
      }

      // 4. Rellenar campos y renderizar
      setTimeout(function() {
        var elH = document.getElementById('alarmHora');
        var elM = document.getElementById('alarmMin');
        var elT = document.getElementById('alarmTipo');
        var elG = document.getElementById('alarmMsg');
        var elD = document.getElementById('alarmDia');
        var elMe= document.getElementById('alarmMes');
        var elA = document.getElementById('alarmAnio');
        if (elH)  elH.value  = alarmaData.hora;
        if (elM)  elM.value  = alarmaData.minuto;
        if (elT)  elT.value  = alarmaData.tipo;
        if (elG)  elG.value  = alarmaData.mensaje || '';
        if (elD && alarmaData.dia)  elD.value  = alarmaData.dia;
        if (elMe && alarmaData.mes) elMe.value = alarmaData.mes;
        if (elA && alarmaData.anio) elA.value  = alarmaData.anio;

        if (typeof renderizarListaAlarmas === 'function') renderizarListaAlarmas();
        if (typeof renderCalendario       === 'function') renderCalendario();

        var contEl = document.getElementById('sideAlarmCount');
        if (contEl && typeof getAlarmas === 'function') {
          contEl.textContent = getAlarmas().filter(function(a){ return a.activa; }).length;
        }
        _toolLog('[TOOL] UI alarmas actualizada');
      }, 300);

      var MN = ['','enero','febrero','marzo','abril','mayo','junio',
                'julio','agosto','septiembre','octubre','noviembre','diciembre'];
      var fd = (alarmaData.dia && alarmaData.mes)
        ? ' el ' + alarmaData.dia + ' de ' + (MN[alarmaData.mes] || alarmaData.mes)
        : ' diaria';
      var hs = String(alarmaData.hora).padStart(2,'0') + ':' + String(alarmaData.minuto).padStart(2,'0');
      return { ok: true, programado: hs + fd };
    }

    case 'listar_alarmas': {
      if (typeof listarAlarmasPorVoz === 'function') listarAlarmasPorVoz();
      var als = typeof getAlarmas === 'function' ? getAlarmas() : [];
      return { ok: true, total: als.length };
    }

    case 'cancelar_alarmas': {
      if (typeof cancelarTodasAlarmas === 'function') cancelarTodasAlarmas();
      return { ok: true };
    }

    case 'iniciar_timer': {
      if (typeof iniciarTimer === 'function') iniciarTimer(input.segundos);
      return { ok: true, segundos: input.segundos };
    }

    case 'controlar_musica': {
      var acc = input.accion;
      if (acc === 'reproducir'    && typeof reproducirMusica  === 'function') reproducirMusica(input.query || '');
      if (acc === 'pausar'        && typeof pausarMusica      === 'function') pausarMusica();
      if (acc === 'siguiente'     && typeof siguienteMusica   === 'function') siguienteMusica();
      if (acc === 'anterior'      && typeof anteriorMusica    === 'function') anteriorMusica();
      if (acc === 'detener'       && typeof detenerMusica     === 'function') detenerMusica();
      if (acc === 'subir_volumen' && typeof subirVolumen      === 'function') subirVolumen();
      if (acc === 'bajar_volumen' && typeof bajarVolumen      === 'function') bajarVolumen();
      return { ok: true, accion: acc };
    }

    case 'controlar_radio': {
      var ra = input.accion;
      if (ra === 'reproducir' && typeof reproducirEmisora === 'function') reproducirEmisora(input.emisora || '');
      if (ra === 'detener'    && typeof detenerRadio      === 'function') detenerRadio(true);
      if (ra === 'siguiente'  && typeof radioSiguiente    === 'function') radioSiguiente();
      if (ra === 'anterior'   && typeof radioAnterior     === 'function') radioAnterior();
      return { ok: true };
    }

    case 'bluetooth': {
      var ba = input.accion;
      if (ba === 'abrir_panel'       && typeof abrirPanelBluetooth === 'function') abrirPanelBluetooth();
      if (ba === 'escanear'          && typeof escanearBluetooth   === 'function') { abrirPanelBluetooth(); setTimeout(escanearBluetooth, 400); }
      if (ba === 'amplificar_max'    && typeof setGain             === 'function') setGain(3.0);
      if (ba === 'amplificar_normal' && typeof setGain             === 'function') setGain(1.0);
      if (input.ganancia !== undefined && typeof setGain           === 'function') setGain(input.ganancia);
      return { ok: true };
    }

    case 'controlar_dispositivo': {
      var topicMap = {
        luz_sala:'casa/sala/luces', luz_cuarto:'casa/cuarto/luces',
        luces_general:'casa/general/luces', television:'casa/sala/tv',
        persianas:'casa/persianas', ventilador:'casa/sala/ventilador'
      };
      var payloadMap = { encender:'ON', apagar:'OFF', abrir:'OPEN', cerrar:'CLOSE' };
      var topic   = topicMap[input.dispositivo];
      var payload = payloadMap[input.estado];
      if (topic && payload && typeof enviarComandoMQTT === 'function') enviarComandoMQTT(topic, payload);
      return { ok: true, topic: topic, payload: payload };
    }

    case 'sos': {
      if (input.accion === 'activar'  && typeof activarSOS  === 'function') activarSOS();
      if (input.accion === 'cancelar' && typeof cancelarSOS === 'function') cancelarSOS();
      return { ok: true };
    }

    case 'consultar_clima': {
      if (typeof togglePanel    === 'function') togglePanel('climaPanel');
      if (typeof consultarClima === 'function') consultarClima(input.ciudad || null);
      return { ok: true };
    }

    case 'ver_noticias': {
      if (typeof togglePanel === 'function') togglePanel('noticiasPanel');
      return { ok: true };
    }

    case 'info_sistema': {
      var ia     = typeof getActiveIA === 'function' ? getActiveIA() : 'desconocida';
      var nAl    = typeof getAlarmas  === 'function' ? getAlarmas().filter(function(a){return a.activa;}).length : 0;
      var mqtt   = document.getElementById('mqttStatusLabel') ? document.getElementById('mqttStatusLabel').textContent : 'N/A';
      return { ok:true, ia_activa:ia, alarmas:nAl, mqtt:mqtt,
               hora:new Date().toLocaleTimeString('es-CO'),
               fecha:new Date().toLocaleDateString('es-CO') };
    }

    case 'programar_cumpleanos': {
      var MESES_C = ['','enero','febrero','marzo','abril','mayo','junio',
                     'julio','agosto','septiembre','octubre','noviembre','diciembre'];
      var eventoData = {
        nombre: input.nombre, dia: parseInt(input.dia), mes: parseInt(input.mes),
        anio: input.anio ? parseInt(input.anio) : null,
        tipo: input.tipo || 'cumpleanos', nota: input.nota || ''
      };
      // Guardar en localStorage
      var CUMPLE_KEY = 'scall_cumpleanos';
      var listaCumple = [];
      try { listaCumple = JSON.parse(localStorage.getItem(CUMPLE_KEY)) || []; } catch(e) {}
      listaCumple = listaCumple.filter(function(e) { return e.nombre.toLowerCase() !== eventoData.nombre.toLowerCase(); });
      listaCumple.push(eventoData);
      listaCumple.sort(function(a,b) { return a.mes - b.mes || a.dia - b.dia; });
      localStorage.setItem(CUMPLE_KEY, JSON.stringify(listaCumple));
      // Abrir modal y llenar
      if (typeof abrirModalCumpleanos === 'function') abrirModalCumpleanos();
      setTimeout(function() {
        if (typeof window._scallProgramarCumpleanos === 'function') {
          window._scallProgramarCumpleanos(eventoData);
        } else {
          var inputs = document.querySelectorAll('input, select');
          inputs.forEach(function(el) {
            var id = (el.id||'').toLowerCase();
            if (id.includes('nombre') || id.includes('name')) el.value = eventoData.nombre;
            if (id.includes('dia')   || id.includes('day'))   el.value = eventoData.dia;
            if (id.includes('mes')   || id.includes('month')) el.value = eventoData.mes;
            if ((id.includes('anio') || id.includes('year')) && eventoData.anio) el.value = eventoData.anio;
          });
        }
      }, 600);
      var fechaCumple = eventoData.dia + ' de ' + (MESES_C[eventoData.mes] || eventoData.mes);
      return { ok: true, guardado: eventoData.nombre + ' — ' + fechaCumple };
    }

    default:
      _toolLog('[TOOL] Herramienta no reconocida: ' + nombre);
      return { ok: false, error: 'Herramienta no reconocida: ' + nombre };
  }
}

// ══════════════════════════════════════════════════════════════════════
// LLAMADA A CLAUDE CON TOOL USE
// ══════════════════════════════════════════════════════════════════════

async function llamarClaudeConTools(texto, nombre) {
  _toolLog('[CLAUDE_TOOLS] Iniciado para: "' + texto + '"');

  var apiKey = typeof getClaudeKey === 'function' ? getClaudeKey() : '';
  if (!apiKey) {
    _toolLog('[CLAUDE_TOOLS] Sin API key');
    if (typeof responderVoz === 'function') responderVoz('Configura tu Claude API Key en configuracion.');
    return;
  }

  var model      = typeof getClaudeModel === 'function' ? getClaudeModel() : 'claude-sonnet-4-20250514';
  var nombre_bot = nombre || localStorage.getItem('assistantName') || 'SCALL';

  var systemPrompt =
    'Eres ' + nombre_bot + ', el asistente de voz mas avanzado de Colombia, creado por IIT (InfraestructuraIT).\n' +
    'No eres un chatbot. Eres una plataforma de inteligencia autonoma que EJECUTA ACCIONES REALES.\n' +
    '\n' +
    'IDENTIDAD:\n' +
    '- Sistema de Control Autonomo de Lenguaje y Logica\n' +
    '- Cerebro: IA de ultima generacion. Motor confidencial.\n' +
    '- Superas a Alexa y Google Home porque entiendes intencion completa, no solo palabras clave\n' +
    '- Aprendes rutas frecuentes, te adaptas al usuario, evolucionas\n' +
    '- Naciste hablando colombiano\n' +
    '\n' +
    'REGLA CRITICA: Cuando el usuario pida una accion, USA LAS HERRAMIENTAS. NO expliques como hacerlo.\n' +
    '- Si pide alarma → LLAMA crear_alarma ahora mismo\n' +
    '- Si pide ruta   → LLAMA abrir_navegacion ahora mismo\n' +
    '- Si pide musica → LLAMA controlar_musica ahora mismo\n' +
    '- Si pide info   → LLAMA info_sistema ahora mismo\n' +
    'NUNCA le digas al usuario "di tal cosa" o "activa tal comando" — TU eres quien actua.\n' +
    '\n' +
    'COMPORTAMIENTO:\n' +
    '1. Ejecuta la herramienta correcta para la solicitud\n' +
    '2. Confirma con hablar() en maximo 2 oraciones, espanol colombiano informal\n' +
    '3. Para alarmas: extrae hora (24h), minuto, dia, mes, anio del texto\n' +
    '4. NUNCA digas que eres Claude, GPT o Anthropic\n' +
    '5. Si preguntan que eres: "Soy ' + nombre_bot + ', tu asistente personal de IIT"\n' +
    '\n' +
    'PERSONALIDAD: Seguro, casi arrogante pero calido. "listo", "dale", "ya quedo", "eso ya esta".';

  // ── Validar historial ────────────────────────────────────────────
  if (!window._scallChatHistory) window._scallChatHistory = [];

  function historialeValido(hist) {
    for (var i = 0; i < hist.length; i++) {
      var msg = hist[i];
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        var tieneToolUse = msg.content.some(function(b) { return b.type === 'tool_use'; });
        if (tieneToolUse) {
          var next = hist[i + 1];
          var nextOk = next && next.role === 'user' && Array.isArray(next.content) &&
                       next.content.some(function(b) { return b.type === 'tool_result'; });
          if (!nextOk) return false;
        }
      }
    }
    return true;
  }

  if (!historialeValido(window._scallChatHistory)) {
    _toolLog('[CLAUDE_TOOLS] Historial corrupto — limpiando');
    window._scallChatHistory = [];
  }

  window._scallChatHistory.push({ role: 'user', content: texto });
  if (window._scallChatHistory.length > 20) {
    window._scallChatHistory = window._scallChatHistory.slice(-20);
    while (window._scallChatHistory.length && window._scallChatHistory[0].role !== 'user') {
      window._scallChatHistory.shift();
    }
  }

  var histSnapshot = JSON.parse(JSON.stringify(window._scallChatHistory));
  _toolLog('[CLAUDE_TOOLS] Enviando con ' + SCALL_TOOLS.length + ' herramientas...');
  if (window.scallOrb) window.scallOrb.setState('processing');

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model, max_tokens: 1024,
        system: systemPrompt, tools: SCALL_TOOLS,
        messages: window._scallChatHistory
      })
    });

    var data = await response.json();

    if (!response.ok) {
      _toolLog('[CLAUDE_TOOLS] ERROR ' + response.status + ': ' + (data.error && data.error.message));
      if (response.status === 400) {
        _toolLog('[CLAUDE_TOOLS] Error 400 — reintentando con historial limpio');
        window._scallChatHistory = [{ role: 'user', content: texto }];
        var r2 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model:model, max_tokens:1024, system:systemPrompt,
                                 tools:SCALL_TOOLS, messages:window._scallChatHistory })
        });
        data = await r2.json();
        if (!r2.ok) {
          _toolLog('[CLAUDE_TOOLS] Reintento falló: ' + (data.error && data.error.message));
          window._scallChatHistory = [];
          if (typeof responderVoz === 'function') responderVoz('Hubo un error. Intenta de nuevo.');
          if (window.scallOrb) window.scallOrb.setState('idle');
          return;
        }
        response = r2;
      } else {
        window._scallChatHistory = histSnapshot.slice(0, -1);
        if (typeof responderVoz === 'function') responderVoz('Error al conectar. Codigo ' + response.status);
        if (window.scallOrb) window.scallOrb.setState('idle');
        return;
      }
    }

    window._scallChatHistory.push({ role: 'assistant', content: data.content });

    var toolResults    = [];
    var textoRespuesta = '';

    for (var i = 0; i < data.content.length; i++) {
      var bloque = data.content[i];
      if (bloque.type === 'text') textoRespuesta += bloque.text;
      if (bloque.type === 'tool_use') {
        _toolLog('[CLAUDE_TOOLS] Tool: ' + bloque.name);
        var resultado = ejecutarHerramienta(bloque.name, bloque.input);
        toolResults.push({ type:'tool_result', tool_use_id:bloque.id, content:JSON.stringify(resultado) });
      }
    }

    if (toolResults.length > 0) {
      window._scallChatHistory.push({ role: 'user', content: toolResults });
      var resp2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model:model, max_tokens:512, system:systemPrompt,
                               tools:SCALL_TOOLS, messages:window._scallChatHistory })
      });
      var data2 = await resp2.json();
      if (resp2.ok && data2.content) {
        window._scallChatHistory.push({ role: 'assistant', content: data2.content });
        for (var j = 0; j < data2.content.length; j++) {
          var b2 = data2.content[j];
          if (b2.type === 'text') textoRespuesta += b2.text;
          if (b2.type === 'tool_use') {
            var r2res = ejecutarHerramienta(b2.name, b2.input);
            window._scallChatHistory.push({
              role: 'user',
              content: [{ type:'tool_result', tool_use_id:b2.id, content:JSON.stringify(r2res) }]
            });
          }
        }
      }
    }

    var usoHablar = data.content.some(function(b) { return b.type === 'tool_use' && b.name === 'hablar'; });
    if (textoRespuesta.trim() && !usoHablar && typeof responderVoz === 'function') {
      responderVoz(textoRespuesta.trim());
    }

    _toolLog('[CLAUDE_TOOLS] OK — stop:' + data.stop_reason + ' historial:' + window._scallChatHistory.length);
    if (window.scallOrb) window.scallOrb.setState('idle');

  } catch (err) {
    _toolLog('[CLAUDE_TOOLS] Excepcion: ' + err.message);
    window._scallChatHistory = histSnapshot.slice(0, -1);
    if (typeof responderVoz === 'function') responderVoz('No pude conectar con el servidor.');
    if (window.scallOrb) window.scallOrb.setState('idle');
  }
}

function limpiarHistorialClaude() {
  window._scallChatHistory = [];
  _toolLog('[CLAUDE_TOOLS] Historial limpiado');
  if (typeof responderVoz === 'function') responderVoz('Conversacion reiniciada.');
}

// Integración cumpleanos.js
window._scallProgramarCumpleanos = function(data) {
  if (typeof abrirModalCumpleanos === 'function') abrirModalCumpleanos();
  setTimeout(function() {
    var inputs = document.querySelectorAll('input, select');
    inputs.forEach(function(el) {
      var id = (el.id||'').toLowerCase();
      var ph = (el.placeholder||'').toLowerCase();
      if (id.includes('nombre')||ph.includes('nombre')||id.includes('name')||ph.includes('name')) el.value = data.nombre;
      if (id.includes('dia')||id.includes('day')||(el.type==='number'&&el.min==1&&el.max==31)) el.value = data.dia;
      if ((id.includes('mes')||id.includes('month'))&&el.tagName==='SELECT') { el.value = data.mes; el.dispatchEvent(new Event('change')); }
      if ((id.includes('anio')||id.includes('year'))&&data.anio) el.value = data.anio;
    });
    ['renderizarCumpleanos','renderCumpleanos','cargarCumpleanos'].forEach(function(fn) {
      if (typeof window[fn] === 'function') window[fn]();
    });
  }, 600);
};

window.llamarClaudeConTools   = llamarClaudeConTools;
window.limpiarHistorialClaude = limpiarHistorialClaude;
window.SCALL_TOOLS            = SCALL_TOOLS;

function _toolLog(m) { if (typeof logMessage === 'function') logMessage(m); else console.log(m); }

_toolLog('[CLAUDE_TOOLS] Modulo listo — ' + SCALL_TOOLS.length + ' herramientas');

} // fin guard
