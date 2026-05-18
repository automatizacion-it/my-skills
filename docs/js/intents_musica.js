// ================================================================
// intents_musica.js — Intents de música para SCALL
// Carga este archivo en index.html ANTES de intents.js
// <script src="js/intents_musica.js"></script>
// ================================================================

const intentsMúsica = [

  // ── Reproducir música genérica ──────────────────────────────────
  {
    name: "musica_play",
    description: "Reproducir música (Ej: 'Pon música', 'Coloca algo de música')",
    match: (c) => {
      const triggers = [
        'pon música', 'ponme música', 'coloca música', 'coloca algo de música',
        'reproduce música', 'reproducir música', 'quiero escuchar música',
        'dame música', 'toca algo', 'toca música', 'pon algo de música',
        'pon musica', 'ponme musica', 'coloca musica', 'reproduce musica'
      ];
      return triggers.some(t => c.includes(t)) && !c.includes('radio') && !c.includes('emisora') && !c.includes('podcast');
    },
    action: () => {
      if (typeof reproducirMusica === 'function') reproducirMusica('música popular');
    }
  },

  // ── Reproducir por query (artista, género, canción) ──────────────
  {
    name: "musica_play_query",
    description: "Poner artista o género (Ej: 'Pon Bad Bunny', 'Pon música electrónica')",
    match: (c) => {
      if (c.includes('radio') || c.includes('emisora') || c.includes('podcast')) return false;
      const triggers = [
        'pon ', 'ponme ', 'reproduce ', 'coloca ', 'busca ',
        'quiero escuchar ', 'dame ', 'toca '
      ];
      const hasTrigger = triggers.some(t => c.includes(t));
      // Evitar que coincida con "pon música" a secas (eso lo maneja musica_play)
      const isGeneric = ['pon música','ponme música','pon musica','ponme musica',
                         'coloca música','coloca musica','reproduce música','reproduce musica',
                         'quiero escuchar música','quiero escuchar musica'].includes(c.trim());
      return hasTrigger && !isGeneric;
    },
    action: (comando) => {
      const triggers = [
        'quiero escuchar ', 'reproduce ', 'coloca ', 'busca ', 'ponme ', 'dame ', 'toca ', 'pon '
      ];
      let query = comando;
      for (const t of triggers) {
        if (comando.includes(t)) { query = comando.split(t).slice(1).join(t); break; }
      }
      // Limpiar prefijos innecesarios
      query = query
        .replace(/^(música de |música del |música para |algo de |canciones de |canción de |la canción |el hit de |musica de |musica para |algo de )/i, '')
        .replace(/\b(por favor|porfavor)\b/gi, '')
        .trim();
      if (typeof reproducirMusica === 'function') reproducirMusica(query || 'música popular');
    }
  },

  // ── Géneros específicos ──────────────────────────────────────────
  {
    name: "musica_electronica",
    description: "Poner música electrónica (Ej: 'Pon música electrónica', 'Pon música eléctrica')",
    match: (c) => !c.includes('radio') && (c.includes('electrónica') || c.includes('electronica') || c.includes('eléctrica') || c.includes('electrica') || c.includes('electronic')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música electrónica'); }
  },
  {
    name: "musica_relajante",
    description: "Poner música relajante (Ej: 'Pon algo relajante', 'Música para dormir')",
    match: (c) => !c.includes('radio') && (c.includes('relajante') || c.includes('relajar') || c.includes('dormir') || c.includes('tranquil') || c.includes('calma') || c.includes('ambient')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música relajante ambient'); }
  },
  {
    name: "musica_trabajar",
    description: "Música para trabajar o estudiar",
    match: (c) => !c.includes('radio') && (c.includes('trabajar') || c.includes('estudiar') || c.includes('concentrar') || c.includes('trabajo') || c.includes('estudio') || c.includes('focus')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música para trabajar concentración'); }
  },
  {
    name: "musica_ejercicio",
    description: "Música para ejercitarse",
    match: (c) => !c.includes('radio') && (c.includes('ejercicio') || c.includes('ejercitar') || c.includes('entrenar') || c.includes('gym') || c.includes('correr') || c.includes('deporte')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música para entrenar gym workout'); }
  },
  {
    name: "musica_salsa",
    description: "Poner salsa (Ej: 'Pon salsa', 'Quiero escuchar salsa')",
    match: (c) => !c.includes('radio') && c.includes('salsa') && !c.includes('picante'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('salsa colombiana clásica'); }
  },
  {
    name: "musica_vallenato",
    description: "Poner vallenato",
    match: (c) => !c.includes('radio') && c.includes('vallenato'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('vallenato colombiano'); }
  },
  {
    name: "musica_reggaeton",
    description: "Poner reggaeton",
    match: (c) => !c.includes('radio') && (c.includes('reggaeton') || c.includes('reguetón') || c.includes('regueton')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('reggaeton hits 2024'); }
  },
  {
    name: "musica_cumbia",
    description: "Poner cumbia",
    match: (c) => !c.includes('radio') && c.includes('cumbia'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('cumbia colombiana popular'); }
  },
  {
    name: "musica_pop",
    description: "Poner pop",
    match: (c) => !c.includes('radio') && (c.includes(' pop') || c.includes('música pop')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('pop hits 2024'); }
  },
  {
    name: "musica_rock",
    description: "Poner rock",
    match: (c) => !c.includes('radio') && c.includes('rock'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('rock clásico hits'); }
  },
  {
    name: "musica_jazz",
    description: "Poner jazz",
    match: (c) => !c.includes('radio') && c.includes('jazz'),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('jazz suave instrumental'); }
  },
  {
    name: "musica_romantica",
    description: "Poner música romántica",
    match: (c) => !c.includes('radio') && (c.includes('románti') || c.includes('romantica') || c.includes('romantic') || c.includes('amor')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música romántica en español'); }
  },
  {
    name: "musica_instrumental",
    description: "Poner música instrumental",
    match: (c) => !c.includes('radio') && (c.includes('instrumental') || c.includes('sin letra') || c.includes('sin cantante')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música instrumental piano'); }
  },
  {
    name: "musica_popular",
    description: "Poner música popular / hits",
    match: (c) => !c.includes('radio') && (c.includes('popular') || c.includes('éxitos') || c.includes('exitos') || c.includes('hits') || c.includes('lo mejor')),
    action: () => { if (typeof reproducirMusica === 'function') reproducirMusica('música popular hits 2024'); }
  },

  // ── Pausar ───────────────────────────────────────────────────────
  {
    name: "musica_stop",
    description: "Pausar música (Ej: 'Pausa', 'Para la música', 'Apaga eso')",
    match: (c) => {
      if (c.includes('radio') || c.includes('emisora')) return false;
      return c.includes('pausa') || c.includes('pausar') ||
             c.includes('para la música') || c.includes('para la musica') ||
             c.includes('para la canción') || c.includes('para la cancion') ||
             c.includes('detén la música') || c.includes('deten la musica') ||
             c.includes('detener la música') || c.includes('detener la musica') ||
             c.includes('apaga la música') || c.includes('apaga la musica') ||
             c.includes('apaga el reproductor') || c.includes('silencia la música') ||
             c.includes('silencia la musica') || c.includes('para eso') ||
             (c.includes('detén') && !c.includes('radio')) ||
             (c.includes('parar') && c.includes('música'));
    },
    action: () => { if (typeof pausarMusica === 'function') pausarMusica(); }
  },

  // ── Reanudar ─────────────────────────────────────────────────────
  {
    name: "musica_reanudar",
    description: "Reanudar música (Ej: 'Continúa', 'Sigue la música')",
    match: (c) => {
      if (c.includes('radio') || c.includes('emisora')) return false;
      return c.includes('continúa') || c.includes('continua') ||
             c.includes('reanuda') || c.includes('sigue la música') ||
             c.includes('sigue la musica') || c.includes('sigue tocando') ||
             c.includes('reproduce de nuevo') || c.includes('vuelve a poner');
    },
    action: () => { if (typeof reanudarMusica === 'function') reanudarMusica(); }
  },

  // ── Siguiente ────────────────────────────────────────────────────
  {
    name: "musica_next",
    description: "Siguiente canción (Ej: 'Siguiente', 'Pon otra', 'Skip')",
    match: (c) => {
      if (c.includes('radio') || c.includes('emisora')) return false;
      return c.includes('siguiente') || c.includes('pon otra') ||
             c.includes('cambia de canción') || c.includes('cambia de cancion') ||
             c.includes('otra canción') || c.includes('otra cancion') ||
             c.includes('pasa la canción') || c.includes('pasa la cancion') ||
             c.includes('salta esta') || c.includes('no me gusta esta') ||
             c === 'skip' || c.includes('skip canción') || c.includes('skip cancion');
    },
    action: () => { if (typeof siguienteMusica === 'function') siguienteMusica(); }
  },

  // ── Anterior ─────────────────────────────────────────────────────
  {
    name: "musica_anterior",
    description: "Canción anterior (Ej: 'Anterior', 'La de antes')",
    match: (c) => {
      if (c.includes('radio') || c.includes('emisora')) return false;
      return c.includes('anterior') || c.includes('la de antes') ||
             c.includes('vuelve a la anterior') || c.includes('regresa la canción') ||
             c.includes('regresa la cancion') || c.includes('vuelve atrás') ||
             c === 'atrás' || c === 'atras';
    },
    action: () => { if (typeof anteriorMusica === 'function') anteriorMusica(); }
  },

  // ── Volumen ──────────────────────────────────────────────────────
  {
    name: "musica_volumen_subir",
    description: "Subir volumen (Ej: 'Sube el volumen', 'Más fuerte')",
    match: (c) =>
      (c.includes('sube') || c.includes('aumenta') || c.includes('más volumen') ||
       c.includes('mas volumen') || c.includes('sube la música') || c.includes('más fuerte') ||
       c.includes('mas fuerte') || c.includes('pon más volumen') || c.includes('pon mas volumen')) &&
      (c.includes('volumen') || c.includes('música') || c.includes('musica') || c.includes('fuerte')),
    action: () => { if (typeof subirVolumen === 'function') subirVolumen(); }
  },
  {
    name: "musica_volumen_bajar",
    description: "Bajar volumen (Ej: 'Baja el volumen', 'Más suave')",
    match: (c) =>
      (c.includes('baja') || c.includes('reduce') || c.includes('menos volumen') ||
       c.includes('baja la música') || c.includes('más suave') || c.includes('mas suave') ||
       c.includes('pon menos volumen')) &&
      (c.includes('volumen') || c.includes('música') || c.includes('musica') || c.includes('suave')),
    action: () => { if (typeof bajarVolumen === 'function') bajarVolumen(); }
  },

  // ── Podcast ──────────────────────────────────────────────────────
  {
    name: "podcast_play",
    description: "Reproducir podcast (Ej: 'Pon un podcast de tecnología')",
    match: (c) => c.includes('podcast'),
    action: (comando) => {
      const query = comando
        .replace(/podcast/gi, '')
        .replace(/\b(pon|reproduce|busca|ponme|coloca|quiero escuchar)\b/gi, '')
        .trim();
      if (typeof reproducirMusica === 'function') {
        reproducirMusica('podcast ' + (query || 'tecnología'));
      }
    }
  }

];

// ── Mezclar con los intents globales si ya existen ──────────────────
// Esto permite cargar intents_musica.js antes que intents.js
if (typeof intents !== 'undefined') {
  // Reemplazar los intents de música que ya existen en intents.js
  const nombresMusica = intentsMúsica.map(i => i.name);
  const intentsBase = intents.filter(i => !nombresMusica.includes(i.name));
  intents.splice(0, intents.length, ...intentsMúsica, ...intentsBase);
} else {
  // Si intents.js aún no cargó, dejar los intents de música listos
  // intents.js los tomará al inicializar
  window._intentsMusicaPreload = intentsMúsica;
}
