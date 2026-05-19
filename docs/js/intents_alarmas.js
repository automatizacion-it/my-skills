// ================================================================
// intents_alarmas.js — Intents de alarmas para SCALL
// Guard contra doble carga + sin const en scope global
// ================================================================

if (window._SCALL_INTENTS_ALARMAS_LOADED) {
  console.warn('[INTENTS_ALARMAS] Ya cargado');
} else {
window._SCALL_INTENTS_ALARMAS_LOADED = true;

// Meses en español — función helper (no const global)
function _tieneMesAlarma(frase) {
  return ['enero','febrero','marzo','abril','mayo','junio',
          'julio','agosto','septiembre','octubre','noviembre','diciembre']
    .some(function(m) { return frase.includes(m); });
}

var intentsAlarmas = [

  // ── Alarmas ────────────────────────────────────────────────────
  {
    name: 'alarma_crear',
    description: 'Crear alarma simple sin fecha específica',
    match: function(c) {
      // Si tiene mes → Claude lo maneja (extrae día+mes+hora correctamente)
      if (_tieneMesAlarma(c)) return false;
      var triggers = ['alarma','despiertame','despertarme','despierta',
                      'levantame','levantarme','pon alarma','ponme alarma','crea alarma'];
      return triggers.some(function(t) { return c.includes(t); }) && /\d{1,2}/.test(c);
    },
    action: function(c) {
      var datos = typeof parsearAlarmaVoz === 'function' ? parsearAlarmaVoz(c) : null;
      if (datos) {
        if (typeof sincronizarUIDesdeVoz === 'function') sincronizarUIDesdeVoz(datos);
        setTimeout(function() { if (typeof crearAlarma === 'function') crearAlarma(datos); }, 400);
      } else {
        if (typeof togglePanel === 'function') togglePanel('alarmaPanel');
        if (typeof responderVoz === 'function') responderVoz('Abriendo alarmas. ¿A qué hora la pongo?');
      }
    }
  },

  {
    name: 'alarma_listar',
    description: 'Ver alarmas activas',
    match: function(c) {
      return (c.includes('alarma') || c.includes('alarmas')) &&
             (c.includes('que tengo') || c.includes('cuales') || c.includes('mis alarmas') ||
              c.includes('lista') || c.includes('ver') || c.includes('mostrar'));
    },
    action: function() {
      if (typeof listarAlarmasPorVoz === 'function') listarAlarmasPorVoz();
    }
  },

  {
    name: 'alarma_cancelar_todas',
    description: 'Cancelar todas las alarmas',
    match: function(c) {
      return (c.includes('cancela') || c.includes('elimina') || c.includes('borra')) &&
              c.includes('alarma') && (c.includes('todas') || c.includes('todo'));
    },
    action: function() {
      if (typeof cancelarTodasAlarmas === 'function') cancelarTodasAlarmas();
    }
  },

  {
    name: 'alarma_abrir_panel',
    description: 'Abrir panel de alarmas',
    match: function(c) {
      return (c.includes('abrir alarma') || c.includes('abre alarma') ||
              c.includes('panel de alarma') || c.includes('gestionar alarma')) &&
             !/\d{1,2}/.test(c);
    },
    action: function() {
      if (typeof togglePanel === 'function') togglePanel('alarmaPanel');
      if (typeof responderVoz === 'function') responderVoz('Abriendo panel de alarmas.');
    }
  },

  // ── Recordatorios ──────────────────────────────────────────────
  {
    name: 'recordatorio_crear',
    description: 'Crear recordatorio sin fecha específica',
    match: function(c) {
      if (_tieneMesAlarma(c)) return false;
      var triggers = ['recuerdame','recordatorio','recuerda que','avisame','notificame'];
      return triggers.some(function(t) { return c.includes(t); }) && /\d{1,2}/.test(c);
    },
    action: function(c) {
      var datos = typeof parsearAlarmaVoz === 'function' ? parsearAlarmaVoz(c) : null;
      if (datos) {
        var d = Object.assign({}, datos, { tipo: 'recordatorio' });
        if (typeof sincronizarUIDesdeVoz === 'function') sincronizarUIDesdeVoz(d);
        setTimeout(function() { if (typeof crearAlarma === 'function') crearAlarma(d); }, 400);
      } else {
        if (typeof responderVoz === 'function') responderVoz('No entendí la hora.');
      }
    }
  },

  {
    name: 'recordatorio_diario',
    description: 'Recordatorio que se repite cada día',
    match: function(c) {
      if (_tieneMesAlarma(c)) return false;
      var esRepetitivo = c.includes('todos los dias') || c.includes('cada dia') ||
                         c.includes('diario') || c.includes('siempre a las');
      return esRepetitivo && /\d{1,2}/.test(c);
    },
    action: function(c) {
      var datos = typeof parsearAlarmaVoz === 'function' ? parsearAlarmaVoz(c) : null;
      if (datos) {
        var d = Object.assign({}, datos, { repetir: true });
        if (typeof sincronizarUIDesdeVoz === 'function') sincronizarUIDesdeVoz(d);
        setTimeout(function() { if (typeof crearAlarma === 'function') crearAlarma(d); }, 400);
      }
    }
  },

  // ── Medicamentos ───────────────────────────────────────────────
  {
    name: 'medicamento_crear',
    description: 'Recordatorio de medicamento sin fecha',
    match: function(c) {
      if (_tieneMesAlarma(c)) return false;
      var esMed = c.includes('pastilla') || c.includes('medicamento') ||
                  c.includes('medicina') || c.includes('jarabe') || c.includes('dosis');
      return esMed && /\d{1,2}/.test(c);
    },
    action: function(c) {
      var datos = typeof parsearAlarmaVoz === 'function' ? parsearAlarmaVoz(c) : null;
      if (datos) {
        var d = Object.assign({}, datos, { tipo: 'medicamento' });
        if (typeof sincronizarUIDesdeVoz === 'function') sincronizarUIDesdeVoz(d);
        setTimeout(function() { if (typeof crearAlarma === 'function') crearAlarma(d); }, 400);
      }
    }
  },

  {
    name: 'medicamento_diario',
    description: 'Medicamento diario sin fecha específica',
    match: function(c) {
      if (_tieneMesAlarma(c)) return false;
      var esMed = c.includes('pastilla') || c.includes('medicamento') ||
                  c.includes('medicina') || c.includes('jarabe') || c.includes('dosis');
      var esDiario = c.includes('todos los dias') || c.includes('cada dia') || c.includes('diario');
      return esMed && esDiario && /\d{1,2}/.test(c);
    },
    action: function(c) {
      var datos = typeof parsearAlarmaVoz === 'function' ? parsearAlarmaVoz(c) : null;
      if (datos) {
        var d = Object.assign({}, datos, { tipo: 'medicamento', repetir: true });
        if (typeof sincronizarUIDesdeVoz === 'function') sincronizarUIDesdeVoz(d);
        setTimeout(function() { if (typeof crearAlarma === 'function') crearAlarma(d); }, 400);
      }
    }
  },

  // ── Timer y cronómetro ─────────────────────────────────────────
  {
    name: 'timer_iniciar',
    description: 'Iniciar temporizador',
    match: function(c) {
      return (c.includes('timer') || c.includes('temporizador') || c.includes('cuenta regresiva')) &&
             (c.includes('minuto') || c.includes('segundo') || c.includes('hora'));
    },
    action: function(c) {
      var s = typeof parsearTimer === 'function' ? parsearTimer(c) : 0;
      if (s > 0) { if (typeof iniciarTimer === 'function') iniciarTimer(s); }
      else { if (typeof responderVoz === 'function') responderVoz('Di: timer de 5 minutos.'); }
    }
  },

  {
    name: 'timer_cancelar',
    description: 'Cancelar temporizador',
    match: function(c) {
      return (c.includes('cancela') || c.includes('para') || c.includes('detener')) &&
             (c.includes('timer') || c.includes('temporizador'));
    },
    action: function() { if (typeof cancelarTimer === 'function') cancelarTimer(); }
  },

  {
    name: 'cronometro_iniciar',
    description: 'Iniciar cronómetro',
    match: function(c) {
      return (c.includes('cronometro') || c.includes('cronómetro')) &&
             !c.includes('para') && !c.includes('pausa') && !c.includes('cuanto') &&
             !c.includes('reinicia') && !c.includes('reset');
    },
    action: function() { if (typeof iniciarCronometro === 'function') iniciarCronometro(); }
  },

  {
    name: 'cronometro_pausar',
    description: 'Pausar cronómetro',
    match: function(c) {
      return (c.includes('cronometro') || c.includes('cronómetro')) &&
             (c.includes('pausa') || c.includes('para') || c.includes('detener'));
    },
    action: function() { if (typeof pausarCronometro === 'function') pausarCronometro(); }
  },

  {
    name: 'cronometro_reiniciar',
    description: 'Reiniciar cronómetro',
    match: function(c) {
      return (c.includes('cronometro') || c.includes('cronómetro')) &&
             (c.includes('reinicia') || c.includes('reset') || c.includes('cero'));
    },
    action: function() { if (typeof reiniciarCronometro === 'function') reiniciarCronometro(); }
  },

  {
    name: 'cronometro_leer',
    description: 'Leer tiempo del cronómetro',
    match: function(c) {
      return (c.includes('cronometro') || c.includes('cronómetro')) &&
             (c.includes('cuanto') || c.includes('tiempo lleva'));
    },
    action: function() { if (typeof leerCronometro === 'function') leerCronometro(); }
  },

  // ── SOS ────────────────────────────────────────────────────────
  {
    name: 'sos_activar',
    description: 'Activar alerta SOS',
    match: function(c) {
      return c.includes('auxilio') || c.includes('emergencia') || c.includes('sos') ||
             c.includes('me cai') || c.includes('me caí') || c.includes('me siento mal') ||
             c.includes('estoy mal') || c.includes('accidente');
    },
    action: function() {
      if (typeof activarSOS === 'function') activarSOS();
      else if (typeof responderVoz === 'function') responderVoz('Módulo SOS no disponible.');
    }
  },

  {
    name: 'sos_cancelar',
    description: 'Cancelar alerta SOS',
    match: function(c) {
      return (c.includes('cancela') || c.includes('estoy bien') || c.includes('falsa alarma')) &&
             (c.includes('sos') || c.includes('alerta') || c === 'estoy bien');
    },
    action: function() { if (typeof cancelarSOS === 'function') cancelarSOS(); }
  },

  {
    name: 'sos_contactos',
    description: 'Gestionar contactos SOS',
    match: function(c) {
      return c.includes('contacto') && (c.includes('emergencia') || c.includes('sos'));
    },
    action: function() { if (typeof abrirModalSOS === 'function') abrirModalSOS(); }
  }

];

// ── Integrar con array global ─────────────────────────────────────
(function integrarIntentsAlarmas() {
  var nombres = intentsAlarmas.map(function(i) { return i.name; });
  if (typeof intents !== 'undefined') {
    var base = intents.filter(function(i) { return !nombres.includes(i.name); });
    intents.splice(0, intents.length);
    for (var i = 0; i < intentsAlarmas.length; i++) intents.push(intentsAlarmas[i]);
    for (var j = 0; j < base.length; j++) intents.push(base[j]);
  } else {
    window._intentsAlarmasPreload = intentsAlarmas;
  }
})();

} // fin guard
