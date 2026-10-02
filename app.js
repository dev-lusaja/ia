// ==========================================================================
// 🛠️ CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================================================

let appState = {
  activeNode: null,
  completedNodes: [], // IDs cargados de localStorage
};

// Temas de la ruta (sin satélites), en orden de la historia
const lessons = conceptMap.filter(n => !n.type);

// Elementos DOM Clave
const lessonView = document.getElementById('lesson-view');
const lessonEl = document.getElementById('lesson');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// ==========================================================================
// 🚀 INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Cargar Progreso guardado
  loadProgress();
  
  // Configurar Escuchadores de Eventos
  setupLessonListeners();
  setupSidebarListeners();
  setupLightboxListeners();
  setupSearchListener();
  setupTutorial();
  
  // Actualizar indicadores de progreso generales
  updateProgressUI();
  
  // Enlace directo (index.html#id-del-tema); sin enlace, el primer tema pendiente
  openFromUrl();

  // Botón atrás/adelante del navegador
  window.addEventListener('popstate', openFromUrl);
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

function isCompleted(nodeId) {
  return appState.completedNodes.includes(nodeId);
}

// Primer tema sin completar (en orden de la historia); si están todos, el primero
function getResumeNodeId() {
  const next = lessons.find(n => !isCompleted(n.id)) || lessons[0];
  return next.id;
}

function setNodeCompletion(nodeId, completed) {
  if (isCompleted(nodeId) === completed) return;
  if (completed) {
    appState.completedNodes.push(nodeId);
  } else {
    appState.completedNodes.splice(appState.completedNodes.indexOf(nodeId), 1);
  }
  
  localStorage.setItem('ai-map-progress', JSON.stringify(appState.completedNodes));
  
  updateProgressUI();

  // ¿Era el último tema pendiente de su capítulo?
  const node = conceptMap.find(n => n.id === nodeId);
  if (completed && lessons.filter(l => l.chapter === node.chapter).every(l => isCompleted(l.id))) {
    showChapterDone(node.chapter);
  }
}

function updateProgressUI() {
  const total = lessons.length;
  const completed = lessons.filter(n => isCompleted(n.id)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  document.getElementById('progress-percent').innerText = `${percent}%`;
  document.getElementById('progress-fraction').innerText = `(${completed}/${total} completados)`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
  renderPathIndex();
}

// Índice lateral: capítulos plegables con anillo de progreso y el estado de cada tema
function renderPathIndex() {
  const nav = document.getElementById('path-index');
  const wasOpen = new Set([...nav.querySelectorAll('details[open]')].map(d => d.dataset.chapter));
  const current = appState.activeNode;

  nav.innerHTML = chapters.map(chap => {
    const items = lessons.filter(l => l.chapter === chap.id);
    const done = items.filter(l => isCompleted(l.id)).length;
    const open = wasOpen.has(String(chap.id)) || current?.chapter === chap.id;
    return `
      <details class="path-chapter" data-chapter="${chap.id}" ${open ? 'open' : ''}
               style="--chapter-neon: ${chapterColor(chap.id)}; --chapter-neon-rgb: ${chap.rgb}; --p: ${done / items.length}">
        <summary>
          <span class="path-ring" aria-hidden="true"></span>
          <span class="path-chapter-name">${escapeHtml(chap.name)}</span>
          <span class="path-count" aria-label="${done} de ${items.length} completados">${done}/${items.length}</span>
        </summary>
        <ol>${items.map(l => {
          const isDone = isCompleted(l.id);
          const isCurrent = l === current;
          const state = isCurrent ? 'current' : isDone ? 'done' : 'pending';
          return `
          <li><a href="#${l.id}" data-id="${l.id}" class="path-lesson ${state}" ${isCurrent ? 'aria-current="page"' : ''}>
            <span class="path-status" aria-hidden="true">${isDone ? '✓' : isCurrent ? '●' : '○'}</span>
            <span>${escapeHtml(l.title)}</span>${isDone ? '<span class="visually-hidden">, completado</span>' : ''}
          </a></li>`;
        }).join('')}</ol>
      </details>`;
  }).join('');

  nav.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest' });
}

// Color del capítulo (definido en data.js): "r, g, b" para rgba() y rgb() sólido
function chapterRgb(chapterId) {
  return (chapters.find(c => c.id === chapterId) || chapters[0]).rgb;
}

function chapterColor(chapterId) {
  return `rgb(${chapterRgb(chapterId)})`;
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

// Texto de búsqueda de cada nodo (título + contenido), calculado una vez
const searchTexts = new Map(conceptMap.map(n => [n, normalizeSearch(`${n.title} ${plainText(n)}`)]));

const searchInput = document.getElementById('search-input');
const searchPanel = document.getElementById('search-panel');
const searchResults = document.getElementById('search-results');

function setupSearchListener() {
  const clearBtn = document.getElementById('clear-search');

  // Escribir filtra y lista resultados
  searchInput.addEventListener('input', () => {
    const query = normalizeSearch(searchInput.value.trim());
    clearBtn.style.display = query ? 'block' : 'none';
    if (query) filterSearch(query);
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
      // Que no cierre también el índice lateral
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

function filterSearch(query) {
  // Primero los que coinciden en el título; dentro de cada grupo, orden de la historia
  const matches = conceptMap.filter(n => searchTexts.get(n).includes(query));
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

// ↑↓: marca el resultado en la lista
function selectSearchMatch(index) {
  searchState.index = index;

  searchResults.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
  const option = document.getElementById(`search-option-${index}`);
  option.scrollIntoView({ block: 'nearest' });
  searchInput.setAttribute('aria-activedescendant', option.id);
}

function openSearchMatch(node) {
  searchInput.blur();
  openNode(node);
}

function resetFilter() {
  searchState = { query: '', matches: [], index: -1 };
  searchResults.innerHTML = '';
  searchInput.removeAttribute('aria-activedescendant');
  showSearchPanel(false);
}

// ==========================================================================
// 📂 LECCIÓN A PANTALLA COMPLETA (RUTA)
// ==========================================================================

function setupLessonListeners() {
  // Copiar enlace directo al tema
  const shareBtn = document.getElementById('lesson-share');
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

  // Flechas laterales: solo cambian de tema
  document.getElementById('lesson-prev-arrow').addEventListener('click', () =>
    openLesson(lessons.find(n => getNextLesson(n) === appState.activeNode)));
  document.getElementById('lesson-next-arrow').addEventListener('click', () =>
    openLesson(getNextLesson(appState.activeNode)));

  // Completar y seguir: marca el tema como hecho y abre el siguiente
  document.getElementById('lesson-next-btn').addEventListener('click', () => {
    const node = appState.activeNode;
    if (!node) return;
    const next = getNextLesson(node);
    if (next) openLesson(next);
    setNodeCompletion(node.id, true); // Después: el aviso de capítulo completado queda encima
    if (!next) renderNextButton(node);
  });
  
  // Figuras de la lección: abren el visor
  document.getElementById('lesson-extras').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (btn) openLightbox(conceptMap.find(n => n.id === btn.dataset.id));
  });

  // ¡Capítulo completado!
  document.getElementById('chapter-done-btn').addEventListener('click', () => {
    const { next } = document.getElementById('chapter-done-overlay').dataset;
    hideChapterDone();
    if (next) openLesson(conceptMap.find(n => n.id === next));
  });
}

function setupSidebarListeners() {
  const menuBtn = document.getElementById('menu-btn');
  menuBtn.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('open')));
  sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));

  // Clic en un tema del índice (el href queda para abrir en otra pestaña)
  document.getElementById('path-index').addEventListener('click', (e) => {
    const link = e.target.closest('a[data-id]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    openLesson(conceptMap.find(n => n.id === link.dataset.id));
  });
}

// Índice como panel en móvil
function setSidebarOpen(open) {
  sidebar.classList.toggle('open', open);
  sidebarOverlay.hidden = !open;
  document.getElementById('menu-btn').setAttribute('aria-expanded', String(open));
}

// ==========================================================================
// 🔗 ENLACES DIRECTOS (#id-del-tema) E HISTORIAL DEL NAVEGADOR
// ==========================================================================

// Refleja el tema abierto en la URL. Abrir crea entrada en el historial (el botón
// atrás vuelve al tema anterior); replace la sustituye.
function setUrlNode(id, replace = false) {
  if (location.hash === `#${id}`) return;
  if (replace) history.replaceState(null, '', `#${id}`);
  else history.pushState(null, '', `#${id}`);
}

// Abre lo que indique la URL: un tema, una imagen o (sin nada o desconocido) el primer tema pendiente
function openFromUrl() {
  const id = decodeURIComponent(location.hash.slice(1));
  const node = conceptMap.find(n => n.id === id);

  if (lightboxOverlay.classList.contains('active') && node?.type !== 'satellite-image') closeLightbox(false);
  if (!node) {
    openLesson(conceptMap.find(n => n.id === getResumeNodeId()), 'replace');
  } else if (node.type === 'satellite-image') {
    if (!appState.activeNode) openLesson(parentLesson(node), false);
    openLightbox(node);
  } else if (node.type === 'satellite-logo') {
    openLesson(parentLesson(node), false, node.id);
  } else {
    openLesson(node, false);
  }
}

// Imágenes satélite se ven en el visor; las fichas de logo dentro de su tema; el resto es un tema
function openNode(node) {
  if (node.type === 'satellite-image') openLightbox(node);
  else if (node.type === 'satellite-logo') openLesson(parentLesson(node), 'push', node.id);
  else openLesson(node);
}

// Siguiente lección de la historia: el primer destino de connectsTo que no es satélite
function getNextLesson(node) {
  return (node.connectsTo || [])
    .map(id => conceptMap.find(n => n.id === id))
    .find(n => n && !n.type);
}

// Tema del que cuelga un satélite (subiendo por satélites intermedios)
function parentLesson(node) {
  let current = node;
  while (current?.type) current = conceptMap.find(n => (n.connectsTo || []).includes(current.id));
  return current || lessons[0];
}

// Satélites que cuelgan de un tema (también los que cuelgan de otro satélite)
function lessonSatellites(lesson) {
  const found = [];
  const walk = ids => ids.forEach(id => {
    const n = conceptMap.find(x => x.id === id);
    if (n?.type) {
      found.push(n);
      walk(n.connectsTo || []);
    }
  });
  walk(lesson.connectsTo || []);
  return found;
}

// urlMode: 'push' (nuevo paso en el historial), 'replace' o false (la URL ya es la correcta)
function openLesson(node, urlMode = 'push', focusExtraId = null) {
  if (urlMode) setUrlNode(focusExtraId || node.id, urlMode === 'replace');
  setSidebarOpen(false);

  const changed = appState.activeNode !== node;
  appState.activeNode = node;

  // Colores del capítulo
  lessonEl.style.setProperty('--chapter-neon', chapterColor(node.chapter));
  lessonEl.style.setProperty('--chapter-neon-rgb', chapterRgb(node.chapter));

  const position = `${lessons.indexOf(node) + 1} de ${lessons.length}`;
  document.getElementById('lesson-chapter-badge').innerText = `Capítulo ${node.chapter} · ${position}`;
  document.getElementById('topbar-chapter').innerText = `Capítulo ${node.chapter}`;
  document.getElementById('topbar-progress').innerText = `${lessons.indexOf(node) + 1}/${lessons.length}`;

  if (changed) {
    document.getElementById('lesson-title').innerText = node.title;

    // ¿Cómo llegamos aquí? (el primer tema no tiene paso previo)
    const transitionCard = document.getElementById('lesson-transition-card');
    transitionCard.hidden = !node.transitionFromPrevious?.trim();
    document.getElementById('lesson-transition-text').innerHTML = formatMarkdown(node.transitionFromPrevious);

    renderLessonContent();
    renderLessonExtras(node);
    renderDemo(node);

    renderNextButton(node);

    lessonView.scrollTop = 0;
    document.getElementById('lesson-title').focus({ preventScroll: true });
  }

  renderPathIndex();

  // Ficha de logo pedida (desde la búsqueda o un enlace): abrirla y llevarla a la vista
  if (focusExtraId) {
    const extra = document.getElementById(`extra-${focusExtraId}`);
    if (extra) {
      extra.open = true;
      extra.scrollIntoView({ block: 'start' });
    }
  }
}

// "Completar y seguir" (o "Siguiente tema" si ya estaba hecho); en el último tema, terminar el viaje.
// También las flechas laterales, que solo navegan (no marcan el tema como completado)
function renderNextButton(node) {
  const next = getNextLesson(node);
  const prev = lessons.find(n => getNextLesson(n) === node);
  [['lesson-prev-arrow', prev, 'Tema anterior'], ['lesson-next-arrow', next, 'Tema siguiente']].forEach(([id, target, label]) => {
    const arrow = document.getElementById(id);
    arrow.hidden = !target;
    if (target) arrow.title = arrow.ariaLabel = `${label}: ${target.title}`;
  });
  const done = isCompleted(node.id);
  document.getElementById('lesson-next-btn').hidden = !next && done;
  document.getElementById('lesson-next-label').textContent = done ? 'Siguiente tema' : next ? 'Completar y seguir' : 'Último tema';
  document.getElementById('lesson-next-title').textContent = next
    ? next.title.split('. ')[1] || next.title
    : 'Terminar el viaje';
}

// Satélites dentro de la lección: imágenes como figuras (abren el visor) y logos como fichas plegables
function renderLessonExtras(node) {
  document.getElementById('lesson-extras').innerHTML = lessonSatellites(node).map(s => s.type === 'satellite-image'
    ? `<figure class="lesson-figure">
        <button type="button" data-id="${s.id}" aria-label="Ampliar imagen: ${escapeHtml(s.title)}">
          <img src="${s.imageUrl}" alt="${escapeHtml(s.title)}" loading="lazy">
        </button>
        <figcaption><strong>${escapeHtml(s.title)}</strong>${s.caption ? ` · ${escapeHtml(s.caption)}` : ''}</figcaption>
      </figure>`
    : `<details class="lesson-aside" id="extra-${s.id}">
        <summary><img src="${s.logoUrl}" alt="" class="node-logo"> ${escapeHtml(s.title)}</summary>
        <div class="tab-content-area">${formatMarkdown(s.levels?.basic?.content)}</div>
      </details>`
  ).join('');
}

// Pruébalo: cada demo es demos/<nombre>.js y exporta mount(elemento)
function renderDemo(node) {
  const section = document.getElementById('lesson-demo');
  const mount = document.getElementById('lesson-demo-mount');
  mount.innerHTML = '';
  section.hidden = !node.demo;
  if (!node.demo) return;

  const target = document.createElement('div');
  target.className = 'demo';
  mount.append(target);
  import(`./demos/${node.demo}.js`)
    .then(m => { if (target.isConnected) m.mount(target); })
    .catch(() => { target.textContent = 'No se pudo cargar la demo.'; });
}

// ==========================================================================
// 🏆 ¡CAPÍTULO COMPLETADO!
// ==========================================================================

function showChapterDone(chapterId) {
  const overlay = document.getElementById('chapter-done-overlay');
  const chap = chapters.find(c => c.id === chapterId);
  const nextChap = chapters.find(c => c.id === chapterId + 1);
  const firstNext = nextChap && lessons.find(l => l.chapter === nextChap.id);

  document.getElementById('chapter-done-title').textContent = nextChap ? '¡Capítulo completado!' : '¡Has completado el viaje!';
  document.getElementById('chapter-done-text').textContent = nextChap
    ? `Terminaste «${chap.name}». Lo siguiente: «${nextChap.name}».`
    : `Terminaste «${chap.name}» y, con él, los ${lessons.length} temas del viaje.`;
  const btn = document.getElementById('chapter-done-btn');
  btn.textContent = firstNext ? `Ir al capítulo ${nextChap.id} →` : 'Cerrar';
  overlay.dataset.next = firstNext ? firstNext.id : '';
  overlay.style.setProperty('--chapter-neon', chapterColor(chapterId));
  overlay.hidden = false;
  btn.focus();
}

function hideChapterDone() {
  document.getElementById('chapter-done-overlay').hidden = true;
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

  // Resetear zoom/pan
  lbResetView();

  // Mostrar
  lightboxOverlay.classList.add('active');
  lightboxOverlay.setAttribute('aria-hidden', 'false');
}

function closeLightbox(updateUrl = true) {
  // La URL vuelve al tema abierto debajo
  if (updateUrl) setUrlNode(appState.activeNode.id, true);
  lightboxOverlay.classList.remove('active');
  lightboxOverlay.setAttribute('aria-hidden', 'true');
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

function getTouchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

// --- Eventos del Lightbox ---
function setupLightboxListeners() {
  // Cerrar
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay) closeLightbox();
  });
  // Escape cierra lo que esté encima: visor, aviso de capítulo o índice (móvil)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightboxOverlay.classList.contains('active')) closeLightbox();
    else if (!document.getElementById('chapter-done-overlay').hidden) hideChapterDone();
    else if (sidebar.classList.contains('open')) setSidebarOpen(false);
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

// Los niveles se leen seguidos y todos a la vista: básico, intermedio y, después de la demo, el técnico
function renderLessonContent() {
  const { basic, intermediate, technical } = appState.activeNode.levels;
  // El título propio del nivel se omite si solo repite la etiqueta («🚀 Perspectiva Computacional»)
  const plain = t => t.toLowerCase().replace(/[^a-záéíóúñü ]/g, '').trim();
  const label = (text, title = '') =>
    `<div class="level-label"><span>${text}</span>${title && plain(title) !== plain(text) ? ` ${escapeHtml(title)}` : ''}</div>`;
  document.getElementById('lesson-tab-content').innerHTML = basic
    ? label('Concepto base') + formatMarkdown(basic.content) : '';
  document.getElementById('lesson-intermediate').innerHTML = intermediate
    ? label('Profundiza', intermediate.title) + formatMarkdown(intermediate.content) : '';
  document.getElementById('lesson-deep').innerHTML = technical
    ? label('Perspectiva computacional', technical.title) + formatMarkdown(technical.content) : '';
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

  // Líneas de tiempo: bloque ```timeline con una línea "fecha | título | texto" por hito
  const timelines = [];
  md = md.replace(/```timeline\n([\s\S]*?)```/g, (_, body) => {
    const items = body.trim().split('\n').map(line => {
      const [date, title, desc = ''] = line.split('|').map(s => s.trim());
      return `<li><span class="timeline-date">${date}</span>` +
        `<strong class="timeline-title">${marked.parseInline(title)}</strong>` +
        `<span class="timeline-desc">${marked.parseInline(desc)}</span></li>`;
    });
    return `\n\n%%TIMELINE${timelines.push(`<ol class="timeline">${items.join('')}</ol>`) - 1}%%\n\n`;
  });

  // Apartar fórmulas antes de marked para que no toque sus _ ni *
  const math = [];
  const hold = (formula, display) => `%%MATH${math.push({ formula, display }) - 1}%%`;
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => `\n\n${hold(f, true)}\n\n`)
         .replace(/\$([^\n$]+?)\$/g, (_, f) => hold(f, false));

  return marked.parse(md, { breaks: true })
    // Un párrafo que es solo negrita actúa de título de sección (salvo los esquemas "A → B → C")
    .replace(/<p><strong>([^<]*(?:<(?!\/strong>)[^<]*)*)<\/strong><\/p>/g,
      (m, t) => t.includes('→') ? m : `<p class="content-heading">${t}</p>`)
    .replace(/<p>%%TIMELINE(\d+)%%<\/p>/g, (_, i) => timelines[i])
    // Cada "### Título" abre una sección plegable que llega hasta el siguiente ###, un --- o el final
    .replace(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?:<hr>\s*|(?=<h3>)|$)/g, (_, title, body) =>
      `<details class="content-section"><summary><span class="content-section-title">${title}</span>` +
      `<span class="content-section-hint" aria-hidden="true"></span></summary>` +
      `<div class="content-section-body">${body}</div></details>`)
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
  
  // Comprobar si el usuario ya vio el tutorial
  const tutorialSeen = localStorage.getItem('ai-map-tutorial-seen');
  if (tutorialSeen === 'true') {
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
  }
  
  const close = (then) => {
    localStorage.setItem('ai-map-tutorial-seen', 'true');
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = 0;
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
    then();
  };

  // "Iniciar mi viaje": debajo ya está abierto el primer tema pendiente (o el del enlace)
  document.getElementById('welcome-start-btn').addEventListener('click', () => close(() => document.getElementById('lesson-title').focus()));
}
