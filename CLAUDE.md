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
