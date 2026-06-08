// ==========================================================================
// 🛠️ CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================

const VIEWPORT_CONFIG = {
  canvasWidth: 2800,
  canvasHeight: 2100,
  minScale: 0.35,
  maxScale: 2.2,
  zoomSpeed: 0.05
};

let appState = {
  panX: 0,
  panY: 0,
  scale: 0.75, // Zoom inicial para ver parte del mapa
  isDragging: false,
  startX: 0,
  startY: 0,
  activeNode: null,
  activeTab: 'basic',
  completedNodes: [], // IDs cargados de localStorage
  
  // Soporte Multi-Touch (Pinch-to-zoom en móvil)
  touchStartDist: 0,
  touchStartScale: 1
};

// Elementos DOM Clave
const viewport = document.getElementById('map-viewport');
const canvas = document.getElementById('map-canvas');
const nodesContainer = document.getElementById('nodes-container');
const svgConnectionsGroup = document.getElementById('connections-group');
const svgElement = document.getElementById('map-svg-connections');
const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');

// ==========================================================================
// 🚀 INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Ajustar tamaño inicial del SVG coincidiendo con el lienzo
  svgElement.setAttribute('width', VIEWPORT_CONFIG.canvasWidth);
  svgElement.setAttribute('height', VIEWPORT_CONFIG.canvasHeight);
  
  // Cargar Progreso guardado
  loadProgress();
  
  // Renderizar Elementos del Mapa
  renderNodes();
  renderConnections();
  renderLegend();
  
  // Configurar Escuchadores de Eventos
  setupPanAndZoom();
  setupDrawerListeners();
  setupSearchListener();
  setupTutorial();
  
  // Actualizar indicadores de progreso generales
  updateProgressUI();
  
  // Esperar a que el navegador haya pintado el layout completo (crítico en móvil)
  // para que viewport.clientWidth/clientHeight reflejen las dimensiones reales.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      centerOnNodeId("que-es-pensar", true);
    });
  });

  // Re-centrar si el viewport cambia de tamaño (rotación, barra del navegador móvil)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Solo re-centra si no hay un nodo activo abierto en el drawer
      if (!appState.activeNode) {
        centerOnNodeId("que-es-pensar", true);
      }
    }, 200);
  });
});

// ==========================================================================
// 📦 CARGA Y GUARDADO DE PROGRESO (localStorage)
// ==========================================================================

function loadProgress() {
  const saved = localStorage.getItem('ai-map-progress');
  if (saved) {
    try {
      appState.completedNodes = JSON.parse(saved);
    } catch (e) {
      appState.completedNodes = [];
    }
  }
}

function toggleNodeCompletion(nodeId) {
  const index = appState.completedNodes.indexOf(nodeId);
  if (index > -1) {
    appState.completedNodes.splice(index, 1);
  } else {
    appState.completedNodes.push(nodeId);
  }
  
  localStorage.setItem('ai-map-progress', JSON.stringify(appState.completedNodes));
  
  // Actualizar interfaz del nodo y progreso
  const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
  if (nodeEl) {
    if (appState.completedNodes.includes(nodeId)) {
      nodeEl.classList.add('completed');
    } else {
      nodeEl.classList.remove('completed');
    }
  }
  
  updateProgressUI();
  renderConnections(); // Volver a dibujar conexiones para cambiar brillo
}

function updateProgressUI() {
  const conceptMapWithoutSatellites = conceptMap.filter(node => !node.isSatellite);
  const total = conceptMapWithoutSatellites.length;
  const completed = appState.completedNodes.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  document.getElementById('progress-percent').innerText = `${percent}%`;
  document.getElementById('progress-fraction').innerText = `(${completed}/${total} completados)`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

// ==========================================================================
// 🎨 RENDERIZADO DE NODOS Y CONEXIONES (SVG)
// ==========================================================================

function renderNodes() {
  nodesContainer.innerHTML = '';
  let nodeIndicator = 0
  conceptMap.forEach((node, index) => {
    if (!node.isSatellite) {
      nodeIndicator = nodeIndicator + 1
    }
    const chapterObj = chapters.find(c => c.id === node.chapter);
    const neonColor = chapterObj ? chapterObj.color : 'var(--neon-cian)';
    const neonRgb = getRgbFromVariable(node.chapter);
    
    const nodeEl = document.createElement('div');
    nodeEl.className = 'concept-node';
    if (appState.completedNodes.includes(node.id)) {
      nodeEl.classList.add('completed');
    }
    nodeEl.setAttribute('data-id', node.id);
    nodeEl.setAttribute('data-search-text', `${node.title} ${node.summary}`.toLowerCase());
    
    // Asignar variables personalizadas de CSS para estilos dinámicos de neón
    nodeEl.style.left = `${node.coords.x}px`;
    nodeEl.style.top = `${node.coords.y}px`;
    nodeEl.style.setProperty('--neon-color', neonColor);
    nodeEl.style.setProperty('--neon-rgb', neonRgb);
    
    // Contenido del Nodo
    if (!node.isSatellite) {
    nodeEl.innerHTML = `
      <div class="node-indicator">${nodeIndicator}</div>
      <span class="node-title">${node.title.split('. ')[1] || node.title}</span>
    `;
    } else {
      nodeEl.innerHTML = `
        <img src="${node.logoUrl}" alt="${node.title}" class="node-logo">
        <span class="node-title">${node.title.split('. ')[1] || node.title}</span>
      `;
    }      
    // Evento de clic en nodo
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer(node);
    })
    
    nodesContainer.appendChild(nodeEl);
  });
}

function renderConnections() {
  svgConnectionsGroup.innerHTML = '';
  
  conceptMap.forEach(node => {
    if (!node.connectsTo || node.connectsTo.length === 0) return;
    
    const chapterObj = chapters.find(c => c.id === node.chapter);
    const color = chapterObj ? chapterObj.color : 'rgba(255, 255, 255, 0.12)';
    
    node.connectsTo.forEach(targetId => {
      const targetNode = conceptMap.find(n => n.id === targetId);
      if (!targetNode) return;
      
      const x1 = node.coords.x;
      const y1 = node.coords.y;
      const x2 = targetNode.coords.x;
      const y2 = targetNode.coords.y;
      
      // Dibujar curvas Bezier suaves y orgánicas tipo S
      // Si fluye mayormente horizontal, controlamos X. Si es vertical, Y.
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      let pathD = '';
      
      if (dx >= dy) {
        // Curva horizontal fluida
        const ctrlX = (x2 - x1) * 0.45;
        pathD = `M ${x1} ${y1} C ${x1 + ctrlX} ${y1}, ${x2 - ctrlX} ${y2}, ${x2} ${y2}`;
      } else {
        // Curva vertical fluida
        const ctrlY = (y2 - y1) * 0.45;
        pathD = `M ${x1} ${y1} C ${x1} ${y1 + ctrlY}, ${x2} ${y2 - ctrlY}, ${x2} ${y2}`;
      }
      
      // Determinar si ambos nodos están completados
      const isPathActive = appState.completedNodes.includes(node.id) && appState.completedNodes.includes(targetNode.id);
      const pathOpacity = isPathActive ? 0.9 : 0.18;
      const pulseOpacity = isPathActive ? 0.95 : 0;
      
      // 1. Línea Base
      const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      linePath.setAttribute('d', pathD);
      linePath.setAttribute('class', 'connection-line');
      linePath.style.setProperty('--neon-color', color);
      linePath.style.opacity = pathOpacity;
      if (isPathActive) {
        linePath.style.strokeWidth = '5px';
        linePath.style.filter = 'drop-shadow(0 0 4px ' + color + ')';
      } else {
        linePath.style.strokeWidth = '3px';
      }
      svgConnectionsGroup.appendChild(linePath);
      
      // 2. Impulso Animado (solo si la ruta está activa o parcialmente activa)
      // Para darle dinamismo, pintamos el pulso siempre con menor opacidad en rutas no activadas
      const pulsePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pulsePath.setAttribute('d', pathD);
      pulsePath.setAttribute('class', 'connection-pulse');
      pulsePath.style.setProperty('--neon-color', color);
      pulsePath.style.opacity = isPathActive ? 1.0 : 0.1;
      
      // Variar la velocidad de animación del pulso según el capítulo
      const speed = 6 - (node.chapter * 0.4);
      pulsePath.style.animationDuration = `${speed}s`;
      
      svgConnectionsGroup.appendChild(pulsePath);
    });
  });
}

function renderLegend() {
  const legendList = document.getElementById('legend-list');
  legendList.innerHTML = '';
  
  chapters.forEach(chap => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.setProperty('--chapter-color', chap.color);
    item.innerHTML = `
      <span class="legend-color-dot"></span>
      <span>${chap.name}</span>
    `;
    legendList.appendChild(item);
  });
  
  // Alternar colapsado de leyenda
  const toggleBtn = document.getElementById('legend-toggle');
  const container = document.getElementById('legend-container');
  toggleBtn.addEventListener('click', () => {
    container.classList.toggle('collapsed');
  });
}

// Devuelve los valores RGB en texto según la variable de CSS para poder usar RGBA dinámico
function getRgbFromVariable(chapterId) {
  const rgbs = {
    1: "0, 255, 255",     // Cian
    2: "30, 144, 255",   // Azul
    3: "138, 43, 226",   // Violeta
    4: "255, 0, 255",     // Magenta
    5: "255, 69, 0",     // Naranja
    6: "255, 215, 0",     // Oro
    7: "0, 255, 128",     // Verde
    8: "255, 64, 64"      // Rojo
  };
  return rgbs[chapterId] || "0, 255, 255";
}

// ==========================================================================
// 🖱️ PAN AND ZOOM: NAVEGACIÓN DENTRO DEL CANVAS
// ==========================================================================

function setupPanAndZoom() {
  // 1. Mouse Dragging (Paneo en Desktop)
  viewport.addEventListener('mousedown', (e) => {
    // Evitar que arrastre nodos interfiera con paneo general
    if (e.target.closest('.concept-node') || e.target.closest('.glass-panel') || e.target.closest('aside')) return;
    
    appState.isDragging = true;
    viewport.classList.replace('viewport-grab', 'viewport-grabbing');
    appState.startX = e.clientX - appState.panX;
    appState.startY = e.clientY - appState.panY;
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!appState.isDragging) return;
    
    appState.panX = e.clientX - appState.startX;
    appState.panY = e.clientY - appState.startY;
    
    clampPan();
    updateCanvasTransform();
  });
  
  window.addEventListener('mouseup', () => {
    if (appState.isDragging) {
      appState.isDragging = false;
      viewport.classList.replace('viewport-grabbing', 'viewport-grab');
    }
  });
  
  // 2. Touch Dragging & Pinch to Zoom (Paneo y zoom en móvil)
  viewport.addEventListener('touchstart', (e) => {
    if (e.target.closest('.concept-node') || e.target.closest('.glass-panel') || e.target.closest('aside')) return;
    
    if (e.touches.length === 1) {
      // Un solo dedo -> arrastre simple
      appState.isDragging = true;
      appState.startX = e.touches[0].clientX - appState.panX;
      appState.startY = e.touches[0].clientY - appState.panY;
    } else if (e.touches.length === 2) {
      // Dos dedos -> pellizco para zoom (Pinch)
      appState.isDragging = false;
      appState.touchStartDist = getTouchDistance(e.touches);
      appState.touchStartScale = appState.scale;
    }
  }, { passive: true });
  
  viewport.addEventListener('touchmove', (e) => {
    if (appState.isDragging && e.touches.length === 1) {
      appState.panX = e.touches[0].clientX - appState.startX;
      appState.panY = e.touches[0].clientY - appState.startY;
      clampPan();
      updateCanvasTransform();
    } else if (e.touches.length === 2) {
      // Zoom por pellizco
      const dist = getTouchDistance(e.touches);
      const factor = dist / appState.touchStartDist;
      const nextScale = Math.min(Math.max(appState.touchStartScale * factor, VIEWPORT_CONFIG.minScale), VIEWPORT_CONFIG.maxScale);
      
      // Zoom enfocado al punto medio entre los dos toques
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      const canvasMidX = (midX - appState.panX) / appState.scale;
      const canvasMidY = (midY - appState.panY) / appState.scale;
      
      appState.panX = midX - canvasMidX * nextScale;
      appState.panY = midY - canvasMidY * nextScale;
      appState.scale = nextScale;
      
      clampPan();
      updateCanvasTransform();
    }
  }, { passive: true });
  
  viewport.addEventListener('touchend', () => {
    appState.isDragging = false;
  });
  
  // 3. Zoom mediante Rueda de Ratón (Enfocado en cursor)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const viewportRect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - viewportRect.left;
    const mouseY = e.clientY - viewportRect.top;
    
    const zoomFactor = e.deltaY < 0 ? (1 + VIEWPORT_CONFIG.zoomSpeed) : (1 - VIEWPORT_CONFIG.zoomSpeed);
    const nextScale = Math.min(Math.max(appState.scale * zoomFactor, VIEWPORT_CONFIG.minScale), VIEWPORT_CONFIG.maxScale);
    
    // Ubicar coordenadas del mouse en el canvas
    const canvasMouseX = (mouseX - appState.panX) / appState.scale;
    const canvasMouseY = (mouseY - appState.panY) / appState.scale;
    
    // Ajustar pan para centrar el zoom
    appState.panX = mouseX - canvasMouseX * nextScale;
    appState.panY = mouseY - canvasMouseY * nextScale;
    appState.scale = nextScale;
    
    clampPan();
    updateCanvasTransform();
  }, { passive: false });
  
  // 4. Botones Flotantes de Control
  document.getElementById('zoom-in').addEventListener('click', () => zoomCenter(1.2));
  document.getElementById('zoom-out').addEventListener('click', () => zoomCenter(0.8));
  document.getElementById('zoom-reset').addEventListener('click', () => centerOnNodeId("que-es-pensar", true));
}

function getTouchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function zoomCenter(factor) {
  const centerX = viewport.clientWidth / 2;
  const centerY = viewport.clientHeight / 2;
  
  const nextScale = Math.min(Math.max(appState.scale * factor, VIEWPORT_CONFIG.minScale), VIEWPORT_CONFIG.maxScale);
  
  const canvasCenterX = (centerX - appState.panX) / appState.scale;
  const canvasCenterY = (centerY - appState.panY) / appState.scale;
  
  appState.panX = centerX - canvasCenterX * nextScale;
  appState.panY = centerY - canvasCenterY * nextScale;
  appState.scale = nextScale;
  
  clampPan();
  updateCanvasTransform();
}

// Restringe el paneo para que el usuario no pierda el canvas en el infinito
function clampPan() {
  const vw = viewport.clientWidth  || window.innerWidth;
  const vh = viewport.clientHeight || window.innerHeight;
  
  // Altura del header fijo en móvil: los nodos deben poder arrastrarse
  // por debajo de él, así que maxY debe ser al menos headerH + margen.
  const header = document.getElementById('main-header');
  const headerH = (vw < 992 && header) ? header.offsetHeight + 8 : 0;
  
  // En móvil el padding mínimo permite ver el nodo aunque esté en el borde
  const pad = vw < 768 ? 40 : 150;
  
  const minX = vw - VIEWPORT_CONFIG.canvasWidth  * appState.scale - pad;
  const maxX = pad;
  const minY = vh - VIEWPORT_CONFIG.canvasHeight * appState.scale - pad;
  // maxY: el canvas puede bajar lo suficiente para que queden nodos visibles
  // debajo del header (sin que el canvas se vaya al infinito hacia abajo)
  const maxY = headerH + pad;
  
  // Solo aplicamos límites si el canvas es más grande que el viewport
  appState.panX = Math.min(Math.max(appState.panX, minX), maxX);
  appState.panY = Math.min(Math.max(appState.panY, minY), maxY);
}

function updateCanvasTransform() {
  canvas.style.transform = `translate(${appState.panX}px, ${appState.panY}px) scale(${appState.scale})`;
}

// Centra la vista en un nodo específico
function centerOnNodeId(nodeId, smoothScale = false) {
  const node = conceptMap.find(n => n.id === nodeId);
  if (!node) return;
  
  // Usar las dimensiones reales del viewport en el momento de la llamada
  const vw = viewport.clientWidth  || window.innerWidth;
  const vh = viewport.clientHeight || window.innerHeight;

  if (smoothScale) {
    // Escala adaptativa: más pequeña en móvil para que el mapa sea visible sin desplazar
    if (vw < 480) {
      appState.scale = 0.38; // iPhone SE / 12 mini
    } else if (vw < 768) {
      appState.scale = 0.45; // Tablets pequeñas
    } else if (vw < 992) {
      appState.scale = 0.72; // Tablets
    } else {
      appState.scale = 0.95; // Desktop
    }
  }

  // Descontar la altura del header fijo en móvil para centrar verticalmente
  // dentro del área visible real (debajo del header)
  const header = document.getElementById('main-header');
  const headerH = (vw < 992 && header) ? header.offsetHeight + 8 : 0;
  
  const centerX = vw / 2;
  const centerY = headerH + (vh - headerH) / 2;

  // Centrar coordenadas del nodo
  appState.panX = centerX - node.coords.x * appState.scale;
  appState.panY = centerY - node.coords.y * appState.scale;
  
  clampPan();
  
  // Añadir una bonita transición temporal al centrar
  canvas.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
  updateCanvasTransform();
  
  setTimeout(() => {
    canvas.style.transition = 'none';
  }, 500);
}

// ==========================================================================
// 🔍 SISTEMA DE BÚSQUEDA Y FILTRADO
// ==========================================================================

function setupSearchListener() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  
  searchInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase().trim();
    
    if (text.length > 0) {
      clearBtn.style.display = 'block';
      filterMap(text);
    } else {
      clearBtn.style.display = 'none';
      resetFilter();
    }
  });
  
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    resetFilter();
    searchInput.focus();
  });
}

function filterMap(query) {
  let matchedNode = null;
  
  conceptMap.forEach(node => {
    const nodeEl = document.querySelector(`[data-id="${node.id}"]`);
    if (!nodeEl) return;
    
    // Coincidencia: Título, resumen o lección básica
    const inTitle = node.title.toLowerCase().includes(query);
    const inSummary = node.summary.toLowerCase().includes(query);
    const inBasic = node.levels.basic.content.toLowerCase().includes(query);
    
    if (inTitle || inSummary || inBasic) {
      nodeEl.classList.remove('dimmed');
      nodeEl.classList.add('highlighted');
      if (!matchedNode) matchedNode = node; // Guardar el primero encontrado para centrar
    } else {
      nodeEl.classList.remove('highlighted');
      nodeEl.classList.add('dimmed');
    }
  });
  
  // Si encontramos al menos una coincidencia, centrar el mapa en ella
  if (matchedNode) {
    centerOnNodeId(matchedNode.id);
  }
}

function resetFilter() {
  conceptMap.forEach(node => {
    const nodeEl = document.querySelector(`[data-id="${node.id}"]`);
    if (nodeEl) {
      nodeEl.classList.remove('dimmed', 'highlighted');
    }
  });
}

// ==========================================================================
// 📂 LECCIONES Y LOGICA DEL DRAWER (PANEL LATERAL)
// ==========================================================================

function setupDrawerListeners() {
  const closeBtn = document.getElementById('drawer-close');
  const completedCheckbox = document.getElementById('node-completed-checkbox');
  const tabs = document.querySelectorAll('.tab-btn');
  
  // Cerrar Drawer
  closeBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  
  // Checkbox de Completado
  completedCheckbox.addEventListener('change', () => {
    if (appState.activeNode) {
      toggleNodeCompletion(appState.activeNode.id);
    }
  });
  
  // Botones de pestañas (Niveles)
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      appState.activeTab = tab.getAttribute('data-tab');
      renderLessonContent();
    });
  });
}

function openDrawer(node) {
  appState.activeNode = node;
  
  // Resaltar nodo activo visualmente
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  const activeNodeEl = document.querySelector(`[data-id="${node.id}"]`);
  if (activeNodeEl) activeNodeEl.classList.add('active-node');
  
  // Rellenar Badge de Capítulo y colores neón personalizados
  const chapterObj = chapters.find(c => c.id === node.chapter);
  const chapterColor = chapterObj ? chapterObj.color : 'var(--neon-cian)';
  const chapterRgb = getRgbFromVariable(node.chapter);
  
  const drawerBadge = document.getElementById('drawer-chapter-badge');
  drawerBadge.innerText = `Capítulo ${node.chapter}`;
  drawer.style.setProperty('--chapter-neon', chapterColor);
  drawer.style.setProperty('--chapter-neon-rgb', chapterRgb);
  
  // Datos Generales
  document.getElementById('drawer-title').innerText = node.title;
  //document.getElementById('drawer-summary').innerText = node.summary;
  
  // Estado Checkbox Completado
  document.getElementById('node-completed-checkbox').checked = appState.completedNodes.includes(node.id);
  
  // Configuración de la Narrativa de Transición
  const transitionCard = document.getElementById('drawer-transition-card');
  if (node.transitionFromPrevious && node.transitionFromPrevious.trim().length > 0) {
    transitionCard.style.display = 'flex';
    document.getElementById('drawer-transition-text').innerHTML = formatMarkdown(node.transitionFromPrevious);
  } else {
    // Si es el primer tema, ocultamos la tarjeta de transición al no haber pasado previo
    transitionCard.style.display = 'none';
  }

  if (node.isImageOnly || node.isSatellite){
    // Ocultar pestañas de nivel
    document.querySelector('.drawer-tabs').style.display = 'none';
    
    // Ocultar el check de completado
    document.querySelector('.completion-card').style.display = 'none';
  } else {
    // Resetear a pestaña básica
    appState.activeTab = 'basic';
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-basic-btn').classList.add('active');
    
    // Mostrar pestañas
    document.querySelector('.drawer-tabs').style.display = 'flex';

    // Mostrar el check de completado
    document.querySelector('.completion-card').style.display = 'flex';
  }
  
  // Renderizar
  renderLessonContent();
  
  // Activar Drawer y Overlay
  drawer.classList.add('active');
  drawer.setAttribute('aria-hidden', 'false');
  if (window.innerWidth < 768) {
    drawerOverlay.style.display = 'block';
  }
  
  // Centrar el mapa un poco a la izquierda de la pantalla en desktop para que no quede tapado por el panel
  if (window.innerWidth >= 992) {
    const shiftX = viewport.clientWidth * 0.12; // Desplazar coordenadas
    const targetX = (viewport.clientWidth / 2) - shiftX;
    const targetY = viewport.clientHeight / 2;
    
    canvas.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    appState.panX = targetX - node.coords.x * appState.scale;
    appState.panY = targetY - node.coords.y * appState.scale;
    clampPan();
    updateCanvasTransform();
    setTimeout(() => canvas.style.transition = 'none', 400);
  } else {
    centerOnNodeId(node.id);
  }
}

function closeDrawer() {
  appState.activeNode = null;
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  
  drawer.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  drawerOverlay.style.display = 'none';
}

function renderLessonContent() {
  if (!appState.activeNode) return;
  
  const contentContainer = document.getElementById('drawer-tab-content');
  const levelData = appState.activeNode.levels[appState.activeTab];
  
  if (levelData) {
    // Aplicar formateador personalizado de Markdown a HTML
    contentContainer.innerHTML = formatMarkdown(levelData.content);
    
    // Asegurar que el scroll del drawer vuelva arriba al cambiar de tab
    document.querySelector('.drawer-body').scrollTop = 0;
  } else {
    contentContainer.innerHTML = `<p class="text-muted">Contenido no disponible para este nivel.</p>`;
  }
}

// ==========================================================================
// ✏️ FORMATEADOR INTEGRADO DE MARKDOWN A HTML + KATEX
// ==========================================================================

function formatMarkdown(text) {
  if (!text) return '';

  // 1. Limpiar espacios extra iniciales
  let formatted = text.trim();

  // 2. Guardar bloque de fórmulas matemáticas ANTES de escapar HTML
  //    para que KaTeX las procese sin interferencia. Las marcamos con placeholders.
  const mathBlocks = [];
  
  // Guardar fórmulas en bloque: $$ formula $$
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    mathBlocks.push({ type: 'block', formula: formula.trim() });
    return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
  });

  // Guardar fórmulas en línea: $ formula $  (no greedy, no salto de línea)
  formatted = formatted.replace(/\$([^\n$]+?)\$/g, (_, formula) => {
    mathBlocks.push({ type: 'inline', formula: formula.trim() });
    return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
  });

  // 3. Escapar HTML para prevenir XSS
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 4. Bloques de Código Multilínea: ``` ... ```
  formatted = formatted.replace(/```(?:\w+)?\n([\s\S]*?)```/g, (_, code) => {
    const cleanCode = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return `<pre><code>${cleanCode.trim()}</code></pre>`;
  });

  // 5. Código en línea: `código`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 6. Citas: > cita
  formatted = formatted.replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // 7. Negritas: **texto**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 8. Cursivas: *texto* (que no sean parte de listas)
  formatted = formatted.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

  // 10. Listas ordenadas y sin orden
  let lines = formatted.split('\n');
  let listStack = []; // Guarda el tipo de lista abierta ('ul' o 'ol') y su nivel de indentación
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();
    
    // Calcular cuántos espacios de indentación tiene la línea
    const matchSpaces = rawLine.match(/^(\s*)/);
    const indent = matchSpaces ? matchSpaces[1].length : 0;

    if (/^- /.test(trimmedLine)) {
      const content = trimmedLine.slice(2);
      adjustListStack('ul', indent, processedLines, listStack);
      processedLines.push(`<li>${content}</li>`);
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^\d+\.\s/, '');
      adjustListStack('ol', indent, processedLines, listStack);
      processedLines.push(`<li>${content}</li>`);
    } else {
      // Si no es lista, cerramos todas las listas abiertas
      while (listStack.length > 0) {
        const top = listStack.pop();
        processedLines.push(`</${top.type}>`);
      }
      
      if (trimmedLine.length > 0
          && !trimmedLine.startsWith('<pre')
          && !trimmedLine.startsWith('</pre')
          && !trimmedLine.startsWith('<blockquote')
          && !trimmedLine.startsWith('<ul')
          && !trimmedLine.startsWith('</ul')
          && !trimmedLine.startsWith('<ol')
          && !trimmedLine.startsWith('</ol')
          && !trimmedLine.startsWith('<li')
          && !trimmedLine.startsWith('%%MATH_BLOCK')) {
        processedLines.push(`<p>${trimmedLine}</p>`);
      } else {
        processedLines.push(trimmedLine);
      }
    }
  }

  // Cerrar cualquier lista que haya quedado abierta al final del archivo
  while (listStack.length > 0) {
    const top = listStack.pop();
    processedLines.push(`</${top.type}>`);
  }

  formatted = processedLines.join('\n');

  // 11. Restaurar fórmulas matemáticas renderizadas con KaTeX
  formatted = formatted.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, idx) => {
    const { type, formula } = mathBlocks[parseInt(idx)];
    try {
      if (type === 'block') {
        const rendered = katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false,
          trust: true
        });
        return `<div class="math-block">${rendered}</div>`;
      } else {
        const rendered = katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false,
          trust: true
        });
        return `<span class="math-inline">${rendered}</span>`;
      }
    } catch (e) {
      // Fallback: mostrar la fórmula en code si KaTeX falla
      return type === 'block'
        ? `<div class="math-block"><code>${formula}</code></div>`
        : `<code>${formula}</code>`;
    }
  });

  // 9. Italica: _texto_
  //formatted = formatted.replace(/_([^_\n]+?)_/g, '<em>$1</em>')
  formatted = formatted.replace(/(?<!\$[^$\n]*)(?<!_)_([^_\n$]+?)_(?![^$\n]*\$)/g, '<em>$1</em>');

  // 12. Limpiar párrafos vacíos residuales
  formatted = formatted.replace(/<p><\/p>/g, '');

  // Enlaces e Imágenes de Markdown: ![alt](url)
  formatted = formatted.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;display: block;"/>');

  return formatted;
}

function adjustListStack(type, indent, processedLines, listStack) {
  // Si la lista actual es más profunda que la anterior, abrimos una sublista
  if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
    listStack.push({ type, indent });
    processedLines.push(`<${type}>`);
  } 
  // Si es menor indentación, cerramos las sublistas necesarias
  else {
    while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
      const top = listStack.pop();
      processedLines.push(`</${top.type}>`);
    }
    // Si cambió de tipo (de ul a ol) en el mismo nivel
    if (listStack.length > 0 && listStack[listStack.length - 1].type !== type) {
      const top = listStack.pop();
      processedLines.push(`</${top.type}>`);
      listStack.push({ type, indent });
      processedLines.push(`<${type}>`);
    }
  }
}

// ==========================================================================
// 🎓 MODAL DE BIENVENIDA Y TUTORIAL
// ==========================================================================

function setupTutorial() {
  const overlay = document.getElementById('welcome-modal-overlay');
  const startBtn = document.getElementById('welcome-start-btn');
  
  // Comprobar si el usuario ya vio el tutorial
  const tutorialSeen = localStorage.getItem('ai-map-tutorial-seen');
  if (tutorialSeen === 'true') {
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
  }
  
  startBtn.addEventListener('click', () => {
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = 0;
    setTimeout(() => {
      overlay.style.display = 'none';
      localStorage.setItem('ai-map-tutorial-seen', 'true');
    }, 400);
  });
}
