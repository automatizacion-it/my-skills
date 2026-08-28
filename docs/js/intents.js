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
    description: "Consultar el clima (Ej: 'Clima Bogotá', 'Temperatura Medellín')",
    match: (c) => c.includes('clima') || c.includes('temperatura') || c.includes('tiempo hace') || c.includes('lloverá') || c.includes('pronóstico'),
    action: (cmd) => {
      const mapa = {'bogotá':'Bogota,CO','bogota':'Bogota,CO','medellín':'Medellin,CO','medellin':'Medellin,CO','cali':'Cali,CO','barranquilla':'Barranquilla,CO','cartagena':'Cartagena,CO','bucaramanga':'Bucaramanga,CO','pereira':'Pereira,CO','manizales':'Manizales,CO'};
      const ciudad = Object.entries(mapa).find(([k])=>cmd.includes(k));
      if (typeof consultarClima === 'function') { consultarClima(ciudad?ciudad[1]:null); togglePanel('climaPanel'); }
      else responderVoz('Módulo de clima no disponible.');
    }
  },
  // ── Noticias ──────────────────────────────────────────────────────────
  {
    name: "noticias_consultar",
    description: "Ver noticias (Ej: 'Dime las noticias', 'Titulares')",
    match: (c) => c.includes('noticias') || c.includes('qué pasó') || c.includes('titulares') || c.includes('actualidad'),
    action: () => {
      togglePanel('noticiasPanel');
      if (typeof consultarNoticias === 'function') consultarNoticias('general');
      else responderVoz('Abriendo noticias.');
    }
  },
  // ── Traductor ─────────────────────────────────────────────────────────
  {
    name: "traducir",
    description: "Traducir texto (Ej: 'Traduce hola al inglés')",
    match: (c) => c.includes('traduce') || c.includes('traducir') || c.includes('cómo se dice') || c.includes('en inglés') || c.includes('en francés'),
    action: (cmd) => {
      if (typeof traducirTexto === 'function') traducirTexto(cmd);
      else { togglePanel('tradPanel'); responderVoz('Abriendo traductor.'); }
    }
  },
  // ── Alarmas ───────────────────────────────────────────────────────────
  {
    name: "alarma_crear",
    description: "Poner alarma (Ej: 'Alarma a las 7', 'Despiértame a las 6')",
    match: (c) => (c.includes('alarma')||c.includes('despiértame')||c.includes('despiertame')) && c.includes('las'),
    action: (cmd) => { const a=parsearAlarmaVoz(cmd); if(a) crearAlarma(a); else { togglePanel('alarmaPanel'); responderVoz('Abriendo alarmas.'); } }
  },
  {
    name: "recordatorio_crear",
    description: "Recordatorio (Ej: 'Recuérdame reunión a las 3')",
    match: (c) => (c.includes('recuérdame')||c.includes('recordatorio')) && c.includes('las'),
    action: (cmd) => { const a=parsearAlarmaVoz(cmd); if(a) crearAlarma({...a,tipo:'recordatorio'}); else togglePanel('alarmaPanel'); }
  },
  {
    name: "medicamento",
    description: "Recordatorio medicamento (Ej: 'Pastilla a las 8')",
    match: (c) => (c.includes('medicamento')||c.includes('pastilla')||c.includes('medicina')) && c.includes('las'),
    action: (cmd) => { const a=parsearAlarmaVoz(cmd); if(a) crearAlarma({...a,tipo:'medicamento',mensaje:'Toma tu medicamento.'}); else togglePanel('alarmaPanel'); }
  },
  // ── Timer / Cronómetro ────────────────────────────────────────────────
  {
    name: "timer_iniciar",
    description: "Temporizador (Ej: 'Timer 5 minutos', '30 segundos')",
    match: (c) => (c.includes('timer')||c.includes('temporizador')||c.includes('cuenta regresiva')) && (c.includes('minuto')||c.includes('segundo')||c.includes('hora')),
    action: (cmd) => { const s=parsearTimer(cmd); if(s>0) iniciarTimer(s); else responderVoz('Di: timer de 5 minutos.'); }
  },
  {
    name: "cronometro",
    description: "Cronómetro (Ej: 'Inicia cronómetro', 'Pausa cronómetro')",
    match: (c) => c.includes('cronómetro')||c.includes('cronometro'),
    action: (cmd) => {
      if(cmd.includes('pausa')||cmd.includes('para')) pausarCronometro();
      else if(cmd.includes('reinicia')||cmd.includes('reset')) reiniciarCronometro();
      else if(cmd.includes('cuánto')) leerCronometro();
      else iniciarCronometro();
    }
  },
  // ── Corpus ────────────────────────────────────────────────────────────
  {
    name: "corpus_ver",
    description: "Ver corpus de entrenamiento",
    match: (c) => c.includes('corpus')||c.includes('frases no reconocidas')||c.includes('log de intents'),
    action: () => { togglePanel('corpusPanel'); responderVoz('Abriendo corpus.'); }
  },
  // ── Sismos ────────────────────────────────────────────────────────────
  {
    name: "sismo_activar",
    description: "Activar monitoreo sísmico (Ej: 'Activa el monitoreo sísmico')",
    match: (c) => !c.includes('desactiv') && (c.includes('activa')||c.includes('enciende')||c.includes('prende')) && (c.includes('monitoreo sísmico')||c.includes('monitoreo sismico')||c.includes('alertas de sismo')||c.includes('alerta sísmica')||c.includes('alerta sismica')),
    action: () => { if (typeof activarMonitoreoSismico === 'function') activarMonitoreoSismico(); }
  },
  {
    name: "sismo_desactivar",
    description: "Desactivar monitoreo sísmico (Ej: 'Desactiva el monitoreo sísmico')",
    match: (c) => (c.includes('desactiva')||c.includes('apaga')) && (c.includes('monitoreo sísmico')||c.includes('monitoreo sismico')||c.includes('alertas de sismo')||c.includes('alerta sísmica')||c.includes('alerta sismica')),
    action: () => { if (typeof desactivarMonitoreoSismico === 'function') desactivarMonitoreoSismico(); }
  },
  {
    name: "sismo_simular",
    description: "Simular un sismo de prueba (Ej: 'Simula un sismo')",
    match: (c) => (c.includes('simula')||c.includes('simular')||c.includes('prueba')) && (c.includes('sismo')||c.includes('terremoto')||c.includes('sísmic')||c.includes('sismic')),
    action: () => { if (typeof simularSismo === 'function') simularSismo(); }
  },
  {
    name: "sismo_panel",
    description: "Ver panel de sismos (Ej: 'Muéstrame los sismos')",
    match: (c) => (c.includes('sismo')||c.includes('terremoto')||c.includes('sísmic')||c.includes('sismic')) && (c.includes('muestra')||c.includes('muéstrame')||c.includes('abre')||c.includes('ver')||c.includes('panel')),
    action: () => { if (typeof abrirPanelSismos === 'function') abrirPanelSismos(); }
  }
];

// ── Fusionar los intents de música (intents_musica.js, carga ANTES que
// este archivo) — sus versiones reemplazan a las que tengan el mismo
// nombre aquí arriba, y se agregan las que solo existen allá (géneros
// específicos: electrónica, salsa, vallenato, etc.) ──
if (window._intentsMusicaPreload) {
  const nombresMusica = window._intentsMusicaPreload.map(i => i.name);
  const base = intents.filter(i => !nombresMusica.includes(i.name));
  intents.splice(0, intents.length, ...window._intentsMusicaPreload, ...base);
}
