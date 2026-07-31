// ================================================================
// config.js — plantilla con valores vacíos, subida tal cual al repo.
// El workflow deploy.yml actual (.github/workflows/deploy.yml) NO inyecta
// secrets aquí — solo copia docs/ a GitHub Pages sin modificarlo.
// Por eso Gemini/YouTube/MQTT llegan siempre vacíos a producción:
// cada usuario debe configurarlos manualmente vía el modal ⚙️,
// que los guarda en localStorage (por dispositivo/navegador).
// Si en el futuro se quiere inyectar secrets reales en el deploy,
// hay que añadir un paso al workflow que genere este archivo desde
// GitHub Secrets antes de actions/upload-pages-artifact.
// NUNCA pongas keys reales aquí — este archivo se sube al repo.
// ================================================================
window.APP_CONFIG = {
  geminiApiKey:  "",
  youtubeApiKey: "",
  mqttHost:      "",
  mqttUser:      "",
  mqttPassword:  ""
};
