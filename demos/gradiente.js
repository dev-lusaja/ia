// Descenso de gradiente en f(x) = x²: cada paso hace x ← x − η·f'(x) = x − η·2x.
const f = x => x * x;
const X0 = -2.6;
const px = x => 200 + x * 60;           // x ∈ [-3.3, 3.3] → [0, 400]
const py = y => 250 - y * 22;           // y ∈ [0, ~11] → [250, 0]

export function mount(el) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> la bola sigue la pendiente hacia el mínimo del error.
      Con una tasa de aprendizaje pequeña avanza despacio; demasiado grande, <em>oscila</em> o incluso se escapa.</p>
    <svg viewBox="0 0 400 260" role="img" aria-label="Curva de error y posición de la bola"></svg>
    <div class="demo-controls">
      <label>Tasa de aprendizaje η <input type="range" min="0.02" max="1.1" step="0.02" value="0.1">
        <output class="demo-value">0.10</output></label>
    </div>
    <div class="demo-controls">
      <button type="button" data-a="step">Paso →</button>
      ${reduced ? '' : '<button type="button" data-a="run">▶ Automático</button>'}
      <button type="button" data-a="reset">↺ Reiniciar</button>
      <span class="demo-result" aria-live="polite"></span>
    </div>
    <p class="demo-reflect">🤔 Prueba η = 0.1, η = 0.9 y η = 1.05. ¿Por qué la tasa ideal no es simplemente «la más
      grande posible»?</p>`;

  const svg = el.querySelector('svg');
  const slider = el.querySelector('input');
  const out = el.querySelector('.demo-result');
  let path, timer;

  const curve = Array.from({ length: 67 }, (_, i) => {
    const x = -3.3 + i * 0.1;
    return `${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`;
  }).join(' ');

  const render = () => {
    const x = path[path.length - 1];
    const escaped = Math.abs(x) > 3.3;
    const trail = path.filter(v => Math.abs(v) <= 3.3)
      .map(v => `${px(v).toFixed(1)},${py(f(v)).toFixed(1)}`).join(' ');
    svg.innerHTML = `
      <polyline points="${curve}" fill="none" style="stroke: rgba(255,255,255,0.35)" stroke-width="2"/>
      <polyline points="${trail}" fill="none" style="stroke: var(--chapter-neon)" stroke-width="1.5" stroke-dasharray="4 3"/>
      ${escaped ? '' : `<circle cx="${px(x)}" cy="${py(f(x)) - 8}" r="8" style="fill: var(--chapter-neon)"/>`}
      <text x="200" y="256" text-anchor="middle" font-size="11" style="fill: var(--text-muted)">mínimo</text>`;
    out.textContent = escaped
      ? `¡Divergió! Tras ${path.length - 1} pasos la bola salió disparada.`
      : `Paso ${path.length - 1} · x = ${x.toFixed(3)} · error = ${f(x).toFixed(3)}`;
    return escaped || f(x) < 1e-4;
  };

  const stop = () => { clearInterval(timer); timer = null; };
  const step = () => {
    const eta = Number(slider.value);
    const x = path[path.length - 1];
    path.push(x - eta * 2 * x);
    if (render()) stop();
  };
  const reset = () => { stop(); path = [X0]; render(); };

  el.querySelector('[data-a="step"]').addEventListener('click', () => { stop(); step(); });
  el.querySelector('[data-a="run"]')?.addEventListener('click', () => {
    if (timer) return stop();
    if (render()) reset();
    timer = setInterval(() => { if (!el.isConnected) return stop(); step(); }, 350);
  });
  el.querySelector('[data-a="reset"]').addEventListener('click', reset);
  slider.addEventListener('input', () => {
    slider.nextElementSibling.value = Number(slider.value).toFixed(2);
    reset();
  });
  reset();
}
