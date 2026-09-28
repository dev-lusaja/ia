// Tokenizador de juguete: vocabulario pequeño y coincidencia más larga primero.
// ponytail: aproximación didáctica; un BPE real (tiktoken) pesa varios MB.
const VOCAB = [
  // Palabras frecuentes: un solo token
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'y', 'en', 'a', 'es', 'por', 'con', 'para', 'se', 'no',
  'su', 'al', 'lo', 'me', 'mi', 'más', 'pero', 'como', 'muy', 'hola', 'gato', 'perro', 'casa', 'día', 'hoy', 'sol',
  'cielo', 'azul', 'mundo', 'red', 'datos', 'texto', 'modelo', 'palabra', 'máquina', 'inteligencia', 'artificial',
  'aprender', 'sentó', 'estaba', 'cansado', 'bien', 'gracias', 'tiempo', 'agua', 'vida', 'nuevo', 'todo',
  // Trozos reutilizables: raíces, prefijos y sufijos
  'aprend', 'intelig', 'comput', 'neur', 'token', 'transform', 'lengu', 'escrib', 'habl', 'pens', 'program',
  'des', 're', 'in', 'pre', 'sub', 'super', 'anti', 'auto',
  'ción', 'ciones', 'mente', 'ando', 'iendo', 'ado', 'ada', 'ido', 'ida', 'aje', 'able', 'ible', 'izar', 'iza',
  'ente', 'ante', 'dad', 'ismo', 'ista', 'oso', 'osa', 'es', 'os', 'as', 'ar', 'er', 'ir', 'on', 'or',
  'patr', 'ones', 'cre', 'íble', 'íbles', 'ble', 'bles', 'je', 'nes', 'e', 'o', 's',
];
const vocabSet = new Set(VOCAB);
const MAX_LEN = Math.max(...VOCAB.map(t => t.length));

function tokenize(text) {
  const tokens = [];
  // Palabras (con su espacio delante, como hacen los tokenizadores reales), números y signos sueltos
  for (const [piece] of text.matchAll(/ ?[\p{L}]+| ?\d+|\s+|[^\s\p{L}\d]/gu)) {
    const space = piece.startsWith(' ') ? ' ' : '';
    let word = piece.slice(space.length);
    if (!/\p{L}/u.test(word)) { tokens.push({ text: piece, id: idFor(piece) }); continue; }
    let first = true;
    while (word) {
      let len = Math.min(MAX_LEN, word.length);
      while (len > 1 && !vocabSet.has(word.slice(0, len).toLowerCase())) len--;
      const chunk = word.slice(0, len);
      tokens.push({ text: (first ? space : '') + chunk, id: idFor(chunk.toLowerCase()) });
      word = word.slice(len);
      first = false;
    }
  }
  return tokens;
}

// ID estable: posición en el vocabulario o, si no está, un número derivado del texto
function idFor(text) {
  const i = VOCAB.indexOf(text.trim());
  if (i >= 0) return 100 + i;
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) % 49000;
  return 1000 + h;
}

export function mount(el) {
  el.innerHTML = `
    <p class="demo-observe"><strong>Qué observar:</strong> las palabras comunes son un solo token; las raras o largas se
      parten en trozos. Prueba con «desaprendizaje» o con tu nombre.</p>
    <div class="demo-controls">
      <input type="text" aria-label="Frase para tokenizar" value="La inteligencia artificial aprende patrones increíbles">
    </div>
    <div class="token-list" aria-live="polite"></div>
    <p class="demo-result"></p>
    <p class="demo-reflect">⚠️ Es una aproximación con un vocabulario de unas 100 piezas; los modelos reales usan
      decenas de miles. 🤔 ¿Por qué crees que un modelo cobra por tokens y no por palabras?</p>`;

  const input = el.querySelector('input');
  const list = el.querySelector('.token-list');
  const result = el.querySelector('.demo-result');

  const render = () => {
    const tokens = tokenize(input.value).filter(t => t.text.trim());
    const words = input.value.trim().split(/\s+/).filter(Boolean).length;
    list.innerHTML = tokens.map((t, i) => `
      <span class="token" style="--h: ${(i * 67) % 360}">
        <span class="token-text">${t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ /g, '·')}</span>
        <span class="token-id">${t.id}</span>
      </span>`).join('');
    result.textContent = `${words} palabra${words === 1 ? '' : 's'} → ${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
  };
  input.addEventListener('input', render);
  render();
}
