\# SKILL: Generar Landing Page para Instagram



\## Propósito

Generar el código HTML completo de una landing page de una sola página,

optimizada para visitantes que llegan desde Instagram (móvil primero,

carga rápida, acción clara e inmediata).



\## Cuándo usar esta skill

\- Crear una página de destino para el link en bio de Instagram

\- Capturar leads desde stories o publicaciones

\- Promocionar un producto, servicio o evento específico

\- Reemplazar o complementar un Linktree personalizado



\## Inputs requeridos

El usuario debe proporcionar:

\- \*\*Nombre del negocio o marca\*\*

\- \*\*Qué ofrece\*\* (producto, servicio, evento)

\- \*\*Acción principal\*\* (comprar, agendar, suscribirse, contactar)

\- \*\*Colores o estilo\*\* (opcional — si no se indica, usar paleta moderna y limpia)

\- \*\*Redes o links adicionales\*\* (opcional)



Si falta algún input crítico, pregunta antes de generar.



\## Instrucciones



\### Paso 1 — Define la estructura

Toda landing page debe tener exactamente estas secciones en orden:

1\. \*\*Hero\*\* — logo o nombre de marca + headline impactante + subheadline

2\. \*\*Propuesta de valor\*\* — 3 beneficios concretos (iconos + texto corto)

3\. \*\*CTA principal\*\* — botón grande, color contrastante, texto de acción

4\. \*\*Prueba social\*\* — 1 o 2 testimonios cortos (inventar si no se proporcionan, marcándolos como placeholder)

5\. \*\*CTA secundario\*\* — formulario de email O botón de WhatsApp/contacto

6\. \*\*Footer\*\* — nombre de marca + redes sociales si se proporcionaron



\### Paso 2 — Reglas de diseño mobile-first

\- Ancho máximo del contenido: `480px` centrado

\- Fuente principal: Google Fonts (Inter o Poppins)

\- Botones CTA: mínimo `56px` de alto, bordes redondeados `12px`

\- Imágenes: usar gradientes o SVG inline, NO imágenes externas que puedan fallar

\- Espaciado generoso: `padding` mínimo de `24px` en secciones

\- Todo debe verse perfecto en pantalla de 390px de ancho (iPhone 14)



\### Paso 3 — Reglas de conversión

\- El headline debe hablar del BENEFICIO, no del producto

\- El CTA principal debe estar visible sin hacer scroll (above the fold)

\- Colores del botón CTA deben contrastar fuertemente con el fondo

\- Máximo UNA acción principal por página

\- Velocidad: no cargar recursos externos salvo Google Fonts



\### Paso 4 — Genera el código

Produce un único archivo `index.html` autocontenido con:

\- CSS embebido en `<style>` (no archivos externos)

\- JavaScript mínimo inline si se necesita (solo para formulario o animaciones simples)

\- Meta tags para móvil y Open Graph para compartir en redes

\- Sin dependencias de frameworks (no Bootstrap, no Tailwind CDN)



\## Restricciones

\- NO usar imágenes de URLs externas (pueden romperse)

\- NO usar más de 2 fuentes tipográficas

\- NO generar código con errores de HTML — siempre válido y completo

\- NO incluir más de 1 CTA principal

\- El archivo debe funcionar abriéndolo directamente en el navegador (sin servidor)



\## Output esperado

Un bloque de código HTML completo y listo para usar:



```html

<!DOCTYPE html>

<html lang="es">

<head>

&#x20; <meta charset="UTF-8">

&#x20; <meta name="viewport" content="width=device-width, initial-scale=1.0">

&#x20; ...

</head>

<body>

&#x20; ...

</body>

</html>

```



Después del código, incluir una sección breve:

