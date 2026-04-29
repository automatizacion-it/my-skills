# Cómo crear una skill nueva

## Estructura mínima de una skill

Cada skill vive en su propia carpeta dentro de `skills/`:

```
skills/
└── nombre-de-tu-skill/
    └── SKILL.md          ← obligatorio
    └── ejemplos/         ← opcional pero recomendado
        └── input1.txt
        └── output1.txt
```

---

## Plantilla de SKILL.md

```markdown
# SKILL: [Nombre descriptivo]

## Propósito
Una oración que explique exactamente qué hace esta skill.

## Cuándo usar esta skill
- Caso de uso 1
- Caso de uso 2

## Instrucciones

### Paso 1 — [Nombre del paso]
Qué debe hacer Claude primero.

### Paso 2 — [Nombre del paso]
Qué sigue.

## Restricciones
- NO hacer X
- Siempre hacer Y
- Límite de Z palabras

## Output esperado
Describe el formato exacto de la respuesta. Usa bloques de código
si el formato es fijo (JSON, Markdown, tabla, etc.)

## Ejemplos
### Input
"Ejemplo de input"

### Output esperado
"Ejemplo de output"
```

---

## Consejos para escribir buenas skills

**Sé específico en las restricciones**
Malo: "Sé profesional"
Bueno: "No uses emojis. Párrafos de máximo 3 oraciones. Sin jerga técnica."

**Define el output con exactitud**
Claude sigue mejor las instrucciones cuando ve un ejemplo concreto del
formato esperado, no solo una descripción de él.

**Separa "qué hacer" de "cómo hacerlo"**
El propósito explica el qué. Las instrucciones paso a paso explican el cómo.

**Prueba con inputs extremos**
¿Qué pasa si el input está vacío? ¿Si tiene demasiado texto? ¿Si está
en otro idioma? Agrega restricciones para esos casos borde.

**Versiona tus skills**
Si cambias una skill significativamente, usa comentarios o una sección
`## Historial de cambios` al final del SKILL.md.

---

## Convenciones de nombres

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Carpeta de skill | `kebab-case` | `redactar-email` |
| Archivo principal | `SKILL.md` (mayúsculas) | `SKILL.md` |
| Ejemplos de input | `ejemplo-N-input.txt` | `ejemplo-1-input.txt` |
| Ejemplos de output | `ejemplo-N-output.md` | `ejemplo-1-output.md` |

---

## Flujo de trabajo recomendado

1. Identifica una tarea repetitiva que haces con Claude
2. Copia la plantilla y completa cada sección
3. Prueba con `python scripts/run_skill.py --skill tu-skill --input "test"`
4. Ajusta las instrucciones hasta que el output sea consistente
5. Agrega ejemplos reales en la carpeta `ejemplos/`
6. Haz commit con un mensaje descriptivo: `feat: add skill redactar-propuesta`
