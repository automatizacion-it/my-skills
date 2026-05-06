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
    description: "Sintonizar emisora (Ej: 'Pon W Radio', 'Sintoniza Caracol', 'Abre La FM')",
    match: (c) => {
      const triggers = ['pon ', 'sintoniza ', 'abre ', 'reproduce ', 'ponme ', 'coloca '];
      const palabras = ['radio', 'emisora', 'fm', 'caracol', 'rcn', 'los 40',
                        'la fm', 'blu', 'olímpica', 'tropicana', 'rumba',
                        'amor', 'candela', 'javeriana', 'nacional', 'todelar', 'oxígeno'];
      return triggers.some(t => c.includes(t)) && palabras.some(p => c.includes(p));
    },
    action: (comando) => {
      const triggers = ['sintoniza ', 'ponme ', 'coloca ', 'abre ', 'reproduce ', 'pon '];
      let query = comando;
      for (const t of triggers) {
        if (comando.includes(t)) { query = comando.split(t)[1]; break; }
      }
      query = query.replace(/\b(la|el|una|un|por favor)\b/gi, '').trim();
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
  }
];
