// =====================================================================
// INTENTS DE RADIO — Agregar dentro del array intents[] en intents.js
// =====================================================================

  {
    name: "radio_play",
    description: "Sintonizar una emisora (Ej: 'Pon W Radio', 'Sintoniza Caracol')",
    match: (c) => {
      const triggers = ['pon ', 'sintoniza ', 'abre ', 'reproduce ', 'ponme ', 'coloca '];
      const palabras = ['radio', 'emisora', 'fm', 'caracol', 'rcn', 'los 40',
                        'la fm', 'blu', 'olímpica', 'tropicana', 'rumba',
                        'amor', 'candela', 'javeriana', 'nacional', 'todelar', 'oxígeno'];
      return triggers.some(t => c.includes(t)) && palabras.some(p => c.includes(p));
    },
    action: (comando) => {
      // Quitar el trigger del comando para quedarse con el nombre de la emisora
      const triggers = ['sintoniza ', 'ponme ', 'coloca ', 'abre ', 'reproduce ', 'pon '];
      let query = comando;
      for (const t of triggers) {
        if (comando.includes(t)) { query = comando.split(t)[1]; break; }
      }
      query = query.replace(/\b(la|el|una|un|por favor)\b/gi, '').trim();
      reproducirEmisora(query);
    }
  },

  {
    name: "radio_stop",
    description: "Apagar la radio (Ej: 'Apaga la radio', 'Para la emisora')",
    match: (c) =>
      (c.includes('apaga') || c.includes('para') || c.includes('detén') ||
       c.includes('detener') || c.includes('apagar')) &&
      (c.includes('radio') || c.includes('emisora')),
    action: () => {
      detenerRadio(true);
      responderVoz('Radio apagada.');
    }
  },

  {
    name: "radio_siguiente",
    description: "Siguiente emisora (Ej: 'Cambia de emisora', 'Siguiente radio')",
    match: (c) =>
      (c.includes('siguiente') || c.includes('cambia') || c.includes('otra emisora') || c.includes('otra radio')),
    action: () => { radioSiguiente(); }
  },

  {
    name: "radio_anterior",
    description: "Emisora anterior (Ej: 'Vuelve a la anterior')",
    match: (c) =>
      c.includes('anterior') && (c.includes('radio') || c.includes('emisora')),
    action: () => { radioAnterior(); }
  },

  {
    name: "radio_lista",
    description: "Listar emisoras disponibles (Ej: '¿Qué emisoras tienes?')",
    match: (c) =>
      (c.includes('qué emisoras') || c.includes('cuáles emisoras') ||
       c.includes('lista de radio') || c.includes('emisoras tienes') ||
       c.includes('qué radios')),
    action: () => { listarEmisoras(); }
  },

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
