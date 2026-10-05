// Descenso de gradiente con la casa del tema 4: 100 m² que valen $200 000 y el modelo precio = θ × metros.
// La altura de la montaña es el error (θ·100 − 200 000)². Cada paso hace θ ← θ − η · 2·100·(θ·100 − 200 000),
// es decir θ ← θ − 20 000·η·(θ − 2 000): con η = 0,00001 el error baja un 20 % por paso (800 → 1 040, como en
// el texto), con 0,000001 solo un 2 %, y con 0,0001 salta 800 ↔ 3 200 para siempre sin bajar nunca.
const M2 = 100, REAL = 200000, BEST = 2000, START = 800;
const MAX_STEPS = 40;
const TICKS = [0, 1000, 2000, 3000, 4000];
const CLOSE = 500;                       // falta o sobra menos de $500: ya está en el fondo
const RATES = [
  { eta: 0.000001, label: '0,000001' },
  { eta: 0.00001, label: '0,00001' },
  { eta: 0.0001, label: '0,0001' },
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
    <p class="demo-observe">La casa de 100 m² vale <strong>$200 000</strong>. La casita marca tu número, el precio
      por metro, y empieza en 800. La altura de la montaña es el error. Elige una <strong>tasa de aprendizaje</strong>
      y baja.</p>
    <svg viewBox="0 0 400 214" role="img" aria-label="Montaña del error según el precio por m², con la casa en el precio actual"></svg>
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
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 Con 0,0001 cada paso va en la dirección correcta y aun así nunca llegas. ¿Por qué? Mira dónde cae cada paso.</p>`;

  const svg = el.querySelector('svg');
  const out = el.querySelector('.demo-result');
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
      mark = `<line x1="${wx - 28}" y1="${wy}" x2="${wx + 28}" y2="${wy}" stroke-width="3" style="stroke: var(--chapter-neon)"/>
        <text x="${wx}" y="${wy - 30}" text-anchor="middle" font-size="11" style="fill: var(--chapter-neon)">pendiente 0</text>`;
    } else {
      const dir = Math.sign(BEST - t), slope = -130 * 2 * (t - BEST) / 2000 ** 2 / (360 / 4000);
      const len = Math.hypot(1, slope);
      const [ax, ay] = [wx + dir / len * 38, wy + dir * slope / len * 38];
      mark = `<line x1="${wx}" y1="${wy}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke-width="3"
        style="stroke: var(--chapter-neon)" marker-end="url(#${id}-tip)"/>`;
    }
    const steps = path.map(v => `<circle cx="${px(v).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3"
      style="fill: var(--chapter-neon)" opacity="0.6"/>`).join('');
    svg.innerHTML = `
      <defs>
        <marker id="${id}-tip" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" style="fill: var(--chapter-neon)"/></marker>
      </defs>
      <polygon points="20,180 ${ground} 380,180" style="fill: rgba(255,255,255,0.06)"/>
      <polyline points="${ground}" fill="none" style="stroke: rgba(255,255,255,0.4)" stroke-width="2"/>
      <text x="22" y="18" font-size="10" style="fill: var(--text-muted)">altura = error</text>
      <line x1="20" y1="180.5" x2="380" y2="180.5" style="stroke: rgba(255,255,255,0.4)"/>
      ${TICKS.map(v => `<line x1="${px(v)}" y1="180" x2="${px(v)}" y2="185" style="stroke: rgba(255,255,255,0.4)"/>
        <text x="${px(v)}" y="197" text-anchor="middle" font-size="10"
          style="fill: var(${v === BEST ? '--chapter-neon' : '--text-muted'})">${fmt(v)}</text>`).join('')}
      <text x="${px(BEST)}" y="210" text-anchor="middle" font-size="10" style="fill: var(--chapter-neon)">error mínimo</text>
      <text x="380" y="210" text-anchor="end" font-size="10" style="fill: var(--text-muted)">precio por m² ($) →</text>
      ${steps}${mark}
      <text x="${wx}" y="${wy - 3}" text-anchor="middle" font-size="22">🏠</text>`;
    stepBtn.disabled = done();
  };

  const describe = () => {
    const n = path.length - 1, t = path[n], m = miss(t);
    const now = `${fmt(t)} $/m² · ${m > 0 ? 'faltan' : 'sobran'} $${fmt(Math.abs(m))}`;
    if (n === 0) return `Paso 0 · ${now}. Pulsa ▷ para dar un paso.`;
    if (atBottom()) return `🎯 Llegaste al fondo en ${n} pasos (${now}). Aquí el suelo es plano: el error ya no sube ni baja, y la máquina se detiene.`;
    if (n >= MAX_STEPS) {
      return rate === 2
        ? `${n} pasos y sigues igual: saltas de 800 a 3 200 y de vuelta, siempre con $120 000 de error. Con esta tasa nunca llegas.`
        : `${n} pasos y todavía ${m > 0 ? 'faltan' : 'sobran'} $${fmt(Math.abs(m))}. Con esta tasa llegarías, pero tras cientos de pasos.`;
    }
    const prev = path[n - 1];
    const jumped = Math.sign(miss(prev)) !== Math.sign(m);
    return `Paso ${n} · ${now}${jumped ? ' · ¡te pasaste del valle!' : ''}`;
  };

  const stop = () => { clearInterval(timer); timer = null; };
  const step = () => {
    if (done()) return stop();
    const t = path[path.length - 1];
    path.push(t - RATES[rate].eta * 2 * M2 * (t * M2 - REAL));
    out.textContent = describe();
    render();
    if (done()) stop();
  };
  const reset = () => {
    stop();
    path = [START];
    out.textContent = describe();
    render();
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
