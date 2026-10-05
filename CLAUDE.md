# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio. Toda la documentación `.md` del repo se escribe en español.

## Proyecto

Sitio estático en JS puro, sin build, que enseña IA como una historia (contenido en español): una ruta lineal de aprendizaje (índice lateral + tema a pantalla completa). El antiguo mapa conceptual con zoom se eliminó (2026-10); está en el historial de git si alguna vez hace falta. Se publica tal cual en Netlify (`netlify.toml`, directorio `.`). Sin tests, sin linter, sin bundler.

## Ejecutar en local

```bash
npm run dev                  # live-server (recarga automática)
python -m http.server 8000   # alternativa
```

## Arquitectura

Los scripts se cargan como globales en orden (`index.html`): KaTeX (CDN, diferido) → `marked` (CDN, versión fija) → `data.js` → `app.js`. Sin módulos; `app.js` lee directamente las globales `chapters` y `conceptMap`.

- **`data.js`**: todo el contenido. `chapters` (id, name, `rgb: "r, g, b"`) y `conceptMap` (array de nodos). Dos tipos de nodo:
  - **Tema**: `id`, `title` (`"N. Título"`; el botón de siguiente muestra el texto tras `". "`), `chapter`, `connectsTo` (ids: el primer id de tema es el siguiente tema; los ids de satélites los adjuntan), `transitionFromPrevious`, `levels.basic` y `levels.technical`, cada uno `{title, content}` (ya no hay nivel intermedio). El tema se lee de arriba abajo, todo visible: `basic` («Concepto base») → demo + figuras satélite → `technical` («Perspectiva computacional», con su propio `title` al lado salvo que lo repita) → botón de siguiente (`renderLessonContent`).
  - **Satélite**: `type: "satellite-image"` (abre el lightbox con `imageUrl` + `caption`) o `"satellite-logo"`; ambos usan `logoUrl` como icono. No entran en la numeración.
  - **`demo`** (opcional, en `lessonDemos` al final de `data.js`): nombre de un módulo ES `demos/<nombre>.js` que exporta `mount(el)`, cargado con `import()` en la sección «Pruébalo» (tras el concepto base). Un `<div class="demo-slot"></div>` dentro de `basic.content` monta la demo ahí y oculta «Pruébalo» (tema 3, ELIZA). Las demos usan JS/SVG puro, `<input type="range">` nativo, el color del capítulo (`--chapter-neon`) y respetan `prefers-reduced-motion`.
- **`app.js`**: una sola vista, la ruta: `openLesson`, índice lateral `renderPathIndex` con anillos de progreso por capítulo y búsqueda, flechas laterales (anterior/siguiente, solo navegan) y «Completar y seguir» vía `getNextLesson`. Hash de URL: `#<id-tema>`, `#<id-satélite>`; sin hash o con uno desconocido abre `getResumeNodeId()`. Los satélites se pintan dentro de su tema padre (`lessonSatellites`): imágenes como figuras que abren el lightbox, logos como `<details>` plegables. Completar el último tema de un capítulo muestra `showChapterDone`. `localStorage`: `ai-map-progress`, `ai-map-tutorial-seen`.

### Sintaxis del contenido (`formatMarkdown` en `app.js`)

Quita la sangría del template literal (si no, marked trata 4+ espacios como código), saca `$$…$$` / `$…$` a marcadores, ejecuta `marked.parse(…, { breaks: true })` y luego renderiza las fórmulas con KaTeX.

- **LaTeX**: en strings de JS las barras se duplican (`\\text`, `\\land`). Nunca pongas `$` dentro de un bloque HTML (se lee como fórmula); un signo de dólar literal (precios) se escribe `&#36;`.
- **Listas**: los ítems anidados se sangran hasta la columna del texto del padre (3 espacios bajo `1. `), y una línea justo después de una lista necesita una línea en blanco o se une al último ítem.
- **Encabezados**: `## Título` (o `## icono | Título`) = encabezado de sección siempre abierto; `### Título` = sección plegable (`<details class="content-section">`, cerrada) que llega hasta el siguiente `###`, una línea `---` (se consume, no se dibuja) o el final del nivel; un párrafo que es solo `**negrita**` = subtítulo (barra fina del color del capítulo; las líneas con `→` se dejan como están).
- **Bloques visuales** (una línea `a | b | c` por elemento; un `!` al inicio resalta ese elemento, `VIZ_ITEMS`):
  - ```` ```timeline ````: `fecha | título | texto`, línea de tiempo vertical.
  - ```` ```flow ````: `icono | título | texto`, pasos unidos por flechas.
  - ```` ```cards ````: `icono | título | texto`, cuadrícula de tarjetas.
  - ```` ```bars ````: `etiqueta | ancho % | nota`, barras horizontales.
  - El `icono` acepta un emoji o un nombre de [Lucide](https://lucide.dev/icons) (`search`, `trending-up`), pintado con máscara CSS desde `lucide-static` en jsDelivr en el color del capítulo (`vizIcon`). Títulos y textos aceptan markdown en línea.
- **Tablas** markdown: para comparaciones.
- **Diagramas propios**: `<figure class="viz-figure"><svg viewBox=…>…</svg><figcaption>…</figcaption></figure>` sin líneas en blanco dentro; clases `line`, `box` y `hi` (color del capítulo), atributos `font-size` en `<text>` y `style="max-width: …"` en SVG pequeños.
- **Texto + imagen lado a lado**: `<div class="media-row"><div>` + línea en blanco + markdown + línea en blanco + `</div><img …></div>` (tema 2).
- **Pregunta antes de la respuesta**: `<div class="predict"><p class="predict-question">pregunta</p>` + línea en blanco + respuesta en markdown + línea en blanco + `</div>` (usa `<strong>`, no `**`, dentro de la pregunta).

## Estilo narrativo

El sitio promete una historia, no una enciclopedia. Si un párrafo podría estar en Wikipedia tal cual, está mal escrito para este sitio.

### Voz

- **Siempre de tú, hablándole al lector**: «Imagina que…», «Lee esta frase», «Compruébalo tú mismo». Nada de «nosotros» de autor, el que explica desde fuera («veremos», «definimos»), tampoco en la perspectiva computacional ni en las transiciones: «Ya sabes predecir precios…», no «Ya sabemos…».
- **Excepción**: el «nosotros» inclusivo, que acompaña al lector al entrar en un ejemplo («Veámoslo con un problema más sencillo»), para no repetir «tú» una y otra vez. Como mucho una vez por tema.
- Español latinoamericano neutro (computadora, auto, celular).
- Frases cortas, una idea por frase; párrafos de 1 a 3 frases.

### `transitionFromPrevious`: el gancho

Es lo primero que lee el lector y tiene que dejarlo con una pregunta que quiera resolver. Lo que hace es crear una **tensión**, no resumir.

1. **Lo que ya funciona** (1 frase): lo que el tema anterior permitió hacer, en concreto.
2. **Dónde se rompe** (1 frase): un caso concreto que el lector pueda imaginar, no una abstracción («una limitación fundamental»).
3. **La pregunta** que abre este tema. Puede insinuar la idea con palabras llanas, pero sin nombrarla.

Máximo 3 frases (~60 palabras). Prohibido:
- nombrar la solución o el título del tema («Así nació el Deep Learning», «Ahí es donde entra el Aprendizaje por Refuerzo»);
- repetir la conclusión con la que terminó el tema anterior: si el tema 3 ya dijo «que la máquina las aprenda de ejemplos», el tema 4 no puede abrir planteando eso mismo como pregunta;
- anunciar sin tensión («el siguiente paso lógico es obvio», «hagamos una pausa»).

Bien (tema 19): *«Un LLM alineado responde al instante, escribiendo un token tras otro sin pararse a pensar. Para conversar funciona bien, pero falla en problemas de varios pasos: un error temprano en un cálculo arruina todo lo que viene después. ¿Y si le dieras tiempo para pensar antes de responder?»*

Mal (tema 10): *«…Junto con mejores técnicas de entrenamiento, eso permitió apilar decenas de capas ocultas. Nació el Deep Learning.»* No hay problema ni pregunta, solo un anuncio.

### Concepto base: contar, no definir

- **Apertura**: una de tres: escena histórica (persona + fecha + qué pasó, p. ej. `**Verano de 1956.** Un grupo de científicos…`), situación cotidiana del lector («Cada vez que tu correo manda un mensaje a spam…») o experimento del lector («Lee esta frase:»). Nunca una definición.
- **La historia, solo si aporta**: la escena histórica sitúa al lector, pero no tiene por qué ser el hilo del tema. Si no ayuda a entender el concepto, va en 1 o 2 frases y se pasa al ejemplo.
- **Un ejemplo conductor**: el ejemplo que explica el concepto puede no tener nada que ver con la historia, pero una vez elegido se mantiene en todo el tema y el técnico lo retoma con símbolos (tema 4: la casa de 100 m² recorre el ciclo, la montaña y el cálculo).
- **La situación antes que el nombre**: primero el lector vive el problema; después se nombra. Ninguna sección empieza con «Un X es…». El término en negrita aparece cuando ya se entiende lo que nombra.
  - Mal (tema 4): *«Un **modelo** es una fórmula que convierte datos en una predicción.»*
  - Bien: *«Quieres adivinar el precio de una casa. Tu regla: 800 dólares por metro. Esa regla es un **modelo**.»*
- **Pocos términos nuevos**: 3 o 4 en el concepto base. Los demás van a la perspectiva computacional. Si un tema complejo necesita más, se gana con más ejemplos, no con más definiciones.
- **Analogías cotidianas y cercanas** para lo difícil (el chat de la fiesta, bajar la montaña de noche), aclarando que son analogías.
- **Preguntas antes de explicar**: plantea la duda que tendría el lector («¿Cómo sabe el modelo si debe subir o bajar el número?») y luego respóndela.
- **Listas**: cada ítem es una definición corta más un ejemplo en cursiva (tema 1: *«Ves un auto acercándose rápidamente.»*).
- **Al menos un visual estático** (`flow`, `cards`, `bars`, tabla o `viz-figure`).
- **Cierre**: una idea clara que el lector se lleva. Sin adelantos.

### Perspectiva computacional

- Puede ser más formal, pero sigue siendo de tú.
- Retoma el ejemplo conductor del concepto base con símbolos; no lo vuelve a explicar.
- Cada fórmula se lee en palabras y cada símbolo se explica.
- Un ejemplo numérico paso a paso o un visual donde ayude.
- Los números inventados o redondeados se marcan como ilustrativos.

### Convenciones

- Números: coma decimal (`0,25`), espacio de miles (`86 000`), porcentaje con espacio (`75 %`).
- Comillas: «latinas» para citas y palabras mencionadas.
- Títulos con mayúscula solo inicial («Los límites de las primeras redes neuronales»).
- Términos en inglés: primero en español y el inglés en cursiva entre paréntesis la primera vez (*aprendizaje automático (machine learning)*). Las siglas consagradas (LLM, RAG, GPU) se quedan.
- Para nombrar un tema se usa su número global, el del título («tema 4»), no capítulo.posición («2.1»).
- Referencias cruzadas: «tema N», y **solo hacia atrás**. Nunca se menciona un tema o capítulo posterior («lo veremos en el tema N», «(siguiente tema)»): si algo se trata más adelante, simplemente no se menciona.

### Prohibido

- Adelantos del siguiente tema y referencias hacia adelante.
- Meta-narración de la página: «arriba vimos», «más abajo», «en esta sección veremos», «mira la demo».
- Abrir el tema o una sección con una definición.
- «Nosotros» de autor.
- Listas de definiciones sin ejemplo.

### Demos

Si el tema tiene un mecanismo, va una demo; si es escena o contexto, una animación SVG (no se generan más imágenes; las de `public/img/` son heredadas). Una demo tiene un marco narrativo («estás en tu cuarto…»), pasos guiados de uno en uno, etiquetas con doble nombre (término técnico · analogía), controles libres solo al final con un reto, y aclara que es una analogía.

## Cuidado al editar contenido

- Las demos son módulos ES cargados con `import()`: el sitio debe servirse por HTTP (no `file://`).
- Los colores de capítulo viven solo en `chapters[].rgb` (`data.js`); `app.js` los expone con `chapterColor(id)` / `chapterRgb(id)` como las variables CSS `--chapter-neon`/`--chapter-neon-rgb` (tema, índice, lightbox). Las variables `--neon-*` de `styles.css` son acentos de la interfaz, no colores de capítulo.
- Mantén sincronizados el orden de los temas, la cadena `connectsTo` y los números «N.» de los títulos.
- `transitionFromPrevious` se muestra arriba de su tema, en una caja sin título; no hay adelanto al final del tema anterior, así que cada tema cuenta su propia historia.
- `REDISENO.md` es el plan del rediseño ruta + demos (implementado; los quizzes se descartaron). Léelo antes de cambiar la navegación o el diseño del tema, o de añadir demos.
