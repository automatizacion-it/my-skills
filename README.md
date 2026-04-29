# 🧠 My Claude Skills

Repositorio de skills personalizadas para automatizar tareas con la API de Claude.

## ¿Qué es una skill?

Una skill es un archivo `SKILL.md` que Claude lee **antes** de ejecutar una tarea.
Contiene instrucciones precisas, restricciones y ejemplos para que Claude produzca
resultados consistentes y de alta calidad.

## Estructura

```
my-skills/
├── skills/
│   ├── redactar-email/
│   │   └── SKILL.md
│   ├── analizar-documento/
│   │   └── SKILL.md
│   └── generar-reporte/
│       └── SKILL.md
├── scripts/
│   └── run_skill.py       # Script para invocar skills via API
├── docs/
│   └── como-crear-skills.md
└── README.md
```

## Uso rápido

```python
from scripts.run_skill import run_skill

resultado = run_skill(
    skill="redactar-email",
    input="Escribe un email a un cliente para hacer seguimiento de una propuesta"
)
print(resultado)
```

## Cómo agregar una skill nueva

1. Crea una carpeta en `skills/nombre-de-tu-skill/`
2. Agrega un archivo `SKILL.md` siguiendo la plantilla en `docs/`
3. Pruébala con `run_skill.py`
4. Haz commit y push

## Skills disponibles

| Skill | Descripción |
|-------|-------------|
| `redactar-email` | Redacta emails profesionales con tono y estructura correcta |
| `analizar-documento` | Extrae puntos clave, riesgos y resumen de documentos |
| `generar-reporte` | Genera reportes estructurados a partir de datos crudos |
