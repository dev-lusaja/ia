# 🧠 El Viaje Evolutivo de la IA: una ruta interactiva de aprendizaje

Este es un sitio web interactivo y responsivo diseñado para enseñar conceptos de Inteligencia Artificial (IA) a través de una **narrativa de evolución histórica y lógica**. En lugar de mostrar conceptos de forma aislada, la plataforma conecta las tecnologías explicando qué limitación de la tecnología anterior impulsó la creación de la siguiente (por ejemplo, cómo los límites del Machine Learning tradicional forzaron la creación de las Redes Neuronales, y cómo estas evolucionaron al Deep Learning y los Transformers).

## 🚀 Características Principales

1. **Diseño oscuro y descansado**: paleta suave por capítulo pensada para leer sin cansar la vista.
2. **Una ruta lineal**: índice lateral por capítulos, flechas para ir al tema anterior o siguiente y el botón «Completar y seguir».
3. **Aprendizaje Incremental en 3 Niveles** por concepto, que se leen seguidos:
   - 🌱 **Nivel Básico**: Explicaciones intuitivas mediante analogías sencillas del día a día.
   - 🌿 **Nivel Intermedio**: Desglose técnico de componentes y clasificaciones.
   - 🚀 **Nivel Técnico/Matemático**: Fórmulas detalladas, ecuaciones y pequeños fragmentos de código listos para su uso.
4. **Arquitectura Orientada a Datos (Data-Driven)**: Todo el contenido de las lecciones y su orden se define en un único archivo modular `data.js`, haciendo que editar, añadir o eliminar temas sea increíblemente fácil.
5. **Progreso**: Guarda el avance en el navegador (`localStorage`) y lo muestra en el índice con un anillo por capítulo.
6. **Demos interactivas** («Pruébalo») en los temas con un mecanismo que se puede experimentar.
7. **Buscador Integrado**: Encuentra temas por título o contenido en tiempo real.

---

## 📂 Estructura del Proyecto

```
ia/
├── index.html         # Maquetación y estructura principal
├── styles.css         # Estética visual, neones y responsividad
├── data.js            # Base de datos de lecciones (Fácil de editar)
├── app.js             # Ruta de temas, índice, búsqueda y progreso
├── demos/             # Demos interactivas (un módulo por demo)
├── netlify.toml       # Configuración para despliegue en Netlify
├── IDEA.md            # Temario narrativo de referencia original
└── README.md          # Este archivo explicativo
```

---

## 🛠️ Cómo Editar el Contenido

Para agregar, editar o eliminar temas, abre el archivo [data.js](file:///d:/code/ia/data.js) y edita su estructura:

- **Modificar un tema existente**: Busca el nodo por su `id` y edita los campos `title`, `transitionFromPrevious` o el contenido de los niveles en `levels.basic`, `levels.intermediate` o `levels.technical`.
- **Añadir un tema nuevo**: Agrega un objeto con la estructura estándar al array `conceptMap`, y enlázalo en `connectsTo` desde el tema previo: ese enlace define el orden de la ruta.

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