# my-skills (SCALL) — Guía para Claude Code

## Qué es este proyecto

Aplicación web SCALL — asistente de voz inteligente desplegada en GitHub Pages.
La carpeta `docs/` contiene toda la aplicación y es lo que se despliega.

> Las skills de Claude fueron migradas a [my-new-skill](https://github.com/automatizacion-it/my-new-skill).
> `docs/` **no** tiene carpeta `skills/` — todo el frontend vive en `index.html` + `css/` + `js/`.

## Estructura real (verificada)

```
my-skills/
├── docs/                       # App SCALL completa (GitHub Pages)
│   ├── index.html              # Punto de entrada — incluye funciones inline críticas
│   │                            # (sideMenuActivar, togglePanel-stub, toggleModoOrbe)
│   ├── css/styles.css          # Estilos globales
│   ├── musica_intents.txt      # Notas/borrador de intents de música
│   └── js/                     # 24 módulos JavaScript, todos cargados vía <script src>
│       ├── config.js            # Plantilla de API keys (vacía, ver nota abajo)
│       ├── ui.js
│       ├── skills.js            # Noticias(panel)/Clima(panel)/Traductor(panel-UI)/Corpus
│       ├── spotify.js, radio.js
│       ├── cumpleanos.js, sos.js
│       ├── alarms.js            # Módulo de alarmas — ÚNICA fuente de verdad (IIFE, expone
│       │                         # funciones a window). Define también el togglePanel activo.
│       ├── rutas.js, intents_rutas.js
│       ├── intents_alarmas.js, intents_musica.js, intents.js
│       ├── bluetooth.js, colombia.js, sismos.js
│       ├── equalizer.js, visualizer.js
│       ├── gdrive.js, bottle_eq.js
│       ├── tts_elevenlabs.js, claude_tools.js
│       ├── noticias.js          # Lectura de noticias por voz (consultarNoticias)
│       ├── traductor.js         # Traductor por voz — versión completa (fallback + toast)
│       └── app.js               # Orquestador principal — SIEMPRE va último
├── .github/workflows/
│   └── deploy.yml              # Push a main → deploy automático a GitHub Pages
└── README.md
```

**Nota:** `deploy_scall.bat` mencionado en versiones anteriores de este documento
**no existe en el repo**. Si tu flujo de trabajo real es "descargar archivos a
`Downloads/` y moverlos manualmente a `docs/`", trátalo como proceso manual —
no hay script que lo automatice todavía.

## Deploy

**Automático**: Push a `main` → GitHub Actions (`deploy.yml`) sube `docs/` tal
cual a GitHub Pages. **No hay ningún paso que inyecte secrets** — ver nota sobre
`config.js` abajo.

## Archivos importantes

- `docs/js/config.js` — plantilla con API keys vacías (Gemini/YouTube/MQTT).
  El comentario interno explica que el workflow actual NO las rellena; cada
  usuario debe configurarlas vía el modal ⚙️ (se guardan en `localStorage`,
  por dispositivo). Si se quiere automatizar esto con GitHub Secrets, falta
  agregar un paso al workflow — no existe hoy.
- `docs/js/app.js` — orquestador principal de la app, siempre debe cargar último.
- `docs/js/intents.js` — array `intents[]`, comandos de voz. Dos pasadas de
  matching: una prioritaria (`INTENTS_PRIORITARIOS` en `app.js`, evita IA) y
  un fallback (`ejecutarIntentLocal`, primer match gana).
- `docs/js/alarms.js` — se carga como IIFE y expone funciones a `window`
  explícitamente al final del archivo. **Redefine `window.togglePanel`**,
  por lo que es la fuente de verdad real para abrir/cerrar cualquier panel
  (alarma, noticias, clima, traductor, corpus), no solo el de alarmas.

## ⚠️ Patrón de riesgo — scripts globales sin módulos

Todos los `.js` de `docs/js/` se cargan como `<script src>` clásicos (sin
`type="module"`), compartiendo el mismo scope global. Si dos archivos declaran
una función con el mismo nombre, **el que carga después gana silenciosamente**
— no hay error en consola. Antes de crear un archivo nuevo o renombrar una
función, revisa que el nombre no exista ya en otro módulo:

```bash
grep -rn "^function nombreFuncion" docs/js/*.js
```

Y antes de agregar un `<script src="js/nuevo.js">`, confirma en qué orden
carga respecto a los módulos con los que podría chocar.

## Sesión de auditoría y limpieza (2026-07-30)

Se encontraron y corrigieron varios problemas de este patrón:

1. **Bug crítico de `togglePanel`**: `alarms.js` redefinía `window.togglePanel`
   pero solo inicializaba el panel de alarmas — al abrir Noticias/Clima/Corpus
   quedaban vacíos porque `initNoticiasPanel()`/`initClimaPanel()`/`renderCorpus()`
   nunca se llamaban. **Corregido**: `alarms.js` ahora inicializa los 4 paneles.
2. **Calendario de alarmas no respondía al clic**: causado por el mismo patrón
   de shadowing (dos versiones de `renderCalendario()`, la ganadora no incluía
   los `onclick`/`id` que necesitaba `seleccionarDia()`). Se resolvió al
   eliminar la versión vieja/duplicada de `skills.js`.
3. Se eliminó ~200 líneas de código muerto en `skills.js` (CRUD de alarmas,
   timer, cronómetro, `togglePanel`/`initPanel` viejos, `traducirTexto` viejo)
   que `alarms.js`/`traductor.js` ya cubrían con versiones más completas.
4. Se eliminó una declaración duplicada de `toggleSonido()` dentro del propio
   `alarms.js` (la primera nunca se ejecutaba).
5. `clima.js` y `radio_intents.js` — existían en el repo pero nunca se cargaban
   en `index.html`. Se confirmó que eran **verdaderamente redundantes**
   (sus funciones ya estaban cubiertas, en el caso de radio incluso con una
   versión mejor ya integrada en `intents.js`) y se **eliminaron**.
6. `noticias.js` y `traductor.js` — también huérfanos, pero **no** redundantes:
   tenían funcionalidad real que faltaba (lectura de noticias por voz, mejor
   fallback de traducción). Se **integraron**: se agregaron sus `<script src>`
   a `index.html` y se conectó `noticias_consultar` en `intents.js` para que
   realmente invoque `consultarNoticias()`.

## Sesión 2 (2026-07-30, continuación)

7. **Bug de acentos en "modo orbe"**: `comandoLower = texto.toLowerCase()` no
   quita tildes. El comando de voz "muéstrame los menús" nunca activaba
   `_esMostrar` porque `"muéstrame".includes("muestra")` es `false` (la é con
   tilde no coincide con la e plana). Se agregaron las variantes con tilde
   ('muéstrame', 'muéstrenme', 'menú'/'menús') a las listas de palabras clave
   en `app.js`. **Nota de arquitectura**: este es un patrón de bug que puede
   repetirse en cualquier otro intent que compare texto de voz sin normalizar
   acentos — si vuelve a aparecer, considerar normalizar acentos globalmente
   en `comandoLower` en vez de parchear caso por caso.
8. **Submenu de Ecualizadores**: "Botellas" y "Visualiz." (Human Visualizer)
   dejaron de ser botones independientes del menú lateral. Ahora son sub-ítems
   dentro de un submenu colapsable bajo "Ecualiz." (`#eqSubmenu`, función
   `toggleEQSubmenu()` en el script inline de `index.html`). Los 3 modos
   (Estándar/Botellas/Humano) siguen siendo paneles flotantes independientes
   — `equalizer.js`, `bottle_eq.js`, `visualizer.js` no se tocaron por dentro,
   solo cambió desde dónde se abren.

## Sesión 3 (2026-07-31) — Menú de usuario (capa de personalización)

9. **Nuevo directorio `docs/js/user-menu/`** con `menu_usuario.js`. Agrega un
   panel "Mi Menú" (botón nuevo en el menú lateral, `toggleMenuUsuario()`)
   donde el usuario puede crear accesos personalizados sin tocar código:
   - Nombre del ítem (texto libre)
   - Acción a ejecutar — elegida de `ACCIONES_DISPONIBLES`, un catálogo fijo
     de 16 funciones ya existentes en la app (togglePanel de cada panel,
     abrir Bluetooth/Drive/Colombia/Sismos/Rutas, los 3 modos de
     ecualizador, Config, SOS, Asistente). Todas sin parámetros.
   - Frase de voz (intent) — al decirla, o al tocar el ítem en la lista,
     se ejecuta la acción elegida.
   - Persistencia: `localStorage['scall_menu_usuario']`, arreglo de
     `{id, nombre, accionId, intent}`.
   - **Puente con el motor de voz**: `registrarIntentsUsuario()` inyecta
     (`push`) los intents del usuario directamente en el arreglo global
     `intents` (el mismo que usa `intents.js`), marcados con `_usuario:true`
     para poder quitarlos y re-agregarlos sin duplicar en cada cambio. No
     hace falta tocar `intents.js` ni `app.js` — el loop de fallback
     `ejecutarIntentLocal()` ya revisa todo `intents[]`, así que los
     detecta automáticamente. **Importante**: como no están en
     `INTENTS_PRIORITARIOS`, solo se evalúan en el fallback, no en el paso
     prioritario — esto es intencional y evita que un intent de usuario mal
     escrito interfiera con los intents críticos del sistema.
   - Requiere que `js/intents.js` cargue ANTES que
     `js/user-menu/menu_usuario.js` en `index.html` (el arreglo `intents`
     debe existir cuando se registra). `menu_usuario.js` se sincroniza en
     `window.addEventListener('load', ...)`.
   - Panel construido igual que `bottle_eq.js`/`visualizer.js` (creación
     dinámica vía `createElement`, no vive en el HTML estático), pero
     reutiliza la clase CSS `.skill-panel` en vez de estilos propios —
     visualmente es consistente con Alarmas/Noticias/Clima/etc.

## Sesión 4 (2026-07-31) — Chat amigo-a-amigo (MQTT)

10. **Nuevo directorio `docs/js/chat/`** con `chat.js`. Panel "Chat" (botón
    nuevo en el menú lateral, `toggleChat()`) para mensajería en tiempo real
    entre dos instancias de SCALL de amigos distintos.
    - **Protocolo**: MQTT (librería `mqtt` ya cargada por CDN en `index.html`
      para el broker de IoT — se reutiliza la misma librería, pero con una
      **conexión y variable de cliente completamente separadas**
      (`chatClient`, no `mqttClient`) y su **propio broker configurable**,
      independiente del de IoT/ESP32. Fue decisión explícita del usuario.
    - **Esquema de sala**: cada mensaje se publica/suscribe en el tópico
      `scall/chat/<sala>`, donde `<sala>` pasa por `sanearSala()` (minúsculas,
      espacios → guiones, solo `[a-z0-9-_]`). "Pizza 2026" y "pizza-2026"
      terminan siendo la misma sala — probado con una simulación de dos
      instancias.
    - **Identidad**: cada instancia genera un `chatMiId` aleatorio persistido
      en `localStorage` (`scall_chat_mi_id`) para distinguir "mis" burbujas
      de las del amigo sin depender del nombre visible.
    - **Config**: `localStorage['scall_chat_config']` (host, puerto, sala,
      usuario/password opcionales, nombre visible). Vive dentro del propio
      panel de Chat (⚙), no en el modal de Configuración general — mismo
      patrón que la API key de OpenWeatherMap en el panel de Clima.
    - **Historial**: persistido por sala en
      `localStorage['scall_chat_historial_<sala>']`, recortado a 50 msjs.
    - Los mensajes propios NO se renderizan de forma optimista al enviar —
      solo se pintan cuando llegan de vuelta por la suscripción MQTT (el
      broker hace eco al publicador), evitando duplicados/desincronía.

## Sesión 5 (2026-07-31) — Actividad: Audiolibro / Clase / Video para TV

11. **Nuevo directorio `docs/js/actividad/`** con `actividad.js`. Botón
    "Actividad" en el menú lateral (`toggleActividad()`) que abre un panel
    de 3 pasos: (1) elegir Audiolibro / Clase / Video, (2) elegir origen
    del contenido (IA sobre un tema, o texto propio pegado — solo para
    Audiolibro/Clase), (3) resultado.
    - **No se construyó infraestructura nueva** — todo reusa módulos ya
      existentes:
      - Generación de texto: llama directo a la API de Gemini o Claude
        (según `getActiveIA()`) usando las mismas keys/funciones que ya
        usa `app.js` (`getApiKey`, `getClaudeKey`, `getClaudeModel`).
      - Narración: reusa `encolarVoz()`/`detenerVoz()`/`colaVoz` de
        `tts_elevenlabs.js` sin modificar ese archivo — el texto generado
        se parte en párrafos (`partirEnParrafos`) y cada uno se encola,
        así se reproducen en secuencia con el motor de voz que ya existe
        (ElevenLabs con fallback a Web Speech).
      - Video: reusa `buscarEnYouTube()` de `spotify.js` (ya usa la
        YouTube Data API v3 con la key ya configurada) y lo embebe con un
        **nuevo** `YT.Player` (`ytPlayerActividad`, variable propia — NO
        se toca `ytPlayer` de `spotify.js` para no interferir con la
        reproducción de música). Espera a que la API de YouTube esté lista
        con `esperarYT()` (polling), sin redefinir el callback global
        `window.onYouTubeIframeAPIReady` que ya reclama `spotify.js`.
    - **Decisión de arquitectura sobre "video para el TV"**: investigamos
      Google Cast SDK — un receiver personalizado (para diapositivas o
      contenido propio) requiere registrarse en el Google Cast SDK
      Developer Console (pago único ~5 USD) y alojar un receiver. Se optó
      por la ruta sin fricción: el reproductor embebido de YouTube ya trae
      su propio botón de Cast nativo, así que "proyectar en el Smart TV"
      funciona hoy mismo con un Chromecast, sin ninguna cuenta ni
      infraestructura adicional. Si más adelante se quiere una
      presentación 100% propia en el TV, esa es la puerta que falta abrir
      (registro pagado + receiver custom).
    - Requiere que `js/spotify.js` y `js/tts_elevenlabs.js` ya existan como
      funciones globales al momento de USARSE (se referencian dentro de
      cuerpos de función, nunca en el nivel superior del archivo, así que
      el orden exacto del `<script>` no es estrictamente crítico — igual
      se colocó después de ambos por claridad).

## Sesión 6 (2026-07-31) — Priorizar la alerta sísmica

13. **Hallazgo**: `responderVoz` no es una función fija — `app.js`,
    `tts_elevenlabs.js` y `ui.js` se la disputan en tiempo de ejecución
    (la reemplazan condicionalmente según si hay key de ElevenLabs). Si la
    versión activa en ese momento es la de ElevenLabs, el mensaje se
    **encola** (`encolarVoz`/`colaVoz`) detrás de cualquier otra cosa que
    ya esté sonando (música, radio, audiolibro/clase de Actividad). Una
    alerta sísmica real podía quedar esperando en cola en vez de sonar
    de inmediato. No se resolvió la causa raíz (la triple reasignación de
    `responderVoz`, que sigue siendo frágil) — se resolvió el síntoma que
    importa para seguridad: `sismos.js` ahora limpia todo antes de hablar.
14. **`interrumpirTodoParaSismo()`** (nueva, en `sismos.js`), se llama al
    inicio de `dispararAlertaSismica()`, antes de tocar el sonido de alerta
    o hablar. Detiene, en este orden: la cola de voz (`detenerVoz()` +
    vaciar `colaVoz`), `speechSynthesis.cancel()` nativo, la radio
    (`detenerRadio()`), la música de YouTube (`detenerMusica()`), la
    narración de Actividad (`detenerNarracionActividad()`) y pausa su
    reproductor de YouTube (`ytPlayerActividad.pauseVideo()`). Todas las
    llamadas están protegidas con `typeof === 'function'` y try/catch —
    no rompe nada si algún módulo no está cargado. Probado con una
    simulación que confirma las 6 interrupciones.
15. **Eventos críticos (M ≥ 5.0)** ahora también llaman `abrirPanelSismos()`
    automáticamente (antes solo sonaba/hablaba/notificaba sin mostrar nada
    en pantalla).
16. **4 intents de voz nuevos** en `intents.js`, agregados también a
    `INTENTS_PRIORITARIOS` en `app.js` (se resuelven localmente, sin pasar
    por el router de IA): `sismo_activar`, `sismo_desactivar`,
    `sismo_simular`, `sismo_panel`. **Bug encontrado y corregido durante
    las pruebas**: "desactiva" contiene "activa" como substring, así que
    el match de `sismo_activar` (sin cuidado) disparaba con frases de
    desactivación — se corrigió agregando `!c.includes('desactiv')` a su
    condición. Mismo tipo de trampa que el bug de acentos de la Sesión 2,
    pero con substrings en vez de tildes — vale la pena tenerlo en cuenta
    al escribir cualquier `match` nuevo basado en `includes()`.

## Sesión 7 (2026-07-31) — Grupos de intents con pregunta de aclaración

17. **Nuevo concepto**: cuando una frase es genérica (ej. "pon música", sin
    especificar género), en vez de asumir un valor por defecto, SCALL
    **pregunta** — como un menú de contact center — y la **frase
    siguiente** se interpreta como respuesta a esa pregunta puntual, no
    como un comando nuevo. Antes no existía ningún concepto de "pregunta
    pendiente"/contexto entre turnos de voz — cada frase se evaluaba sola.
    - **`docs/data/intents_musica.json`** (nuevo directorio `data/`):
      archivo de texto plano (JSON) — no código — con el intent principal
      "música" y sus 14 sub-intents (electrónica, relajante, trabajar,
      ejercicio, salsa, vallenato, reggaetón, cumbia, pop, rock, jazz,
      romántica, instrumental, popular), cada uno con sus palabras clave
      y el query de búsqueda que ya usaba el intent específico
      correspondiente en `intents_musica.js`. Pensado para poder
      editarse/ampliarse sin tocar JS.
    - **`docs/js/intents_grupos.js`** (nuevo): carga el JSON por `fetch()`,
      expone `preguntarGrupo(id)` (hace la pregunta y marca
      `grupoPendiente`) y `resolverRespuestaGrupo(texto)` (si hay pregunta
      pendiente, la resuelve contra las palabras clave del grupo y
      ejecuta la acción; si no hay nada pendiente, devuelve `false` y no
      cambia nada del comportamiento existente). Diseñado para agregar
      más grupos después (radio, clima, etc.) sin tocar esta lógica —
      solo un `.json` nuevo + una línea en `cargarTodosLosGrupos()`.
    - **Enganche en `app.js`**: dentro de `ejecutarHabilidad()`, justo
      después de calcular `comandoLower` y ANTES que cualquier otro
      intent (incluso antes de ORBE), se llama a `resolverRespuestaGrupo()`.
      Si devuelve `true`, la frase se consumió como respuesta y no sigue
      el pipeline normal. Es el punto más temprano posible del pipeline.
    - **`musica_play`** (el intent de "pon música" a secas, en
      `intents_musica.js`) ahora llama `preguntarGrupo('musica')` en vez
      de reproducir "música popular" por defecto directamente.
    - **Nunca se queda atascado**: `grupoPendiente` se limpia ANTES de
      intentar resolver la respuesta (no después), así que si el usuario
      dice algo que no matchea ninguna opción, o cualquier cosa rara,
      la siguiente frase ya vuelve a ser un comando normal — no hace
      falta ningún "cancelar" explícito.
    - Probado de punta a punta con una simulación de 3 turnos: pregunta,
      respuesta reconocida, y confirmación de que una frase normal
      posterior ya no se confunde con una respuesta pendiente.
    - **Pendiente para el futuro** (mencionado explícitamente por el
      usuario, no se construyó): 3 modos posibles para cómo se presenta
      la pregunta — 100% voz (el actual), voz + opciones visibles en
      pantalla, o 100% visual sin voz. Quedaría como una preferencia
      guardada en `localStorage` que `preguntarGrupo()` consulte.
    - **No se tocó** el resto de la cascada de intents de música
      (`musica_play_query`, `musica_salsa`, etc.) — sigue exactamente
      igual que antes. Solo cambió qué pasa cuando la frase es
      puramente genérica.

## Sesión 8 (2026-07-31) — Refinar el JSON de música (probado en vivo)

18. El usuario confirmó que "pon música" ya dispara la pregunta en
    producción. Se refinó `docs/data/intents_musica.json` con un ejemplo
    real que dio: "romántica, planchas, rock de los 80".
    - **"plancha"/"planchas"** agregado como sinónimo de `romantica`
      (jerga colombiana para baladas lentas/música para bailar pegado).
    - **Nueva opción `rock_80`**, específica para "rock de los 80" —
      colocada ANTES de la opción genérica `rock` en el arreglo
      `opciones`, porque `Array.find()` devuelve la PRIMERA coincidencia:
      si `rock` (genérica) fuera evaluada primero, "rock de los 80"
      matchearía ahí (contiene la palabra "rock") y nunca llegaría a la
      opción específica. **Regla general para agregar opciones nuevas al
      JSON**: la más específica siempre va primero en el arreglo.
    - Pregunta reformulada más corta y natural: "¿Qué tipo de música
      quieres? Por ejemplo: romántica, planchas, rock de los 80,
      electrónica, salsa, vallenato, reggaetón, o lo que se te ocurra."
      — ya no intenta leer las 15 opciones completas, da ejemplos y dice
      "o lo que se te ocurra" (la búsqueda de sub-intent sigue cubriendo
      las 15 opciones igual, la pregunta solo menciona algunas).
    - Probado con 5 frases ("romántica", "planchas", "rock de los 80",
      "rock", "rock clásico") — las 5 resuelven al sub-intent correcto,
      confirmando que la opción específica no se confunde con la
      genérica.

## Sesión 9 (2026-07-31) — Errores de consola en producción

19. **Hallazgo importante**: `docs/js/chat/chat.js` **nunca llegó a
    existir en el repo real** (confirmado con `git log --all -- docs/js/chat/`,
    vacío) — el `<script src="js/chat/chat.js">` en `index.html` sí se
    commiteó, pero el archivo en sí se perdió en algún punto del flujo
    manual de copiar/pegar (ocurrió en la sesión del Chat, antes de que
    existiera el flujo `Instalar-ArchivoSCALL`). Causaba un 404 real en
    cada carga de página — el panel de Chat completo estaba roto en
    producción sin que nadie lo notara hasta revisar la consola. Se
    recuperó desde una copia de trabajo y se re-entregó.
    - **Lección de proceso**: después de este hallazgo se comparó la copia
      de trabajo completa contra un `git clone` fresco del repo real —
      salió limpio salvo `chat.js` (ya corregido) y `config.js`
      (intencionalmente ausente, ver abajo). Vale la pena repetir esta
      comparación si vuelve a haber una sospecha de archivo faltante.
20. **`docs/js/config.js` — 404 esperado, pero faltaba un ajuste.**
    Tras el `git rm --cached` de la Sesión 6, el archivo ya no existe (por
    diseño) y nunca va a volver a existir. El `<script src="js/config.js">`
    en `index.html` seguía ahí, generando un 404 permanente en cada carga.
    Se quitó el `<script>` — se verificó primero que las 7 referencias a
    `window.APP_CONFIG` en todo el proyecto ya están protegidas con
    `window.APP_CONFIG && ...`, así que quitar el tag no cambia ningún
    comportamiento, solo silencia el error de consola.
21. **`favicon.svg` — nunca existió.** Se creó uno simple (círculo con
    degradé cian→violeta sobre fondo oscuro, usando `--glow`/`--glow2` de
    `styles.css`) en `docs/favicon.svg`, coherente con la identidad visual
    de la app.
22. Errores de `doubleclick.net`/`googleads.g.doubleclick.net` en consola
    son tracking interno de anuncios de YouTube (bloqueado por el propio
    navegador) — no son del código de SCALL, se pueden ignorar siempre
    que aparezcan cuando el reproductor de YouTube está activo (música o
    la actividad de Video).
23. **Pendiente de diagnosticar** (no resuelto esta sesión, falta info):
    3 errores 400 de `api.elevenlabs.io/.../stream` en la misma sesión de
    consola. Un 400 de ElevenLabs indica que el cuerpo de la petición no
    era válido — candidatos más probables: texto vacío o demasiado largo
    en un solo fragmento (revisar `partirEnParrafos()` de `actividad.js`
    si el texto generado por la IA viene sin saltos de línea, produciría
    un solo fragmento gigante), o cuota mensual de caracteres agotada
    (el plan gratis son 10,000/mes). Se necesita saber qué estaba haciendo
    el usuario justo antes del error para confirmar la causa.

## Sesión 10 (2026-07-31) — El bug real: la fusión de intents_musica.js nunca funcionó

25. **Hallazgo mayor, con stack traces del usuario como evidencia**: el
    sistema de pregunta de aclaración de música (Sesiones 7-8) **nunca
    funcionó en producción**, desde el primer día. La traza mostraba
    `action @ intents.js:132` ejecutando `reproducirMusica` directo — NO
    la versión con `preguntarGrupo` que está en `intents_musica.js`.
    - **Causa raíz**: `intents.js` tiene su **propia copia**, previa a la
      existencia de `intents_musica.js`, de 14 intents de
      música/radio/podcast (incluyendo su propio `musica_play` viejo, que
      reproduce "música popular" directo sin preguntar nada).
      `intents_musica.js` (que carga antes) intenta guardar sus 23 intents
      en `window._intentsMusicaPreload` para que `intents.js` los fusione
      al cargar — pero **nada nunca leyó esa variable**. El comentario en
      `intents_musica.js` ("Esto permite cargar intents_musica.js antes
      que intents.js") documentaba la intención, pero la mitad que hace
      la fusión real nunca se escribió del lado de `intents.js`.
    - **Consecuencia real, más allá de la pregunta de aclaración**: los 14
      géneros específicos de `intents_musica.js` (electrónica, salsa,
      vallenato, reggaetón, cumbia, pop, rock, jazz, romántica,
      instrumental, popular, relajante, trabajar, ejercicio) **nunca se
      ejecutaron, ni un solo día** — quedaban completamente huérfanos.
      Comandos como "pon salsa" probablemente caían al `musica_play_query`
      genérico de `intents.js` (búsqueda de YouTube sin curar), no al
      intent específico con su query cuidada.
    - **Fix**: se agregó, al final de `intents.js` (justo después de
      cerrar `const intents = [...]`), el bloque que faltaba: si existe
      `window._intentsMusicaPreload`, se hace `intents.splice(...)`
      reemplazando cualquier intent de `intents.js` que tenga el mismo
      `name`, y agregando los que solo existen en `intents_musica.js`.
    - **Probado con una simulación de dos scripts secuenciales** (no un
      solo bloque concatenado — eso da un falso error de TDZ de `const`
      que no ocurre en el navegador real, porque ahí cada `<script>` es
      un programa completo que termina antes de que el siguiente
      empiece). Confirmado: 62 intents finales, sin duplicados,
      `musica_play` es la versión que pregunta, y los 14 géneros
      específicos están presentes.
    - **Lección para el futuro**: si se agrega otro archivo con el mismo
      patrón "cargar antes, fusionar después" (`window._algoPreload`),
      hay que verificar explícitamente que el lado receptor lo consuma —
      quedó demostrado que es fácil escribir la mitad del mecanismo y
      nunca notar que la otra mitad falta, porque el código no truena,
      simplemente ejecuta silenciosamente el camino viejo.
26. **`tts_elevenlabs.js` tragaba errores en silencio**: cuando ElevenLabs
    fallaba (por la razón que fuera), `procesarCola()` caía a Web Speech
    sin dejar ningún rastro del motivo real — solo se veía en la consola
    del navegador como un 400 crudo, sin cuerpo de respuesta visible. Se
    agregó un `_ttsLog()` en el `catch` para que el mensaje de error real
    (`e.message`, que incluye el `detail` que devuelve la API) aparezca en
    el log de SCALL. **La causa de los 400 de esta sesión sigue sin
    confirmarse** — la próxima vez que ocurra, el log de SCALL debería
    decir la razón exacta (cuota agotada, key inválida, etc.) en vez de
    tener que ir a inspeccionar la consola del navegador.

## Sesión 11 (2026-07-31) — Log de errores persistente

27. **`docs/js/error_log.js`** (nuevo): mismo patrón que el Corpus de
    `skills.js` (que guarda frases de voz no reconocidas), pero para
    **errores técnicos** — fallos de API, excepciones, etc. Se guardan en
    `localStorage['scall_error_log']` (máx. 200), sobreviven a recargar la
    página (a diferencia del panel "Log" en pantalla, que es efímero).
    - `registrarError(origen, mensaje)` — punto de entrada único, pensado
      para llamarse desde el `catch` de cualquier módulo.
    - Panel nuevo "Errores" en el menú lateral (`togglePanelErrores()`),
      mismo patrón visual que Corpus: lista con fecha/origen/mensaje,
      botón "Exportar .txt" y "Limpiar". Punto rojo en el ícono del menú
      si hay al menos un error guardado (`actualizarBadgeErrores()`).
    - **Conectado por ahora solo en un lugar**: el `catch` de
      `procesarCola()` en `tts_elevenlabs.js` (el mismo que ya loggeaba a
      pantalla en la Sesión 10) ahora también llama
      `registrarError('TTS/ElevenLabs', e.message)`. **Pendiente**: cablear
      lo mismo en otros catches del proyecto (Sismos/USGS, Drive, YouTube,
      etc.) si se quiere que el log capture errores de todos los módulos,
      no solo de voz — hoy solo cubre ElevenLabs.
    - Idea de uso: exportar el .txt periódicamente y pegarlo en una sesión
      de Claude para revisar y corregir los errores acumulados en lote,
      en vez de perseguirlos uno por uno en la consola del navegador.

## Sesión 12 (2026-08-28) — La causa real de los 400/401 de ElevenLabs: la UI del modal

28. **Causa raíz final** de toda la saga de errores de ElevenLabs de las
    últimas sesiones (400 en producción, luego 401 al probar la key
    nueva): **no era la cuota, ni la voz, ni el modelo — era el propio
    modal de Configuración de SCALL**, con dos bugs de UX que se
    combinaban para que una key nueva pegada por el usuario nunca llegara
    a probarse ni guardarse de verdad:
    - **`probarVozElevenLabs()` (botón "▶ Probar") ignoraba por completo
      el campo de texto** — llamaba a `getElevenLabsKey()`, que lee de
      `localStorage`, nunca el valor recién pegado en el input. Resultado:
      pegar una key nueva y darle "Probar" siempre probaba la key vieja
      (o ninguna), sin importar qué se hubiera escrito.
    - **El campo de ElevenLabs no lo guarda el botón "Guardar
      Configuración"** (el grande del pie del modal) — ese botón
      (`saveAssistantConfig()`) solo toca nombre del asistente,
      Gemini y Claude. ElevenLabs tiene su PROPIO botón, "Activar voz"
      (`guardarElevenLabsKey()`). Ni MQTT ni YouTube los toca tampoco —
      cada integración tiene su propio botón de guardado, patrón que ya
      existía pero que no está explicado en ningún lado de la UI.
    - El campo también se limpia intencionalmente cada vez que se abre
      el modal (`index.html` línea ~216, `if (key && elKey) key.value = ''`)
      cuando ya hay una key guardada — para no mostrarla en texto plano.
      Correcto en sí, pero sin ninguna explicación visible, se ve idéntico
      a "se me borró lo que pegué".
    - **Fix**: `probarVozElevenLabs()` ahora prueba primero el valor
      actual del campo (lo recién pegado, aunque no se haya guardado
      todavía con "Activar voz") y solo si está vacío cae a la key
      guardada. Se agregó un `form-hint` visible bajo el campo explicando
      qué botón usar. **No se tocó** el patrón de "cada integración
      guarda con su propio botón" — es consistente con MQTT/YouTube, así
      que unificar todo bajo "Guardar Configuración" habría sido un
      cambio más grande e inconsistente con el resto del modal.
    - **Lección**: los errores 400/401 en consola eran síntomas reales,
      pero la causa nunca estuvo en el código de red o en la cuenta de
      ElevenLabs — estaba en que la key correcta nunca llegaba a viajar
      en la petición porque la UI nunca la capturó. Vale la pena, ante
      errores de autenticación persistentes, verificar primero qué valor
      concreto está usando el código (no asumir que "la key está mal")
      antes de sospechar de la cuenta/servicio externo.
29. **Selector de voz personalizada**: el selector "Voz" solo tenía 6
    opciones fijas (`<select>`), sin ninguna forma de pegar un Voice ID
    distinto. Se agregó una 7ª opción "🔧 Personalizado (pegar ID)" que
    revela un campo de texto (`#elVoiceCustomInput`) para pegar cualquier
    ID de la cuenta de ElevenLabs del usuario. "Activar voz" y "Probar"
    ahora resuelven el ID real (del select o del campo personalizado,
    según cuál esté activo) antes de guardar/probar. Al reabrir el modal,
    si el ID guardado no coincide con ninguna de las 6 voces predefinidas,
    se selecciona automáticamente "Personalizado" y se rellena el campo
    con el ID guardado (antes se insertaba una opción sintética en el
    `<select>`, funcional pero menos clara para editar después).
30. **El bug que explica por qué nunca vimos la causa real**: el log de
    SCALL (Sesión 10/11) mostraba `HTTP 401: [object Object]` en vez del
    motivo — ElevenLabs manda `detail` como un **objeto anidado**
    (`{status, message}`), no como texto plano. El código hacía
    `'HTTP ' + status + ': ' + errorData.detail`, y al concatenar un
    objeto en un string, JavaScript llama a su `.toString()` por
    defecto, que para un objeto genérico literalmente da
    `"[object Object]"`. Todas las sesiones anteriores intentando
    diagnosticar el 400/401 estuvieron ciegas por este bug — el log
    persistente y el `_ttsLog` que agregamos SÍ estaban funcionando,
    pero mostraban basura en vez del mensaje real.
    - **Fix** en `hablarConElevenLabs()`: si `errorData.detail` es un
      objeto, se extrae `.message` (o `.status` si no hay message, o el
      JSON completo como último recurso) en vez de concatenarlo directo.
      Probado con 4 formatos distintos de respuesta de error.
    - **Pendiente**: con este fix ya desplegado, el próximo error de
      ElevenLabs en el panel "Errores" o en el Log debería decir la razón
      real en texto legible (ej. "invalid_api_key", "quota_exceeded",
      etc.) — ahí sabremos por fin qué le pasa a la cuenta/key.

## Sesión 13 (2026-08-31) — Gemini TTS como proveedor alternativo

31. **`hablarConGeminiTTS()`** (nueva, en `tts_elevenlabs.js`) — usa la
    función nativa de texto-a-voz de la API de Gemini
    (`gemini-2.5-flash-preview-tts`, endpoint `generateContent` con
    `responseModalities:["AUDIO"]`), **reutilizando la misma API Key de
    Gemini** que ya usa el resto de la app (`getApiKey()` de `app.js`) —
    cero cuentas o keys nuevas que gestionar.
    - Gemini devuelve el audio como **PCM crudo sin encabezado** (16-bit,
      mono, 24kHz) en base64, no un MP3 listo como ElevenLabs. Se agregó
      `pcmBase64AWav()` para envolver ese PCM en un WAV mínimo válido que
      `<audio>` sí puede reproducir. **Probado con `ffprobe`** (no solo
      revisando los bytes a mano): confirma 24000 Hz, mono, PCM 16-bit,
      duración exacta — el archivo generado es un WAV real y válido.
    - **Selector de proveedor** nuevo en el modal de Configuración (arriba
      de las secciones de voz), mismo patrón visual que el selector
      Gemini/Claude para el cerebro de texto. Guarda en
      `localStorage['scall_tts_proveedor']` ('elevenlabs' o 'gemini').
      Al cambiar, se muestra/oculta la sección correspondiente
      (`elevenlabsSection` / `geminiTtsSection`).
    - **21 voces de Gemini** listadas en un `<select>` con su estilo
      (Kore-Firme, Puck-Alegre, etc., traducidas del catálogo oficial de
      30 — se omitieron algunas para no saturar el selector). Guardadas en
      `localStorage['scall_gemini_voice']`.
    - **`procesarCola()`** (el motor central de la cola de voz) ahora
      consulta `getTtsProveedor()` antes de decidir a quién llamar —
      ElevenLabs sigue siendo el default si no se ha elegido nada, así
      que no cambia el comportamiento de nadie que no toque el selector
      nuevo. El resto de la cadena (`encolarVoz`, `responderVozEL`, todo
      lo que ya llama a estas dos) no se tocó — hereda el proveedor
      automáticamente sin cambios.
    - Botón "▶ Probar voz de Gemini" dedicado, igual que el de ElevenLabs,
      para no tener que decir un comando de voz completo solo para oír
      cómo suena una voz.

## Sesión 14 (2026-08-31) — Resolución final del saga de ElevenLabs

32. **Causa raíz definitiva, confirmada por el usuario** (gracias al fix
    del "[object Object]" de la Sesión 12, que por fin dejó ver el
    mensaje real de la API): eran **dos problemas distintos, no uno**:
    - El usuario estaba pegando el **Key ID** de ElevenLabs (un
      identificador) en vez de la **API Key real** (`sk_...`) — son dos
      valores distintos en su dashboard, y la key real solo se muestra
      **una vez** al crearla o rotarla. Mensaje real de la API:
      `"API key ID used as API key - only valid API keys can be used."`
    - Algunas de las 6 voces predefinidas del selector son parte de la
      **Voice Library de pago** de ElevenLabs — se ven disponibles en la
      web, pero un plan gratis no puede usarlas por API (`HTTP 402`).
      Solo "Lourdes" quedó confirmada como gratuita en pruebas reales;
      las demás (Ligia, Alejandro, Horacio, Eleguar) no se han confirmado
      ninguna u otra forma.
    - **`interpretarErrorEL(mensaje)`** (nueva en `tts_elevenlabs.js`):
      reconoce estos dos patrones de error (y "invalid api key" genérico)
      y los traduce a una frase clara y accionable en español, en vez del
      texto crudo en inglés de la API. Conectada en `probarVozElevenLabs`
      (lo que se ve en el status del modal) y en el `catch` de
      `procesarCola` (lo que se guarda en el Log y en el panel Errores).
    - Se quitó la etiqueta "(free)" de Ligia/Alejandro/Horacio/Eleguar en
      el selector (nunca se confirmó que lo fueran) y se agregó
      "(✅ confirmada gratis)" solo a Lourdes, más un `form-hint` general
      explicando el problema de las voces de pago.
    - **Estado actual**: con la key real (`sk_...`) puesta y una voz
      gratuita seleccionada, ElevenLabs funciona correctamente
      ("Voz funcionando — ID: pFZP5JQG7iQjIQuC4Bku", confirmado por el
      usuario). El saga que empezó en la Sesión 9 queda cerrado.

## Sesión 15 (2026-08-31) — Taller de Intents (docs/ui/)

33. **Nuevo espacio de pruebas totalmente aislado**, en
    `https://automatizacion-it.github.io/my-skills/ui/` — un HTML
    autocontenido (`docs/ui/index.html`, sin dependencias de la app
    principal) para construir y probar intents nuevos ANTES de tocar
    producción. Sigue un proceso de 6 pasos documentado en
    `docs/ui/README.md`: nombre del menú → nombre del intent → subintents
    → JSON generado → probar (log manual) → copiar a la UI principal
    (paso manual, sin automatizar a propósito).
    - **Primer caso de prueba**: "Audiolibro" (`leer_audiolibro`) —
      pregunta qué libro, espera la respuesta, **pide confirmación antes
      de ejecutar** (novedad frente al sistema de música: ahí se ejecuta
      directo tras la primera respuesta). Borrador guardado en
      `docs/ui/borradores/audiolibro.json`.
    - El taller genera el JSON en vivo desde un formulario (menú, intent,
      disparadores, pregunta, checkbox de confirmación, tabla de
      opciones), lo simula con un chat de prueba (sin ejecutar nada real
      — la "acción" solo se describe en el chat), y lleva un log de
      resultados **manual** (copiar/descargar, nunca se conecta solo a
      ninguna IA — el usuario decide cuándo pegarlo en una sesión de
      Claude).
    - **Probado con jsdom** (DOM real simulado en Node, no solo lógica
      aislada): 5 escenarios completos — disparador→pregunta,
      pregunta→confirmación, confirmación→ejecución, cancelación
      (responder "no"), y respuesta no reconocida. Los 5 pasaron
      exactamente como se esperaba.
    - **Patrón nuevo respecto a `intents_grupos.js`**: agrega un paso de
      confirmación opcional (`"confirmar": true` en el JSON) antes de
      ejecutar la acción — útil para acciones costosas/difíciles de
      deshacer. `intents_grupos.js` (música) no lo tiene todavía; si este
      patrón se valida bien aquí, sería candidato a incorporarse allá
      también en el paso 6 (copiar a la UI principal).
34. **Voz real + micrófono agregados al Taller**: el taller ya no es
    100% mudo/de texto — ahora carga `../js/tts_elevenlabs.js` de verdad
    (mismo archivo que usa la app principal), así que cuando "SCALL"
    habla en el simulador, usa exactamente la misma configuración de voz
    (ElevenLabs o Gemini TTS, la que esté activa) guardada en
    `localStorage` — porque `docs/ui/` vive en el mismo dominio
    (`automatizacion-it.github.io`), el `localStorage` se comparte con
    la app principal automáticamente, sin ninguna sincronización manual.
    - Se agregó `getApiKey()` (réplica exacta de la de `app.js`, sin
      cargar las 1300+ líneas de ese archivo) para que la ruta de Gemini
      TTS funcione dentro del taller.
    - Botón **"🎤 Hablar"** con reconocimiento de voz real (Web Speech
      API, `es-CO`) — al terminar de hablar, el texto reconocido se
      procesa exactamente igual que si se hubiera escrito.
    - **Límite de las pruebas automatizadas**: `speechSynthesis` y
      `SpeechRecognition` son APIs exclusivas del navegador — jsdom no
      las implementa, así que esa parte se confirmó por inspección de
      código y viendo que el flujo llega correctamente al punto donde se
      invocan, pero la prueba de audio/micrófono real solo se puede hacer
      a mano en Chrome.
