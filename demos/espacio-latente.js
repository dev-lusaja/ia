// Embeddings de juguete en 2D: eje x ≈ masculino (+) / femenino (−), eje y ≈ realeza/personas.
// Los grupos (personas, animales, frutas, tecnología) apuntan en direcciones distintas.
const WORDS = {
  rey: [3, 8], reina: [-3, 8], príncipe: [2.5, 7], princesa: [-2.5, 7],
  hombre: [3, 5], mujer: [-3, 5], niño: [2.5, 3.5], niña: [-2.5, 3.5],
  perro: [8, 1], gato: [8, -1], caballo: [7.5, 0.3], león: [7, 2.5],
  manzana: [1.5, -7], pera: [0.5, -7.5], plátano: [2.5, -6.5],
  computadora: [-7, -3], teclado: [-7.5, -2], pantalla: [-6.5, -4], internet: [-6, -5],
};
const names = Object.keys(WORDS);

const cosine = (a, b) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));

// Palabra más parecida a un vector (sin contar las usadas para construirlo)
function nearest(vec, exclude) {
  return names.filter(n => !exclude.includes(n))
    .reduce((best, n) => cosine(vec, WORDS[n]) > cosine(vec, WORDS[best]) ? n : best,
      names.find(n => !exclude.includes(n)));
}

const S = 20; // px por unidad; el origen está en el centro (200, 200)
const px = ([x, y]) => [200 + x * S, 200 - y * S];

export function mount(el) {
  const options = names.map(n => `<option>${n}</option>`).join('');
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> cada palabra es una flecha desde el centro. La similitud
      coseno solo mira el <em>ángulo</em> entre flechas: 1 = misma dirección, 0 = perpendiculares, −1 = opuestas.</p>
    <div class="demo-controls">
      <label>A <select aria-label="Palabra A">${options}</select></label>
      <label>B <select aria-label="Palabra B">${options}</select></label>
    </div>
    <svg viewBox="0 0 400 400" role="img" aria-label="Plano con las palabras y las flechas de A y B"></svg>
    <p class="demo-result" aria-live="polite"></p>
    <div class="demo-controls">
      <button type="button">rey − hombre + mujer = ?</button>
      <span class="demo-value analogy" aria-live="polite"></span>
    </div>
    <p class="demo-reflect">🤔 Compara «gato» con «perro» y «gato» con «computadora». ¿Qué significa que dos palabras
      tengan similitud negativa?</p>`;

  const [selA, selB] = el.querySelectorAll('select');
  selA.value = 'gato';
  selB.value = 'perro';
  const svg = el.querySelector('svg');
  const result = el.querySelector('.demo-result');
  const analogyOut = el.querySelector('.analogy');
  let analogy = null;

  const arrow = (vec, color, width, dash = '') => {
    const [x, y] = px(vec);
    return `<line x1="200" y1="200" x2="${x}" y2="${y}" style="stroke: ${color}" stroke-width="${width}"
      stroke-dasharray="${dash}" stroke-linecap="round"/>`;
  };

  const render = () => {
    const a = WORDS[selA.value], b = WORDS[selB.value];
    svg.innerHTML = `
      <line x1="0" y1="200" x2="400" y2="200" stroke="rgba(255,255,255,0.1)"/>
      <line x1="200" y1="0" x2="200" y2="400" stroke="rgba(255,255,255,0.1)"/>
      ${names.map(n => {
        const [x, y] = px(WORDS[n]);
        const on = n === selA.value || n === selB.value;
        return `<circle cx="${x}" cy="${y}" r="${on ? 5 : 3}" style="fill: ${on ? 'var(--chapter-neon)' : 'rgba(255,255,255,0.45)'}"/>
          <text x="${x + 7}" y="${y + 4}" font-size="12" style="fill: ${on ? 'var(--text-primary)' : 'var(--text-muted)'}">${n}</text>`;
      }).join('')}
      ${arrow(a, 'var(--chapter-neon)', 2.5)}
      ${arrow(b, 'var(--text-primary)', 2)}
      ${analogy ? arrow(analogy, 'var(--neon-verde)', 2, '5 4') : ''}`;
    const cos = cosine(a, b);
    const angle = Math.round(Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI);
    result.textContent = `similitud(${selA.value}, ${selB.value}) = ${cos.toFixed(2)} · ángulo ≈ ${angle}°`;
  };

  el.querySelector('button').addEventListener('click', () => {
    analogy = WORDS.rey.map((v, i) => v - WORDS.hombre[i] + WORDS.mujer[i]);
    analogyOut.textContent = `→ (${analogy.join(', ')}) ≈ «${nearest(analogy, ['rey', 'hombre', 'mujer'])}» (flecha verde)`;
    render();
  });
  selA.addEventListener('change', render);
  selB.addEventListener('change', render);
  render();
}
