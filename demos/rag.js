// RAG en miniatura: la pregunta se compara con cada fragmento (similitud entre sus conceptos, como un coseno
// entre embeddings), los dos más parecidos se adjuntan al prompt y la respuesta se apoya en ellos.
// «Libro cerrado» muestra lo que respondería el modelo de memoria: suena igual de seguro, pero se lo inventa.
const DOCS = [
  { title: 'Política de descanso, sección 3', text: 'Cada empleado tiene 22 días hábiles de descanso remunerado al año.', tags: ['vacaciones', 'descanso', 'días', 'año', 'libre'] },
  { title: 'Calendario laboral', text: 'La oficina cierra los festivos nacionales y los días 24 y 31 de diciembre.', tags: ['festivos', 'días', 'calendario', 'oficina'] },
  { title: 'Trabajo en remoto, sección 1', text: 'Se puede trabajar desde casa hasta dos días por semana, avisando al equipo el día anterior.', tags: ['casa', 'remoto', 'semana', 'días', 'trabajar'] },
  { title: 'Viajes y dietas, sección 2', text: 'En los viajes de trabajo se cubren hasta 30 € diarios en comidas, con factura.', tags: ['viaje', 'comida', 'gastos', 'dinero', 'trabajo'] },
  { title: 'Material de trabajo', text: 'Al incorporarte puedes pedir un portátil y una silla ergonómica para la oficina.', tags: ['portátil', 'material', 'oficina', 'silla'] },
  { title: 'Formación', text: 'La empresa paga hasta 500 € al año en cursos relacionados con tu puesto.', tags: ['cursos', 'formación', 'dinero', 'año'] },
];
const QUESTIONS = [
  { q: '¿Cuántos días libres tengo al año?', tags: ['vacaciones', 'días', 'año', 'libre'],
    answer: 'Tienes 22 días hábiles de descanso remunerado al año.', closed: 'Tienes 30 días naturales de vacaciones al año.' },
  { q: '¿Puedo trabajar desde casa?', tags: ['casa', 'remoto', 'trabajar'],
    answer: 'Sí, hasta dos días por semana, avisando al equipo el día anterior.', closed: 'Sí, puedes teletrabajar todos los días que quieras.' },
  { q: '¿Cuánto me pagan las comidas en un viaje?', tags: ['viaje', 'comida', 'gastos'],
    answer: 'Hasta 30 € al día, presentando la factura.', closed: 'Se cubren 50 € al día, sin necesidad de justificarlos.' },
  { q: '¿Puedo traer a mi perro a la oficina?', tags: ['perro', 'mascota', 'oficina'],
    answer: null, closed: '¡Claro! Los viernes se permiten mascotas en la oficina.' },
];
const TOP = 2;
const MIN_SCORE = 0.4; // por debajo, los fragmentos no responden la pregunta

const similarity = (a, b) => a.filter(t => b.includes(t)).length / Math.sqrt(a.length * b.length);

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> elige una pregunta sobre las normas de una empresa y
      compara las dos formas de responder. Con <strong>libro abierto</strong>, mira qué fragmentos encuentra el
      buscador y cuáles se adjuntan al prompt.</p>
    <div class="demo-controls" role="group" aria-label="Pregunta">
      ${QUESTIONS.map((q, i) => `<button type="button" data-q="${i}">${q.q}</button>`).join('')}
    </div>
    <div class="demo-controls" role="group" aria-label="Modo">
      <button type="button" data-m="closed">🧠 Libro cerrado</button>
      <button type="button" data-m="rag">📖 Libro abierto (RAG)</button>
    </div>
    <div class="rag-search">
      <p class="demo-observe">🔎 Similitud de cada fragmento con la pregunta (📎 = se adjunta al prompt):</p>
      <div class="prob-bars"></div>
    </div>
    <ol class="chat-log" aria-live="polite"></ol>
    <p class="demo-reflect">🤔 Prueba la pregunta del perro con libro abierto: el buscador trae fragmentos de
      todas formas, porque siempre hay alguno "más parecido". ¿Por qué es tan importante que el modelo sepa decir
      "no está en los documentos"?</p>`;

  const $ = s => el.querySelector(s);
  let qi = 0;
  let mode = 'rag';

  const render = () => {
    const q = QUESTIONS[qi];
    el.querySelectorAll('[data-q]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.q) === qi)));
    el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));

    const ranked = DOCS.map(d => ({ ...d, score: similarity(q.tags, d.tags) })).sort((a, b) => b.score - a.score);
    const attached = ranked.slice(0, TOP);
    $('.rag-search').hidden = mode !== 'rag';
    $('.prob-bars').innerHTML = ranked.map((d, i) => `
      <div class="prob-row">
        <span class="prob-word" title="${d.text}">${i < TOP ? '📎 ' : ''}${d.title}</span>
        <span class="prob-track"><span class="prob-fill" style="width: ${(d.score * 100).toFixed(0)}%; opacity: ${i < TOP ? 1 : 0.45}"></span></span>
        <span class="demo-value">${d.score.toFixed(2)}</span>
      </div>`).join('');

    let reply;
    if (mode === 'closed') {
      reply = `${q.closed}<span class="chat-rule">⚠️ Suena seguro, pero lo dice de memoria y no tiene ninguna fuente. Es inventado.</span>`;
    } else if (q.answer && attached[0].score >= MIN_SCORE) {
      reply = `${q.answer}<span class="chat-rule">📎 Fuente: ${attached[0].title} · «${attached[0].text}»</span>`;
    } else {
      reply = `No encontré nada sobre eso en los documentos. Te recomiendo preguntar a Recursos Humanos.
        <span class="chat-rule">📎 Los fragmentos adjuntos hablaban de otra cosa (similitud ${attached[0].score.toFixed(2)}), así que no responde con ellos.</span>`;
    }
    $('.chat-log').innerHTML = `
      <li class="chat-msg chat-user">${q.q}</li>
      <li class="chat-msg chat-bot">${reply}</li>`;
  };

  el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { qi = Number(b.dataset.q); render(); }));
  el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; render(); }));
  render();
}
