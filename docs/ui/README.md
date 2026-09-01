# Taller de Intents — SCALL

Espacio de pruebas **totalmente aislado** de la app principal. Sirve para
construir y probar intents nuevos antes de arriesgarse a romper algo en
producción.

URL: `https://automatizacion-it.github.io/my-skills/ui/`

## El proceso (6 pasos)

1. **Nombre del menú** — cómo se va a ver en el menú lateral (ej: "Audiolibro").
2. **Nombre del intent** — el identificador interno (ej: `leer_audiolibro`).
3. **Subintents** — las opciones concretas dentro del intent (ej: los libros
   disponibles), cada una con su nombre y las palabras clave que la
   identifican cuando el usuario responde.
4. **Se genera el JSON** — el taller arma automáticamente el archivo de
   configuración a partir del formulario, en el mismo formato que ya usa
   `docs/data/intents_musica.json` en producción (con la mejora de
   confirmación agregada aquí).
5. **Probar / log** — se simula la conversación completa (disparador →
   pregunta → confirmación → ejecución) sin tocar nada real. El log de
   resultados es **manual**: cuando tú decidas, lo copias o descargas y lo
   pegas en una sesión de Claude para revisar juntos.
6. **Copiar a la UI principal** — no hay botón automático a propósito. Una
   vez que el simulador se comporta bien, se le pide a Claude que copie el
   intent a `docs/data/` y lo conecte en `docs/js/intents_grupos.js`, igual
   que se hizo con música. Así ningún intent nuevo llega a producción sin
   haberse probado primero aquí.

## Diferencia con el sistema de música (intents_grupos.js)

El de música solo pregunta una vez y ejecuta directo. Este taller agrega un
paso opcional de **confirmación** (`"confirmar": true` en el JSON) — útil
para acciones más "caras" o difíciles de deshacer (como empezar a leer un
libro completo), donde vale la pena confirmar antes de ejecutar.

## Estructura de archivos

```
docs/ui/
├── index.html              # El taller en sí (autocontenido, sin dependencias)
├── borradores/
│   └── audiolibro.json     # Primer ejemplo, ya probado
└── README.md               # Este archivo
```
