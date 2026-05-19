// ================================================================
// intents_rutas.js — Intents de navegación para SCALL
//
// Carga en index.html ANTES de intents.js:
//   <script src="js/rutas.js"></script>
//   <script src="js/intents_rutas.js"></script>
//   <script src="js/intents.js"></script>
// ================================================================

const intentsRutas = [

  // ── Navegar a una dirección dicha por voz ──────────────────────────
  {
    name: 'ruta_navegar',
    description: 'Abrir ruta (Ej: "Llévame a Calle 80", "Navega a Av. Boyacá 123", "Ruta al aeropuerto")',
    match: (c) => {
      const triggers = [
        'llevame a ','llevame al ','llevame hasta ','llevame donde ',
        'navega a ','navega al ','navega hasta ',
        'ruta a ','ruta al ','ruta hasta ','ruta hacia ',
        'como llego a ','como llego al ','como llego hasta ',
        'ir a ','ir al ','ir hasta ','ir donde ',
        'donde queda ','donde esta ','ubicacion de ',
        'dirigeme a ','dirigeme al ',
        'muestra ruta','ver ruta','abre el mapa',
        'muestra el mapa','mostrar mapa',
        'quiero ir a ','quiero ir al ',
      ];
      return triggers.some(t => c.includes(t));
    },
    action: (c) => {
      // Extraer destino quitando el trigger
      const triggers = [
        'llevame a ','llevame al ','llevame hasta ','llevame donde ',
        'navega a ','navega al ','navega hasta ',
        'ruta a ','ruta al ','ruta hasta ','ruta hacia ',
        'como llego a ','como llego al ','como llego hasta ',
        'ir a ','ir al ','ir hasta ','ir donde ',
        'donde queda ','donde esta ','ubicacion de ',
        'dirigeme a ','dirigeme al ',
        'quiero ir a ','quiero ir al ',
      ];

      let destino = c;
      for (const t of triggers) {
        if (c.includes(t)) {
          destino = c.split(t).slice(1).join(t).trim();
          break;
        }
      }

      // Limpiar muletillas
      destino = destino
        .replace(/^(la|el|los|las|un|una|por favor|porfavor)\s/gi, '')
        .replace(/\s*(por favor|porfavor)$/gi, '')
        .trim();

      if (destino.length < 3) {
        if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
        if (typeof responderVoz === 'function')
          responderVoz('Abriendo el mapa. Escribe la dirección a donde quieres ir.');
        return;
      }

      if (typeof navegarA === 'function') navegarA(destino);
      else if (typeof responderVoz === 'function')
        responderVoz('Módulo de rutas no disponible.');
    }
  },

  // ── Solo abrir el mapa sin destino ───────────────────────────────
  {
    name: 'ruta_abrir_mapa',
    description: 'Abrir mapa (Ej: "Abre el mapa", "Muestra el mapa")',
    match: (c) =>
      (c === 'abre el mapa' || c === 'muestra el mapa' ||
       c === 'mostrar mapa' || c === 'ver mapa' ||
       c === 'abrir mapa'  || c === 'mapa'),
    action: () => {
      if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (typeof responderVoz === 'function')
        responderVoz('Abriendo el mapa. Escribe o di la dirección de destino.');
    }
  },

  // ── Cerrar el mapa ───────────────────────────────────────────────
  {
    name: 'ruta_cerrar',
    description: 'Cerrar mapa',
    match: (c) =>
      (c.includes('cierra') || c.includes('oculta') || c.includes('cerrar')) &&
      (c.includes('mapa') || c.includes('ruta') || c.includes('navegacion')),
    action: () => {
      if (typeof cerrarPanelRutas === 'function') cerrarPanelRutas();
      if (typeof responderVoz === 'function') responderVoz('Mapa cerrado.');
    }
  },

  // ── Abrir en Google Maps ─────────────────────────────────────────
  {
    name: 'ruta_google_maps',
    description: 'Abrir en Google Maps (Ej: "Abre en Google Maps", "Ver en Google Maps")',
    match: (c) =>
      c.includes('google maps') || c.includes('google map') ||
      (c.includes('abrir') && c.includes('maps')),
    action: () => {
      if (typeof abrirEnGoogleMaps === 'function') abrirEnGoogleMaps();
      else if (typeof responderVoz === 'function')
        responderVoz('No hay ruta activa para abrir en Google Maps.');
    }
  },

  // ── Usar ubicación GPS actual ─────────────────────────────────────
  {
    name: 'ruta_mi_ubicacion',
    description: 'Actualizar mi ubicación GPS',
    match: (c) =>
      (c.includes('mi ubicacion') || c.includes('donde estoy') ||
       c.includes('actualiza mi posicion') || c.includes('usar gps') ||
       c.includes('detecta mi ubicacion')),
    action: () => {
      if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (typeof usarMiUbicacion === 'function') usarMiUbicacion();
    }
  },


  // ── Informe de ruta activa ────────────────────────────────────────
  {
    name: 'ruta_informar',
    description: 'Informar distancia y tiempo de ruta activa (Ej: "¿Cuánto tarda?", "¿A qué distancia está?", "¿Cuánto falta?")',
    match: (c) => {
      const triggers = [
        'cuanto tarda','cuanto demora','cuanto falta','cuanto tiempo',
        'a que distancia','que tan lejos','cuanto hay','cuanto queda',
        'distancia al destino','tiempo de viaje','tiempo de ruta',
        'cuanto es el recorrido','informame la ruta','info de ruta',
        'cuanto me demoro','cuanto me tarda'
      ];
      return triggers.some(t => c.includes(t));
    },
    action: () => {
      if (typeof informarRutaVoz === 'function') informarRutaVoz();
      else if (typeof responderVoz === 'function')
        responderVoz('Módulo de rutas no disponible.');
    }
  },

  // ── Destinos frecuentes ──────────────────────────────────────────
  {
    name: 'ruta_destinos_frecuentes',
    description: 'Ver destinos frecuentes (Ej: "¿A dónde voy seguido?", "Mis destinos")',
    match: (c) =>
      c.includes('destinos frecuentes') || c.includes('mis destinos') ||
      c.includes('donde voy seguido') || c.includes('destinos guardados') ||
      c.includes('lugares frecuentes') || c.includes('mis lugares'),
    action: () => {
      if (typeof listarDestinosRecurrentesVoz === 'function') listarDestinosRecurrentesVoz();
      else if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
    }
  },

  // ── Configurar punto de inicio (casa) ─────────────────────────────
  {
    name: 'ruta_configurar_casa',
    description: 'Configurar dirección de casa como punto de partida',
    match: (c) =>
      (c.includes('mi casa es') || c.includes('mi casa queda') ||
       c.includes('punto de partida') || c.includes('salgo desde') ||
       c.includes('configura mi casa') || c.includes('mi casa esta en')),
    action: (c) => {
      if (typeof usarMiUbicacion === 'function') {
        if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
        usarMiUbicacion();
      } else if (typeof responderVoz === 'function') {
        responderVoz('Abre el mapa y presiona el botón de ubicación GPS para actualizar tu punto de partida.');
      }
    }
  }

];

// ── Integrar con intents globales ─────────────────────────────────────
(function integrarIntentsRutas() {
  const nombres = intentsRutas.map(i => i.name);
  if (typeof intents !== 'undefined') {
    const base = intents.filter(i => !nombres.includes(i.name));
    intents.splice(0, intents.length, ...intentsRutas, ...base);
  } else {
    window._intentsRutasPreload = intentsRutas;
  }
})();
