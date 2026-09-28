// Self-attention de juguete: pesos precalculados (cada fila suma 1) para una frase.
const WORDS = ['El', 'gato', 'se', 'sentó', 'porque', 'estaba', 'cansado'];
const WEIGHTS = [
  // El    gato  se    sentó porque estaba cansado
  [0.40, 0.45, 0.03, 0.05, 0.02, 0.02, 0.03], // El
  [0.20, 0.45, 0.05, 0.15, 0.03, 0.05, 0.07], // gato
  [0.03, 0.32, 0.20, 0.40, 0.02, 0.01, 0.02], // se
  [0.03, 0.40, 0.22, 0.25, 0.04, 0.02, 0.04], // sentó
  [0.02, 0.10, 0.05, 0.33, 0.20, 0.15, 0.15], // porque
  [0.03, 0.50, 0.02, 0.08, 0.07, 0.10, 0.20], // estaba
  [0.03, 0.46, 0.02, 0.10, 0.04, 0.25, 0.10], // cansado
];
const ROW = 34;
const y = i => 24 + i * ROW;

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> elige una palabra de la izquierda. Las líneas muestran a qué
      palabras «atiende» para entender su significado: más gruesa = más peso.</p>
    <svg viewBox="0 0 320 ${24 + WORDS.length * ROW - 10}" role="group" aria-label="Pesos de atención entre palabras"></svg>
    <p class="demo-result" aria-live="polite"></p>
    <p class="demo-reflect">🤔 ¿Por qué «estaba» y «cansado» atienden sobre todo a «gato» y no a «sentó»? Una RNN
      tendría que recordar «gato» durante 4 pasos; aquí la conexión es directa.</p>`;

  const svg = el.querySelector('svg');
  const out = el.querySelector('.demo-result');
  let active = 5;

  const render = () => {
    const lines = WEIGHTS[active].map((w, j) => `
      <path d="M 100 ${y(active)} C 160 ${y(active)}, 160 ${y(j)}, 220 ${y(j)}" fill="none"
        style="stroke: var(--chapter-neon); opacity: ${0.25 + w * 1.5}" stroke-width="${(w * 22).toFixed(1)}" stroke-linecap="round"/>`).join('');
    const words = WORDS.map((w, i) => `
      <g class="attn-word" tabindex="0" role="button" data-i="${i}" aria-pressed="${i === active}"
         aria-label="${w}: ver a qué palabras atiende">
        <rect x="4" y="${y(i) - 13}" width="92" height="26" rx="8"
          style="fill: ${i === active ? 'var(--chapter-neon)' : 'rgba(255,255,255,0.05)'}"/>
        <text x="50" y="${y(i) + 4}" text-anchor="middle" font-size="13"
          style="fill: ${i === active ? 'var(--text-dark)' : 'var(--text-primary)'}">${w}</text>
      </g>
      <text x="228" y="${y(i) + 4}" font-size="13" style="fill: var(--text-secondary)">${w}
        <tspan style="fill: var(--text-muted)" font-size="11"> ${Math.round(WEIGHTS[active][i] * 100)}%</tspan></text>`).join('');
    svg.innerHTML = lines + words;
    const top = WEIGHTS[active].map((w, j) => [w, WORDS[j]]).filter((_, j) => j !== active).sort((a, b) => b[0] - a[0])[0];
    out.textContent = `«${WORDS[active]}» presta más atención a «${top[1]}» (${Math.round(top[0] * 100)}%).`;
  };

  const pick = (e) => {
    const g = e.target.closest('.attn-word');
    if (!g || Number(g.dataset.i) === active) return;
    active = Number(g.dataset.i);
    render();
    if (e.type === 'keydown') svg.querySelector(`[data-i="${active}"]`).focus();
  };
  svg.addEventListener('click', pick);
  svg.addEventListener('mouseover', pick);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); }
  });
  render();
}
