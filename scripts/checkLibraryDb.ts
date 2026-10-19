// Comprobación rápida de la base de datos de la biblioteca (en memoria): node scripts/checkLibraryDb.ts
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { guessSaga, addBook, CatalogConflictError, isbn10Of, matchWords, hasValidCheckDigit, cleanSynopsis, looksSpanish, setSynopsis } from '../server/bookCatalog.ts'
import {
  openLibraryDb,
  seedBooks,
  readState,
  writePlacements,
  writeFlipped,
  writeReadingStatus,
  ValidationError,
  listEbooks,
  readReader,
  writePosition,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  createBookmark,
  deleteBookmark,
} from '../server/library.ts'

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

// --- Lector ---
// Carpeta de libros electrónicos: solo cuentan los nombres que son un ISBN (nada de rutas ni otros archivos)
const ebooksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebooks-'))
for (const name of ['111.epub', '9788410140462.pdf', '9788410140462.epub', '978841014046X.pdf', 'notas.txt', '..pdf']) {
  fs.writeFileSync(path.join(ebooksDir, name), 'x')
}
assert.deepEqual(listEbooks(ebooksDir), { 9788410140462: 'epub' }) // 111 no es un ISBN; con EPUB y PDF gana el EPUB
assert.deepEqual(listEbooks(path.join(ebooksDir, 'no-existe')), {})
fs.rmSync(ebooksDir, { recursive: true })

seedBooks(db, [{ isbn: '9788410140462', title: 'Un edén de huesos en flor' }])
const isbn = '9788410140462'
assert.deepEqual(readReader(db, isbn), { position: null, annotations: [], bookmarks: [] })
writePosition(db, isbn, { cfi: 'epubcfi(/6/4!/4/2)' })
assert.deepEqual(readReader(db, isbn).position, { cfi: 'epubcfi(/6/4!/4/2)' })

const epubNote = createAnnotation(db, isbn, { location: { cfi: 'epubcfi(/6/4!/4/2,/1:0,/1:20)' }, text: 'Había una vez', color: 'yellow' })
const pdfNote = createAnnotation(db, isbn, { location: { page: 3, rects: [[0.1, 0.2, 0.5, 0.03]] }, text: 'línea', note: 'Me encanta', color: 'pink' })
assert.equal(epubNote.note, null)
assert.equal(pdfNote.note, 'Me encanta')
assert.equal(updateAnnotation(db, epubNote.id, { note: 'Comentario nuevo' }).note, 'Comentario nuevo')
assert.equal(updateAnnotation(db, epubNote.id, { color: 'green' }).note, 'Comentario nuevo') // cambiar el color no borra la nota
deleteAnnotation(db, pdfNote.id)
assert.deepEqual(readReader(db, isbn).annotations.map((a) => a.text), ['Había una vez'])

// Datos no válidos: se rechazan
assert.throws(() => readReader(db, '../../secreto'), ValidationError)
assert.throws(() => writePosition(db, isbn, { page: 0 }), ValidationError)
assert.throws(() => createAnnotation(db, isbn, { location: { cfi: 'nada' }, text: 'x', color: 'yellow' }), ValidationError)
assert.throws(() => createAnnotation(db, isbn, { location: { page: 1, rects: [] }, text: 'x', color: 'yellow' }), ValidationError)
assert.throws(() => createAnnotation(db, isbn, { location: { page: 1, rects: [[0, 0, 1, 1]] }, text: '  ', color: 'yellow' }), ValidationError)
assert.throws(() => createAnnotation(db, isbn, { location: { page: 1, rects: [[0, 0, 1, 1]] }, text: 'x', color: 'negro' }), ValidationError)
assert.throws(() => updateAnnotation(db, 9999, { note: 'x' }), ValidationError)

// Marcadores
const mark = createBookmark(db, isbn, { location: { page: 12 }, label: '  Páginas 11–12  ' })
assert.equal(mark.label, 'Páginas 11–12')
assert.deepEqual(readReader(db, isbn).bookmarks.map((b) => b.location), [{ page: 12 }])
assert.throws(() => createBookmark(db, isbn, { location: { page: 1 }, label: '' }), ValidationError)
assert.throws(() => createBookmark(db, isbn, { location: { cfi: 'mal' }, label: 'x' }), ValidationError)
deleteBookmark(db, mark.id)
assert.deepEqual(readReader(db, isbn).bookmarks, [])

// Añadir libros desde la consola: saga y número sacados del título
assert.deepEqual(guessSaga('Solo Leveling, Vol. 1'), { saga: 'Solo Leveling', saga_index: 1 })
assert.deepEqual(guessSaga('SOLO LEVELING 02'), { saga: 'SOLO LEVELING', saga_index: 2 })
assert.deepEqual(guessSaga('Pandora Hearts 24'), { saga: 'Pandora Hearts', saga_index: 24 })
assert.deepEqual(guessSaga('Alas de sangre'), { saga: null, saga_index: null })
assert.deepEqual(guessSaga('Fahrenheit 451'), { saga: null, saga_index: null })
assert.deepEqual(guessSaga('1984'), { saga: null, saga_index: null })
assert.deepEqual(guessSaga('Akame ga Kill! Tomo 101'), { saga: 'Akame ga Kill!', saga_index: 101 })

// Portadas de Amazon por ISBN-10 (con su dígito de control, que puede ser X)
assert.equal(isbn10Of('9788467945850'), '8467945850')
assert.equal(isbn10Of('9788408279990'), '8408279998')
assert.equal(isbn10Of('9780306406157'), '0306406152')
assert.equal(isbn10Of('9798890981547'), null)
// Resultados con todas las palabras buscadas, sin distinguir mayúsculas ni tildes; primero los que las tienen en el título
const found = [
  { title: 'Dual Trump', author: 'Donald Trump' },
  { title: 'Las crónicas de IDHÚN', author: 'Laura Gallego' },
  { title: 'Memorias de Idhún: La Resistencia', author: 'Laura Gallego' },
  { title: 'Otro libro', author: 'Idhun Gallego' },
]
assert.deepEqual(matchWords(found, 'idhun GALLEGO').map((b) => b.title), ['Las crónicas de IDHÚN', 'Memorias de Idhún: La Resistencia', 'Otro libro'])
assert.deepEqual(matchWords(found, 'MEMORIAS idhún').map((b) => b.title), ['Memorias de Idhún: La Resistencia'])
assert.deepEqual(matchWords(found, 'idhun').map((b) => b.title), ['Las crónicas de IDHÚN', 'Memorias de Idhún: La Resistencia', 'Otro libro'])

// Alta de libros: se valida todo antes de descargar nada o tocar archivos
const catalogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-'))
const catalogFiles = {
  booksMetaFile: path.join(catalogDir, 'booksMeta.json'),
  isbnsFile: path.join(catalogDir, 'isbns.json'),
  coversDir: catalogDir,
}
fs.writeFileSync(catalogFiles.booksMetaFile, JSON.stringify([{ isbn: '9788410140462', title: 'Un edén de huesos en flor' }]))
fs.writeFileSync(catalogFiles.isbnsFile, JSON.stringify(['9788410140462']))
const newBook = { isbn: '9781975319434', title: 'Solo Leveling, Vol. 1', format: 'manga', coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg' }
await assert.rejects(addBook(db, catalogFiles, { ...newBook, isbn: '123' }), ValidationError)
await assert.rejects(addBook(db, catalogFiles, { ...newBook, format: 'revista' }), ValidationError)
await assert.rejects(addBook(db, catalogFiles, { ...newBook, isbn: '9788410140462' }), CatalogConflictError)
// Portadas solo de Open Library o Google: ni otros servidores ni direcciones locales
await assert.rejects(addBook(db, catalogFiles, { ...newBook, coverUrl: 'http://localhost:5199/x.jpg' }), ValidationError)
await assert.rejects(addBook(db, catalogFiles, { ...newBook, coverUrl: 'https://example.com/x.jpg' }), ValidationError)
assert.equal(JSON.parse(fs.readFileSync(catalogFiles.booksMetaFile, 'utf8')).length, 1)
// Alta a mano: portada subida que no es imagen, rechazada; con ISBN-10 y una PNG subida, se guarda con su ISBN-13
// (con sinopsis escrita: así no se busca en internet)
const manual = { isbn: '84-679-4585-0', title: 'Solo Leveling 1', format: 'manga', synopsis: 'Sung Jinwoo es el cazador más débil del mundo.' }
// ISBN con una cifra mal (el dígito de control no cuadra): no se busca su portada ni se guarda
await assert.rejects(addBook(db, catalogFiles, { ...manual, isbn: '9788467945851' }), /cifra mal/)
await assert.rejects(addBook(db, catalogFiles, { ...manual, isbn: '8467945851' }), /cifra mal/)
assert.ok(hasValidCheckDigit('9788467945850') && hasValidCheckDigit('080442957X') && !hasValidCheckDigit('9788467945860'))
await assert.rejects(addBook(db, catalogFiles, { ...manual, coverData: Buffer.from('no es una imagen').toString('base64') }), ValidationError)
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)])
const added = await addBook(db, catalogFiles, { ...manual, coverData: `data:image/png;base64,${png.toString('base64')}` })
assert.equal(added.isbn, '9788467945850')
assert.deepEqual([added.saga, added.saga_index], ['Solo Leveling', 1])
assert.ok(fs.existsSync(path.join(catalogDir, '9788467945850.png')))
assert.deepEqual(JSON.parse(fs.readFileSync(catalogFiles.isbnsFile, 'utf8')), ['9788410140462', '9788467945850'])
assert.equal(added.synopsis, 'Sung Jinwoo es el cazador más débil del mundo.')
// Sinopsis a mano: se guarda en booksMeta.json; vacía, se quita; de un libro que no está, error
setSynopsis(catalogFiles, '9788410140462', '  Una historia de huesos.  ')
assert.equal(JSON.parse(fs.readFileSync(catalogFiles.booksMetaFile, 'utf8'))[0].synopsis, 'Una historia de huesos.')
setSynopsis(catalogFiles, '9788410140462', '')
assert.equal('synopsis' in JSON.parse(fs.readFileSync(catalogFiles.booksMetaFile, 'utf8'))[0], false)
assert.throws(() => setSynopsis(catalogFiles, '9780000000002', 'x'), ValidationError)
fs.rmSync(catalogDir, { recursive: true })

// Sinopsis de los catálogos: sin HTML, enlaces ni el apartado tras los guiones de Open Library; solo si es español
assert.equal(cleanSynopsis({ value: 'Una <b>gran</b> [historia](https://x.org).\n----------\nAlso contained in: …' }), 'Una gran historia.')
assert.equal(cleanSynopsis(42), null)
assert.ok(looksSpanish('En las tenebrosas minas de sal de Endovier, una muchacha de dieciocho años cumple condena por sus crímenes.'))
assert.ok(!looksSpanish('Chaol Westfall has always defined himself by his unwavering loyalty to the king.'))

console.log('Base de datos de la biblioteca: OK')
