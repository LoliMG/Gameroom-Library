// Rellena la sinopsis de los libros de booksMeta.json que no tienen: la busca por ISBN en Open Library (y en Google Books
// si hay GOOGLE_BOOKS_API_KEY) y solo guarda las que están en español. Se puede volver a lanzar: no toca las que ya hay.
// Uso: node scripts/fillSynopses.mjs
import fs from 'node:fs'
import { findSynopsis } from '../server/bookCatalog.js'

const BOOKS_META = 'src/data/booksMeta.json'
// Las sinopsis escritas en books.js (bookStyles) mandan sobre las de booksMeta.json: esos libros no se buscan
const styled = fs.readFileSync('src/data/books.js', 'utf8')
// Bloque '<isbn>': { … } de bookStyles contando llaves (dentro hay objetos, como spineGradient)
function hasStyledSynopsis(isbn) {
  const start = styled.indexOf(`'${isbn}': {`)
  if (start < 0) return false
  const open = styled.indexOf('{', start)
  let depth = 0
  for (let i = open; i < styled.length; i++) {
    if (styled[i] === '{') depth++
    else if (styled[i] === '}' && --depth === 0) return /\bsynopsis\s*:/.test(styled.slice(open, i))
  }
  return false
}

const booksMeta = JSON.parse(fs.readFileSync(BOOKS_META, 'utf8'))
const pending = booksMeta.filter((book) => book.title && !book.synopsis && !hasStyledSynopsis(book.isbn))
console.log(`Libros sin sinopsis: ${pending.length}`)

let found = 0
for (const book of pending) {
  const synopsis = await findSynopsis(book.isbn, { googleBooksKey: process.env.GOOGLE_BOOKS_API_KEY })
  console.log(`${synopsis ? '✓' : '·'} ${book.title}`)
  if (synopsis) {
    book.synopsis = synopsis
    found++
  }
}

// Se vuelve a leer el archivo por si la sala añadió algún libro mientras tanto, y solo se añaden las sinopsis encontradas
const latest = JSON.parse(fs.readFileSync(BOOKS_META, 'utf8'))
const foundByIsbn = new Map(pending.filter((book) => book.synopsis).map((book) => [book.isbn, book.synopsis]))
latest.forEach((entry) => {
  if (!entry.synopsis && foundByIsbn.has(entry.isbn)) entry.synopsis = foundByIsbn.get(entry.isbn)
})
fs.writeFileSync(BOOKS_META, `${JSON.stringify(latest, null, 2)}\n`)
console.log(`Sinopsis encontradas en español: ${found} de ${pending.length}`)
