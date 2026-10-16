// Comprobación rápida de fitOnShelf (dónde cae un libro soltado en una balda): node scripts/checkShelfFit.mjs
import assert from 'node:assert/strict'
import { fitOnShelf } from '../src/utils/shelfLayout.js'

const book = (width) => ({ width })
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

// Balda vacía de 1 m: el libro queda donde se suelta, salvo que se salga por un lateral
near(fitOnShelf([], 0.04, 0.1, 1), 0.1)
near(fitOnShelf([], 0.04, 0.6, 1), 0.48)

// Soltado encima de un libro: se arrima al hueco libre más cercano (a su izquierda, con la separación)
near(fitOnShelf([{ book: book(0.1), x: 0 }], 0.04, -0.01, 1, 0.01), -0.08)

// Hueco más estrecho que el libro: no cabe ahí, va al siguiente hueco libre
near(fitOnShelf([{ book: book(0.1), x: -0.1 }, { book: book(0.1), x: 0.03 }], 0.04, -0.03, 1, 0), 0.1)

// Balda llena: no hay sitio
assert.equal(fitOnShelf([{ book: book(1), x: 0 }], 0.04, 0, 1), null)

console.log('fitOnShelf: OK')
