// Comprobación rápida de fitOnShelf (dónde cae un libro soltado en una balda) y separateOnShelf (separar libros que
// se pisan): node scripts/checkShelfFit.mjs
import assert from 'node:assert/strict'
import { fitOnShelf, separateOnShelf, fitGroupOnShelf, isValidSlot, placeSavedBooks, placeNewBooks } from '../src/utils/shelfLayout.js'

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

// Bloque de libros (selección arrastrada): seguidos, con el agarrado (el segundo) bajo el puntero
const group = fitGroupOnShelf([], [0.02, 0.04, 0.02], 1, 0, 1, 0.01)
near(group[0], -0.04)
near(group[1], 0)
near(group[2], 0.04)
// Un solo libro: igual que fitOnShelf
near(fitGroupOnShelf([book(0.1, 0)], [0.04], 0, -0.01, 1, 0.01)[0], -0.08)
// Contra el panel derecho, el bloque entero se arrima sin salirse; si no cabe, null
near(Math.max(...fitGroupOnShelf([], [0.1, 0.1], 0, 0.5, 1, 0)), 0.45)
assert.equal(fitGroupOnShelf([book(0.9, 0)], [0.04, 0.04], 0, 0, 1, 0), null)

// Sitios guardados encima del reparto inicial: un tramo de 1 módulo de 1 m con 2 baldas
const walls = [{ key: 'a0', moduleCount: 1, innerWidth: 1, shelfCount: 2 }]
const at = (isbn, width, shelf, x) => ({ book: { isbn, width }, wall: 'a0', module: 0, shelf, x })
// Sitio inexistente (balda 5 en un tramo de 2) o fuera del ancho: no vale
assert.equal(isValidSlot(walls, { wall: 'a0', module: 0, shelf: 5, x: 0 }), false)
assert.equal(isValidSlot(walls, { wall: 'a0', module: 0, shelf: 0, x: 0.6 }), false)
assert.equal(isValidSlot(walls, { wall: 'a0', module: 0, shelf: 1, x: 0.1 }), true)
// Sin sitios guardados: el reparto inicial tal cual
const initial = [at('A', 0.3, 0, -0.35), at('B', 0.3, 0, -0.05), at('C', 0.1, 0, 0.2)]
assert.deepEqual(placeSavedBooks(initial, {}, walls, 0.01), initial)
// A y B guardados llenando la izquierda de la balda 0: C (sin sitio) va al primer hueco libre, sin pisarlos
const saved = { A: { wall: 'a0', module: 0, shelf: 0, x: -0.35 }, B: { wall: 'a0', module: 0, shelf: 0, x: -0.04 } }
const placed = placeSavedBooks(initial, saved, walls, 0.01)
near(placed[0].x, -0.35)
near(placed[1].x, -0.04)
assert.equal(placed[2].shelf, 0)
near(placed[2].x, 0.17) // Justo tras B (borde derecho 0.11) con la separación (0.01): centro 0.12 + 0.05
// Balda 0 llena: el libro nuevo sube a la balda 1
const full = { A: { wall: 'a0', module: 0, shelf: 0, x: -0.3 }, B: { wall: 'a0', module: 0, shelf: 0, x: 0.2 } }
const wide = [at('A', 0.45, 0, 0), at('B', 0.55, 0, 0), at('C', 0.1, 0, 0)]
const upstairs = placeSavedBooks(wide, full, walls, 0.01)
assert.equal(upstairs[2].shelf, 1)
near(upstairs[2].x, -0.45)

// Libro añadido sin recargar: entra en el primer hueco libre; si no falta ninguno, la misma lista (React no repinta)
const shelfNow = [at('A', 0.45, 0, -0.27), at('B', 0.3, 0, 0.2)]
assert.equal(placeNewBooks(shelfNow, [{ isbn: 'A', width: 0.45 }, { isbn: 'B', width: 0.3 }], walls, 0.01), shelfNow)
const withNew = placeNewBooks(shelfNow, [{ isbn: 'A', width: 0.45 }, { isbn: 'B', width: 0.3 }, { isbn: 'N', width: 0.1 }], walls, 0.01)
assert.equal(withNew.length, 3)
assert.deepEqual([withNew[2].book.isbn, withNew[2].shelf], ['N', 0])
near(withNew[2].x, 0.41) // Entre A y B no cabe: va tras B (borde derecho 0.35) con la separación (0.01): 0.36 + 0.05

console.log('fitOnShelf, separateOnShelf, fitGroupOnShelf, placeSavedBooks y placeNewBooks: OK')
