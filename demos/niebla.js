// Descenso de gradiente con la casa del tema 4: 100 m² que valen $200 000 y el modelo precio = θ × metros.
// La altura de la montaña es el error (θ·100 − 200 000)². Cada paso hace θ ← θ − η · 2·100·(θ·100 − 200 000),
// es decir θ ← θ − 20 000·η·(θ − 2 000): con η = 0,00001 el error baja un 20 % por paso (800 → 1 040, como en
// el texto), con 0,000001 solo un 2 %, y con 0,0001 salta 800 ↔ 3 200 para siempre sin bajar nunca.
const M2 = 100, REAL = 200000, BEST = 2000, START = 800;
const MAX_STEPS = 40;
const TICKS = [0, 1000, 2000, 3000, 4000];
const CLOSE = 500;                       // falta o sobra menos de $500: ya está en el fondo
const RATES = [
  { eta: 0.000001, label: '0,000001',
    note: 'Vas en la dirección correcta, pero los pasos son tan cortos que necesitas cientos para llegar al fondo. Cada paso es tiempo de cálculo: cuantos más pasos, más tarda la máquina en dar con el precio correcto.' },
  { eta: 0.00001, label: '0,00001',
    note: 'Los pasos son largos al principio y se acortan solos al acercarte, porque el suelo se aplana. Llegas al fondo en pocos pasos, sin gastar tiempo de más.' },
  { eta: 0.0001, label: '0,0001',
    note: 'El paso es tan largo que te pasas del punto de menor error y caes igual de lejos del otro lado. Saltas de un lado al otro y el error nunca baja.' },
];
const miss = t => REAL - t * M2;         // > 0 falta dinero, < 0 sobra
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const px = t => 20 + t / 4000 * 360;     // θ ∈ [0, 4 000] → [20, 380]
const py = t => 165 - ((t - BEST) / 2000) ** 2 * 130;   // valle en 165, extremos en 35
let uid = 0;
// Icono Lucide pintado con máscara (como vizIcon en app.js); toma el color del texto del botón
const icon = name => `<span class="viz-icon lucide" aria-hidden="true"
  style="--icon: url(https://cdn.jsdelivr.net/npm/lucide-static@1.49.0/icons/${name}.svg)"></span>`;

export function mount(el) {
  const id = `niebla-${uid++}`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = `
    <p class="demo-observe">La casa de 100 m² vale <strong>$200 000</strong>. El signo <strong>$</strong> marca tu número, el precio
      por metro, y empieza en 800. La altura de la montaña es el error. Elige una <strong>tasa de aprendizaje</strong>
      y baja.</p>
    <svg viewBox="0 0 450 214" role="img" aria-label="Montaña del error según el precio por m², con un signo de dólar en el precio actual"></svg>
    <p class="niebla-note" aria-live="polite"></p>
    <div class="niebla-controls">
      <div class="niebla-eta" role="group" aria-label="Tasa de aprendizaje">
        <span>Tasa de aprendizaje η</span>
        ${RATES.map((r, i) => `<button type="button" data-eta="${i}" aria-pressed="${i === 1}">${r.label}</button>`).join('')}
      </div>
      <div class="niebla-actions">
        <button type="button" data-a="step" aria-label="Dar un paso" title="Dar un paso">${icon('play')}</button>
        ${reduced ? '' : `<button type="button" data-a="run" aria-label="Pasos automáticos" title="Pasos automáticos">${icon('fast-forward')}</button>`}
        <button type="button" data-a="reset" aria-label="Reiniciar" title="Reiniciar">${icon('rotate-ccw')}</button>
      </div>
    </div>
    <p class="visually-hidden" aria-live="polite"></p>`;

  const svg = el.querySelector('svg');
  const out = el.querySelector('.visually-hidden');
  const note = el.querySelector('.niebla-note');
  const stepBtn = el.querySelector('[data-a="step"]');
  const etaBtns = [...el.querySelectorAll('[data-eta]')];
  let rate = 1, path, timer;

  const ground = Array.from({ length: 81 }, (_, i) => {
    const t = i * 50;
    return `${px(t).toFixed(1)},${py(t).toFixed(1)}`;
  }).join(' ');

  const atBottom = () => Math.abs(miss(path[path.length - 1])) < CLOSE;
  const done = () => atBottom() || path.length > MAX_STEPS;

  const render = () => {
    const t = path[path.length - 1];
    const [wx, wy] = [px(t), py(t)];
    const flat = atBottom();
    // Flecha cuesta abajo, tangente al suelo; en el fondo, un tramo plano: pendiente 0
    let mark;
    if (flat) {
      mark = `<line x1="${wx - 28}" y1="${wy}" x2="${wx + 28}" y2="${wy}" stroke-width="2" style="stroke: rgb(255, 107, 107)"/>
        <text x="${wx}" y="${wy - 30}" text-anchor="middle" font-size="8" style="fill: rgb(255, 107, 107)">pendiente 0</text>`;
    } else {
      const dir = Math.sign(BEST - t), slope = -130 * 2 * (t - BEST) / 2000 ** 2 / (360 / 4000);
      const len = Math.hypot(1, slope);
      const [ax, ay] = [wx + dir / len * 38, wy + dir * slope / len * 38];
      mark = `<line x1="${wx}" y1="${wy}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke-width="2"
        style="stroke: rgb(255, 107, 107)" marker-end="url(#${id}-tip)"/>`;
    }
    const steps = path.map(v => `<circle cx="${px(v).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3"
      style="fill: rgb(255, 107, 107)" opacity="0.6"/>`).join('');
    svg.innerHTML = `
      <defs>
        <marker id="${id}-tip" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" style="fill: rgb(255, 107, 107)"/></marker>
      </defs>
      <polygon points="20,180 ${ground} 380,180" style="fill: rgba(255,255,255,0.06)"/>
      <polyline points="${ground}" fill="none" style="stroke: rgba(255,255,255,0.4)" stroke-width="2"/>
      <text x="22" y="16" font-size="8" style="fill: var(--text-muted)">altura = error</text>
      <text x="200" y="56" text-anchor="middle" font-size="9" style="fill: var(--text-secondary)">${status()}</text>
      <line x1="20" y1="180.5" x2="380" y2="180.5" style="stroke: rgba(255,255,255,0.4)"/>
      ${TICKS.map(v => `<line x1="${px(v)}" y1="180" x2="${px(v)}" y2="185" style="stroke: rgba(255,255,255,0.4)"/>
        <text x="${px(v)}" y="194" text-anchor="middle" font-size="7"
          style="fill: var(${v === BEST ? '--chapter-neon' : '--text-muted'})">${fmt(v)}</text>`).join('')}
      <text x="${px(BEST)}" y="205" text-anchor="middle" font-size="8" style="fill: var(--chapter-neon)">error mínimo</text>
      <text x="396" y="178" font-size="8" style="fill: var(--text-muted)">parámetro →<tspan x="396" dy="9" font-size="7">(precio por m²)</tspan></text>
      ${steps}${mark}
      <text x="${wx}" y="${wy - 10}" text-anchor="middle" font-size="18" font-weight="700" style="fill: var(--neon-verde)">$</text>`;
    stepBtn.disabled = done();
  };

  // Estado del paso: se dibuja dentro del SVG y se anuncia a lectores de pantalla
  const status = () => {
    const n = path.length - 1, m = miss(path[n]);
    return `Paso ${n} · ${fmt(path[n])} $/m² · ${m > 0 ? 'faltan' : 'sobran'} $${fmt(Math.abs(m))}`;
  };
  const report = () => {
    out.textContent = status();
    render();
  };

  const stop = () => { clearInterval(timer); timer = null; };
  const step = () => {
    if (done()) return stop();
    const t = path[path.length - 1];
    path.push(t - RATES[rate].eta * 2 * M2 * (t * M2 - REAL));
    report();
    if (done()) stop();
  };
  const reset = () => {
    stop();
    path = [START];
    note.textContent = RATES[rate].note;
    report();
  };

  etaBtns.forEach(b => b.addEventListener('click', () => {
    rate = Number(b.dataset.eta);
    etaBtns.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    reset();
  }));
  stepBtn.addEventListener('click', () => { stop(); step(); });
  el.querySelector('[data-a="run"]')?.addEventListener('click', () => {
    if (timer) return stop();
    if (done()) reset();
    timer = setInterval(() => (el.isConnected ? step() : stop()), 250);
  });
  el.querySelector('[data-a="reset"]').addEventListener('click', reset);
  reset();
}
