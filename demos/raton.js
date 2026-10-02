// Ratón en un laberinto que aprende con Q-learning: Q(s,a) ← Q(s,a) + α·(r + γ·máx Q(s',·) − Q(s,a)).
// Cada paso cuesta −1, el queso da +10 y la trampa −10. Cada casilla se tiñe según su mejor valor y muestra
// la flecha de la acción que el ratón prefiere allí.
const MAP = [
  '...#C',
  '.#...',
  '.#T.#',
  '...#.',
  'S....',
];
const ROWS = MAP.length;
const COLS = MAP[0].length;
const MOVES = [[0, -1, '↑'], [1, 0, '→'], [0, 1, '↓'], [-1, 0, '←']];
const ALPHA = 0.8;
const GAMMA = 0.95;
const MAX_STEPS = 100;
const C = 50; // tamaño de la casilla en el SVG

const at = (x, y) => MAP[y]?.[x];
const find = ch => {
  const y = MAP.findIndex(r => r.includes(ch));
  return [MAP[y].indexOf(ch), y];
};
const START = find('S');

export function mount(el) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> el ratón 🐭 no conoce el laberinto. Cada paso le cuesta
      un poco, el queso 🧀 lo premia y la trampa 🪤 lo castiga. Juega partidas y mira cómo las casillas se iluminan
      y las flechas señalan, cada vez mejor, el camino al queso.</p>
    <svg viewBox="0 0 ${COLS * C} ${ROWS * C}" role="img" aria-label="Laberinto de 5 por 5 con el ratón, el queso, una trampa y paredes" style="max-width: 320px; margin: 0 auto"></svg>
    <div class="demo-controls">
      <label>Exploración <input type="range" min="0" max="0.5" step="0.05" value="0.05">
        <output class="demo-value">5 %</output></label>
    </div>
    <div class="demo-controls">
      <button type="button" data-a="one">▶ Jugar una partida</button>
      <button type="button" data-a="many">⏩ Entrenar 20 partidas</button>
      <button type="button" data-a="reset">↺ Olvidar todo</button>
    </div>
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 Cuando ya conoce el camino, sube la exploración al 50 %: a veces se desvía, e incluso
      cae en la trampa. Bájala a 0 %: nunca prueba nada nuevo. ¿Cuánto explorarías al principio? ¿Y al final?</p>`;

  const svg = el.querySelector('svg');
  const slider = el.querySelector('input');
  const buttons = el.querySelectorAll('button');
  let Q, episodes, history, mouse, busy = false;

  const best = (x, y) => {
    const q = Q[y][x];
    const max = Math.max(...q);
    const ties = q.map((v, i) => (v === max ? i : -1)).filter(i => i >= 0);
    return ties[Math.floor(Math.random() * ties.length)];
  };

  // Juega una partida completa (actualizando Q) y devuelve el recorrido y cómo terminó
  const play = () => {
    const eps = Number(slider.value);
    let [x, y] = START;
    const path = [[x, y]];
    for (let step = 1; step <= MAX_STEPS; step++) {
      const a = Math.random() < eps ? Math.floor(Math.random() * 4) : best(x, y);
      const [dx, dy] = MOVES[a];
      let [nx, ny] = [x + dx, y + dy];
      if (!at(nx, ny) || at(nx, ny) === '#') [nx, ny] = [x, y];
      const cell = at(nx, ny);
      const reward = cell === 'C' ? 10 : cell === 'T' ? -10 : -1;
      const done = cell === 'C' || cell === 'T';
      const future = done ? 0 : Math.max(...Q[ny][nx]);
      Q[y][x][a] += ALPHA * (reward + GAMMA * future - Q[y][x][a]);
      [x, y] = [nx, ny];
      path.push([x, y]);
      if (done) return { path, end: cell, steps: step };
    }
    return { path, end: 'lost', steps: MAX_STEPS };
  };

  const record = r => {
    episodes++;
    history.push(r.end === 'C' ? `${r.steps}` : r.end === 'T' ? '🪤' : '…');
    const last = r.end === 'C' ? `llegó al queso en <strong>${r.steps} pasos</strong> 🧀`
      : r.end === 'T' ? 'cayó en la trampa 🪤' : 'se perdió y se rindió a los 100 pasos';
    el.querySelector('.demo-result').innerHTML = `Partida ${episodes}: ${last}.<br>
      <small>Pasos en las últimas partidas: ${history.slice(-10).join(' · ')} (el camino más corto es de 10)</small>`;
  };

  const render = () => {
    const values = MAP.flatMap((row, y) => [...row].map((ch, x) => (ch === '#' ? null : Math.max(...Q[y][x]))))
      .filter(v => v !== null && v !== 0);
    const top = Math.max(1, ...values.map(Math.abs));
    let html = '';
    MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      const px = x * C, py = y * C;
      if (ch === '#') {
        html += `<rect x="${px + 1}" y="${py + 1}" width="${C - 2}" height="${C - 2}" rx="6" style="fill: rgba(255, 255, 255, 0.14)"/>`;
        return;
      }
      const v = Math.max(...Q[y][x]);
      const glow = ch === 'C' || ch === 'T' || v === 0 ? 0 : Math.max(0, (v + top) / (2 * top)) * 0.45;
      html += `<rect x="${px + 1}" y="${py + 1}" width="${C - 2}" height="${C - 2}" rx="6"
        style="fill: rgba(var(--chapter-neon-rgb), ${glow.toFixed(2)}); stroke: rgba(255, 255, 255, 0.12)"/>`;
      if (ch === 'C') html += `<text x="${px + C / 2}" y="${py + 33}" text-anchor="middle" font-size="24">🧀</text>`;
      else if (ch === 'T') html += `<text x="${px + C / 2}" y="${py + 33}" text-anchor="middle" font-size="24">🪤</text>`;
      else if (Q[y][x].some(q => q !== 0)) {
        const a = Q[y][x].indexOf(Math.max(...Q[y][x]));
        html += `<text x="${px + C / 2}" y="${py + 32}" text-anchor="middle" font-size="20" style="fill: var(--text-secondary)">${MOVES[a][2]}</text>`;
      }
    }));
    html += `<text x="${mouse[0] * C + C / 2}" y="${mouse[1] * C + 34}" text-anchor="middle" font-size="26">🐭</text>`;
    svg.innerHTML = html;
  };

  const setBusy = b => {
    busy = b;
    buttons.forEach(btn => { btn.disabled = b; });
  };

  const reset = () => {
    Q = MAP.map(row => [...row].map(() => [0, 0, 0, 0]));
    episodes = 0;
    history = [];
    mouse = [...START];
    el.querySelector('.demo-result').textContent = 'El ratón todavía no sabe nada. Juega una partida.';
    render();
  };

  el.querySelector('[data-a="one"]').addEventListener('click', () => {
    if (busy) return;
    const r = play();
    record(r);
    if (reduced) {
      mouse = r.path.at(-1);
      return render();
    }
    // Animación del recorrido, paso a paso
    setBusy(true);
    let i = 0;
    const timer = setInterval(() => {
      if (!el.isConnected) return clearInterval(timer);
      mouse = r.path[i++];
      render();
      if (i === r.path.length) {
        clearInterval(timer);
        setBusy(false);
      }
    }, 110);
  });
  el.querySelector('[data-a="many"]').addEventListener('click', () => {
    if (busy) return;
    let r;
    for (let k = 0; k < 20; k++) record(r = play());
    mouse = r.path.at(-1);
    render();
  });
  el.querySelector('[data-a="reset"]').addEventListener('click', reset);
  slider.addEventListener('input', () => {
    slider.nextElementSibling.value = `${Math.round(slider.value * 100)} %`;
  });
  reset();
}
