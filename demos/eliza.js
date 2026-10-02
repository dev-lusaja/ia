// ELIZA de juguete: palabras clave → plantillas de respuesta, como el original de 1966.
// Las reglas se prueban en orden y gana la primera que encaja (así "no me siento triste" cae en "me siento …").
const RULES = [
  { label: 'hola', re: / (hola|buenas|buenos días|buenas tardes) /, replies: ['Hola. ¿Qué te preocupa hoy?'] },
  { label: 'me siento …', re: / me siento (.+) /, replies: ['¿Por qué te sientes {1}?', '¿Desde cuándo te sientes {1}?'] },
  { label: 'estoy …', re: / estoy (.+) /, replies: ['¿Cuánto tiempo llevas {1}?', '¿Crees que es normal estar {1}?'] },
  { label: 'soy …', re: / soy (.+) /, replies: ['¿Por qué dices que eres {1}?', '¿Te gusta ser {1}?'] },
  { label: 'no puedo …', re: / no puedo (.+) /, replies: ['¿Qué te impide {1}?', '¿Has intentado {1} de verdad?'] },
  { label: 'quiero …', re: / quiero (.+) /, replies: ['¿Qué significaría para ti {1}?', '¿Por qué quieres {1}?'] },
  { label: 'familia', re: / (madre|padre|mamá|papá|hermano|hermana|familia|hijo|hija) /, replies: ['Háblame más de tu familia.', '¿Qué papel tiene tu familia en todo esto?'] },
  { label: 'máquina', re: / (máquina|computadora|ordenador|robot|programa|ia) /, replies: ['¿Te preocupan las máquinas?', '¿Por qué mencionas las máquinas?'] },
  { label: 'siempre', re: / siempre /, replies: ['¿Puedes pensar en un ejemplo concreto?'] },
  { label: 'porque …', re: / porque /, replies: ['¿Esa es la verdadera razón?', '¿Se te ocurre otra razón?'] },
  { label: 'no', re: / no /, replies: ['¿Por qué no?', 'Suenas muy seguro.'] },
  { label: 'pregunta (termina en «?»)', re: /\?$/, raw: true, replies: ['¿Por qué lo preguntas?', '¿Qué crees tú?'] },
];
const FALLBACK = ['Cuéntame más.', 'Entiendo. Sigue.', '¿Y eso cómo te hace sentir?'];

// Primera persona → segunda: "mi jefe me grita" → "tu jefe te grita"
const SWAP = {
  yo: 'tú', mi: 'tu', mis: 'tus', me: 'te', conmigo: 'contigo', estoy: 'estás', soy: 'eres',
  tengo: 'tienes', puedo: 'puedes', quiero: 'quieres', siento: 'sientes',
};
const reflect = text => text.split(' ').map(w => SWAP[w] || w).join(' ');

const used = new Map(); // regla → veces usada, para rotar respuestas
const pick = (key, list) => {
  const n = used.get(key) || 0;
  used.set(key, n + 1);
  return list[n % list.length];
};

function answer(input) {
  const raw = input.trim();
  const text = ` ${raw.toLowerCase().replace(/[¿?¡!.,;:"«»]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  for (const rule of RULES) {
    const m = (rule.raw ? raw : text).match(rule.re);
    if (m) {
      const reply = pick(rule, rule.replies).replace('{1}', () => reflect((m[1] || '').trim()));
      return { reply, rule: `regla «${rule.label}»` };
    }
  }
  return { reply: pick(FALLBACK, FALLBACK), rule: 'ninguna regla encajó: respuesta comodín' };
}

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> debajo de cada respuesta verás la regla que usó ELIZA.
      Parece que te escucha, pero solo busca palabras clave. Intenta que diga algo sin sentido.</p>
    <ol class="chat-log" aria-live="polite"></ol>
    <form class="demo-controls chat-form">
      <input type="text" aria-label="Tu mensaje para ELIZA" placeholder="Escribe algo…" autocomplete="off">
      <button type="submit">Enviar</button>
    </form>
    <div class="demo-controls chat-suggestions">
      <button type="button">Me siento cansado</button>
      <button type="button">Mi madre no me entiende</button>
      <button type="button">No me siento triste</button>
      <button type="button">El cielo sabe a jueves</button>
    </div>
    <p class="demo-reflect">🤔 Con «No me siento triste», ELIZA te pregunta por qué te sientes triste: la regla
      «me siento …» no sabe qué significa «no». ¿Cuántas reglas harían falta para cubrir todo lo que una persona puede decir?</p>`;

  const log = el.querySelector('.chat-log');
  const input = el.querySelector('input');

  const add = (who, text, rule) => {
    const li = document.createElement('li');
    li.className = `chat-msg chat-${who}`;
    li.textContent = text;
    if (rule) {
      const small = document.createElement('small');
      small.className = 'chat-rule';
      small.textContent = `🔧 ${rule}`;
      li.append(small);
    }
    log.append(li);
    log.scrollTop = log.scrollHeight;
  };

  const send = text => {
    if (!text.trim()) return;
    add('user', text);
    const { reply, rule } = answer(text);
    add('bot', reply, rule);
  };

  el.querySelector('.chat-form').addEventListener('submit', e => {
    e.preventDefault();
    send(input.value);
    input.value = '';
  });
  el.querySelector('.chat-suggestions').addEventListener('click', e => {
    if (e.target.matches('button')) send(e.target.textContent);
  });

  add('bot', 'Hola, soy ELIZA. Cuéntame qué te preocupa.', 'mensaje inicial');
}
