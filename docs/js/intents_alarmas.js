// ================================================================
// intents_alarmas.js — Intents de alarmas, recordatorios,
// medicamentos, temporizador, cronómetro y SOS para SCALL
//
// Carga ANTES de intents.js en index.html:
//   <script src="js/intents_alarmas.js"></script>
//   <script src="js/intents.js"></script>
// ================================================================

const intentsAlarmas = [

  // ══════════════════════════════════════════════════════════════
  // ALARMAS
  // ══════════════════════════════════════════════════════════════
  {
    name: 'alarma_crear',
    description: 'Crear alarma (Ej: "Pon alarma a las 7", "Despiértame a las 6 de la mañana")',
    match: (c) => {
      const triggers = ['alarma','despiertame','despertarme','despierta','levantame','levantarme',
                        'programa una alarma','pon alarma','ponme alarma','crea alarma'];
      const tieneHora = /\d{1,2}/.test(c);
      return triggers.some(t => c.includes(t)) && tieneHora;
    },
    action: (c) => {
      const datos = parsearAlarmaVoz(c);
      if (datos) {
        sincronizarUIDesdeVoz(datos);
        setTimeout(() => crearAlarma(datos), 400);
      } else { togglePanel('alarmaPanel'); _alarVoz('Abriendo alarmas. ¿A qué hora la pongo?'); }
    }
  },
  {
    name: 'alarma_listar',
    description: 'Ver alarmas activas (Ej: "¿Qué alarmas tengo?", "Mis alarmas")',
    match: (c) => (c.includes('alarma') || c.includes('alarmas')) &&
                  (c.includes('que tengo') || c.includes('cuales') || c.includes('mis alarmas') ||
                   c.includes('lista') || c.includes('ver') || c.includes('mostrar')),
    action: () => listarAlarmasPorVoz()
  },
  {
    name: 'alarma_cancelar_todas',
    description: 'Cancelar todas las alarmas',
    match: (c) => (c.includes('cancela') || c.includes('elimina') || c.includes('borra') || c.includes('quita')) &&
                  c.includes('alarma') && (c.includes('todas') || c.includes('todo')),
    action: () => cancelarTodasAlarmas()
  },
  {
    name: 'alarma_abrir_panel',
    description: 'Abrir panel de alarmas',
    match: (c) => (c.includes('abrir alarma') || c.includes('abre alarma') ||
                   c.includes('panel de alarma') || c.includes('gestionar alarma')) &&
                  !(/\d{1,2}/.test(c)),
    action: () => { togglePanel('alarmaPanel'); _alarVoz('Abriendo panel de alarmas.'); }
  },

  // ══════════════════════════════════════════════════════════════
  // RECORDATORIOS
  // ══════════════════════════════════════════════════════════════
  {
    name: 'recordatorio_crear',
    description: 'Crear recordatorio (Ej: "Recuérdame la reunión a las 3", "Avísame de la cita a las 10")',
    match: (c) => {
      const triggers = ['recuerdame','recordatorio','recuerda que','no olvides','avisame','notificame'];
      const tieneHora = /\d{1,2}/.test(c);
      return triggers.some(t => c.includes(t)) && tieneHora;
    },
    action: (c) => {
      const datos = parsearAlarmaVoz(c);
      if (datos) {
        const d = { ...datos, tipo: 'recordatorio' };
        sincronizarUIDesdeVoz(d);
        setTimeout(() => crearAlarma(d), 400);
      } else _alarVoz('No entendí la hora. Di por ejemplo: recuérdame la reunión a las 3 de la tarde.');
    }
  },
  {
    name: 'recordatorio_diario',
    description: 'Recordatorio diario (Ej: "Todos los días a las 7 recuérdame tomar agua")',
    match: (c) => {
      const tieneRepeticion = c.includes('todos los dias') || c.includes('cada dia') ||
                              c.includes('diario') || c.includes('siempre a las') ||
                              c.includes('cada manana') || c.includes('de lunes a viernes');
      const tieneHora = /\d{1,2}/.test(c);
      return tieneRepeticion && tieneHora;
    },
    action: (c) => {
      const datos = parsearAlarmaVoz(c);
      if (datos) crearAlarma({ ...datos, repetir: true });
      else _alarVoz('No entendí la hora. Di por ejemplo: todos los días a las 8 recuérdame tomar el jarabe.');
    }
  },

  // ══════════════════════════════════════════════════════════════
  // MEDICAMENTOS
  // ══════════════════════════════════════════════════════════════
  {
    name: 'medicamento_crear',
    description: 'Recordatorio de medicamento (Ej: "Recuérdame tomar la pastilla a las 8", "Medicina a las 10 de la noche")',
    match: (c) => {
      const esMed = c.includes('pastilla') || c.includes('medicamento') || c.includes('medicina') ||
                    c.includes('jarabe') || c.includes('capsula') || c.includes('comprimido') ||
                    c.includes('inyeccion') || c.includes('dosis') || c.includes('tomar') && c.includes('a las');
      const tieneHora = /\d{1,2}/.test(c);
      return esMed && tieneHora;
    },
    action: (c) => {
      const datos = parsearAlarmaVoz(c);
      if (datos) {
        const d = { ...datos, tipo: 'medicamento' };
        sincronizarUIDesdeVoz(d);
        setTimeout(() => crearAlarma(d), 400);
      } else _alarVoz('No entendí la hora. Di por ejemplo: recuérdame tomar la pastilla a las 8 de la mañana.');
    }
  },
  {
    name: 'medicamento_diario',
    description: 'Medicamento diario (Ej: "Todos los días a las 7 tomar el jarabe")',
    match: (c) => {
      const esMed = c.includes('pastilla') || c.includes('medicamento') || c.includes('medicina') ||
                    c.includes('jarabe') || c.includes('capsula') || c.includes('dosis');
      const esRepetitivo = c.includes('todos los dias') || c.includes('cada dia') ||
                           c.includes('diario') || c.includes('siempre');
      return esMed && esRepetitivo && /\d{1,2}/.test(c);
    },
    action: (c) => {
      const datos = parsearAlarmaVoz(c);
      if (datos) {
        const d = { ...datos, tipo: 'medicamento', repetir: true };
        sincronizarUIDesdeVoz(d);
        setTimeout(() => crearAlarma(d), 400);
      } else _alarVoz('Di por ejemplo: todos los días a las 8 de la mañana tomar la medicina.');
    }
  },

  // ══════════════════════════════════════════════════════════════
  // TEMPORIZADOR
  // ══════════════════════════════════════════════════════════════
  {
    name: 'timer_iniciar',
    description: 'Temporizador (Ej: "Timer de 5 minutos", "Cuenta regresiva 30 segundos")',
    match: (c) => (c.includes('timer') || c.includes('temporizador') ||
                   c.includes('cuenta regresiva') || c.includes('en cuanto') ||
                   c.includes('dentro de') || c.includes('en cinco') || c.includes('en diez')) &&
                  (c.includes('minuto') || c.includes('segundo') || c.includes('hora') || /\d/.test(c)),
    action: (c) => {
      const s = parsearTimer(c);
      if (s > 0) iniciarTimer(s);
      else _alarVoz('Di por ejemplo: timer de 5 minutos, o cuenta regresiva de 30 segundos.');
    }
  },
  {
    name: 'timer_cancelar',
    description: 'Cancelar temporizador',
    match: (c) => (c.includes('cancela') || c.includes('para') || c.includes('detener')) &&
                  (c.includes('timer') || c.includes('temporizador') || c.includes('cuenta regresiva')),
    action: () => cancelarTimer()
  },

  // ══════════════════════════════════════════════════════════════
  // CRONÓMETRO
  // ══════════════════════════════════════════════════════════════
  {
    name: 'cronometro_iniciar',
    description: 'Iniciar cronómetro (Ej: "Inicia cronómetro", "Arranca el cronómetro")',
    match: (c) => (c.includes('cronometro') || c.includes('cronómetro')) &&
                  !c.includes('para') && !c.includes('pausa') && !c.includes('cuanto') &&
                  !c.includes('reinicia') && !c.includes('reset'),
    action: () => iniciarCronometro()
  },
  {
    name: 'cronometro_pausar',
    description: 'Pausar cronómetro',
    match: (c) => (c.includes('cronometro') || c.includes('cronómetro')) &&
                  (c.includes('pausa') || c.includes('para') || c.includes('detener')),
    action: () => pausarCronometro()
  },
  {
    name: 'cronometro_reiniciar',
    description: 'Reiniciar cronómetro',
    match: (c) => (c.includes('cronometro') || c.includes('cronómetro')) &&
                  (c.includes('reinicia') || c.includes('reset') || c.includes('cero')),
    action: () => reiniciarCronometro()
  },
  {
    name: 'cronometro_leer',
    description: 'Leer tiempo del cronómetro',
    match: (c) => (c.includes('cronometro') || c.includes('cronómetro')) &&
                  (c.includes('cuanto') || c.includes('tiempo lleva') || c.includes('cuantos')),
    action: () => leerCronometro()
  },

  // ══════════════════════════════════════════════════════════════
  // SOS / EMERGENCIAS
  // ══════════════════════════════════════════════════════════════
  {
    name: 'sos_activar',
    description: 'Activar alerta de emergencia (Ej: "Auxilio", "Emergencia", "Llama a emergencias")',
    match: (c) => c.includes('auxilio')    || c.includes('emergencia') ||
                  c.includes('sos')        || c.includes('ayuda') ||
                  c.includes('me cai')     || c.includes('me caí') ||
                  c.includes('me siento mal') || c.includes('estoy mal') ||
                  c.includes('llama a emergencias') || c.includes('llama al medico') ||
                  c.includes('accidente')  || c.includes('me lastime') ||
                  c.includes('no puedo respirar') || c.includes('dolor fuerte'),
    action: () => {
      if (typeof activarSOS === 'function') activarSOS();
      else if (typeof responderVoz === 'function') responderVoz('Módulo SOS no disponible.');
    }
  },
  {
    name: 'sos_cancelar',
    description: 'Cancelar alerta SOS (Ej: "Cancela el SOS", "Estoy bien", "Falsa alarma")',
    match: (c) => (c.includes('cancela') || c.includes('cancelar') ||
                   c.includes('estoy bien') || c.includes('falsa alarma') ||
                   c.includes('fue un error')) &&
                  (c.includes('sos') || c.includes('alerta') || c.includes('emergencia') ||
                   c === 'estoy bien' || c === 'cancela'),
    action: () => { if (typeof cancelarSOS === 'function') cancelarSOS(); }
  },
  {
    name: 'sos_contactos',
    description: 'Gestionar contactos SOS (Ej: "Contactos de emergencia", "Agregar contacto SOS")',
    match: (c) => (c.includes('contacto') || c.includes('agregar')) &&
                  (c.includes('emergencia') || c.includes('sos') || c.includes('auxilio')),
    action: () => { if (typeof abrirModalSOS === 'function') abrirModalSOS(); }
  }

];

// ── Integrar con el array global de intents ───────────────────────────
(function integrarIntentsAlarmas() {
  const nombres = intentsAlarmas.map(i => i.name);

  if (typeof intents !== 'undefined') {
    // Reemplazar intents de alarma/sos que ya existen en intents.js
    const base = intents.filter(i => !nombres.includes(i.name));
    intents.splice(0, intents.length, ...intentsAlarmas, ...base);
  } else {
    // Guardar para que intents.js los tome al cargar
    window._intentsAlarmasPreload = intentsAlarmas;
  }
})();
