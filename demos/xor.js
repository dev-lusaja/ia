// XOR: la clase 1 ocupa dos esquinas opuestas. Ninguna recta (un solo perceptrón) acierta más de 15/20.
import { draw } from './perceptron.js';

const XOR = [
  // Clase 1: arriba a la izquierda y abajo a la derecha
  [-0.7, 0.6, 1], [-0.4, 0.8, 1], [-0.6, 0.3, 1], [-0.3, 0.5, 1], [-0.8, 0.8, 1],
  [0.7, -0.6, 1], [0.4, -0.8, 1], [0.6, -0.3, 1], [0.3, -0.5, 1], [0.8, -0.8, 1],
  // Clase 0: arriba a la derecha y abajo a la izquierda
  [0.7, 0.6, 0], [0.4, 0.8, 0], [0.6, 0.3, 0], [0.3, 0.5, 0], [0.8, 0.8, 0],
  [-0.7, -0.6, 0], [-0.4, -0.8, 0], [-0.6, -0.3, 0], [-0.3, -0.5, 0], [-0.8, -0.8, 0],
];

export function mount(el) {
  draw(el, XOR,
    `es el mismo perceptrón del tema anterior, pero ahora cada clase ocupa dos esquinas opuestas.
      Mueve los controles todo lo que quieras: ¿consigues más de 15 aciertos?`,
    `Ninguna recta puede separar estos puntos: eso demostraron Minsky y Papert en 1969. Con una capa
      oculta sí se puede: dos neuronas trazan una recta cada una y una tercera combina sus respuestas. ¿Cómo lo harías tú?`);
}
