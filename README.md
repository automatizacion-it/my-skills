# SCALL — Asistente de Voz Inteligente

Aplicación web de asistente de voz inteligente desplegada en GitHub Pages.
Control por voz de múltiples funcionalidades: música, alarmas, clima, navegación,
Google Drive, traducción, noticias y más.

## Demo

Desplegada en GitHub Pages (rama `main` → carpeta `docs/`).

## Funcionalidades

- Reproducción de música (Spotify, Radio)
- Alarmas y recordatorios de cumpleaños
- Clima y noticias en tiempo real
- Navegación GPS y rutas
- Integración con Google Drive
- Traducción de idiomas
- Síntesis de voz (ElevenLabs TTS)
- Información de sismos (Colombia)
- Visualizador de audio y ecualizador
- Botón SOS de emergencia

## Estructura

```
my-skills/
├── docs/                   # Aplicación SCALL (GitHub Pages)
│   ├── index.html          # App principal
│   ├── css/styles.css      # Estilos
│   └── js/                 # Módulos de funcionalidades
│       ├── app.js           # Orquestador principal
│       ├── intents.js       # Procesamiento de comandos
│       ├── radio.js         # Reproducción de audio
│       ├── clima.js         # Clima
│       ├── gdrive.js        # Google Drive
│       ├── tts_elevenlabs.js# Síntesis de voz
│       └── ...              # 30+ módulos
└── .github/workflows/
    └── deploy.yml          # CI/CD: push a main → GitHub Pages automático
```

## Deploy

**Automático**: Cualquier push a `main` despliega `docs/` en GitHub Pages tal
cual está en el repo (el workflow no inyecta API keys ni ninguna otra variable).

**Manual**: no hay script de deploy en el repo por ahora. El flujo típico es
editar/descargar los archivos correspondientes en `docs/`, `git add`, `git commit`
y `git push` a `main`.

## Skills

Las skills de Claude fueron migradas a:
**[my-new-skill](https://github.com/automatizacion-it/my-new-skill)**
