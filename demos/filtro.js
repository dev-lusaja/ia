// Convolución: un filtro de 3×3 recorre la imagen y cada casilla del resultado es Σ ventana × filtro.
// Imagen de 10×10 (brillo 0–9) con una casa; el resultado es de 8×8 (sin relleno en los bordes).
const IMG = [
  '0000000000',
  '0000990000',
  '0009999000',
  '0099999900',
  '0999999990',
  '0099999900',
  '0099009900',
  '0099009900',
  '0099009900',
  '0000000000',
].map(r => [...r].map(Number));
const FILTERS = {
  'Bordes verticales': [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
  'Bordes horizontales': [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
  'Contorno': [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
  'Desenfocar': [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
};
const N = IMG.length;
const M = N - 2;
const CELL = 18;
const GAP = 40; // separación entre la imagen y el resultado

const conv = (k, i, j) => {
  let s = 0;
  for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) s += IMG[i + u][j + v] * k[u][v];
  return s;
};

export function mount(el) {
  const names = Object.keys(FILTERS);
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> elige un filtro y mira qué detecta en la casa. Toca
      cualquier casilla del resultado para ver la ventana de 3×3 que la produjo y la cuenta que hizo el filtro.</p>
    <div class="demo-controls" role="group" aria-label="Filtro">
      ${names.map(n => `<button type="button" data-f="${n}">${n}</button>`).join('')}
    </div>
    <svg viewBox="0 0 ${N * CELL + GAP + M * CELL} ${N * CELL + 24}" tabindex="0" role="img" aria-label="La imagen de una casa y, a su derecha, el resultado de aplicar el filtro elegido; las flechas del teclado mueven la casilla seleccionada" style="max-width: 520px; margin: 0 auto"></svg>
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 Una red convolucional no recibe estos filtros: empieza con números al azar y los
      <em>aprende</em> al entrenar. Sus primeras capas terminan pareciéndose mucho a "bordes verticales" y
      "bordes horizontales". ¿Por qué crees que los bordes son lo primero que conviene detectar?</p>`;

  const svg = el.querySelector('svg');
  const ox = N * CELL + GAP;
  let filter = names[0];
  let sel = [2, 1];

  const render = () => {
    const k = FILTERS[filter];
    const out = Array.from({ length: M }, (_, i) => Array.from({ length: M }, (_, j) => conv(k, i, j)));
    const top = Math.max(1, ...out.flat().map(Math.abs));
    const blur = filter === 'Desenfocar';
    const [si, sj] = sel;
    let html = '';
    IMG.forEach((row, i) => row.forEach((v, j) => {
      const g = Math.round(30 + v * 22);
      html += `<rect x="${j * CELL}" y="${i * CELL}" width="${CELL}" height="${CELL}" fill="rgb(${g},${g},${g})" stroke="rgba(0,0,0,0.35)"/>`;
    }));
    html += `<rect x="${sj * CELL}" y="${si * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="none" stroke-width="3" style="stroke: var(--chapter-neon)"/>`;
    out.forEach((row, i) => row.forEach((v, j) => {
      // Bordes: se pinta la intensidad (el signo solo dice de qué lado está lo claro); desenfoque: el brillo
      const a = blur ? v / top : Math.abs(v) / top;
      html += `<rect x="${ox + j * CELL}" y="${CELL + i * CELL}" width="${CELL}" height="${CELL}" data-i="${i}" data-j="${j}"
        style="fill: rgba(var(--chapter-neon-rgb), ${a.toFixed(2)}); stroke: rgba(255, 255, 255, 0.12); cursor: pointer"/>`;
    }));
    html += `<rect x="${ox + sj * CELL}" y="${CELL + si * CELL}" width="${CELL}" height="${CELL}" fill="none" stroke-width="3" style="stroke: var(--text-primary)"/>
      <text x="${N * CELL / 2}" y="${N * CELL + 18}" text-anchor="middle" font-size="12" style="fill: var(--text-muted)">imagen</text>
      <text x="${ox + M * CELL / 2}" y="${N * CELL + 18}" text-anchor="middle" font-size="12" style="fill: var(--text-muted)">resultado</text>`;
    svg.innerHTML = html;

    el.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
    const win = IMG.slice(si, si + 3).map(r => r.slice(sj, sj + 3));
    // «9×1 + 9×1 − 0×1…», omitiendo los términos que valen 0
    const terms = win.flatMap((r, u) => r.map((v, w) => ({ v, c: k[u][w] }))).filter(t => t.v && t.c);
    const sum = terms.map((t, n) => `${t.c < 0 ? (n ? ' − ' : '−') : n ? ' + ' : ''}${t.v}×${Math.abs(t.c)}`).join('');
    const value = out[si][sj];
    el.querySelector('.demo-result').innerHTML = `Casilla seleccionada: ${sum || '0'} = <strong>${value}</strong> →
      ${blur ? 'cuanto más alta la suma, más clara la zona' : value === 0 ? 'no hay nada que este filtro busque' : 'aquí hay un borde'}`;
  };

  svg.addEventListener('click', e => {
    const cell = e.target.closest('[data-i]');
    if (!cell) return;
    sel = [Number(cell.dataset.i), Number(cell.dataset.j)];
    render();
  });
  svg.addEventListener('keydown', e => {
    const move = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!move) return;
    e.preventDefault();
    sel = [Math.max(0, Math.min(M - 1, sel[0] + move[0])), Math.max(0, Math.min(M - 1, sel[1] + move[1]))];
    render();
  });
  el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f;
    render();
  }));
  render();
}
