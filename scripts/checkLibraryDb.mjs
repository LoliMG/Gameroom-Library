// Comprobación rápida de la base de datos de la biblioteca (en memoria): node scripts/checkLibraryDb.mjs
import assert from 'node:assert/strict'
import {
  openLibraryDb,
  seedBooks,
  readState,
  writePlacements,
  writeFlipped,
  writeReadingStatus,
  ValidationError,
} from '../server/library.js'

const db = openLibraryDb(':memory:')
seedBooks(db, [
  { isbn: '111', title: 'Uno', author: 'A', pages: 100 },
  { isbn: '222', title: 'Dos', author: 'B', pages: 200 },
  { isbn: '333', title: null }, // sin título: no entra
])
assert.deepEqual(readState(db), { placements: {}, flipped: [], readingStatus: {} })

// Guardar y leer: los ISBN que no existen se ignoran
writePlacements(db, { 111: { wall: 'a0', module: 1, shelf: 2, x: 0.25 }, 999: { wall: 'a0', module: 0, shelf: 0, x: 0 } })
writeFlipped(db, ['222', '999'])
writeReadingStatus(db, { 111: 'finished', 222: 'reading' })
assert.deepEqual(readState(db), {
  placements: { 111: { wall: 'a0', module: 1, shelf: 2, x: 0.25 } },
  flipped: ['222'],
  readingStatus: { 111: 'finished', 222: 'reading' },
})

// Volver a cargar el catálogo no borra lo guardado
seedBooks(db, [{ isbn: '111', title: 'Uno (2.ª ed.)' }, { isbn: '222', title: 'Dos' }])
assert.equal(readState(db).readingStatus[111], 'finished')

// Cada escritura sustituye a la anterior
writeFlipped(db, [])
assert.deepEqual(readState(db).flipped, [])

// Datos no válidos: se rechazan y no cambian nada
assert.throws(() => writeReadingStatus(db, { 111: 'quemado' }), ValidationError)
assert.throws(() => writePlacements(db, { 111: { wall: 'a0', module: -1, shelf: 0, x: 0 } }), ValidationError)
assert.throws(() => writeFlipped(db, 'no es lista'), ValidationError)
assert.equal(readState(db).readingStatus[111], 'finished')

console.log('Base de datos de la biblioteca: OK')
