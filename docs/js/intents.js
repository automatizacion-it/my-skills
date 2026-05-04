// Definición de todos los intents locales disponibles
const intents = [
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
      const chisteElegido = chistes[Math.floor(Math.random() * chistes.length)];
      responderVoz(chisteElegido);
    }
  },
  {
    name: "encender_luz_sala",
    description: "Encender luces de la sala",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && c.includes('sala'),
    action: () => {
      enviarComandoMQTT('casa/sala/luces', 'ON');
      responderVoz('Encendiendo las luces de la sala principal.');
    }
  },
  {
    name: "apagar_luz_sala",
    description: "Apagar luces de la sala",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && c.includes('sala'),
    action: () => {
      enviarComandoMQTT('casa/sala/luces', 'OFF');
      responderVoz('Apagando las luces de la sala. Que descanses.');
    }
  },
  {
    name: "encender_luz_cuarto",
    description: "Encender luces del cuarto",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && c.includes('cuarto'),
    action: () => {
      enviarComandoMQTT('casa/cuarto/luces', 'ON');
      responderVoz('Encendiendo las luces del cuarto.');
    }
  },
  {
    name: "apagar_luz_cuarto",
    description: "Apagar luces del cuarto",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && c.includes('cuarto'),
    action: () => {
      enviarComandoMQTT('casa/cuarto/luces', 'OFF');
      responderVoz('Apagando las luces del cuarto.');
    }
  },
  {
    name: "encender_luz_general",
    description: "Encender todas las luces",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('luz') || c.includes('luces')) && !c.includes('sala') && !c.includes('cuarto'),
    action: () => {
      enviarComandoMQTT('casa/general/luces', 'ON');
      responderVoz('Encendiendo las luces.');
    }
  },
  {
    name: "apagar_luz_general",
    description: "Apagar todas las luces",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('luz') || c.includes('luces')) && !c.includes('sala') && !c.includes('cuarto'),
    action: () => {
      enviarComandoMQTT('casa/general/luces', 'OFF');
      responderVoz('Apagando las luces.');
    }
  },
  {
    name: "encender_tv",
    description: "Encender la televisión",
    match: (c) => (c.includes('encender') || c.includes('prende')) && (c.includes('tele') || c.includes('tv') || c.includes('televisor')),
    action: () => {
      enviarComandoMQTT('casa/sala/tv', 'ON');
      responderVoz('Encendiendo el televisor. Disfruta tu programa.');
    }
  },
  {
    name: "apagar_tv",
    description: "Apagar la televisión",
    match: (c) => (c.includes('apagar') || c.includes('apaga')) && (c.includes('tele') || c.includes('tv') || c.includes('televisor')),
    action: () => {
      enviarComandoMQTT('casa/sala/tv', 'OFF');
      responderVoz('Televisor apagado.');
    }
  },
  {
    name: "musica_play_query",
    description: "Poner una canción o artista (Ej: 'Pon Bad Bunny', 'Pon reggaetón')",
    match: (c) => {
      const triggers = ['pon ', 'reproduce ', 'busca ', 'quiero escuchar ', 'ponme '];
      const musicWords = ['música', 'canción', 'song', 'audio', 'tema'];
      // Si incluye un trigger Y NO es solo "pon música" genérico
      return triggers.some(t => c.startsWith(t)) && !musicWords.every(w => c.includes(w) && c.replace(w,'').trim().length < 5);
    },
    action: (comando) => {
      // Extraer lo que sigue después del trigger
      const triggers = ['quiero escuchar ', 'reproduce ', 'busca ', 'ponme ', 'pon '];
      let query = comando;
      for (const t of triggers) {
        if (comando.startsWith(t)) { query = comando.slice(t.length); break; }
      }
      // Limpiar palabras genéricas
      query = query.replace(/\b(música|una canción|algo de|por favor)\b/gi, '').trim();
      if (typeof reproducirMusica === 'function') {
        reproducirMusica(query || 'música popular');
      }
    }
  },
  {
    name: "musica_play",
    description: "Reproducir música genérica (Ej: 'Pon música')",
    match: (c) => c.includes('pon música') || c.includes('reproducir música') || c.includes('pon algo de música') || c === 'música',
    action: () => {
      if (typeof reproducirMusica === 'function') reproducirMusica('música popular');
    }
  },
  {
    name: "musica_stop",
    description: "Pausar música (Ej: 'Detén la música', 'Pausa')",
    match: (c) => c.includes('detén') || c.includes('parar música') || c.includes('apaga la música') || c.includes('pausa') || c.includes('detener'),
    action: () => {
      if (typeof pausarMusica === 'function') pausarMusica();
    }
  },
  {
    name: "musica_reanudar",
    description: "Reanudar música (Ej: 'Continúa la música')",
    match: (c) => c.includes('continúa') || c.includes('reanuda') || c.includes('sigue la música'),
    action: () => {
      if (typeof reanudarMusica === 'function') reanudarMusica();
    }
  },
  {
    name: "musica_next",
    description: "Siguiente canción (Ej: 'Pon otra', 'Siguiente')",
    match: (c) => c.includes('siguiente') || c.includes('pon otra') || c.includes('cambia de canción') || c.includes('otra canción'),
    action: () => {
      if (typeof siguienteMusica === 'function') siguienteMusica();
    }
  },
  {
    name: "musica_anterior",
    description: "Canción anterior (Ej: 'Canción anterior')",
    match: (c) => c.includes('anterior') || c.includes('la de antes') || c.includes('vuelve a la'),
    action: () => {
      if (typeof anteriorMusica === 'function') anteriorMusica();
    }
  },
  {
    name: "musica_volumen_subir",
    description: "Subir volumen (Ej: 'Sube el volumen')",
    match: (c) => (c.includes('sube') || c.includes('aumenta') || c.includes('más volumen')) && c.includes('volumen'),
    action: () => {
      if (typeof subirVolumen === 'function') subirVolumen();
    }
  },
  {
    name: "musica_volumen_bajar",
    description: "Bajar volumen (Ej: 'Baja el volumen')",
    match: (c) => (c.includes('baja') || c.includes('reduce') || c.includes('menos volumen')) && c.includes('volumen'),
    action: () => {
      if (typeof bajarVolumen === 'function') bajarVolumen();
    }
  },
  {
    name: "abrir_persianas",
    description: "Abrir persianas",
    match: (c) => (c.includes('abre') || c.includes('abrir') || c.includes('subir') || c.includes('sube')) && (c.includes('persiana') || c.includes('cortina')),
    action: () => {
      enviarComandoMQTT('casa/persianas', 'OPEN');
      responderVoz('Abriendo las persianas para dejar entrar la luz.');
    }
  },
  {
    name: "cerrar_persianas",
    description: "Cerrar persianas",
    match: (c) => (c.includes('cierra') || c.includes('cerrar') || c.includes('bajar') || c.includes('baja')) && (c.includes('persiana') || c.includes('cortina')),
    action: () => {
      enviarComandoMQTT('casa/persianas', 'CLOSE');
      responderVoz('Cerrando las persianas para mayor privacidad.');
    }
  },
  {
    name: "despedida",
    description: "Despedirse (Ej: 'Adiós')",
    match: (c) => c.includes('adiós') || c.includes('hasta luego') || c.includes('chao') || c.includes('nos vemos'),
    action: () => responderVoz("¡Hasta luego! Estaré aquí escuchando por si me necesitas de nuevo.")
  }
];
