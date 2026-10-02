// El bucle de un agente, paso a paso: piensa → actúa (herramienta) → observa → decide, hasta responder.
// Incluye un fallo de herramienta (el agente reintenta) y una acción con dinero que espera tu confirmación.
const PHASES = { piensa: '🧠 Piensa', actua: '🛠️ Actúa', observa: '👀 Observa', decide: '🔁 Decide', responde: '✅ Responde' };
const TASK = '¿Necesito paraguas mañana en Lima? Si va a llover, resérvame un taxi a las 8:00.';
const STEPS = [
  { p: 'piensa', t: 'Primero necesito el pronóstico de mañana en Lima.' },
  { p: 'actua', t: '<code>obtener_clima(ciudad="Lima", día="mañana")</code>' },
  { p: 'observa', t: '❌ Error: el servicio del clima no respondió a tiempo.', bad: true },
  { p: 'decide', t: 'Sin ese dato no puedo responder. Lo reintento antes de rendirme.' },
  { p: 'actua', t: '<code>obtener_clima(ciudad="Lima", día="mañana")</code>' },
  { p: 'observa', t: '17 °C, nublado, 70 % de probabilidad de lluvia.' },
  { p: 'decide', t: 'Un 70 % es bastante: conviene el paraguas y reservar el taxi.' },
  { p: 'actua', t: '<code>reservar_taxi(hora="8:00")</code>' },
  { p: 'observa', t: '⏸️ Esta acción gasta dinero. Esperando tu confirmación…', confirm: true },
];
const AFTER = {
  yes: [
    { p: 'observa', t: 'Taxi reservado para las 8:00. Código 4821.' },
    { p: 'decide', t: 'Ya tengo todo lo que me pidieron. Termino.' },
    { p: 'responde', t: 'Sí, lleva paraguas: hay un 70 % de probabilidad de lluvia. Te reservé un taxi a las 8:00 (código 4821).' },
  ],
  no: [
    { p: 'observa', t: 'Reserva cancelada por el usuario.' },
    { p: 'decide', t: 'No debo insistir con la reserva. Termino con lo que sé.' },
    { p: 'responde', t: 'Sí, lleva paraguas: hay un 70 % de probabilidad de lluvia. No reservé el taxi, como indicaste.' },
  ],
};

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> le pides una tarea a un agente y avanzas por su bucle
      paso a paso. Fíjate en qué hace cuando una herramienta falla, y en qué momento te pide permiso.</p>
    <p class="agent-task">💬 <strong>Tú:</strong> ${TASK}</p>
    <ul class="agent-phases" aria-hidden="true">
      ${Object.entries(PHASES).map(([k, v]) => `<li data-p="${k}">${v}</li>`).join('')}
    </ul>
    <ol class="agent-log" aria-live="polite"></ol>
    <div class="demo-controls">
      <button type="button" data-a="next">Siguiente paso →</button>
      <button type="button" data-a="yes" hidden>✅ Confirmar reserva</button>
      <button type="button" data-a="no" hidden>✋ Cancelar</button>
      <button type="button" data-a="reset">↺ Empezar de nuevo</button>
      <span class="demo-result" aria-live="polite"></span>
    </div>
    <p class="demo-reflect">🤔 Sin el reintento, el agente habría respondido sin el pronóstico, o inventándolo.
      Sin la confirmación, habría gastado tu dinero sin preguntar. ¿Qué otras acciones deberían pedir siempre
      permiso?</p>`;

  const $ = s => el.querySelector(s);
  let steps, shown, tools;

  const render = () => {
    const done = steps.slice(0, shown);
    const current = done.at(-1);
    $('.agent-log').innerHTML = done.map(s => `
      <li class="agent-step${s.bad ? ' bad' : ''}${s.p === 'responde' ? ' final' : ''}">
        <span class="agent-phase">${PHASES[s.p]}</span><span>${s.t}</span>
      </li>`).join('');
    el.querySelectorAll('.agent-phases li').forEach(li => li.classList.toggle('on', li.dataset.p === current?.p));
    const waiting = current?.confirm && steps.length === STEPS.length;
    const finished = current?.p === 'responde';
    $('[data-a="next"]').hidden = waiting || finished;
    $('[data-a="yes"]').hidden = !waiting;
    $('[data-a="no"]').hidden = !waiting;
    $('.demo-result').textContent = `Pasos: ${shown} · Herramientas usadas: ${tools}`;
    $('.agent-log').lastElementChild?.scrollIntoView({ block: 'nearest' });
  };

  const advance = () => {
    shown++;
    if (steps[shown - 1].p === 'actua') tools++;
    render();
  };
  const reset = () => {
    steps = [...STEPS];
    shown = 0;
    tools = 0;
    render();
  };

  $('[data-a="next"]').addEventListener('click', advance);
  ['yes', 'no'].forEach(k => $(`[data-a="${k}"]`).addEventListener('click', () => {
    steps = [...STEPS, ...AFTER[k]];
    advance();
    $('[data-a="next"]').focus();
  }));
  $('[data-a="reset"]').addEventListener('click', () => {
    reset();
    $('[data-a="next"]').focus();
  });
  reset();
}
