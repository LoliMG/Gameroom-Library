// Comprobación rápida de fitOnShelf (dónde cae un libro soltado en una balda) y separateOnShelf (separar libros que
// se pisan): node scripts/checkShelfFit.mjs
import assert from 'node:assert/strict'
import { fitOnShelf, separateOnShelf } from '../src/utils/shelfLayout.js'

const book = (width, x) => ({ width, x })
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

// Balda vacía de 1 m: el libro queda donde se suelta, salvo que se salga por un lateral
near(fitOnShelf([], 0.04, 0.1, 1), 0.1)
near(fitOnShelf([], 0.04, 0.6, 1), 0.48)

// Soltado encima de un libro: se arrima al hueco libre más cercano (a su izquierda, con la separación)
near(fitOnShelf([book(0.1, 0)], 0.04, -0.01, 1, 0.01), -0.08)

// Hueco más estrecho que el libro: no cabe ahí, va al siguiente hueco libre
near(fitOnShelf([book(0.1, -0.1), book(0.1, 0.03)], 0.04, -0.03, 1, 0), 0.1)

// Balda llena: no hay sitio
assert.equal(fitOnShelf([book(1, 0)], 0.04, 0, 1), null)

// Separar: un libro volteado (0.2 m de hueco) junto a otro se aparta; los que no se pisan se quedan donde estaban
const separated = separateOnShelf([book(0.2, 0), book(0.04, 0.05), book(0.04, 0.4)], 1, 0)
near(separated[0], 0)
near(separated[1], 0.12)
near(separated[2], 0.4)
// Contra el panel derecho: se empujan hacia la izquierda sin salirse
const pushed = separateOnShelf([book(0.2, 0.45), book(0.2, 0.45)], 1, 0)
near(Math.max(...pushed), 0.4)
near(Math.min(...pushed), 0.2)

console.log('fitOnShelf y separateOnShelf: OK')
