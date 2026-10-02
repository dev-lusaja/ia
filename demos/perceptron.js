// Perceptrón: y = 1 si w₁·x₁ + w₂·x₂ + b > 0. La frontera es la recta w₁x₁ + w₂x₂ + b = 0.
const POINTS = [
  // Clase 1 (arriba a la derecha)
  [0.6, 0.7, 1], [0.3, 0.8, 1], [0.8, 0.3, 1], [0.5, 0.4, 1], [0.9, 0.8, 1],
  [0.2, 0.5, 1], [0.7, 0.1, 1], [0.4, 0.9, 1], [0.1, 0.9, 1], [0.9, 0.5, 1],
  // Clase 0 (abajo a la izquierda)
  [-0.6, -0.5, 0], [-0.3, -0.8, 0], [-0.8, -0.2, 0], [-0.4, -0.3, 0], [-0.9, -0.8, 0],
  [-0.2, -0.5, 0], [0.2, -0.7, 0], [-0.7, 0.2, 0], [-0.5, 0.4, 0], [0.4, -0.4, 0],
];
const GRID = 24;
const px = v => (v + 1) * 150; // [-1, 1] → [0, 300]

const OBSERVE = `los pesos <em>w₁</em> y <em>w₂</em> giran la frontera; el sesgo
      <em>b</em> la desplaza sin girarla. Intenta clasificar bien los 20 puntos.`;
const REFLECT = `¿Y si cada clase ocupara dos esquinas opuestas, como un tablero de ajedrez de 2×2?
      (Es el problema XOR del tema siguiente.)`;

export function mount(el) {
  draw(el, POINTS, OBSERVE, REFLECT);
}

// Reutilizable con otros puntos (demos/xor.js)
export function draw(el, points, observe, reflect) {
  const slider = (id, label, value) => `
    <label>${label} <input type="range" data-p="${id}" min="-3" max="3" step="0.1" value="${value}">
      <output class="demo-value">${Number(value).toFixed(1)}</output></label>`;
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> ${observe}</p>
    <svg viewBox="0 0 300 300" role="img" aria-label="Puntos de dos clases y la frontera de decisión"></svg>
    <div class="demo-controls">
      ${slider('w1', 'w₁', -1)}${slider('w2', 'w₂', 1.5)}${slider('b', 'b', 0.5)}
    </div>
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 ${reflect}</p>`;

  const svg = el.querySelector('svg');
  const inputs = el.querySelectorAll('input');
  const result = el.querySelector('.demo-result');

  const render = () => {
    const p = {};
    inputs.forEach(i => {
      p[i.dataset.p] = Number(i.value);
      i.nextElementSibling.value = Number(i.value).toFixed(1);
    });
    const predict = (x, y) => (p.w1 * x + p.w2 * y + p.b > 0 ? 1 : 0);
    const cell = 300 / GRID;
    let bg = '';
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const x = (i + 0.5) / GRID * 2 - 1, y = 1 - (j + 0.5) / GRID * 2;
        bg += `<rect x="${i * cell}" y="${j * cell}" width="${cell + 0.5}" height="${cell + 0.5}"
          style="fill: ${predict(x, y) ? 'rgba(var(--chapter-neon-rgb), 0.14)' : 'rgba(255, 255, 255, 0.03)'}"/>`;
      }
    }
    let hits = 0;
    const dots = points.map(([x, y, label]) => {
      const ok = predict(x, y) === label;
      hits += ok;
      return `<circle cx="${px(x)}" cy="${px(-y)}" r="7"
        style="fill: ${label ? 'var(--chapter-neon)' : 'var(--text-primary)'}; stroke: ${ok ? 'transparent' : 'hsl(0, 75%, 68%)'}"
        stroke-width="3"/>`;
    }).join('');
    // Recta w1·x + w2·y + b = 0 recortada al cuadrado (dos puntos lejanos bastan: el SVG la recorta)
    let line = '';
    if (p.w1 || p.w2) {
      const [x1, y1, x2, y2] = Math.abs(p.w2) > Math.abs(p.w1)
        ? [-3, (-p.b + 3 * p.w1) / p.w2, 3, (-p.b - 3 * p.w1) / p.w2]
        : [(-p.b + 3 * p.w2) / p.w1, -3, (-p.b - 3 * p.w2) / p.w1, 3];
      line = `<line x1="${px(x1)}" y1="${px(-y1)}" x2="${px(x2)}" y2="${px(-y2)}" style="stroke: var(--text-primary)" stroke-width="2"/>`;
    }
    svg.innerHTML = bg + line + dots;
    result.textContent = `Aciertos: ${hits}/${points.length}${hits === points.length ? ' 🎉 ¡Frontera perfecta!' : ' (borde rojo = mal clasificado)'}`;
  };
  inputs.forEach(i => i.addEventListener('input', render));
  render();
}
