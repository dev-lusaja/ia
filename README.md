# 🗺️ El Viaje Evolutivo de la IA: Mapa Interactivo de Aprendizaje

Este es un sitio web interactivo y responsivo diseñado para enseñar conceptos de Inteligencia Artificial (IA) a través de una **narrativa de evolución histórica y lógica**. En lugar de mostrar conceptos de forma aislada, la plataforma conecta las tecnologías explicando qué limitación de la tecnología anterior impulsó la creación de la siguiente (por ejemplo, cómo los límites del Machine Learning tradicional forzaron la creación de las Redes Neuronales, y cómo estas evolucionaron al Deep Learning y los Transformers).

## 🚀 Características Principales

1. **Diseño Premium y Futurista**: Interfaz en modo oscuro con estética de neón de alta fidelidad, efectos de *glassmorphism* y animaciones de flujo en las conexiones.
2. **Navegación Táctil y Fluida**:
   - **Desktop**: Paneo con `click & drag`, zoom con la rueda del ratón y controles en pantalla.
   - **Móvil**: Paneo táctil nativo, zoom con pellizco (`pinch-to-zoom`) y detalles visualizados en un panel inferior deslizante (*Bottom Sheet*).
3. **Aprendizaje Incremental en 3 Niveles** por concepto:
   - 🌱 **Nivel Básico**: Explicaciones intuitivas mediante analogías sencillas del día a día.
   - 🌿 **Nivel Intermedio**: Desglose técnico de componentes y clasificaciones.
   - 🚀 **Nivel Técnico/Matemático**: Fórmulas detalladas, ecuaciones y pequeños fragmentos de código listos para su uso.
4. **Arquitectura Orientada a Datos (Data-Driven)**: Todo el contenido de las lecciones, conexiones y posiciones se define en un único archivo modular `data.js`, haciendo que editar, añadir o eliminar temas sea increíblemente fácil.
5. **Gamificación y Progreso**: Guarda el avance en el navegador (`localStorage`), resaltando con luces de neón los nodos completados y habilitando de forma fluida el siguiente paso de la historia.
6. **Buscador Integrado**: Filtra y enfoca nodos del mapa instantáneamente en tiempo real.

---

## 📂 Estructura del Proyecto

```
ia/
├── index.html         # Maquetación y estructura principal
├── styles.css         # Estética visual, neones y responsividad
├── data.js            # Base de datos de lecciones y posiciones (Fácil de editar)
├── app.js             # Lógica del Canvas interactivo, zoom, pan y progreso
├── netlify.toml       # Configuración para despliegue en Netlify
├── IDEA.md            # Temario narrativo de referencia original
└── README.md          # Este archivo explicativo
```

---

## 🛠️ Cómo Editar el Contenido

Para agregar, editar o eliminar información del mapa, abre el archivo [data.js](file:///d:/code/ia/data.js) y edita su estructura:

- **Modificar un tema existente**: Busca el nodo por su `id` y edita los campos `title`, `summary`, `transitionFromPrevious` o el contenido de los niveles en `levels.basic`, `levels.intermediate` o `levels.technical`.
- **Añadir un tema nuevo**: Agrega un objeto con la estructura estándar al array `conceptMap`, define sus coordenadas `{x, y}` para situarlo en el mapa y enlázalo en `connectsTo` desde el tema previo para que la línea de conexión se dibuje automáticamente.

---

## ☁️ Despliegue en Netlify

Este proyecto está 100% optimizado para ser desplegado de forma estática en Netlify sin necesidad de compilación o dependencias complejas de Node.js.

### Pasos para desplegar:
1. Sube este repositorio a **GitHub**, **GitLab** o **Bitbucket**.
2. Inicia sesión en **Netlify** y selecciona **"Add new site" > "Import an existing project"**.
3. Selecciona tu repositorio.
4. En la configuración de construcción:
   - **Build Command**: *Dejar en blanco* (No se requiere compilar)
   - **Publish directory**: `.` (La raíz del proyecto)
5. Haz clic en **Deploy Site**. Netlify leerá automáticamente el archivo `netlify.toml` y activará el sitio en segundos con HTTPS y compresión habilitada.


## 👨‍💻 Desarrollo local

```bash
python -m http.server 8000
```