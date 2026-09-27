// ==========================================================================
// 🛠️ CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================

const VIEWPORT_CONFIG = {
  canvasWidth: 1400,
  canvasHeight: 6400,
  minScale: 0.15,
  maxScale: 2.2,
  zoomSpeed: 0.05
};

let appState = {
  panX: 0,
  panY: 0,
  scale: 0.85, // Zoom inicial para ver el primer nodo con claridad
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
  setupLightboxListeners();
  setupSearchListener();
  setupTutorial();
  
  // Actualizar indicadores de progreso generales
  updateProgressUI();
  
  // Esperar a que el navegador haya pintado el layout completo (crítico en móvil)
  // para que viewport.clientWidth/clientHeight reflejen las dimensiones reales.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      centerOnNodeId(getResumeNodeId(), true);
      openFromUrl(); // Enlace directo: index.html#id-del-tema
    });
  });

  // Botón atrás/adelante del navegador
  window.addEventListener('popstate', openFromUrl);

  // Re-centrar si el viewport cambia de tamaño (rotación, barra del navegador móvil)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Solo re-centra si no hay un nodo activo abierto en el drawer
      if (!appState.activeNode) {
        centerOnNodeId(getResumeNodeId(), true);
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

// Primer tema sin completar (en orden de la historia); si están todos, el primero
function getResumeNodeId() {
  const lessons = conceptMap.filter(n => !n.type);
  const next = lessons.find(n => !appState.completedNodes.includes(n.id)) || lessons[0];
  return next.id;
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
  const nodeEl = getNodeEl(nodeId);
  if (nodeEl) {
    nodeEl.setAttribute('aria-label', nodeLabel(conceptMap.find(n => n.id === nodeId)));
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
  const mainNodes = conceptMap.filter(node => !node.type || node.type === 'satellite-logo');
  const trackable = mainNodes.filter(node => node.type !== 'satellite-logo');
  const total = trackable.length;
  const completed = appState.completedNodes.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  document.getElementById('progress-percent').innerText = `${percent}%`;
  document.getElementById('progress-fraction').innerText = `(${completed}/${total} completados)`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

// ==========================================================================
// 🎨 RENDERIZADO DE NODOS Y CONEXIONES (SVG)
// ==========================================================================

function getNodeEl(id) {
  return nodesContainer.querySelector(`.concept-node[data-id="${id}"]`);
}

// Nombre accesible: "7. Redes Neuronales Artificiales, capítulo 3, completado"
function nodeLabel(node) {
  const kind = node.type === 'satellite-image' ? ', imagen' : '';
  const done = appState.completedNodes.includes(node.id) ? ', completado' : '';
  return `${node.title}, capítulo ${node.chapter}${kind}${done}`;
}

function renderNodes() {
  nodesContainer.innerHTML = '';
  let nodeIndicator = 0;
  conceptMap.forEach((node) => {
    const isSatellite = node.type === 'satellite-logo' || node.type === 'satellite-image';
    if (!isSatellite) {
      nodeIndicator++;
    }

    const nodeEl = document.createElement('button');
    nodeEl.type = 'button';
    nodeEl.className = 'concept-node';
    nodeEl.setAttribute('aria-label', nodeLabel(node));
    if (isSatellite) {
      nodeEl.classList.add('satellite-node');
    } else {
      nodeEl.classList.add('main-node');
    }
    
    if (appState.completedNodes.includes(node.id)) {
      nodeEl.classList.add('completed');
    }

    nodeEl.setAttribute('data-id', node.id);
    nodeEl.dataset.searchText = normalizeSearch(`${node.title} ${plainText(node)}`);
    
    nodeEl.style.left = `${node.coords.x}px`;
    nodeEl.style.top = `${node.coords.y}px`;
    nodeEl.style.setProperty('--neon-color', chapterColor(node.chapter));
    nodeEl.style.setProperty('--neon-rgb', chapterRgb(node.chapter));
    
    if (!isSatellite) {
      nodeEl.innerHTML = `
        <span class="node-indicator" aria-hidden="true">${nodeIndicator}</span>
        <span class="node-title" aria-hidden="true">${node.title.split('. ')[1] || node.title}</span>
      `;
    } else {
      nodeEl.innerHTML = `
        <img src="${node.logoUrl}" alt="" class="node-logo">
        <span class="node-title" aria-hidden="true">${node.title.split('. ')[1] || node.title}</span>
      `;
    }
    
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openNode(node);
    });
    
    nodesContainer.appendChild(nodeEl);
  });

  // Tab entre nodos: el foco no debe desplazar el viewport (overflow: hidden),
  // en su lugar centramos el mapa en el nodo enfocado
  nodesContainer.addEventListener('focusin', (e) => {
    viewport.scrollTop = viewport.scrollLeft = 0;
    const nodeEl = e.target.closest('.concept-node');
    if (nodeEl && nodeEl.matches(':focus-visible')) centerOnNodeId(nodeEl.dataset.id);
  });
}

function renderConnections() {
  svgConnectionsGroup.innerHTML = '';
  
  conceptMap.forEach(node => {
    if (!node.connectsTo || node.connectsTo.length === 0) return;
    
    const color = chapterColor(node.chapter);
    
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
      
      // Determinar si es una conexión a un satélite
      const isSatelliteConnection = (node.type === 'satellite-logo' || node.type === 'satellite-image' || 
                                     targetNode.type === 'satellite-logo' || targetNode.type === 'satellite-image');
      
      // Determinar si ambos nodos están completados
      const isPathActive = appState.completedNodes.includes(node.id) && appState.completedNodes.includes(targetNode.id);
      const pathOpacity = isPathActive ? 0.9 : 0.18;
      
      // 1. Línea Base
      const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      linePath.setAttribute('d', pathD);
      linePath.setAttribute('class', 'connection-line');
      linePath.style.setProperty('--neon-color', color);
      
      if (isSatelliteConnection) {
        // Conexiones a satélites: línea base muy tenue
        linePath.style.opacity = 0.12;
        linePath.style.strokeWidth = '1px';
        svgConnectionsGroup.appendChild(linePath);

        // Impulso eléctrico sináptico — parpadeo irregular tipo neurona
        const electricPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        electricPath.setAttribute('d', pathD);
        electricPath.setAttribute('class', 'connection-electric');
        electricPath.setAttribute('pathLength', '100');
        electricPath.style.setProperty('--neon-color', color);
        // Offset aleatorio en la animación para que cada satélite "dispare" en momentos distintos
        const delay = -(Math.random() * 3).toFixed(2);
        electricPath.style.animationDelay = `${delay}s`;
        svgConnectionsGroup.appendChild(electricPath);
      } else {
        // Conexiones principales
        linePath.style.opacity = pathOpacity;
        if (isPathActive) {
          linePath.style.strokeWidth = '5px';
          linePath.style.filter = 'drop-shadow(0 0 4px ' + color + ')';
        } else {
          linePath.style.strokeWidth = '3px';
        }
        svgConnectionsGroup.appendChild(linePath);
        
        // 2. Impulso Animado (solo para el camino principal)
        const pulsePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pulsePath.setAttribute('d', pathD);
        pulsePath.setAttribute('class', 'connection-pulse');
        // pathLength normaliza el dasharray al tamaño real del path,
        // así el efecto funciona en conexiones cortas y largas por igual.
        pulsePath.setAttribute('pathLength', '100');
        pulsePath.style.setProperty('--neon-color', color);
        // Pulso siempre visible en el camino principal (más intenso si está completado)
        pulsePath.style.opacity = isPathActive ? 1.0 : 0.5;
        
        const speed = 6 - (node.chapter * 0.4);
        pulsePath.style.animationDuration = `${speed}s`;
        
        svgConnectionsGroup.appendChild(pulsePath);
      }
    });
  });
}

function renderLegend() {
  const legendList = document.getElementById('legend-list');
  legendList.innerHTML = '';
  
  chapters.forEach(chap => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.setProperty('--chapter-color', chapterColor(chap.id));
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

// Color del capítulo (definido en data.js): "r, g, b" para rgba() y rgb() sólido
function chapterRgb(chapterId) {
  return (chapters.find(c => c.id === chapterId) || chapters[0]).rgb;
}

function chapterColor(chapterId) {
  return `rgb(${chapterRgb(chapterId)})`;
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
    viewport.classList.add('map-moving');
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
      viewport.classList.remove('map-moving');
    }
  });
  
  // 2. Touch Dragging & Pinch to Zoom (Paneo y zoom en móvil)
  viewport.addEventListener('touchstart', (e) => {
    if (e.target.closest('.concept-node') || e.target.closest('.glass-panel') || e.target.closest('aside')) return;
    viewport.classList.add('map-moving');
    
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
  
  viewport.addEventListener('touchend', (e) => {
    appState.isDragging = false;
    if (e.touches.length === 0) viewport.classList.remove('map-moving');
  });
  
  // 3. Zoom mediante Rueda de Ratón (Enfocado en cursor)
  let wheelTimer;
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    // La rueda no tiene "fin": se considera terminada tras 150 ms sin eventos
    viewport.classList.add('map-moving');
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => viewport.classList.remove('map-moving'), 150);
    
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
  document.getElementById('zoom-reset').addEventListener('click', () => centerOnNodeId(getResumeNodeId(), true));
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

// Minúsculas y sin acentos: "regresion" encuentra "Regresión"
function normalizeSearch(text) {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Texto legible del tema, sin fórmulas ni símbolos de Markdown (para buscar y para los fragmentos)
function plainText(node) {
  return [node.caption, ...Object.values(node.levels || {}).map(l => l.content)].join(' ')
    .replace(/\$\$[\s\S]*?\$\$|\$[^\n$]+?\$/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Envuelve la primera coincidencia en <mark> (ignorando acentos)
function highlightMatch(text, query) {
  const i = normalizeSearch(text).indexOf(query);
  if (i < 0) return escapeHtml(text);
  const end = i + query.length;
  return escapeHtml(text.slice(0, i)) + '<mark>' + escapeHtml(text.slice(i, end)) + '</mark>' + escapeHtml(text.slice(end));
}

// Fragmento del contenido alrededor de la coincidencia
function searchSnippet(node, query) {
  const text = plainText(node);
  const i = normalizeSearch(text).indexOf(query);
  if (i < 0) return '';
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + query.length + 70);
  const piece = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return highlightMatch(piece, query);
}

let searchState = { query: '', matches: [], index: -1 };

const searchInput = document.getElementById('search-input');
const searchPanel = document.getElementById('search-panel');
const searchResults = document.getElementById('search-results');

function setupSearchListener() {
  const clearBtn = document.getElementById('clear-search');

  // Escribir filtra y lista resultados; el mapa no se mueve
  searchInput.addEventListener('input', () => {
    const query = normalizeSearch(searchInput.value.trim());
    clearBtn.style.display = query ? 'block' : 'none';
    if (query) filterMap(query);
    else resetFilter();
  });

  searchInput.addEventListener('focus', () => { if (searchState.query) showSearchPanel(true); });
  searchInput.addEventListener('blur', () => showSearchPanel(false));

  searchInput.addEventListener('keydown', (e) => {
    const n = searchState.matches.length;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const i = searchState.index;
      selectSearchMatch(i < 0 ? (step > 0 ? 0 : n - 1) : (i + step + n) % n);
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      openSearchMatch(searchState.matches[Math.max(searchState.index, 0)]);
    } else if (e.key === 'Escape') {
      // Que no cierre también el drawer
      e.stopPropagation();
      if (!searchPanel.hidden) showSearchPanel(false);
      else clearBtn.click();
    }
  });

  // mousedown cancelado: el input no pierde el foco antes del clic
  searchResults.addEventListener('mousedown', (e) => e.preventDefault());
  searchResults.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (item) openSearchMatch(conceptMap.find(n => n.id === item.dataset.id));
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    resetFilter();
    searchInput.focus();
  });

  // Atajo "/" para buscar
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    searchInput.focus();
  });
}

function filterMap(query) {
  const matchedIds = new Set();
  document.querySelectorAll('.concept-node').forEach(nodeEl => {
    const match = nodeEl.dataset.searchText.includes(query);
    nodeEl.classList.toggle('highlighted', match);
    nodeEl.classList.toggle('dimmed', !match);
    nodeEl.tabIndex = match ? 0 : -1;
    nodeEl.classList.remove('search-current');
    if (match) matchedIds.add(nodeEl.dataset.id);
  });

  // Primero los que coinciden en el título; dentro de cada grupo, orden de la historia
  const matches = conceptMap.filter(n => matchedIds.has(n.id));
  const inTitle = n => normalizeSearch(n.title).includes(query);
  matches.sort((a, b) => inTitle(b) - inTitle(a));
  searchState = { query, matches, index: -1 };
  renderSearchResults();
  showSearchPanel(document.activeElement === searchInput);
}

function renderSearchResults() {
  const { query, matches } = searchState;
  document.getElementById('search-status-text').textContent = matches.length === 0
    ? 'Sin resultados'
    : `${matches.length} resultado${matches.length === 1 ? '' : 's'}`;

  searchResults.innerHTML = matches.map((node, i) => {
    const kind = node.type === 'satellite-image' ? ' · Imagen' : '';
    const snippet = searchSnippet(node, query);
    return `
      <li id="search-option-${i}" role="option" aria-selected="false" data-id="${node.id}"
          style="--chapter-color: ${chapterColor(node.chapter)}">
        <span class="search-result-title">${highlightMatch(node.title, query)}</span>
        <span class="search-result-meta">Capítulo ${node.chapter}${kind}</span>
        ${snippet ? `<span class="search-result-snippet">${snippet}</span>` : ''}
      </li>`;
  }).join('');
}

function showSearchPanel(show) {
  searchPanel.hidden = !(show && searchState.query);
  searchInput.setAttribute('aria-expanded', String(!searchPanel.hidden));
}

// ↑↓: marca el resultado en la lista y centra el mapa en él (vista previa)
function selectSearchMatch(index) {
  searchState.index = index;
  const node = searchState.matches[index];

  searchResults.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
  const option = document.getElementById(`search-option-${index}`);
  option.scrollIntoView({ block: 'nearest' });
  searchInput.setAttribute('aria-activedescendant', option.id);

  document.querySelectorAll('.concept-node.search-current').forEach(n => n.classList.remove('search-current'));
  getNodeEl(node.id)?.classList.add('search-current');
  centerOnNodeId(node.id);
}

function openSearchMatch(node) {
  searchInput.blur();
  openNode(node);
}

function resetFilter() {
  searchState = { query: '', matches: [], index: -1 };
  document.querySelectorAll('.concept-node').forEach(nodeEl => {
    nodeEl.classList.remove('dimmed', 'highlighted', 'search-current');
    nodeEl.tabIndex = 0;
  });
  searchResults.innerHTML = '';
  searchInput.removeAttribute('aria-activedescendant');
  showSearchPanel(false);
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
  
  // Copiar enlace directo al tema
  const shareBtn = document.getElementById('drawer-share');
  let shareTimer;
  shareBtn.addEventListener('click', async () => {
    if (!appState.activeNode) return;
    const url = `${location.origin}${location.pathname}#${appState.activeNode.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sin permiso de portapapeles (p. ej. http sin TLS): que lo copie a mano
      prompt('Copia este enlace:', url);
      return;
    }
    const actions = shareBtn.parentElement;
    actions.querySelector('.share-feedback').textContent = 'Enlace copiado';
    actions.classList.add('copied');
    clearTimeout(shareTimer);
    shareTimer = setTimeout(() => {
      actions.classList.remove('copied');
      actions.querySelector('.share-feedback').textContent = '';
    }, 1800);
  });

  // Siguiente tema
  document.getElementById('drawer-next-btn').addEventListener('click', () => {
    const next = appState.activeNode && getNextLesson(appState.activeNode);
    if (next) openDrawer(next);
  });

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

// ==========================================================================
// 🔗 ENLACES DIRECTOS (#id-del-tema) E HISTORIAL DEL NAVEGADOR
// ==========================================================================

// Refleja el tema abierto en la URL. Abrir crea entrada en el historial (el botón
// atrás vuelve al tema anterior); cerrar la reemplaza para no dejar entradas vacías.
function setUrlNode(id, replace = false) {
  if (location.hash === (id ? `#${id}` : '')) return;
  const url = id ? `#${id}` : location.pathname + location.search;
  if (replace || !id) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

// Abre lo que indique la URL (o cierra todo si no hay tema)
function openFromUrl() {
  const id = decodeURIComponent(location.hash.slice(1));
  const node = conceptMap.find(n => n.id === id);

  if (lightboxOverlay.classList.contains('active') && node?.type !== 'satellite-image') closeLightbox(false);
  if (!node) {
    if (appState.activeNode) closeDrawer(false);
  } else if (node.type === 'satellite-image') {
    openLightbox(node);
  } else {
    openDrawer(node);
  }
}

// Imágenes satélite se ven en el lightbox; el resto en el drawer
function openNode(node) {
  if (node.type === 'satellite-image') openLightbox(node);
  else openDrawer(node);
}

// Siguiente lección de la historia: el primer destino de connectsTo que no es satélite
function getNextLesson(node) {
  return (node.connectsTo || [])
    .map(id => conceptMap.find(n => n.id === id))
    .find(n => n && !n.type);
}

function openDrawer(node) {
  if (!appState.activeNode) appState.returnFocus = document.activeElement;
  appState.activeNode = node;
  setUrlNode(node.id);
  
  // Resaltar nodo activo visualmente
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  const activeNodeEl = getNodeEl(node.id);
  if (activeNodeEl) activeNodeEl.classList.add('active-node');
  
  // Rellenar Badge de Capítulo y colores neón personalizados
  const drawerBadge = document.getElementById('drawer-chapter-badge');
  drawerBadge.innerText = `Capítulo ${node.chapter}`;
  drawer.style.setProperty('--chapter-neon', chapterColor(node.chapter));
  drawer.style.setProperty('--chapter-neon-rgb', chapterRgb(node.chapter));
  
  // Datos Generales
  document.getElementById('drawer-title').innerText = node.title;
  
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

  if (node.type === 'satellite-logo' || !node.type) {
    if (node.type === 'satellite-logo') {
      // Satélite con logo: resetear a basic (solo tienen ese nivel) y ocultar tabs/checkbox
      appState.activeTab = 'basic';
      document.querySelector('.drawer-tabs').style.display = 'none';
      document.querySelector('.completion-card').style.display = 'none';
    } else {
      // Nodo conceptual normal: resetear a pestaña básica
      appState.activeTab = 'basic';
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-basic-btn').classList.add('active');
      document.querySelector('.drawer-tabs').style.display = 'flex';
      document.querySelector('.completion-card').style.display = 'flex';
    }
  }
  
  const next = getNextLesson(node);
  const nextBtn = document.getElementById('drawer-next-btn');
  nextBtn.hidden = !next;
  if (next) document.getElementById('drawer-next-title').textContent = next.title.split('. ')[1] || next.title;

  // Renderizar
  renderLessonContent();
  
  // Activar Drawer y Overlay
  drawer.classList.add('active');
  drawer.setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-title').focus({ preventScroll: true });
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

function closeDrawer(updateUrl = true) {
  appState.activeNode = null;
  if (updateUrl) setUrlNode(null);
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  
  drawer.classList.remove('active');
  drawer.setAttribute('aria-hidden', 'true');
  drawerOverlay.style.display = 'none';

  // Devolver el foco a donde estaba (p. ej. el nodo del mapa)
  if (updateUrl && drawer.contains(document.activeElement)) {
    appState.returnFocus?.focus?.({ preventScroll: true });
  }
  appState.returnFocus = null;
}

// ==========================================================================
// 🖼️  LIGHTBOX — VISOR DE IMÁGENES CON ZOOM Y PAN
// ==========================================================================

const lightboxOverlay  = document.getElementById('lightbox-overlay');
const lightboxImg      = document.getElementById('lightbox-img');
const lightboxCaption  = document.getElementById('lightbox-caption');
const lightboxTitle    = document.getElementById('lightbox-title');
const lightboxBadge    = document.getElementById('lightbox-badge');
const lightboxWrapper  = document.getElementById('lightbox-image-wrapper');

let lbState = {
  scale: 1,
  minScale: 0.5,
  maxScale: 5,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  originX: 0,  // origin of pan before drag starts
  originY: 0,
};

function openLightbox(node) {
  setUrlNode(node.id);

  // Rellenar datos
  lightboxImg.src = node.imageUrl;
  lightboxImg.alt = node.title;
  lightboxCaption.textContent = node.caption || '';
  lightboxTitle.textContent = node.title;

  lightboxBadge.textContent = `Capítulo ${node.chapter}`;
  lightboxOverlay.style.setProperty('--chapter-neon', chapterColor(node.chapter));
  lightboxOverlay.style.setProperty('--chapter-neon-rgb', chapterRgb(node.chapter));

  // Resaltar nodo
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  const nodeEl = getNodeEl(node.id);
  if (nodeEl) nodeEl.classList.add('active-node');

  // Resetear zoom/pan
  lbResetView();

  // Mostrar
  lightboxOverlay.classList.add('active');
  lightboxOverlay.setAttribute('aria-hidden', 'false');
}

function closeLightbox(updateUrl = true) {
  // Si el drawer sigue abierto debajo, la URL vuelve a su tema
  if (updateUrl) setUrlNode(appState.activeNode?.id, true);
  lightboxOverlay.classList.remove('active');
  lightboxOverlay.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.concept-node').forEach(n => n.classList.remove('active-node'));
  // Limpiar src después de la transición para evitar parpadeo
  setTimeout(() => { lightboxImg.src = ''; }, 350);
}

function lbResetView() {
  lbState.scale = 1;
  lbState.panX = 0;
  lbState.panY = 0;
  lbApplyTransform();
}

function lbApplyTransform() {
  lightboxImg.style.transform = `translate(${lbState.panX}px, ${lbState.panY}px) scale(${lbState.scale})`;
  // Cursor: mano si se puede arrastrar
  lightboxWrapper.style.cursor = lbState.scale > 1 ? (lbState.isDragging ? 'grabbing' : 'grab') : 'default';
}

function lbZoom(factor, pivotX, pivotY) {
  const prevScale = lbState.scale;
  const nextScale = Math.min(Math.max(prevScale * factor, lbState.minScale), lbState.maxScale);
  if (nextScale === prevScale) return;

  // Ajustar pan para que el punto bajo el cursor se quede fijo
  const rect = lightboxWrapper.getBoundingClientRect();
  const cx = (pivotX ?? rect.left + rect.width  / 2) - rect.left - rect.width  / 2;
  const cy = (pivotY ?? rect.top  + rect.height / 2) - rect.top  - rect.height / 2;

  lbState.panX = cx + (lbState.panX - cx) * (nextScale / prevScale);
  lbState.panY = cy + (lbState.panY - cy) * (nextScale / prevScale);
  lbState.scale = nextScale;
  lbApplyTransform();
}

// --- Eventos del Lightbox ---
function setupLightboxListeners() {
  // Cerrar
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay) closeLightbox();
  });
  // Escape cierra primero el lightbox (va encima) y luego el drawer
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightboxOverlay.classList.contains('active')) closeLightbox();
    else if (drawer.classList.contains('active')) closeDrawer();
  });

  // Botones de zoom
  document.getElementById('lightbox-zoom-in').addEventListener('click',    () => lbZoom(1.3));
  document.getElementById('lightbox-zoom-out').addEventListener('click',   () => lbZoom(1 / 1.3));
  document.getElementById('lightbox-zoom-reset').addEventListener('click', lbResetView);

  // Zoom con rueda del ratón
  lightboxWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    lbZoom(factor, e.clientX, e.clientY);
  }, { passive: false });

  // Pan con arrastre del ratón
  lightboxWrapper.addEventListener('mousedown', (e) => {
    if (lbState.scale <= 1) return;
    lbState.isDragging = true;
    lbState.startX = e.clientX;
    lbState.startY = e.clientY;
    lbState.originX = lbState.panX;
    lbState.originY = lbState.panY;
    lbApplyTransform();
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!lbState.isDragging) return;
    lbState.panX = lbState.originX + (e.clientX - lbState.startX);
    lbState.panY = lbState.originY + (e.clientY - lbState.startY);
    lbApplyTransform();
  });
  window.addEventListener('mouseup', () => {
    if (lbState.isDragging) {
      lbState.isDragging = false;
      lbApplyTransform();
    }
  });

  // Pinch-to-zoom en móvil
  let lbTouchDist = 0, lbTouchScale = 1;
  lightboxWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lbTouchDist  = getTouchDistance(e.touches);
      lbTouchScale = lbState.scale;
    } else if (e.touches.length === 1 && lbState.scale > 1) {
      lbState.isDragging = true;
      lbState.startX  = e.touches[0].clientX;
      lbState.startY  = e.touches[0].clientY;
      lbState.originX = lbState.panX;
      lbState.originY = lbState.panY;
    }
  }, { passive: true });
  lightboxWrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist   = getTouchDistance(e.touches);
      const factor = dist / lbTouchDist;
      lbState.scale = Math.min(Math.max(lbTouchScale * factor, lbState.minScale), lbState.maxScale);
      lbApplyTransform();
    } else if (lbState.isDragging && e.touches.length === 1) {
      lbState.panX = lbState.originX + (e.touches[0].clientX - lbState.startX);
      lbState.panY = lbState.originY + (e.touches[0].clientY - lbState.startY);
      lbApplyTransform();
    }
  }, { passive: false });
  lightboxWrapper.addEventListener('touchend', () => { lbState.isDragging = false; });

  // Doble clic para zoom rápido
  lightboxWrapper.addEventListener('dblclick', (e) => {
    if (lbState.scale > 1) {
      lbResetView();
    } else {
      lbZoom(2, e.clientX, e.clientY);
    }
  });
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

marked.use({
  renderer: {
    link({ href, tokens }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="md-link">${this.parser.parseInline(tokens)}</a>`;
    }
  }
});

function formatMarkdown(text) {
  if (!text) return '';

  // Quitar la indentación del template literal: marked trata 4+ espacios como bloque de código
  const lines = text.split('\n');
  const indents = lines.slice(1).filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  let md = [lines[0].trim(), ...lines.slice(1).map(l => l.slice(cut))].join('\n');

  // Apartar fórmulas antes de marked para que no toque sus _ ni *
  const math = [];
  const hold = (formula, display) => `%%MATH${math.push({ formula, display }) - 1}%%`;
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => `\n\n${hold(f, true)}\n\n`)
         .replace(/\$([^\n$]+?)\$/g, (_, f) => hold(f, false));

  return marked.parse(md, { breaks: true })
    .replace(/<p>%%MATH(\d+)%%<\/p>|%%MATH(\d+)%%/g, (_, b, i) => {
      const { formula, display } = math[b ?? i];
      const html = katex.renderToString(formula.trim(), { displayMode: display, throwOnError: false });
      return display ? `<div class="math-block">${html}</div>` : `<span class="math-inline">${html}</span>`;
    });
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
