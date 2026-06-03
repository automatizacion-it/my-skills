# my-skills (SCALL) — Guía para Claude Code

## Qué es este proyecto

Aplicación web SCALL — asistente de voz inteligente desplegada en GitHub Pages.
La carpeta `docs/` contiene toda la aplicación y es lo que se despliega.

> Las skills de Claude fueron migradas a [my-new-skill](https://github.com/automatizacion-it/my-new-skill).

## Estructura

```
my-skills/
├── docs/                    # App SCALL completa (GitHub Pages)
│   ├── index.html           # Punto de entrada
│   ├── css/styles.css       # Estilos globales
│   ├── js/                  # 30+ módulos JavaScript
│   └── skills/              # UIs de skills (HTML)
├── .github/workflows/
│   └── deploy.yml           # Push a main → deploy automático
└── deploy_scall.bat         # Deploy manual desde Windows
```

## Deploy

**Automático**: Push a `main` → GitHub Actions despliega `docs/` en GitHub Pages.

**Manual**: Ejecutar `deploy_scall.bat` — copia archivos de `Downloads/` a `docs/`, commit y push.

## Archivos importantes

- `docs/js/config.js` — excluido de git (claves API). Crearlo manualmente en local o
  configurarlo como secret en GitHub Actions para producción.
- `docs/js/app.js` — orquestador principal de la app
- `docs/js/intents.js` — procesamiento de comandos de voz
