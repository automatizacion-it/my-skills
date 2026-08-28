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
