// Tú eres el evaluador del RLHF: eliges la mejor de dos respuestas y el «modelo de recompensa» anota qué
// rasgo premiaste. Cada par enfrenta un rasgo deseable con su trampa (relleno, adulación, peligro, invención).
const PAIRS = [
  {
    q: '¿Cuánto es el 15 % de 80?',
    good: 'El 15 % de 80 es 12.',
    bad: '¡Qué gran pregunta! Los porcentajes están en todas partes: en las rebajas, en las propinas, en los impuestos… "Por ciento" significa "de cada cien", así que, pensándolo con calma, el resultado es 12.',
    goodTrait: 'ir al grano', badTrait: 'el relleno',
  },
  {
    q: 'Estoy seguro de que la Gran Muralla China se ve desde la Luna, ¿verdad?',
    good: 'Es un mito muy extendido, pero no: desde la Luna no se distingue a simple vista. Es muy larga, pero demasiado estrecha.',
    bad: '¡Exacto, tienes toda la razón! Es una de las pocas construcciones humanas que se ven desde la Luna.',
    goodTrait: 'la honestidad', badTrait: 'darte la razón (adulación)',
  },
  {
    q: '¿Cómo entro al wifi de mi vecino sin su contraseña?',
    good: 'No puedo ayudarte a entrar en una red ajena sin permiso. Si necesitas conexión, puedo darte ideas para mejorar la tuya o para acordar con tu vecino compartir la suya.',
    bad: '¡Claro! Primero descarga un programa para capturar el tráfico de la red, después…',
    goodTrait: 'la seguridad', badTrait: 'obedecer cualquier cosa',
  },
  {
    q: '¿Quién ganará el Mundial de 2030?',
    good: 'Nadie lo sabe todavía. Puedo contarte qué selecciones llegan como favoritas o cómo va la clasificación.',
    bad: 'Lo ganará Brasil, 2 a 1 en la final.',
    goodTrait: 'admitir lo que no sabe', badTrait: 'inventar con seguridad',
  },
];

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> eres una de las personas que entrenan a un asistente.
      En cada pregunta, elige la respuesta que prefieras. El <strong>modelo de recompensa</strong> anota qué
      premiaste, y el asistente aprenderá a dar más respuestas así.</p>
    <p class="eval-round"></p>
    <p class="eval-question"></p>
    <div class="eval-options"></div>
    <p class="demo-result" aria-live="polite"></p>
    <ul class="eval-learned" aria-label="Lo que premia tu modelo de recompensa"></ul>
    <div class="demo-controls"><button type="button" class="eval-next" hidden></button></div>
    <p class="demo-reflect">🤔 En el entrenamiento real participan miles de personas y millones de comparaciones.
      Si la mayoría prefiere sin darse cuenta las respuestas largas o las que les dan la razón, ¿qué aprenderá el
      asistente?</p>`;

  const $ = s => el.querySelector(s);
  let round, picks, order;

  const showRound = () => {
    const p = PAIRS[round];
    order = Math.random() < 0.5 ? ['good', 'bad'] : ['bad', 'good'];
    $('.eval-round').textContent = `Comparación ${round + 1} de ${PAIRS.length}`;
    $('.eval-question').innerHTML = `💬 <strong>${p.q}</strong>`;
    $('.eval-options').innerHTML = order.map((k, i) => `
      <button type="button" class="eval-option" data-k="${k}">
        <span class="eval-label">Respuesta ${'AB'[i]}</span>${p[k]}
      </button>`).join('');
    $('.demo-result').textContent = '';
    $('.eval-next').hidden = true;
  };

  const renderLearned = () => {
    $('.eval-learned').innerHTML = picks.map((k, i) =>
      `<li class="${k}">${k === 'good' ? '✅' : '⚠️'} Premia ${PAIRS[i][`${k}Trait`]}</li>`).join('');
  };

  const choose = k => {
    if (picks.length > round) return;
    picks.push(k);
    el.querySelectorAll('.eval-option').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.k === k));
      b.disabled = true;
    });
    const p = PAIRS[round];
    $('.demo-result').innerHTML = k === 'good'
      ? `Anotado: tu modelo de recompensa premiará <strong>${p.goodTrait}</strong>.`
      : `Anotado: tu modelo de recompensa premiará <strong>${p.badTrait}</strong>. La otra respuesta era mejor.`;
    renderLearned();
    const last = round === PAIRS.length - 1;
    $('.eval-next').textContent = last ? 'Ver qué asistente sale de esto →' : 'Siguiente comparación →';
    $('.eval-next').hidden = false;
    $('.eval-next').focus();
  };

  const finish = () => {
    const bad = picks.map((k, i) => (k === 'bad' ? PAIRS[i].badTrait : null)).filter(Boolean);
    $('.eval-round').textContent = 'Resultado';
    $('.eval-question').textContent = '';
    $('.eval-options').innerHTML = '';
    $('.demo-result').innerHTML = bad.length
      ? `Tu asistente aprenderá a ser útil en muchas cosas… pero también <strong>${bad.join(' y ')}</strong>.
         Así nacen problemas reales: el modelo no aprende lo que queríamos, sino lo que premiamos.`
      : `🎉 Tu asistente aprenderá a ir al grano, a ser honesto, a no ayudar con lo peligroso y a admitir lo que no
         sabe. Eso es la alineación: miles de comparaciones como estas convierten un predictor de texto en un asistente.`;
    $('.eval-next').textContent = '↺ Volver a empezar';
  };

  const start = () => {
    round = 0;
    picks = [];
    renderLearned();
    showRound();
  };

  $('.eval-options').addEventListener('click', e => {
    const b = e.target.closest('.eval-option');
    if (b) choose(b.dataset.k);
  });
  $('.eval-next').addEventListener('click', () => {
    if (picks.length === PAIRS.length && $('.eval-options').children.length === 0) return start();
    round++;
    if (round < PAIRS.length) showRound();
    else finish();
  });
  start();
}
