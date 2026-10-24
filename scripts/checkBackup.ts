// Comprobación del formato de la copia de seguridad: node scripts/checkBackup.ts
import assert from 'node:assert/strict'
import { BACKUP_VERSION, onlyNew, parseBackup } from '../src/utils/backupFormat.ts'

const ISBN = '9788410140462'
const valid = {
  app: 'fantasy-bookroom',
  version: BACKUP_VERSION,
  exportedAt: '2026-10-25T10:00:00.000Z',
  tables: {
    books: [{ isbn: ISBN, title: 'Un edén de huesos en flor', format: 'book', user_id: 'de-otra-cuenta', cover_path: 'otra/ruta.jpg' }],
    book_state: [{ isbn: ISBN, reading_status: 'reading', flipped: true }],
    app_data: [{ key: 'tags', value: { [ISBN]: ['Favorito'] } }],
  },
  covers: { [ISBN]: { extension: 'jpg', data: '/9j/4AAQ' } },
}
const text = (value: unknown) => JSON.stringify(value)

// Una copia buena: las tablas que faltan quedan vacías y no pasan columnas que no son de la copia (user_id, cover_path)
const backup = parseBackup(text(valid))
assert.deepEqual(backup.tables.books, [{ isbn: ISBN, title: 'Un edén de huesos en flor', format: 'book' }], 'solo columnas de la copia')
assert.deepEqual(backup.tables.readings, [], 'tabla que falta')
assert.equal(backup.covers[ISBN].extension, 'jpg')

// Archivos que no valen, con su mensaje
const rejects = (value: string, message: RegExp) => assert.throws(() => parseBackup(value), message)
rejects('no es json', /no es JSON/)
rejects(text({ ...valid, app: 'otra' }), /no es una copia de seguridad de esta web/)
rejects(text({ ...valid, version: 99 }), /otra versión/)
rejects(text({ ...valid, tables: { books: 'mal' } }), /datos rotos en "books"/)
rejects(text({ ...valid, tables: { books: [{ isbn: '123' }] } }), /ISBN no válido/)
rejects(text({ ...valid, covers: { [ISBN]: { extension: 'exe', data: 'x' } } }), /portada rota/)
rejects(text({ ...valid, covers: { '../otra/ruta': { extension: 'jpg', data: 'x' } } }), /portada rota/)

// Importar dos veces no repite subrayados ni lecturas (misma fecha aunque llegue escrita de otra forma)
const existing = [{ isbn: ISBN, created_at: '2026-10-20T10:00:00+00:00' }]
const incoming = [
  { isbn: ISBN, created_at: '2026-10-20T10:00:00.000Z', text: 'ya estaba' },
  { isbn: ISBN, created_at: '2026-10-21T10:00:00.000Z', text: 'nueva' },
]
assert.deepEqual(onlyNew(existing, incoming).map((row) => row.text), ['nueva'], 'sin repetidos')

console.log('Copia de seguridad (formato, comprobaciones y sin repetidos al importar): OK')
