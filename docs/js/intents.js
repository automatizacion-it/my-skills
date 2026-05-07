// Definición de todos los intents locales disponibles
const intents = [
  // ── Básicos ──────────────────────────────────────────────────────────
  {
    name: "saludo",
    description: "Saludar (Ej: 'Hola', 'Buenos días')",
    match: (c) => c.includes('hola') || c.includes('buenos días') || c.includes('buenas tardes') || c.includes('buenas noches'),
    action: () => responderVoz("¡Hola! Soy SCALL, tu asistente local. ¿En qué puedo ayudarte hoy?")
  },
  {
    name: "hora",
    description: "Pedir la hora (Ej: '¿Qué hora es?')",
    match: (c) => c.includes('hora es') || c.includes('dime la hora') || c.includes('qué hora'),
    action: () => {
      const now = new Date();
      const horas = now.getHours() === 0 ? 12 : (now.getHours() > 12 ? now.getHours() - 12 : now.getHours());
      const ampm = now.getHours() >= 12 ? 'de la tarde' : 'de la mañana';
      responderVoz(`Son las ${horas} con ${now.getMinutes()} minutos ${ampm}.`);
    }
  },
  {
    name: "fecha",
    description: "Pedir la fecha (Ej: '¿Qué día es hoy?')",
    match: (c) => c.includes('qué día es') || c.includes('fecha de hoy') || c.includes('día es hoy'),
    action: () => {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      responderVoz(`Hoy es ${new Date().toLocaleDateString('es-ES', options)}.`);
    }
  },
  {
    name: "clima",
    description: "Consultar el clima (Ej: '¿Cómo está el clima?')",
    match: (c) => c.includes('clima') || c.includes('tiempo hace') || c.includes('lloverá'),
    action: () => responderVoz("Como estoy operando en modo local sin acceso a internet, te sugiero mirar por la ventana. ¡Seguro hace un día excelente!")
  },
  {
    name: "chiste",
    description: "Pedir un chiste (Ej: 'Cuéntame un chiste')",
    match: (c) => c.includes('chiste') || c.includes('broma') || c.includes('hazme reír'),
    action: () => {
      const chistes = [
        "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.",
        "¿Qué le dice un bit al otro? Nos vemos en el bus.",
        "Hay 10 tipos de personas: las que saben binario y las que no.",
        "¿Cuál es el animal más antiguo? La cebra, porque está en blanco y negro."
      ];
      responderVoz(chistes[Math.floor(Math.random() * chistes.length)]);
    }
  },
  {
    name: "despedida",
    description: "Despedirse (Ej: 'Adiós')",
    match: (c) => c.includes('adiós') || c.includes('hasta luego') || c.includes('chao') || c.includes('nos vemos'),
    action: () => responderVoz("¡Hasta luego! Estaré aquí escuchando por si me necesitas de nuevo.")
  },

  // ── Luces ─────────────────────────────────────────────────────────────
  {
    name: "encender_luz_sala",
    description: "Encender luces de la sala",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && c.includes('sala'),
    action: () => { enviarComandoMQTT('casa/sala/luces', 'ON'); responderVoz('Encendiendo las luces de la sala.'); }
  },
  {
    name: "apagar_luz_sala",
    description: "Apagar luces de la sala",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && c.includes('sala'),
    action: () => { enviarComandoMQTT('casa/sala/luces', 'OFF'); responderVoz('Apagando las luces de la sala.'); }
  },
  {
    name: "encender_luz_cuarto",
    description: "Encender luces del cuarto",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && c.includes('cuarto'),
    action: () => { enviarComandoMQTT('casa/cuarto/luces', 'ON'); responderVoz('Encendiendo las luces del cuarto.'); }
  },
  {
    name: "apagar_luz_cuarto",
    description: "Apagar luces del cuarto",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && c.includes('cuarto'),
    action: () => { enviarComandoMQTT('casa/cuarto/luces', 'OFF'); responderVoz('Apagando las luces del cuarto.'); }
  },
  {
    name: "encender_luz_general",
    description: "Encender todas las luces",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && !c.includes('sala') && !c.includes('cuarto'),
    action: () => { enviarComandoMQTT('casa/general/luces', 'ON'); responderVoz('Encendiendo las luces.'); }
  },
  {
    name: "apagar_luz_general",
    description: "Apagar todas las luces",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && !c.includes('sala') && !c.includes('cuarto'),
    action: () => { enviarComandoMQTT('casa/general/luces', 'OFF'); responderVoz('Apagando las luces.'); }
  },

  // ── TV ────────────────────────────────────────────────────────────────
  {
    name: "encender_tv",
    description: "Encender la televisión",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('tele') || c.includes('tv') || c.includes('televisor')),
    action: () => { enviarComandoMQTT('casa/sala/tv', 'ON'); responderVoz('Encendiendo el televisor.'); }
  },
  {
    name: "apagar_tv",
    description: "Apagar la televisión",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('tele') || c.includes('tv') || c.includes('televisor')),
    action: () => { enviarComandoMQTT('casa/sala/tv', 'OFF'); responderVoz('Televisor apagado.'); }
  },

  // ── Persianas ─────────────────────────────────────────────────────────
  {
    name: "abrir_persianas",
    description: "Abrir persianas",
    match: (c) => (c.includes('abre') || c.includes('abrir') || c.includes('subir') || c.includes('sube')) && (c.includes('persiana') || c.includes('cortina')),
    action: () => { enviarComandoMQTT('casa/persianas', 'OPEN'); responderVoz('Abriendo las persianas.'); }
  },
  {
    name: "cerrar_persianas",
    description: "Cerrar persianas",
    match: (c) => (c.includes('cierra') || c.includes('cerrar') || c.includes('bajar') || c.includes('baja')) && (c.includes('persiana') || c.includes('cortina')),
    action: () => { enviarComandoMQTT('casa/persianas', 'CLOSE'); responderVoz('Cerrando las persianas.'); }
  },

  // ── Música (YouTube) ──────────────────────────────────────────────────
  {
    name: "musica_play_query",
    description: "Poner una canción o artista (Ej: 'Pon Bad Bunny', 'Reproduce Queen')",
    match: (c) => {
      const triggers = ['pon ', 'reproduce ', 'busca ', 'quiero escuchar ', 'ponme '];
      return triggers.some(t => c.startsWith(t)) && !c.includes('radio') && !c.includes('emisora') && !c.includes('podcast');
    },
    action: (comando) => {
      const triggers = ['quiero escuchar ', 'reproduce ', 'busca ', 'ponme ', 'pon '];
      let query = comando;
      for (const t of triggers) {
        if (comando.startsWith(t)) { query = comando.slice(t.length); break; }
      }
      query = query.replace(/^(música de |música del |algo de |canciones de |canción de )/i, '').trim();
      if (typeof reproducirMusica === 'function') reproducirMusica(query || 'música popular');
    }
  },
  {
    name: "musica_play",
    description: "Reproducir música genérica (Ej: 'Pon música')",
    match: (c) => (c === 'pon música' || c === 'reproducir música' || c.includes('pon algo de música')) && !c.includes('radio'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música popular'); }
  },
  {
    name: "musica_stop",
    description: "Pausar música (Ej: 'Pausa', 'Detén la música')",
    match: (c) => (c.includes('detén') || c.includes('parar música') || c.includes('apaga la música') || c.includes('pausa') || c.includes('detener')) && !c.includes('radio'),
    action: () => { if (typeof pausarMusica === 'function') pausarMusica(); }
  },
  {
    name: "musica_reanudar",
    description: "Reanudar música (Ej: 'Continúa la música')",
    match: (c) => (c.includes('continúa') || c.includes('reanuda') || c.includes('sigue la música')) && !c.includes('radio'),
    action: () => { if (typeof reanudarMusica === 'function') reanudarMusica(); }
  },
  {
    name: "musica_next",
    description: "Siguiente canción (Ej: 'Siguiente', 'Pon otra')",
    match: (c) => (c.includes('siguiente') || c.includes('pon otra') || c.includes('cambia de canción') || c.includes('otra canción')) && !c.includes('radio') && !c.includes('emisora'),
    action: () => { if (typeof siguienteMusica === 'function') siguienteMusica(); }
  },
  {
    name: "musica_anterior",
    description: "Canción anterior",
    match: (c) => (c.includes('anterior') || c.includes('la de antes')) && !c.includes('radio') && !c.includes('emisora'),
    action: () => { if (typeof anteriorMusica === 'function') anteriorMusica(); }
  },
  {
    name: "musica_volumen_subir",
    description: "Subir volumen",
    match: (c) => (c.includes('sube') || c.includes('aumenta') || c.includes('más volumen')) && c.includes('volumen'),
    action: () => { if (typeof subirVolumen === 'function') subirVolumen(); }
  },
  {
    name: "musica_volumen_bajar",
    description: "Bajar volumen",
    match: (c) => (c.includes('baja') || c.includes('reduce') || c.includes('menos volumen')) && c.includes('volumen'),
    action: () => { if (typeof bajarVolumen === 'function') bajarVolumen(); }
  },

  // ── Radio ─────────────────────────────────────────────────────────────
  {
    name: "radio_play",
    description: "Sintonizar emisora (Ej: 'Pon Caracol', 'Sintoniza W Radio', 'Abre La FM', 'Pon Blu')",
    match: (c) => {
      // Nombres exactos de emisoras — matchea aunque no digan "radio" ni "emisora"
      const NOMBRES_EMISORAS = [
        'w radio', 'caracol', 'rcn', 'blu radio', 'blu', 'la fm',
        'los 40', 'oxígeno', 'tropicana', 'rumba', 'olímpica', 'olimpica',
        'amor stereo', 'amor estéreo', 'candela', 'radio uno', 'javeriana',
        'un radio', 'radio nacional', 'todelar'
      ];
      const triggers = ['pon ', 'sintoniza ', 'abre ', 'reproduce ', 'ponme ', 'coloca ', 'quiero escuchar '];
      const palabrasGeneral = ['radio', 'emisora', 'fm'];

      // Matchea si tiene trigger + nombre de emisora conocida
      const tieneTrigger   = triggers.some(t => c.includes(t));
      const tieneNombre    = NOMBRES_EMISORAS.some(n => c.includes(n));
      const tieneGeneral   = palabrasGeneral.some(p => c.includes(p));

      return tieneTrigger && (tieneNombre || tieneGeneral);
    },
    action: (comando) => {
      const triggers = ['quiero escuchar ', 'sintoniza ', 'ponme ', 'coloca ', 'abre ', 'reproduce ', 'pon '];
      let query = comando;
      for (const t of triggers) {
        if (comando.includes(t)) { query = comando.split(t)[1]; break; }
      }
      query = query.replace(/\b(la|el|una|un|por favor|música de|algo de)\b/gi, '').trim();
      if (typeof reproducirEmisora === 'function') reproducirEmisora(query);
      else responderVoz('Módulo de radio no disponible.');
    }
  },
  {
    name: "radio_stop",
    description: "Apagar la radio (Ej: 'Apaga la radio', 'Para la emisora')",
    match: (c) =>
      (c.includes('apaga') || c.includes('para') || c.includes('detén') || c.includes('detener') || c.includes('apagar')) &&
      (c.includes('radio') || c.includes('emisora')),
    action: () => {
      if (typeof detenerRadio === 'function') detenerRadio(true);
      responderVoz('Radio apagada.');
    }
  },
  {
    name: "radio_siguiente",
    description: "Siguiente emisora (Ej: 'Cambia de emisora', 'Otra radio')",
    match: (c) =>
      (c.includes('siguiente') || c.includes('cambia') || c.includes('otra emisora') || c.includes('otra radio')) &&
      (c.includes('radio') || c.includes('emisora')),
    action: () => { if (typeof radioSiguiente === 'function') radioSiguiente(); }
  },
  {
    name: "radio_anterior",
    description: "Emisora anterior (Ej: 'Vuelve a la anterior')",
    match: (c) => c.includes('anterior') && (c.includes('radio') || c.includes('emisora')),
    action: () => { if (typeof radioAnterior === 'function') radioAnterior(); }
  },
  {
    name: "radio_lista",
    description: "Ver emisoras disponibles (Ej: '¿Qué emisoras tienes?')",
    match: (c) =>
      c.includes('qué emisoras') || c.includes('cuáles emisoras') ||
      c.includes('lista de radio') || c.includes('emisoras tienes') || c.includes('qué radios'),
    action: () => { if (typeof listarEmisoras === 'function') listarEmisoras(); }
  },

  // ── Podcast ───────────────────────────────────────────────────────────
  {
    name: "podcast_play",
    description: "Reproducir podcast (Ej: 'Pon el podcast de tecnología')",
    match: (c) => c.includes('podcast'),
    action: (comando) => {
      const query = comando.replace(/podcast/gi, '').replace(/\b(pon|reproduce|busca|ponme)\b/gi, '').trim();
      if (typeof reproducirMusica === 'function') {
        reproducirMusica('podcast ' + (query || 'tecnología'));
      }
    }
  },

  // ── SOS ───────────────────────────────────────────────────────────────
  {
    name: "sos_activar",
    description: "Activar alerta de emergencia (Ej: 'Ayuda', 'Emergencia', 'SOS')",
    match: (c) =>
      c.includes('ayuda') || c.includes('emergencia') || c.includes('sos') ||
      c.includes('auxilio') || c.includes('llama a') || c.includes('me caí') ||
      c.includes('me siento mal') || c.includes('estoy mal'),
    action: () => {
      if (typeof activarSOS === 'function') activarSOS();
      else responderVoz('Módulo SOS no disponible.');
    }
  },
  {
    name: "sos_cancelar",
    description: "Cancelar alerta SOS (Ej: 'Cancela la alerta', 'Estoy bien')",
    match: (c) =>
      (c.includes('cancela') || c.includes('cancelar') || c.includes('estoy bien') || c.includes('falsa alarma')) &&
      (c.includes('alerta') || c.includes('sos') || c.includes('emergencia') || c.includes('estoy bien')),
    action: () => {
      if (typeof cancelarSOS === 'function') cancelarSOS();
    }
  },
  {
    name: "sos_contactos",
    description: "Gestionar contactos de emergencia (Ej: 'Contactos de emergencia')",
    match: (c) =>
      (c.includes('contacto') || c.includes('emergencia')) &&
      (c.includes('sos') || c.includes('emergencia') || c.includes('agregar')),
    action: () => {
      if (typeof abrirModalSOS === 'function') abrirModalSOS();
    }
  },

  // ── Cumpleaños ────────────────────────────────────────────────────────
  {
    name: "cumpleanos_abrir",
    description: "Abrir agenda de cumpleaños (Ej: 'Abre los cumpleaños')",
    match: (c) => c.includes('cumpleaños') || c.includes('cumpleanos') || c.includes('agenda de fechas'),
    action: () => {
      if (typeof abrirModalCumpleanos === 'function') abrirModalCumpleanos();
      else responderVoz('Módulo de cumpleaños no disponible.');
    }
  },
  {
    name: "cumpleanos_hoy",
    description: "Ver cumpleaños de hoy (Ej: '¿Hay cumpleaños hoy?')",
    match: (c) => (c.includes('cumpleaños') || c.includes('cumpleanos')) && (c.includes('hoy') || c.includes('hay')),
    action: () => {
      if (typeof chequearCumpleanos !== 'function') { responderVoz('Módulo no disponible.'); return; }
      const hoy  = new Date();
      const lista = getCumpleanos().filter(c => c.dia === hoy.getDate() && c.mes === hoy.getMonth() + 1);
      if (lista.length === 0) responderVoz('No hay cumpleaños hoy.');
      else responderVoz(`Hoy cumplen años: ${lista.map(c => c.nombre).join(' y ')}.`);
    }
  },
  {
    name: "cumpleanos_proximo",
    description: "Ver próximo cumpleaños (Ej: '¿Cuál es el próximo cumpleaños?')",
    match: (c) => (c.includes('próximo') || c.includes('siguiente')) && (c.includes('cumpleaños') || c.includes('cumpleanos')),
    action: () => {
      if (typeof getCumpleanos !== 'function') return;
      const hoy   = new Date();
      const lista = getCumpleanos();
      if (lista.length === 0) { responderVoz('No tienes cumpleaños guardados.'); return; }
      const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const conFecha = lista.map(c => {
        let fecha = new Date(hoy.getFullYear(), c.mes - 1, c.dia);
        if (fecha < hoy) fecha.setFullYear(hoy.getFullYear() + 1);
        return { ...c, proxFecha: fecha };
      }).sort((a, b) => a.proxFecha - b.proxFecha);
      const prox = conFecha[0];
      const dias = Math.ceil((prox.proxFecha - hoy) / 86400000);
      responderVoz(`El próximo cumpleaños es de ${prox.nombre}, el ${prox.dia} de ${MESES[prox.mes]}. Faltan ${dias} días.`);
    }
  },

  // ── Clima ─────────────────────────────────────────────────────────────
  {
    name: "clima_consultar",
    description: "Consultar el clima (Ej: '¿Cómo está el clima?', 'Temperatura en Medellín')",
    match: (c) =>
      c.includes('clima') || c.includes('temperatura') || c.includes('tiempo hace') ||
      c.includes('lloverá') || c.includes('va a llover') || c.includes('hace frío') ||
      c.includes('hace calor') || c.includes('pronóstico'),
    action: (comando) => {
      const ciudades = ['bogotá','medellín','cali','barranquilla','cartagena','bucaramanga','pereira','manizales','cúcuta','ibagué'];
      const ciudad = ciudades.find(c => comando.includes(c));
      if (typeof consultarClima === 'function') consultarClima(ciudad);
      else responderVoz('Módulo de clima no disponible.');
    }
  },

  // ── Noticias ──────────────────────────────────────────────────────────
  {
    name: "noticias_consultar",
    description: "Ver noticias de Colombia (Ej: 'Dime las noticias', 'Qué pasó hoy')",
    match: (c) =>
      c.includes('noticias') || c.includes('qué pasó') || c.includes('novedades') ||
      c.includes('titulares') || c.includes('actualidad'),
    action: (comando) => {
      let cat = 'general';
      if (comando.includes('tecnología') || comando.includes('tech')) cat = 'tecnologia';
      else if (comando.includes('economía') || comando.includes('economia')) cat = 'economia';
      else if (comando.includes('deporte')) cat = 'deportes';
      else if (comando.includes('bogotá') || comando.includes('bogota')) cat = 'bogota';
      if (typeof consultarNoticias === 'function') consultarNoticias(cat);
      else responderVoz('Módulo de noticias no disponible.');
    }
  },
  {
    name: "noticias_siguiente",
    description: "Siguiente noticia (Ej: 'Siguiente noticia', 'La siguiente')",
    match: (c) => (c.includes('siguiente') || c.includes('otra noticia') || c.includes('la siguiente')) && c.includes('noticia'),
    action: () => { if (typeof siguienteNoticia === 'function') siguienteNoticia(); }
  },

  // ── Traductor ─────────────────────────────────────────────────────────
  {
    name: "traducir",
    description: "Traducir texto (Ej: 'Traduce hola al inglés', 'Cómo se dice gracias en francés')",
    match: (c) =>
      c.includes('traduce') || c.includes('traducir') || c.includes('cómo se dice') ||
      c.includes('en inglés') || c.includes('en francés') || c.includes('en portugués') ||
      c.includes('en alemán') || c.includes('en italiano'),
    action: (comando) => {
      if (typeof traducirTexto === 'function') traducirTexto(comando);
      else responderVoz('Módulo de traducción no disponible.');
    }
  },

  // ── Alarmas ───────────────────────────────────────────────────────────
  {
    name: "alarma_crear",
    description: "Poner alarma (Ej: 'Pon alarma a las 7', 'Despiértame a las 6 de la mañana')",
    match: (c) =>
      (c.includes('alarma') || c.includes('despiértame') || c.includes('despiertame')) &&
      (c.includes('las ') || c.includes('a las')),
    action: (comando) => {
      if (typeof parsearAlarmaVoz !== 'function') { responderVoz('Módulo de alarmas no disponible.'); return; }
      const alarma = parsearAlarmaVoz(comando);
      if (alarma) crearAlarma(alarma);
      else responderVoz('No entendí la hora. Di por ejemplo: pon alarma a las 7 y 30 de la mañana.');
    }
  },
  {
    name: "recordatorio_crear",
    description: "Crear recordatorio (Ej: 'Recuérdame la reunión a las 3')",
    match: (c) => (c.includes('recuérdame') || c.includes('recuerda') || c.includes('recordatorio')) && c.includes('las'),
    action: (comando) => {
      if (typeof parsearAlarmaVoz !== 'function') { responderVoz('Módulo no disponible.'); return; }
      const alarma = parsearAlarmaVoz(comando);
      if (alarma) crearAlarma({ ...alarma, tipo: 'recordatorio' });
      else responderVoz('No entendí la hora del recordatorio.');
    }
  },
  {
    name: "medicamento_recordatorio",
    description: "Recordatorio de medicamento (Ej: 'Recuérdame tomar la pastilla a las 8')",
    match: (c) =>
      (c.includes('medicamento') || c.includes('pastilla') || c.includes('medicina') || c.includes('tomar')) &&
      (c.includes('las') || c.includes('recordatorio')),
    action: (comando) => {
      if (typeof parsearAlarmaVoz !== 'function') { responderVoz('Módulo no disponible.'); return; }
      const alarma = parsearAlarmaVoz(comando);
      if (alarma) crearAlarma({ ...alarma, tipo: 'medicamento', mensaje: 'Es hora de tomar tu medicamento.' });
      else responderVoz('No entendí la hora. Di: recuérdame tomar la pastilla a las 8 de la mañana.');
    }
  },

  // ── Temporizador ──────────────────────────────────────────────────────
  {
    name: "timer_iniciar",
    description: "Iniciar temporizador (Ej: 'Pon un timer de 5 minutos', 'Temporizador 30 segundos')",
    match: (c) =>
      (c.includes('timer') || c.includes('temporizador') || c.includes('cuenta regresiva')) &&
      (c.includes('minuto') || c.includes('segundo') || c.includes('hora')),
    action: (comando) => {
      if (typeof parsearTimer !== 'function') { responderVoz('Módulo no disponible.'); return; }
      const seg = parsearTimer(comando);
      if (seg > 0) iniciarTimer(seg);
      else responderVoz('No entendí el tiempo. Di por ejemplo: pon timer de 5 minutos.');
    }
  },
  {
    name: "timer_cancelar",
    description: "Cancelar temporizador (Ej: 'Cancela el timer')",
    match: (c) => (c.includes('cancela') || c.includes('para') || c.includes('detén')) && (c.includes('timer') || c.includes('temporizador')),
    action: () => { if (typeof cancelarTimer === 'function') cancelarTimer(); }
  },

  // ── Cronómetro ────────────────────────────────────────────────────────
  {
    name: "cronometro_iniciar",
    description: "Iniciar cronómetro (Ej: 'Inicia el cronómetro', 'Pon el cronómetro')",
    match: (c) => c.includes('cronómetro') || c.includes('cronometro'),
    action: (comando) => {
      if (typeof iniciarCronometro !== 'function') { responderVoz('Módulo no disponible.'); return; }
      if (comando.includes('pausa') || comando.includes('para'))  { pausarCronometro(); }
      else if (comando.includes('reinicia') || comando.includes('reset')) { reiniciarCronometro(); }
      else if (comando.includes('cuánto') || comando.includes('tiempo lleva')) { leerCronometro(); }
      else { iniciarCronometro(); }
    }
  }
];
