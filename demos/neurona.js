// Explorador de la neurona: eliges una parte (pestañas o tocando el dibujo) y la ficha explica qué hace.
// «Enviar señal» muestra el umbral: una señal sola no basta; al juntar THRESHOLD la neurona dispara y el
// impulso recorre el axón hasta las sinapsis.
const PARTS = [
  {
    name: 'Dendritas',
    text: 'Son las ramas que reciben los mensajes de otras neuronas, como antenas. Una sola neurona puede tener miles.',
  },
  {
    name: 'Soma',
    text: 'Es el cuerpo de la neurona. Junta todos los mensajes que llegan: unos la animan a activarse y otros la frenan. Si la suma alcanza el <strong>umbral</strong>, la neurona dispara; si no, no hace nada. Es todo o nada.',
  },
  {
    name: 'Axón',
    text: 'Es el cable que lleva el impulso desde el soma hasta el otro extremo de la neurona. Lo cubre la mielina, un aislante que lo hace viajar a más de 100 m/s.',
  },
  {
    name: 'Sinapsis',
    text: 'Es el punto donde la neurona pasa el mensaje a la siguiente, soltando sustancias químicas llamadas neurotransmisores. Cuanto más se usa una conexión, más fuerte se vuelve: así aprendemos.',
  },
];
const THRESHOLD = 3;

// Geometría del dibujo (viewBox 400 × 210): soma en (130, 100)
const DENDRITES = [
  'M15 30 C 55 35 80 70 103 86',
  'M8 98 C 45 92 75 98 100 99',
  'M15 165 C 50 160 80 130 102 112',
  'M62 200 C 75 172 95 150 112 126',
];
const TWIGS = ['M57 47 L 48 20', 'M49 95 L 28 122', 'M54 149 L 34 128', 'M80 169 L 100 194'];
const AXON = 'M160 100 H 320';
const TERMINALS = [[360, 52], [372, 100], [360, 148]];
const terminal = ([x, y]) => `M320 100 L ${x} ${y}`;
const GAUGE = { x: 100, w: 60, y: 160 };

export function mount(el) {
  const part = (i, body) => `<g class="nx-part" data-part="${i}">${body}</g>`;
  const line = (d, w = 3) => `<path class="nx-line" d="${d}" stroke-width="${w}"/><path class="nx-hit" d="${d}"/>`;

  el.innerHTML = `
    <p class="demo-observe">Elige una parte de la neurona para ver qué hace. Después envíale señales y mira
      cuándo se decide a disparar.</p>
    <div class="nx">
      <div class="nx-stage">
        <svg viewBox="0 0 400 210" role="img" aria-label="Dibujo de una neurona: dendritas, soma, axón y sinapsis">
          ${part(0, `${DENDRITES.map(d => line(d)).join('')}${TWIGS.map(d => line(d, 2)).join('')}
            <text x="60" y="14" text-anchor="middle" class="neuron-label">dendritas</text>`)}
          ${part(2, `${line(AXON, 4)}
            ${[172, 222, 272].map(x => `<rect class="nx-fill" x="${x}" y="92" width="40" height="16" rx="6"/>`).join('')}
            <text x="246" y="82" text-anchor="middle" class="neuron-label">axón (con mielina)</text>`)}
          ${part(3, `${TERMINALS.map(t => line(terminal(t))).join('')}
            ${TERMINALS.map(([x, y]) => `<circle class="nx-fill" cx="${x}" cy="${y}" r="7"/>`).join('')}
            <text x="360" y="178" text-anchor="middle" class="neuron-label">sinapsis</text>`)}
          ${part(1, `<circle class="nx-fill neuron-soma" cx="130" cy="100" r="30" stroke-width="2"/>
            <circle cx="130" cy="100" r="10" style="fill: rgba(255, 255, 255, 0.15)"/>
            <text x="130" y="146" text-anchor="middle" class="neuron-label">soma</text>`)}
          <rect x="${GAUGE.x}" y="${GAUGE.y}" width="${GAUGE.w}" height="8" rx="4" style="fill: rgba(255, 255, 255, 0.06)"/>
          <rect class="neuron-charge" x="${GAUGE.x}" y="${GAUGE.y}" width="${GAUGE.w}" height="8" rx="4" style="fill: var(--chapter-neon)"/>
          <line x1="${GAUGE.x + GAUGE.w}" x2="${GAUGE.x + GAUGE.w}" y1="${GAUGE.y - 4}" y2="${GAUGE.y + 12}" stroke-width="2" style="stroke: var(--text-primary)"/>
          <text x="${GAUGE.x + GAUGE.w}" y="${GAUGE.y + 24}" text-anchor="middle" class="neuron-label">umbral</text>
        </svg>
        <div class="demo-controls"><button type="button" class="nx-signal">⚡ Enviar una señal</button></div>
        <p class="nx-status" aria-live="polite">Cada clic es un mensaje que llega a las dendritas.</p>
      </div>
      <div class="nx-card">
        <div class="nx-tabs" role="tablist" aria-label="Partes de la neurona">
          ${PARTS.map((p, i) => `<button type="button" role="tab" id="nx-tab-${i}" aria-controls="nx-panel">${p.name}</button>`).join('')}
        </div>
        <div class="nx-panels" id="nx-panel" role="tabpanel">
          ${PARTS.map(p => `<p class="nx-text">${p.text}</p>`).join('')}
        </div>
      </div>
    </div>`;

  const $ = s => el.querySelector(s);
  const svg = $('svg');
  const groups = svg.querySelectorAll('.nx-part');
  const tabs = el.querySelectorAll('[role="tab"]');
  const texts = el.querySelectorAll('.nx-text');
  const soma = svg.querySelector('.neuron-soma');
  const charge = svg.querySelector('.neuron-charge');
  let current = 0;
  let signals = 0;
  let firing = false;

  // Todos los textos ocupan la misma celda (CSS: .nx-text), así la ficha mide lo que el más largo y nada salta
  const select = i => {
    current = (i + PARTS.length) % PARTS.length;
    groups.forEach(g => g.classList.toggle('on', Number(g.dataset.part) === current));
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', k === current);
      t.tabIndex = k === current ? 0 : -1;
    });
    texts.forEach((t, k) => t.classList.toggle('on', k === current));
    $('.nx-panels').setAttribute('aria-labelledby', tabs[current].id);
  };

  // Pulso que recorre un trayecto una vez y desaparece (CSS: .neuron-pulse)
  const pulse = (d, delay = 0) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '100');
    p.setAttribute('class', 'neuron-pulse');
    p.style.stroke = 'var(--chapter-neon)';
    p.style.animationDelay = `${delay}s`;
    p.addEventListener('animationend', () => p.remove());
    svg.insertBefore(p, groups[groups.length - 1]); // debajo del soma
  };

  const setCharge = n => { charge.style.transform = `scaleX(${n / THRESHOLD})`; };

  const signal = () => {
    if (firing) return;
    pulse(DENDRITES[signals % DENDRITES.length]);
    signals++;
    setCharge(signals);
    if (signals < THRESHOLD) {
      $('.nx-status').textContent = `Señal ${signals} de ${THRESHOLD}: no alcanza el umbral, la neurona sigue en silencio.`;
      return;
    }
    // Dispara: el impulso recorre el axón y salta a las terminales; luego la neurona se descarga
    firing = true;
    soma.style.fill = 'var(--chapter-neon)';
    pulse(AXON, 0.5);
    TERMINALS.forEach(t => pulse(terminal(t), 1));
    $('.nx-status').innerHTML = '<strong>¡Umbral alcanzado!</strong> La neurona dispara y el impulso viaja por el axón hasta las siguientes.';
    setTimeout(() => {
      signals = 0;
      firing = false;
      soma.style.fill = '';
      setCharge(0);
    }, 1800);
  };

  // El dibujo se toca con el mouse o el dedo; con teclado se usan las pestañas (flechas para moverse)
  groups.forEach(g => g.addEventListener('click', () => select(Number(g.dataset.part))));
  tabs.forEach((t, k) => t.addEventListener('click', () => select(k)));
  $('.nx-tabs').addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    select(current + step);
    tabs[current].focus();
  });
  $('.nx-signal').addEventListener('click', signal);
  setCharge(0);
  select(0);
}
