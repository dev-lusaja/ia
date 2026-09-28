// Siguiente palabra: logits precalculados + softmax con temperatura, en vivo.
const PROMPTS = [
  { text: 'El cielo es…', next: { azul: 4.2, claro: 2.6, gris: 2.2, inmenso: 1.6, bonito: 1.3, verde: -0.5 } },
  { text: 'Me gusta comer…', next: { pizza: 3.1, pasta: 2.8, frutas: 2.3, tacos: 2.2, chocolate: 2.0, piedras: -1.5 } },
  { text: 'Había una vez un…', next: { rey: 3.0, niño: 2.7, dragón: 2.5, lobo: 2.1, castillo: 1.2, microondas: -1.0 } },
];

function softmax(logits, temperature) {
  const scaled = logits.map(l => l / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> el modelo no elige una palabra, calcula una
      <em>probabilidad</em> para cada candidata. La temperatura aplana (alta) o afila (baja) esa distribución.</p>
    <div class="demo-controls" role="group" aria-label="Frase de ejemplo">
      ${PROMPTS.map((p, i) => `<button type="button" data-i="${i}">${p.text}</button>`).join('')}
    </div>
    <div class="demo-controls">
      <label>Temperatura <input type="range" min="0.1" max="2" step="0.05" value="1">
        <output class="demo-value">1.00</output></label>
    </div>
    <div class="prob-bars"></div>
    <div class="demo-controls">
      <button type="button" class="sample-btn">🎲 Generar</button>
      <span class="demo-result" aria-live="polite"></span>
    </div>
    <p class="demo-reflect">🤔 Pulsa «Generar» varias veces con temperatura 0.1 y luego con 2. ¿Qué temperatura usarías
      para escribir un poema? ¿Y para responder una pregunta de matemáticas?</p>`;

  const slider = el.querySelector('input');
  const bars = el.querySelector('.prob-bars');
  const out = el.querySelector('.demo-result');
  const promptBtns = el.querySelectorAll('[data-i]');
  let current = 0;
  let probs = [];

  const render = () => {
    const t = Number(slider.value);
    slider.nextElementSibling.value = t.toFixed(2);
    promptBtns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === current)));
    const words = Object.keys(PROMPTS[current].next);
    probs = softmax(Object.values(PROMPTS[current].next), t);
    bars.innerHTML = words.map((w, i) => `
      <div class="prob-row">
        <span class="prob-word">${w}</span>
        <span class="prob-track"><span class="prob-fill" style="width: ${(probs[i] * 100).toFixed(1)}%"></span></span>
        <span class="demo-value">${(probs[i] * 100).toFixed(1)}%</span>
      </div>`).join('');
  };

  promptBtns.forEach(b => b.addEventListener('click', () => {
    current = Number(b.dataset.i);
    out.textContent = '';
    render();
  }));
  slider.addEventListener('input', render);
  el.querySelector('.sample-btn').addEventListener('click', () => {
    let r = Math.random();
    const words = Object.keys(PROMPTS[current].next);
    const i = probs.findIndex(p => (r -= p) < 0);
    out.textContent = `${PROMPTS[current].text.replace('…', '')} ${words[i < 0 ? words.length - 1 : i]}`;
  });
  render();
}
