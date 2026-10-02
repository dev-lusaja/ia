// k vecinos más cercanos: una fruta nueva se clasifica por mayoría entre sus k ejemplos más parecidos.
// Coordenadas en el lienzo 400×260: x = tamaño, y = dulzor (más arriba, más dulce). Hay un limón «colado» entre las
// manzanas para que k = 1 y k = 5 discrepen a su lado.
const KINDS = { m: { name: 'manzana', emoji: '🍎' }, l: { name: 'limón', emoji: '🍋' } };
const FRUITS = [
  [250, 70, 'm'], [285, 55, 'm'], [305, 92, 'm'], [268, 104, 'm'], [330, 66, 'm'], [238, 96, 'm'],
  [300, 128, 'm'], [338, 108, 'm'], [282, 84, 'm'], [222, 64, 'm'],
  [92, 190, 'l'], [124, 212, 'l'], [78, 222, 'l'], [134, 180, 'l'], [156, 206, 'l'], [104, 168, 'l'],
  [166, 228, 'l'], [70, 192, 'l'], [190, 196, 'l'],
  [262, 82, 'l'], // el limón colado
];
const START = [200, 145];

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> toca el plano para colocar una fruta misteriosa ❓.
      El modelo mira sus <strong>k</strong> vecinos más parecidos y vota: lo que diga la mayoría, eso es.</p>
    <svg viewBox="0 0 400 260" tabindex="0" role="img" aria-label="Plano con manzanas arriba a la derecha y limones abajo a la izquierda; la fruta misteriosa se mueve con las flechas del teclado" style="cursor: crosshair"></svg>
    <div class="demo-controls">
      <label>Vecinos que votan (k) <input type="range" min="1" max="7" step="2" value="3">
        <output class="demo-value">3</output></label>
    </div>
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 Reto: pon la fruta pegada al limón que se coló entre las manzanas. ¿Qué dice con
      k = 1? ¿Y con k = 5? Un k pequeño se deja engañar por un solo ejemplo raro; uno grande es más estable.</p>`;

  const svg = el.querySelector('svg');
  const slider = el.querySelector('input');
  let [qx, qy] = START;

  const render = () => {
    const k = Number(slider.value);
    slider.nextElementSibling.value = k;
    const near = FRUITS.map(([x, y, c]) => ({ x, y, c, d: Math.hypot(x - qx, y - qy) }))
      .sort((a, b) => a.d - b.d).slice(0, k);
    const votes = { m: 0, l: 0 };
    near.forEach(n => votes[n.c]++);
    const winner = votes.m > votes.l ? 'm' : 'l';

    svg.innerHTML = `
      <text x="392" y="252" text-anchor="end" font-size="11" style="fill: var(--text-muted)">tamaño →</text>
      <text x="8" y="16" font-size="11" style="fill: var(--text-muted)">↑ dulzor</text>
      ${near.map(n => `<line x1="${qx}" y1="${qy}" x2="${n.x}" y2="${n.y}" stroke-width="2"
        style="stroke: var(--chapter-neon)" stroke-dasharray="4 3"/>`).join('')}
      ${FRUITS.map(([x, y, c]) => `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17">${KINDS[c].emoji}</text>`).join('')}
      <circle cx="${qx}" cy="${qy}" r="15" style="fill: rgba(var(--chapter-neon-rgb), 0.2); stroke: var(--chapter-neon)" stroke-width="2"/>
      <text x="${qx}" y="${qy + 6}" text-anchor="middle" font-size="17">❓</text>`;

    el.querySelector('.demo-result').innerHTML =
      `Votos: ${votes.m} ${KINDS.m.emoji} · ${votes.l} ${KINDS.l.emoji} → <strong>es ${winner === 'm' ? 'una' : 'un'} ${KINDS[winner].name}</strong> ${KINDS[winner].emoji}`;
  };

  svg.addEventListener('click', e => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    [qx, qy] = [Math.max(10, Math.min(390, p.x)), Math.max(10, Math.min(250, p.y))];
    render();
  });
  svg.addEventListener('keydown', e => {
    const move = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (!move) return;
    e.preventDefault();
    qx = Math.max(10, Math.min(390, qx + move[0]));
    qy = Math.max(10, Math.min(250, qy + move[1]));
    render();
  });
  slider.addEventListener('input', render);
  render();
}
