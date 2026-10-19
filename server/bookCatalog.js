// Añadir libros a la colección desde la consola: búsqueda en Open Library (y en Google Books si hay clave), portadas
// de Open Library o de Amazon, y alta del libro elegido (portada en src/assets/covers, entrada en booksMeta.json e
// isbns.json y fila en la base de datos)
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { seedBooks, ValidationError } from './library.js'

const ISBN13 = /^97[89][0-9]{10}$/
const ISBN10 = /^[0-9]{9}[0-9X]$/
// Formatos al añadir un libro (los de bolsillo que ya hay en la colección siguen igual)
const FORMATS = ['book', 'manga']
const MAX_RESULTS = 20
// Open Library: obras que se miran por búsqueda, ediciones que se leen de cada una y cuántas se muestran
const WORKS_SEARCHED = 8
const EDITIONS_SCANNED = 100
const EDITIONS_PER_WORK = 3
const GOOGLE_RESULTS = 20
// Por debajo de este tamaño, la "portada" de Amazon es su imagen vacía
const MIN_COVER_BYTES = 1000
const MAX_QUERY = 200
const MAX_TEXT = 300
const MAX_SYNOPSIS = 3000
const MAX_COVER_BYTES = 5 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 10000
// Solo se descargan portadas de estos servidores (la URL llega del navegador: así no se puede pedir cualquier dirección)
const COVER_HOSTS = ['covers.openlibrary.org', 'books.google.com', 'books.googleusercontent.com', 'images-na.ssl-images-amazon.com', 'm.media-amazon.com']

export class CatalogConflictError extends Error {}

const fetchWithTimeout = (url) => fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })

async function fetchJson(url) {
  const response = await fetchWithTimeout(url)
  if (!response.ok) throw new Error(`${new URL(url).host} respondió ${response.status}`)
  return response.json()
}

const onlyDigits = (text) => text.replace(/[\s-]/g, '')

// Saga y número a partir del título ("Solo Leveling, Vol. 1", "SOLO LEVELING 02", "Black Butler 5"). Sin "vol." ni
// "tomo" solo cuentan números de 1 o 2 cifras, así "Fahrenheit 451" o "1984" no se toman por tomos de una saga
export function guessSaga(title) {
  const match =
    /^(.*\p{L}.*?)[\s,.:#-]*(?:vol(?:ume|umen)?\.?|tomo|t\.|n\.?º)\s*0*(\d{1,3})(?:\s*\([^)]*\))?$/iu.exec(title.trim()) ??
    /^(.*\p{L}.*?)[\s,.:#-]+0*(\d{1,2})(?:\s*\([^)]*\))?$/iu.exec(title.trim())
  return match ? { saga: match[1].trim(), saga_index: Number(match[2]) } : { saga: null, saga_index: null }
}

// Manga si el título, las categorías o la editorial lo dicen (Open Library marca los tomos como "(comic)").
// En la consola se puede cambiar antes de añadirlo
const MANGA_HINT = /\b(manga|comic|cómic|graphic novel|norma editorial|ivrea|planeta c[oó]mic|panini|kitsune|milky way|arechi|yen press|viz media|kodansha)/i
const guessFormat = (...texts) => (texts.some((text) => MANGA_HINT.test(text ?? '')) ? 'manga' : 'book')

// ISBN-10 de un ISBN-13 que empieza por 978 (Amazon guarda las portadas por ISBN-10); null si empieza por 979
export function isbn10Of(isbn13) {
  if (!isbn13.startsWith('978')) return null
  const body = isbn13.slice(3, 12)
  const sum = [...body].reduce((total, digit, i) => total + (10 - i) * Number(digit), 0)
  const check = (11 - (sum % 11)) % 11
  return body + (check === 10 ? 'X' : String(check))
}

// ISBN-13 de un ISBN-10 (algunas ediciones de Open Library solo traen el de 10 cifras)
function isbn13From10(isbn10) {
  const body = `978${isbn10.slice(0, 9)}`
  const sum = [...body].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0)
  return body + ((10 - (sum % 10)) % 10)
}

// ¿Cuadra el dígito de control? (detecta una cifra mal escrita o dos cambiadas de sitio)
export function hasValidCheckDigit(isbn) {
  if (ISBN13.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0)
    return sum % 10 === 0
  }
  if (!ISBN10.test(isbn)) return false
  const sum = [...isbn].reduce((total, digit, i) => total + (10 - i) * (digit === 'X' ? 10 : Number(digit)), 0)
  return sum % 11 === 0
}

const isbn13Of = (isbn13List = [], isbn10List = []) =>
  isbn13List.map(onlyDigits).find((isbn) => ISBN13.test(isbn)) ??
  isbn10List.map(onlyDigits).filter((isbn) => ISBN10.test(isbn)).map(isbn13From10)[0] ??
  null

// Portada de Amazon por ISBN, sin clave. Si no la tiene responde una imagen GIF de 1×1, que se descarta
async function amazonCover(isbn13) {
  const isbn10 = isbn10Of(isbn13)
  if (!isbn10) return null
  const url = `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    const isJpeg = response.headers.get('content-type')?.includes('jpeg')
    return response.ok && isJpeg && Number(response.headers.get('content-length')) > MIN_COVER_BYTES ? url : null
  } catch {
    return null // Sin respuesta de Amazon: el resultado se queda sin portada (y no se muestra)
  }
}

const SPANISH = '/languages/spa'
const openLibraryCover = (id) => (id > 0 ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null)

// Ediciones de una obra de Open Library con ISBN, primero las que están en español
async function workEditions(workKey) {
  const json = await fetchJson(`https://openlibrary.org${workKey}/editions.json?limit=${EDITIONS_SCANNED}`)
  return (json.entries ?? [])
    .map((edition) => ({ ...edition, isbn: isbn13Of(edition.isbn_13, edition.isbn_10) }))
    .filter((edition) => edition.isbn)
    .sort((a, b) => Number(b.languages?.some((l) => l.key === SPANISH) ?? false) - Number(a.languages?.some((l) => l.key === SPANISH) ?? false))
    .slice(0, EDITIONS_PER_WORK)
}

// Open Library: por título, varias ediciones de cada obra (las españolas primero, aunque la obra salga en inglés);
// por ISBN, la edición de ese ISBN
async function searchOpenLibrary(query, isbn) {
  const fields = 'key,title,author_name,subject,number_of_pages_median,editions,editions.title,editions.isbn,editions.publisher,editions.cover_i'
  const json = await fetchJson(
    isbn
      ? `https://openlibrary.org/search.json?isbn=${isbn}&fields=${fields}&limit=1`
      : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&lang=es&fields=${fields}&limit=${WORKS_SEARCHED}`
  )
  const works = json.docs ?? []
  // Si no se pueden leer las ediciones de una obra, se usa la edición que trae la búsqueda
  const editionLists = await Promise.all(works.map((work) => (isbn ? [] : workEditions(work.key).catch(() => []))))
  return works.flatMap((work, i) => {
    const best = work.editions?.docs?.[0] ?? {}
    const fromSearch = { title: best.title, isbn: isbn ?? isbn13Of(best.isbn, best.isbn), publishers: best.publisher, covers: [best.cover_i] }
    return [fromSearch, ...editionLists[i]].map((edition) => {
      const title = [edition.title ?? work.title, edition.subtitle].filter(Boolean).join(': ')
      return {
        isbn: edition.isbn,
        title,
        author: work.author_name?.join(', ') ?? null,
        publisher: edition.publishers?.[0] ?? null,
        pages: edition.number_of_pages ?? work.number_of_pages_median ?? null,
        coverUrl: openLibraryCover(edition.covers?.find((id) => id > 0)),
        format: guessFormat(work.title, title, edition.publishers?.[0], ...(work.subject ?? []).slice(0, 20)),
        source: 'Open Library',
      }
    })
  })
}

// Google Books (solo con clave: sin ella su cuota es 0). Tiene casi todos los libros editados en España
async function searchGoogleBooks(query, isbn, apiKey) {
  const json = await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(isbn ? `isbn:${isbn}` : query)}&maxResults=${GOOGLE_RESULTS}&printType=books&key=${encodeURIComponent(apiKey)}`
  )
  return (json.items ?? []).map(({ volumeInfo: v }) => ({
    isbn: isbn13Of(
      v.industryIdentifiers?.filter((id) => id.type === 'ISBN_13').map((id) => id.identifier),
      v.industryIdentifiers?.filter((id) => id.type === 'ISBN_10').map((id) => id.identifier)
    ),
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: v.authors?.join(', ') ?? null,
    publisher: v.publisher ?? null,
    pages: v.pageCount ?? null,
    coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://').replace('zoom=1', 'zoom=2') ?? null,
    format: guessFormat(v.title, v.publisher, ...(v.categories ?? [])),
    source: 'Google Books',
  }))
}

// Texto para comparar sin distinguir mayúsculas, minúsculas ni tildes ("Idhun" encuentra "Idhún")
export const normalizeText = (text) => (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Deja los resultados que tienen todas las palabras buscadas (sin distinguir mayúsculas ni tildes) en el título o en
 * el título y el autor, primero los que las tienen todas en el título
 */
export function matchWords(books, query) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  const hasAll = (text) => {
    const normalized = normalizeText(text)
    return words.every((word) => normalized.includes(word))
  }
  return books
    .filter((book) => hasAll(`${book.title} ${book.author ?? ''}`))
    .sort((a, b) => Number(hasAll(b.title)) - Number(hasAll(a.title)))
}

/**
 * Busca libros por ISBN o por título en Open Library (y en Google Books si hay clave). Solo devuelve los que tienen
 * ISBN-13 y portada (la sala no pinta libros sin portada); si una edición no tiene portada se busca la de Amazon.
 * Si una fuente falla, se usan los resultados de la otra. Lo que no aparece se puede añadir a mano (addBook).
 */
export async function searchBooks(query, { googleBooksKey } = {}) {
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_QUERY) throw new ValidationError('Búsqueda no válida')
  const text = query.trim()
  const digits = onlyDigits(text).toUpperCase()
  const isbn = ISBN13.test(digits) ? digits : ISBN10.test(digits) ? isbn13From10(digits) : null

  const sources = [searchOpenLibrary(text, isbn)]
  if (googleBooksKey) sources.push(searchGoogleBooks(text, isbn, googleBooksKey))
  const settled = await Promise.allSettled(sources)
  const failures = settled.filter((s) => s.status === 'rejected').map((s) => s.reason.message)
  if (failures.length === settled.length) throw new Error(`No se pudo buscar: ${failures.join('; ')}`)
  failures.forEach((message) => console.warn('[catálogo] Una fuente de búsqueda falló:', message))

  // Google primero (sus datos de ediciones españolas son mejores); un ISBN solo aparece una vez
  const seen = new Set()
  const found = settled
    .flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
    .sort((a, b) => Number(b.source === 'Google Books') - Number(a.source === 'Google Books'))
    .filter((book) => book.isbn && book.title && !seen.has(book.isbn) && seen.add(book.isbn))
  const candidates = (isbn ? found.filter((book) => book.isbn === isbn) : matchWords(found, text)).slice(0, MAX_RESULTS)
  const withCovers = await Promise.all(
    candidates.map(async (book) => ({ ...book, coverUrl: book.coverUrl ?? (await amazonCover(book.isbn)) }))
  )
  return withCovers.filter((book) => book.coverUrl).map((book) => ({ ...book, ...guessSaga(book.title) }))
}

// Tipo de imagen por sus primeros bytes (no se confía en la extensión ni en la cabecera de la respuesta)
const imageExtension = (buffer) =>
  buffer[0] === 0xff && buffer[1] === 0xd8 ? 'jpg' : buffer.subarray(0, 4).toString('hex') === '89504e47' ? 'png' : null

async function downloadCover(coverUrl) {
  let url
  try {
    url = new URL(coverUrl)
  } catch {
    throw new ValidationError('Dirección de portada no válida')
  }
  if (url.protocol !== 'https:' || !COVER_HOSTS.includes(url.hostname)) throw new ValidationError('Portada de un servidor no permitido')
  // Si el servidor de portadas falla o no responde, se avisa con un mensaje claro (es un error de fuera, no de datos)
  const unavailable = (reason) =>
    new ValidationError(`No se pudo descargar la portada (${reason}): inténtalo otra vez o súbela con "Añadir a mano"`)
  let response
  try {
    response = await fetchWithTimeout(url)
  } catch {
    throw unavailable('el servidor de portadas no responde')
  }
  if (!response.ok) throw unavailable(`el servidor respondió ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > MAX_COVER_BYTES) throw new ValidationError('La portada es demasiado grande')
  const extension = imageExtension(buffer)
  if (!extension) throw new ValidationError('La portada no es una imagen JPEG o PNG')
  return { buffer, extension }
}

// Portada subida desde la consola (imagen en base64, con o sin el prefijo "data:")
function decodeCover(coverData) {
  if (typeof coverData !== 'string') throw new ValidationError('Portada no válida')
  const buffer = Buffer.from(coverData.replace(/^data:[^,]*,/, ''), 'base64')
  if (buffer.length > MAX_COVER_BYTES) throw new ValidationError('La portada es demasiado grande (máximo 5 MB)')
  const extension = imageExtension(buffer)
  if (!extension) throw new ValidationError('La portada no es una imagen JPEG o PNG')
  return { buffer, extension }
}

// Portada por ISBN para los libros añadidos a mano sin imagen: la de Open Library o, si no tiene, la de Amazon
async function coverByIsbn(isbn) {
  try {
    return await downloadCover(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`)
  } catch {
    const amazon = await amazonCover(isbn) // Open Library no la tiene (responde 404)
    if (amazon) return downloadCover(amazon)
  }
  throw new ValidationError('No hay portada para este ISBN en Open Library ni en Amazon: sube una imagen')
}

const cleanText = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT) : null)

// Texto de una sinopsis tal como llega de Open Library o Google Books: sin etiquetas HTML ni enlaces de Markdown, sin
// los apartados que Open Library añade tras una línea de guiones, y con los espacios en orden
export function cleanSynopsis(value) {
  const raw = typeof value === 'string' ? value : value?.value
  if (typeof raw !== 'string') return null
  const text = raw
    .split(/\n\s*-{3,}/)[0]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\(\[[^\]]*\]\[\d+\]\)/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text ? text.slice(0, MAX_SYNOPSIS) : null
}

// ¿Parece español? Proporción de palabras muy frecuentes del español (en inglés o francés casi no aparecen así)
const SPANISH_WORDS = /\b(el|la|los|las|de|del|que|y|en|una|un|su|sus|por|con|para|se|es)\b/gi
export const looksSpanish = (text) => (text.match(SPANISH_WORDS) ?? []).length / Math.max(1, text.split(/\s+/).length) > 0.15

/**
 * Sinopsis de un libro por su ISBN, en español: la de Google Books (si hay clave) o la de Open Library (de la edición
 * o, si no la tiene, de la obra). null si no hay ninguna en español o si los catálogos no responden.
 */
export async function findSynopsis(isbn, { googleBooksKey } = {}) {
  const candidates = []
  if (googleBooksKey) {
    try {
      const json = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(googleBooksKey)}`)
      candidates.push(json.items?.[0]?.volumeInfo?.description)
    } catch (error) {
      console.warn('[catálogo] Sinopsis de Google Books:', error.message)
    }
  }
  try {
    const edition = await fetchJson(`https://openlibrary.org/isbn/${isbn}.json`)
    candidates.push(edition.description)
    const workKey = edition.works?.[0]?.key
    if (workKey) candidates.push((await fetchJson(`https://openlibrary.org${workKey}.json`)).description)
  } catch {
    // Open Library no tiene este ISBN (404) o no responde: se queda con lo que haya de Google
  }
  return candidates.map(cleanSynopsis).find((text) => text && looksSpanish(text)) ?? null
}

/** Guarda (o, con texto vacío, quita) la sinopsis de un libro de la colección en booksMeta.json. */
export function setSynopsis({ booksMetaFile }, isbn, synopsis) {
  if (typeof synopsis !== 'string') throw new ValidationError('Sinopsis no válida')
  if (synopsis.length > MAX_SYNOPSIS) throw new ValidationError(`La sinopsis es demasiado larga (máximo ${MAX_SYNOPSIS} caracteres)`)
  const booksMeta = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  const entry = booksMeta.find((item) => item.isbn === isbn)
  if (!entry) throw new ValidationError('Ese libro no está en la colección')
  const text = synopsis.trim()
  if (text) entry.synopsis = text
  else delete entry.synopsis
  fs.writeFileSync(booksMetaFile, `${JSON.stringify(booksMeta, null, 2)}\n`)
  return { isbn, synopsis: text || null }
}

/**
 * Añade un libro a la colección, de la búsqueda o escrito a mano. La portada llega subida (coverData), como dirección
 * de un resultado (coverUrl) o, sin ninguna de las dos, se busca por el ISBN. Escribe la portada, booksMeta.json e
 * isbns.json (Vite recarga la sala con el libro nuevo) y lo da de alta en la base de datos. Devuelve la entrada
 * guardada en booksMeta.json.
 */
export async function addBook(db, { booksMetaFile, isbnsFile, coversDir, googleBooksKey }, book) {
  if (typeof book !== 'object' || book === null) throw new ValidationError('Libro no válido')
  // ISBN de 13 cifras, o de 10 (se pasa a 13: los libros de la colección van por ISBN-13)
  const digits = typeof book.isbn === 'string' ? onlyDigits(book.isbn).toUpperCase() : ''
  const isbn = ISBN13.test(digits) ? digits : ISBN10.test(digits) ? isbn13From10(digits) : ''
  const title = cleanText(book.title)
  if (!isbn) throw new ValidationError('ISBN no válido: escribe sus 13 (o 10) cifras')
  if (!hasValidCheckDigit(digits)) throw new ValidationError('Ese ISBN tiene una cifra mal: revísalo')
  if (!title) throw new ValidationError('Falta el título')
  if (!FORMATS.includes(book.format)) throw new ValidationError('Formato no válido')
  const pages = Number.isInteger(book.pages) && book.pages > 0 && book.pages < 10000 ? book.pages : null
  // Saga: la de la búsqueda o, si no llega (título escrito a mano), la que se deduce del título
  const guessed = cleanText(book.saga) ? { saga: book.saga, saga_index: book.saga_index } : guessSaga(title)
  const sagaIndex = Number.isInteger(guessed.saga_index) && guessed.saga_index > 0 && guessed.saga_index < 1000 ? guessed.saga_index : null

  const booksMeta = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  if (booksMeta.some((entry) => entry.isbn === isbn)) throw new CatalogConflictError('Este libro ya está en tu colección')

  const { buffer, extension } = book.coverData
    ? decodeCover(book.coverData)
    : book.coverUrl
      ? await downloadCover(book.coverUrl)
      : await coverByIsbn(isbn)
  const entry = {
    isbn,
    title,
    author: cleanText(book.author),
    pages,
    publisher: cleanText(book.publisher),
    format: book.format,
    saga: cleanText(guessed.saga),
    saga_index: cleanText(guessed.saga) ? sagaIndex : null,
    source: { added: 'consola', from: cleanText(book.source) ?? 'desconocido' },
    complete: Boolean(pages),
    // Sinopsis para la contraportada: la escrita a mano o, si no hay, la que se encuentre por el ISBN
    synopsis: (typeof book.synopsis === 'string' && book.synopsis.trim() ? cleanSynopsis(book.synopsis) : null) ?? (await findSynopsis(isbn, { googleBooksKey })),
  }
  // Primero la portada y la base de datos; los JSON al final, porque al cambiarlos Vite recarga la sala
  fs.writeFileSync(path.join(coversDir, `${isbn}.${extension}`), buffer)
  seedBooks(db, [entry])
  fs.writeFileSync(booksMetaFile, `${JSON.stringify([...booksMeta, entry], null, 2)}\n`)
  const isbns = JSON.parse(fs.readFileSync(isbnsFile, 'utf8'))
  if (!isbns.includes(isbn)) fs.writeFileSync(isbnsFile, `${JSON.stringify([...isbns, isbn], null, 2)}\n`)
  return entry
}
