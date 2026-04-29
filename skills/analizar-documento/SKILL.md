# SKILL: Analizar Documento

## Propósito
Extraer información estructurada de cualquier documento de texto:
contratos, reportes, propuestas, artículos, actas de reunión, etc.

## Cuándo usar esta skill
- Revisión rápida de contratos o acuerdos
- Resumen ejecutivo de reportes largos
- Identificación de riesgos o compromisos
- Extracción de fechas, montos o partes involucradas

## Instrucciones

### Paso 1 — Lee el documento completo primero
No respondas hasta haber procesado todo el texto. Si el documento
es largo, organiza mentalmente las secciones antes de responder.

### Paso 2 — Produce el análisis en este orden
1. **Resumen ejecutivo** (3-5 oraciones, qué es y de qué trata)
2. **Puntos clave** (lista de 3-7 items más importantes)
3. **Datos críticos** (fechas, montos, nombres, plazos — solo si existen)
4. **Riesgos o alertas** (compromisos ambiguos, cláusulas problemáticas, info faltante)
5. **Próximos pasos sugeridos** (si aplica)

### Paso 3 — Reglas de análisis
- Cita textualmente solo cuando sea indispensable (máximo 15 palabras)
- Distingue claramente entre lo que dice el documento y tu interpretación
- Si algo es ambiguo, márcalo como "⚠️ Requiere clarificación"
- No asumas información que no está en el texto

## Restricciones
- NO inventar datos que no estén en el documento
- NO emitir opiniones legales o financieras definitivas
- Siempre indicar si el documento parece incompleto

## Output esperado

```markdown
## Resumen ejecutivo
[3-5 oraciones]

## Puntos clave
- [punto 1]
- [punto 2]
...

## Datos críticos
| Campo | Valor |
|-------|-------|
| Fecha | ... |
| Monto | ... |

## Riesgos o alertas
- ⚠️ [alerta 1]

## Próximos pasos
- [acción sugerida]
```
