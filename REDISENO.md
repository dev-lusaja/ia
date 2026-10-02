# Rediseño: ruta de aprendizaje + explicaciones interactivas

Plan para pasar del mapa como única navegación a una **ruta lineal tipo Duolingo/Brilliant**, con **demos interactivas** en los temas clave. El mapa se conserva como vista de conjunto.

> Estado: **implementado** (fases 1, 2, 4 y 5 sin racha). **El quiz (sección 5, fase 3) se descartó**: los temas se completan con el botón «Completar y seguir →», que además abre el siguiente.
> Decisiones tomadas: portada = ruta; niveles como pestañas (se recuerda el último); sin racha de días.
> Cambio posterior (2026-10): las pestañas de nivel se quitaron. El tema se lee de corrido, todo a la vista, al estilo de organización de Brilliant: concepto base → ilustración (demo/figuras) → perspectiva computacional, siempre abierta. Desde 2026-10 no hay nivel intermedio: se fusionó en el concepto base.

---

## 1. Por qué

- **La historia es lineal.** Los 24 temas forman una cadena (1 → 24); cada uno apunta a un único siguiente. El mapa obliga a desplazarse y hacer zoom para algo que en la práctica es "seguir al siguiente".
- **Referente: Duolingo.** En 2022 cambió su árbol de habilidades con ramas por un camino lineal, porque los usuarios no sabían qué hacer a continuación.
- **Referente: Brilliant.org.** Enseña con pasos cortos e interacción constante: pregunta o manipulación cada pocas pantallas.
- **En IA, lo que mejor enseña es manipular:** Illustrated Transformer (Jay Alammar), Transformer Explainer / CNN Explainer (Polo Club), TensorFlow Playground, Distill.pub. El concepto se entiende al tocarlo.
- **Qué se mantiene:** la narrativa ("¿Cómo llegamos aquí?") y los 3 niveles, que son lo mejor del proyecto.

## 2. Qué se toma de Duolingo (y qué no)

| Sí | No (por ahora) |
|---|---|
| Camino lineal visible, con el tema actual destacado | Vidas / corazones (castigan equivocarse; aquí queremos que se experimente) |
| Lecciones cortas con un final claro | Gemas, tienda, ligas |
| Feedback inmediato al responder | Notificaciones |
| Progreso por capítulo (anillos o barras) | Bloquear temas: todo sigue accesible, solo se *sugiere* el siguiente |
| Pantalla de "¡Capítulo completado!" | |
| *Opcional, más adelante:* racha de días | |

## 3. Estructura de pantallas

### Escritorio

```
┌───────────────┬──────────────────────────────────────────────┐
│ 🔍 Buscar      │  CAPÍTULO 3 · 7 de 24                    ↗ ✕ │
│               │  7. Redes neuronales artificiales            │
│ ◉ Cap 1  3/3  │                                              │
│   ✓ 1 Pensar  │  ¿Cómo llegamos aquí? ...                     │
│   ✓ 2 Intelig │                                              │
│   ✓ 3 ¿Qué IA │  [ Básico ][ Intermedio ][ Técnico ]          │
│ ◔ Cap 2  1/3  │                                              │
│   ✓ 4 ...     │  Texto de la lección ...                      │
│   ● 5 ...  ←  │                                              │
│   ○ 6 ...     │  ┌─ Pruébalo ───────────────────────────┐    │
│ ○ Cap 3       │  │  demo interactiva                     │    │
│   ...         │  └───────────────────────────────────────┘    │
│               │                                              │
│ 🗺 Ver mapa    │  ✅ Comprueba lo aprendido (2 preguntas)       │
│               │                          [ Siguiente → ]      │
└───────────────┴──────────────────────────────────────────────┘
```

- **Índice lateral (≈280 px):** capítulos plegables, cada tema con su estado (✓ completado, ● actual, ○ pendiente) y el color del capítulo. El tema actual siempre está visible.
- **Lección a pantalla completa**, con un ancho de lectura de unos 720 px. Deja de ser un panel lateral estrecho, lo que da espacio a las fórmulas y a las demos.
- **Satélites de imagen:** se muestran dentro de la lección, como figuras que abren el visor al hacer clic. Ya no son nodos aparte.

### Móvil

- **Barra superior:** capítulo actual, progreso (`7/24`) y botón ☰, que abre el índice como panel.
- **Lección a pantalla completa**, con "Siguiente →" fijo abajo.
- **El mapa**, accesible desde el menú.

### Portada / primera visita

- El modal de bienvenida actual. "Iniciar mi viaje" lleva a la ruta, al tema 1 o al primer tema pendiente (`getResumeNodeId()`).
- "🗺 Ver el viaje completo" abre el mapa actual como vista de conjunto. Al hacer clic en un tema del mapa, se abre su lección en la ruta.

## 4. Anatomía de una lección

Orden fijo, de arriba abajo:

1. **Cabecera:** capítulo, "N de 24", título, compartir (↗) y cerrar/volver.
2. **¿Cómo llegamos aquí?** (`transitionFromPrevious`).
3. **Pestañas de nivel:** Básico / Intermedio / Técnico. Se recuerda el último nivel elegido; es el antiguo punto 7 del backlog.
4. **Contenido** del nivel (`formatMarkdown`: Markdown + KaTeX).
5. **Pruébalo:** la demo interactiva, si el tema tiene una (sección 6).
6. **Comprueba lo aprendido:** de 1 a 3 preguntas (sección 5).
7. **Siguiente →** (`getNextLesson()`).

**Decisión abierta:** ¿los niveles siguen como pestañas, o pasan a ser **pasos seguidos** al estilo Brilliant (Básico → pregunta → Intermedio → pregunta → Técnico)? Los pasos siguen mejor a Duolingo, pero obligan a pasar por el nivel básico. Propuesta: mantener las pestañas en la primera versión y probar los pasos en un capítulo.

## 5. Autoevaluación (quiz)

### Datos (`data.js`)

```js
{
  id: "redes-neuronales",
  // ...campos actuales...
  quiz: [
    {
      question: "¿Qué hace la función de activación en una neurona artificial?",
      options: [
        "Suma las entradas",
        "Introduce no linealidad para decidir cuánto se activa",
        "Guarda los pesos entrenados"
      ],
      answer: 1,                       // índice de la correcta
      explanation: "Sin no linealidad, apilar capas equivale a una sola capa lineal."
    }
  ]
}
```

### Comportamiento

- **Al responder:** se marca en verde o rojo al instante y se muestra `explanation`, tanto si se acierta como si no. Se puede reintentar sin penalización.
- **Completado:**
  - Si el tema tiene `quiz`, se marca como completado al acertar todas las preguntas. La casilla manual desaparece.
  - Si el tema no tiene `quiz` todavía, se mantiene la casilla actual. Así se puede ir añadiendo quiz tema a tema.
- **Persistencia:** `localStorage`, igual que hoy (`ai-map-progress`). Opcionalmente, guardar también qué preguntas se acertaron.
- **Formato:** empezar solo con opción múltiple. Más adelante: ordenar pasos o completar un hueco.

## 6. Demos interactivas

Todas en JavaScript puro, sin dependencias nuevas, dentro de la lección.

Cada demo es un módulo `demos/<nombre>.js` que exporta `mount(elemento)`. En el tema se enlaza con un campo nuevo:

```js
{ id: "llm", demo: "temperatura", ... }
```

| Prioridad | Tema | Demo | Qué enseña | Cómo se hace |
|---|---|---|---|---|
| 1 | Tokenización (satélite `tokens` / cap. 5) | Escribir una frase y ver los tokens coloreados, con su número de ID | Que el modelo no ve palabras sino trozos; las palabras raras se parten | Tokenizador simplificado con un vocabulario pequeño precalculado (sin tiktoken real, que pesa varios MB). Avisar de que es una aproximación |
| 2 | Espacio latente (13) | Palabras en un plano 2D. Al elegir dos, se muestra su similitud coseno; también rey − hombre + mujer ≈ reina | Que el significado es posición y que la similitud es un ángulo | Vectores 2D precalculados para unas 20 palabras, dibujados en SVG; la fórmula es la que ya está en el contenido |
| 3 | Redes neuronales (7) | Perceptrón con sliders para `w₁`, `w₂` y `b`, y la frontera de decisión separando puntos de dos colores | Qué hacen realmente los pesos y el sesgo | Canvas o SVG con unos 20 puntos fijos |
| 4 | LLM (15) | Siguientes palabras candidatas con sus probabilidades y un slider de temperatura | Que un LLM predice probabilidades, y qué es la temperatura | Distribución precalculada para 2 o 3 frases de ejemplo, con softmax en vivo |
| 5 | Cómo aprende una máquina (4) | Una bola que baja por una curva de error, con un slider de tasa de aprendizaje | Descenso de gradiente, y por qué una tasa demasiado alta oscila | Una función 1D en SVG, con animación paso a paso |
| 6 | Transformer (14) | Al pasar el ratón sobre una palabra se ve a qué otras palabras "atiende" (líneas de grosor variable) | La idea de self-attention | Pesos precalculados para una frase ("El gato se sentó porque estaba cansado") |

**Reglas comunes:**
- Funcionar con ratón, táctil y teclado (sliders nativos `<input type="range">`).
- Respetar `prefers-reduced-motion`: sin animación automática, solo por pasos.
- Usar el color del capítulo (`--chapter-neon`).
- Texto corto de "Qué observar" encima de la demo, y una pregunta de reflexión debajo.

## 7. Qué se reutiliza del código actual

| Existente | Uso en el rediseño |
|---|---|
| `data.js` (temas, niveles, transiciones, capítulos, colores `rgb`) | Igual; solo se añaden `quiz` y `demo` |
| `formatMarkdown` (marked + KaTeX) | Igual |
| Búsqueda (panel de resultados, ↑↓, `/`) | Se mueve al índice lateral; al abrir un resultado se abre la lección |
| Enlaces `#id`, historial, botón atrás | Igual (`setUrlNode`, `openFromUrl`) |
| `getNextLesson`, `getResumeNodeId` | Igual |
| Progreso en `localStorage` | Igual; se amplía con el estado del quiz |
| Compartir enlace, visor de imágenes | Igual |
| Mapa (pan, zoom, nodos como botones) | Pasa a ser la vista "Ver el viaje completo" |

## 8. Fases

1. **Ruta y lección a pantalla completa.** Índice lateral, vista de lección, barra móvil, "Ver mapa". Sin cambios en los datos. *Se puede comparar con el mapa antes de seguir.*
2. **Recordar el nivel elegido** (pequeño).
3. **Quiz:** componente y preguntas para el capítulo 1 como piloto; después, el resto de capítulos.
4. **Demos, una por entrega**, en el orden de prioridad de la tabla. Empezar por tokenización o espacio latente.
5. **Pulido tipo Duolingo:** pantalla de capítulo completado, anillos de progreso por capítulo, racha opcional.

## 9. Decisiones abiertas

- [ ] ¿Portada = ruta (con el mapa como opción) o portada = mapa (con la ruta como lectura)? *Propuesta: ruta.*
- [ ] ¿Niveles como pestañas o como pasos seguidos? (sección 4)
- [ ] ¿El quiz es obligatorio para marcar un tema como completado, o sigue existiendo la casilla manual?
- [ ] ¿Quién redacta las preguntas? ¿2 por tema? (24 temas → unas 48 preguntas)
- [ ] ¿Añadir racha de días?

## 10. Pendientes heredados del backlog anterior

- En móvil, el evento `resize` recentra el mapa mientras el usuario se desplaza (llamar solo a `clampPan()`). Deja de importar si el mapa pasa a ser secundario.
- `(0/23 completados)` está escrito a mano en `index.html` (son 24 temas; JS lo sobrescribe al cargar).
