// ================================================================
// intents_rutas.js — Sistema de navegación SCALL
//
// FLUJO:
// 1. Primera vez → IA narra toda la ruta y la guarda
// 2. Siguientes veces → ejecución local SIN IA (más rápido)
// 3. Palabras clave múltiples → una frase activa el intent
// ================================================================

var intentsRutas = [

  // ══════════════════════════════════════════════════════════════
  // INTENT MAESTRO — narración completa con IA
  // Detecta trigger de navegación + extrae destino
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_narrar_completa',
    description: 'Ruta completa con narración IA — abre menú, dice origen, destino, tiempo y novedades',
    // Palabras que activan este intent (se puede ampliar con más frases)
    triggers: [
      'llevame a','llevame al','llevame hasta','llevame donde',
      'navega a','navega al','navega hasta',
      'ruta a','ruta al','ruta hacia','ruta hasta',
      'como llego a','como llego al',
      'ir a','ir al','ir hasta','ir donde',
      'quiero ir a','quiero ir al',
      'dirigeme a','dirigeme al',
      'abrir navegacion a','iniciar ruta a',
      'lleva al cliente','ruta al cliente',
      'lleva a la empresa','ruta a la empresa',
    ],
    match: function(c) {
      return this.triggers.some(function(t) { return c.includes(t); });
    },
    action: function(c) {
      var self   = this;
      var destino = c;

      // Extraer destino quitando el trigger
      for (var i = 0; i < self.triggers.length; i++) {
        var t = self.triggers[i];
        if (c.includes(t)) {
          destino = c.split(t).slice(1).join(t).trim();
          break;
        }
      }

      // Limpiar artículos y muletillas
      destino = destino
        .replace(/^(la|el|los|las|un|una|al|a)\s+/gi, '')
        .replace(/\s*(por favor|porfavor)$/gi, '')
        .trim();

      if (destino.length < 2) {
        // Sin destino — abrir panel para que el usuario escriba
        if (typeof sideMenuActivar === 'function') {
          var btn = document.getElementById('smNavegacion');
          if (btn) sideMenuActivar(btn);
        }
        if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
        if (typeof responderVoz === 'function')
          responderVoz('Abriendo navegación. ¿A dónde quieres ir?');
        return;
      }

      // Verificar si ya existe intent guardado localmente
      if (typeof buscarIntentRutaLocal === 'function') {
        var guardado = buscarIntentRutaLocal(c);
        if (!guardado) guardado = buscarIntentRutaLocal(destino);

        if (guardado) {
          // ── Ruta conocida → ejecución LOCAL sin IA ──
          if (typeof ejecutarRutaLocal === 'function') {
            ejecutarRutaLocal(guardado);
          }
          if (typeof logMessage === 'function')
            logMessage('[RUTAS] Intent local (guardado): ' + guardado.destino);
          return;
        }
      }

      // ── Primera vez → narración completa CON IA ──
      if (typeof narrarRutaCompleta === 'function') {
        narrarRutaCompleta(destino, c);
      } else if (typeof navegarA === 'function') {
        navegarA(destino);
      }
    }
  },

  // ══════════════════════════════════════════════════════════════
  // ABRIR NAVEGACIÓN SIN DESTINO
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_abrir_navegacion',
    description: 'Abrir menú de navegación (Ej: "Navegación", "Abre el mapa")',
    match: function(c) {
      return c === 'navegacion' || c === 'abrir navegacion' ||
             c === 'ir a navegacion' || c === 'abre navegacion' ||
             c === 'abre el mapa' || c === 'ver mapa' ||
             c === 'abrir mapa' || c === 'mapa' ||
             c === 'ver navegacion' || c === 'mostrar mapa';
    },
    action: function() {
      if (typeof sideMenuActivar === 'function') {
        var btn = document.getElementById('smNavegacion');
        if (btn) sideMenuActivar(btn);
      }
      if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (typeof responderVoz === 'function')
        responderVoz('Abriendo navegación. Di la dirección de destino.');
    }
  },

  // ══════════════════════════════════════════════════════════════
  // INFORMAR RUTA ACTIVA
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_informar',
    description: 'Informar distancia y tiempo de ruta activa',
    match: function(c) {
      var triggers = [
        'cuanto tarda','cuanto demora','cuanto falta','cuanto tiempo',
        'a que distancia','que tan lejos','cuanto hay de',
        'distancia al destino','tiempo de viaje','tiempo de ruta',
        'cuanto es el recorrido','informame la ruta','info de ruta',
        'cuanto me demoro','cuanto me tarda'
      ];
      return triggers.some(function(t) { return c.includes(t); });
    },
    action: function() {
      if (typeof informarRutaVoz === 'function') informarRutaVoz();
    }
  },

  // ══════════════════════════════════════════════════════════════
  // DESTINOS FRECUENTES
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_destinos_frecuentes',
    description: 'Listar destinos guardados frecuentes',
    match: function(c) {
      return c.includes('destinos frecuentes') || c.includes('mis destinos') ||
             c.includes('donde voy seguido')   || c.includes('destinos guardados') ||
             c.includes('lugares frecuentes')  || c.includes('mis lugares') ||
             c.includes('rutas guardadas');
    },
    action: function() {
      if (typeof listarDestinosRecurrentesVoz === 'function')
        listarDestinosRecurrentesVoz();
      if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
    }
  },

  // ══════════════════════════════════════════════════════════════
  // ABRIR EN GOOGLE MAPS
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_google_maps',
    description: 'Abrir ruta en Google Maps nativo',
    match: function(c) {
      return c.includes('google maps') || c.includes('google map') ||
             (c.includes('abrir') && c.includes('maps')) ||
             c.includes('abrir en maps');
    },
    action: function() {
      if (typeof abrirEnGoogleMaps === 'function') abrirEnGoogleMaps();
    }
  },

  // ══════════════════════════════════════════════════════════════
  // GPS / UBICACIÓN ACTUAL
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_mi_ubicacion',
    description: 'Usar ubicación GPS actual como origen',
    match: function(c) {
      return c.includes('mi ubicacion') || c.includes('donde estoy') ||
             c.includes('actualiza mi posicion') || c.includes('usar gps') ||
             c.includes('detecta mi ubicacion') || c.includes('mi posicion actual');
    },
    action: function() {
      if (typeof mostrarPanelRutas === 'function') mostrarPanelRutas();
      if (typeof usarMiUbicacion === 'function') usarMiUbicacion();
    }
  },

  // ══════════════════════════════════════════════════════════════
  // CERRAR MAPA
  // ══════════════════════════════════════════════════════════════
  {
    name: 'ruta_cerrar',
    description: 'Cerrar el panel de navegación',
    match: function(c) {
      return (c.includes('cierra') || c.includes('oculta') || c.includes('cerrar')) &&
             (c.includes('mapa') || c.includes('ruta') || c.includes('navegacion'));
    },
    action: function() {
      if (typeof cerrarPanelRutas === 'function') cerrarPanelRutas();
      if (typeof responderVoz === 'function') responderVoz('Mapa cerrado.');
    }
  }

];

// ── Integrar con el array global de intents ──────────────────────────
(function integrarIntentsRutas() {
  var nombres = intentsRutas.map(function(i) { return i.name; });
  if (typeof intents !== 'undefined') {
    var base = intents.filter(function(i) { return !nombres.includes(i.name); });
    intents.splice(0, intents.length);
    for (var i = 0; i < intentsRutas.length; i++) intents.push(intentsRutas[i]);
    for (var j = 0; j < base.length; j++) intents.push(base[j]);
  } else {
    window._intentsRutasPreload = intentsRutas;
  }
})();
