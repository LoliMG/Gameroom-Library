// Base de datos SQLite de la biblioteca: catálogo de libros y lo que se hace con cada uno en la sala
// (estado de lectura, si está de frente, su sitio en la estantería y, para los que tienen libro electrónico, por dónde
// se va leyendo y los subrayados y comentarios). Usa el SQLite que trae Node (node:sqlite).
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
// Búsqueda y alta de libros nuevos desde la consola (usa seedBooks y ValidationError de aquí: solo dentro de funciones)
import { searchBooks, addBook, setSynopsis, CatalogConflictError } from './bookCatalog.js'

export const READING_STATUSES = ['finished', 'reading', 'unread']
// Colores de subrayado del lector
export const ANNOTATION_COLORS = ['yellow', 'pink', 'green', 'blue']
// Libros electrónicos: ebooks/<isbn>.epub o ebooks/<isbn>.pdf (el nombre solo puede ser un ISBN: nada de rutas)
const EBOOK_FILE = /^([0-9]{9}[0-9X]|[0-9]{13})\.(epub|pdf)$/i
const ISBN = /^([0-9]{9}[0-9X]|[0-9]{13})$/
const EBOOK_TYPES = { epub: 'application/epub+zip', pdf: 'application/pdf' }
// Límites de lo que se guarda de cada subrayado
const MAX_ANNOTATION_TEXT = 5000
const MAX_LOCATION_JSON = 8000
const MAX_BOOKMARK_LABEL = 200
// Tamaño máximo del cuerpo de una petición: el estado entero de la biblioteca ocupa unos pocos KB
const MAX_BODY_BYTES = 1024 * 1024
// Añadir un libro a mano puede traer su portada en base64 (hasta 5 MB de imagen, que en base64 ocupan un tercio más)
const MAX_BOOK_BODY_BYTES = 8 * 1024 * 1024

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS books (
    isbn TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    publisher TEXT,
    pages INTEGER,
    saga TEXT,
    saga_index INTEGER,
    format TEXT DEFAULT 'book'
  );
  CREATE TABLE IF NOT EXISTS book_state (
    isbn TEXT PRIMARY KEY REFERENCES books(isbn) ON DELETE CASCADE,
    reading_status TEXT NOT NULL DEFAULT 'unread' CHECK (reading_status IN ('finished', 'reading', 'unread')),
    flipped INTEGER NOT NULL DEFAULT 0 CHECK (flipped IN (0, 1)),
    -- Sitio en la estantería (pared, módulo, balda y centro X); NULL = colocación por defecto
    wall TEXT,
    module INTEGER,
    shelf INTEGER,
    x REAL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  -- Subrayados y comentarios del lector. location (JSON): EPUB { cfi } · PDF { page, rects: [[x, y, ancho, alto]] }
  -- con los rectángulos en fracciones de la página (así valen a cualquier tamaño)
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE,
    location TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    color TEXT NOT NULL CHECK (color IN ('yellow', 'pink', 'green', 'blue')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS annotations_isbn ON annotations(isbn);
  -- Marcadores del lector: páginas guardadas. location (JSON): EPUB { cfi } · PDF { page }; label: nombre que se muestra
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE,
    location TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS bookmarks_isbn ON bookmarks(isbn);
`

// Error de datos recibidos: el servidor responde 400 con su mensaje
export class ValidationError extends Error {}

/**
 * Abre (o crea) la base de datos con sus tablas. file puede ser ':memory:' (pruebas).
 */
export function openLibraryDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  // Columnas añadidas después de crear la base de datos: las bases de datos antiguas las reciben al abrirse
  addColumnIfMissing(db, 'books', 'saga', 'TEXT')
  addColumnIfMissing(db, 'books', 'saga_index', 'INTEGER')
  addColumnIfMissing(db, 'books', 'format', "TEXT DEFAULT 'book'")
  // Por dónde se va leyendo el libro electrónico (JSON: EPUB { cfi } · PDF { page })
  addColumnIfMissing(db, 'book_state', 'reading_position', 'TEXT')
  return db
}

// Añade una columna si la tabla aún no la tiene (los nombres los pone el código, nunca vienen de fuera)
function addColumnIfMissing(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((info) => info.name === column)
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

// Ejecuta fn dentro de una transacción: o se guarda todo o nada
function transaction(db, fn) {
  db.exec('BEGIN')
  try {
    fn()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/**
 * Carga o actualiza el catálogo desde booksMeta.json (los libros sin título se saltan, igual que en la sala)
 * y crea la fila de estado de los libros nuevos. Lo ya guardado de cada libro no se toca.
 */
export function seedBooks(db, booksMeta) {
  const upsertBook = db.prepare(`
    INSERT INTO books (isbn, title, author, publisher, pages, saga, saga_index, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(isbn) DO UPDATE SET title = excluded.title, author = excluded.author,
      publisher = excluded.publisher, pages = excluded.pages,
      saga = excluded.saga, saga_index = excluded.saga_index, format = excluded.format
  `)
  const createState = db.prepare('INSERT OR IGNORE INTO book_state (isbn) VALUES (?)')
  transaction(db, () => {
    for (const book of booksMeta) {
      if (!book.isbn || !book.title) continue
      upsertBook.run(
        book.isbn,
        book.title,
        book.author ?? null,
        book.publisher ?? null,
        book.pages ?? null,
        book.saga ?? null,
        book.saga_index ?? null,
        book.format ?? 'book',
      )
      createState.run(book.isbn)
    }
  })
}

/**
 * Estado de la biblioteca con la misma forma que usa la sala:
 * { placements: { isbn: { wall, module, shelf, x } }, flipped: [isbn], readingStatus: { isbn: estado } }
 */
export function readState(db) {
  const state = { placements: {}, flipped: [], readingStatus: {} }
  for (const row of db.prepare('SELECT * FROM book_state').all()) {
    if (row.wall !== null) state.placements[row.isbn] = { wall: row.wall, module: row.module, shelf: row.shelf, x: row.x }
    if (row.flipped) state.flipped.push(row.isbn)
    if (row.reading_status !== 'unread') state.readingStatus[row.isbn] = row.reading_status
  }
  return state
}

// ISBN que existen en el catálogo (los demás se ignoran: libros que ya no están)
const knownIsbns = (db) => new Set(db.prepare('SELECT isbn FROM books').all().map((row) => row.isbn))

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

function validSlot(slot) {
  return (
    isPlainObject(slot) &&
    typeof slot.wall === 'string' && slot.wall.length > 0 && slot.wall.length <= 20 &&
    Number.isInteger(slot.module) && slot.module >= 0 && slot.module < 100 &&
    Number.isInteger(slot.shelf) && slot.shelf >= 0 && slot.shelf < 100 &&
    Number.isFinite(slot.x) && Math.abs(slot.x) < 10
  )
}

/**
 * Sustituye los sitios de todos los libros por los recibidos ({ isbn: sitio }); los que no vienen vuelven al de por defecto.
 */
export function writePlacements(db, placements) {
  if (!isPlainObject(placements)) throw new ValidationError('Se esperaba un objeto { isbn: sitio }')
  for (const [isbn, slot] of Object.entries(placements)) {
    if (!validSlot(slot)) throw new ValidationError(`Sitio no válido para ${isbn}`)
  }
  const known = knownIsbns(db)
  const update = db.prepare("UPDATE book_state SET wall = ?, module = ?, shelf = ?, x = ?, updated_at = datetime('now') WHERE isbn = ?")
  transaction(db, () => {
    db.exec('UPDATE book_state SET wall = NULL, module = NULL, shelf = NULL, x = NULL')
    for (const [isbn, slot] of Object.entries(placements)) {
      if (known.has(isbn)) update.run(slot.wall, slot.module, slot.shelf, slot.x, isbn)
    }
  })
}

/**
 * Sustituye la lista de libros de frente (volteados) por la recibida ([isbn]).
 */
export function writeFlipped(db, isbns) {
  if (!Array.isArray(isbns) || !isbns.every((isbn) => typeof isbn === 'string')) {
    throw new ValidationError('Se esperaba una lista de ISBN')
  }
  const update = db.prepare("UPDATE book_state SET flipped = 1, updated_at = datetime('now') WHERE isbn = ?")
  transaction(db, () => {
    db.exec('UPDATE book_state SET flipped = 0')
    for (const isbn of isbns) update.run(isbn)
  })
}

/**
 * Sustituye los estados de lectura por los recibidos ({ isbn: estado }); los que no vienen quedan sin leer.
 */
export function writeReadingStatus(db, statuses) {
  if (!isPlainObject(statuses)) throw new ValidationError('Se esperaba un objeto { isbn: estado }')
  for (const [isbn, status] of Object.entries(statuses)) {
    if (!READING_STATUSES.includes(status)) throw new ValidationError(`Estado no válido para ${isbn}: ${status}`)
  }
  const update = db.prepare("UPDATE book_state SET reading_status = ?, updated_at = datetime('now') WHERE isbn = ?")
  transaction(db, () => {
    db.exec("UPDATE book_state SET reading_status = 'unread'")
    for (const [isbn, status] of Object.entries(statuses)) update.run(status, isbn)
  })
}

// --- Lector de libros electrónicos ---

/**
 * Libros electrónicos que hay en la carpeta: { isbn: 'epub' | 'pdf' } (si un ISBN tiene los dos, gana el EPUB).
 */
const normalizeName = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

/**
 * Busca libros electrónicos en el directorio principal (ebooks/) y opcionalmente en pdfs/.
 * Permite nombrarlos tanto por ISBN (<isbn>.pdf / .epub) como por título del libro (<titulo>.pdf / .epub).
 */
export function listEbooks(dir, db = null) {
  if (!dir) return {}
  const dirs = [dir]
  const parent = path.dirname(dir)
  const altPdfDir = path.join(parent, 'pdfs')
  if (altPdfDir !== dir && fs.existsSync(altPdfDir)) dirs.push(altPdfDir)

  // Mapa de títulos a ISBN si la base de datos está disponible
  const titleToIsbn = new Map()
  if (db) {
    try {
      const rows = db.prepare('SELECT isbn, title FROM books').all()
      for (const row of rows) {
        if (row.title) {
          titleToIsbn.set(normalizeName(row.title), row.isbn)
          // También sin coletillas entre paréntesis ej. "(Edición especial limitada)"
          const cleanTitle = row.title.replace(/\s*\([^)]*\)/g, '').trim()
          if (cleanTitle) titleToIsbn.set(normalizeName(cleanTitle), row.isbn)
        }
      }
    } catch {
      // Sin catálogo legible: solo se reconocen los archivos con el ISBN como nombre
    }
  }

  const ebooks = {}
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue
    for (const file of fs.readdirSync(d)) {
      const extMatch = /\.(epub|pdf)$/i.exec(file)
      if (!extMatch) continue
      const format = extMatch[1].toLowerCase()
      const baseName = file.slice(0, extMatch.index)

      const matchIsbn = EBOOK_FILE.exec(file)
      let matchedIsbn = matchIsbn ? matchIsbn[1].toUpperCase() : null

      if (!matchedIsbn && titleToIsbn.size > 0) {
        matchedIsbn = titleToIsbn.get(normalizeName(baseName)) || null
      }

      if (matchedIsbn) {
        if (!ebooks[matchedIsbn] || format === 'epub') ebooks[matchedIsbn] = format
      }
    }
  }
  return ebooks
}

export function findEbookFile(dir, isbn, format, db = null) {
  const dirs = [dir]
  const parent = path.dirname(dir)
  const altPdfDir = path.join(parent, 'pdfs')
  if (altPdfDir !== dir && fs.existsSync(altPdfDir)) dirs.push(altPdfDir)

  // 1. Coincidencia directa por ISBN
  for (const d of dirs) {
    const direct = path.join(d, `${isbn}.${format}`)
    if (fs.existsSync(direct)) return direct
  }

  // 2. Coincidencia por título
  if (db) {
    try {
      const row = db.prepare('SELECT title FROM books WHERE isbn = ?').get(isbn)
      if (row?.title) {
        const normTitle = normalizeName(row.title)
        const cleanTitle = normalizeName(row.title.replace(/\s*\([^)]*\)/g, '').trim())
        for (const d of dirs) {
          if (!fs.existsSync(d)) continue
          for (const file of fs.readdirSync(d)) {
            if (!file.toLowerCase().endsWith(`.${format}`)) continue
            const base = normalizeName(file.slice(0, -(`.${format}`.length)))
            if (base === normTitle || (cleanTitle && base === cleanTitle)) {
              return path.join(d, file)
            }
          }
        }
      }
    } catch {
      // Sin catálogo legible: solo se reconocen los archivos con el ISBN como nombre
    }
  }

  return path.join(dir, `${isbn}.${format}`)
}

function assertKnownIsbn(db, isbn) {
  if (!ISBN.test(isbn) || !db.prepare('SELECT 1 FROM books WHERE isbn = ?').get(isbn)) {
    throw new ValidationError(`Libro desconocido: ${isbn}`)
  }
}

// Sitio dentro del libro: EPUB { cfi } o PDF { page[, rects] }; se guarda como JSON de tamaño acotado
function validLocation(location, { withRects = false } = {}) {
  if (!isPlainObject(location)) return false
  if (JSON.stringify(location).length > MAX_LOCATION_JSON) return false
  if ('cfi' in location) return typeof location.cfi === 'string' && location.cfi.startsWith('epubcfi(') && location.cfi.length <= 2000
  if (!Number.isInteger(location.page) || location.page < 1) return false
  if (!withRects) return true
  return (
    Array.isArray(location.rects) && location.rects.length > 0 && location.rects.length <= 200 &&
    location.rects.every((r) => Array.isArray(r) && r.length === 4 && r.every((n) => Number.isFinite(n) && n > -0.5 && n < 1.5))
  )
}

const rowToAnnotation = (row) => ({
  id: row.id,
  location: JSON.parse(row.location),
  text: row.text,
  note: row.note,
  color: row.color,
  createdAt: row.created_at,
})

const rowToBookmark = (row) => ({ id: row.id, location: JSON.parse(row.location), label: row.label, createdAt: row.created_at })

/**
 * Lo que necesita el lector de un libro: { position, annotations, bookmarks } (en orden de creación).
 */
export function readReader(db, isbn) {
  assertKnownIsbn(db, isbn)
  const state = db.prepare('SELECT reading_position FROM book_state WHERE isbn = ?').get(isbn)
  return {
    position: state?.reading_position ? JSON.parse(state.reading_position) : null,
    annotations: db.prepare('SELECT * FROM annotations WHERE isbn = ? ORDER BY id').all(isbn).map(rowToAnnotation),
    bookmarks: db.prepare('SELECT * FROM bookmarks WHERE isbn = ? ORDER BY id').all(isbn).map(rowToBookmark),
  }
}

/** Guarda un marcador ({ location, label }) y lo devuelve con su id. */
export function createBookmark(db, isbn, bookmark) {
  assertKnownIsbn(db, isbn)
  if (!isPlainObject(bookmark) || !validLocation(bookmark.location)) throw new ValidationError('Sitio del marcador no válido')
  const { label } = bookmark
  if (typeof label !== 'string' || label.trim().length === 0 || label.length > MAX_BOOKMARK_LABEL) {
    throw new ValidationError('Nombre del marcador no válido')
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO bookmarks (isbn, location, label) VALUES (?, ?, ?)')
    .run(isbn, JSON.stringify(bookmark.location), label.trim())
  return rowToBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(lastInsertRowid))
}

/** Borra un marcador. */
export function deleteBookmark(db, id) {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
}

/** Guarda por dónde se va leyendo. */
export function writePosition(db, isbn, location) {
  assertKnownIsbn(db, isbn)
  if (!validLocation(location)) throw new ValidationError('Posición de lectura no válida')
  db.prepare("UPDATE book_state SET reading_position = ?, updated_at = datetime('now') WHERE isbn = ?").run(JSON.stringify(location), isbn)
}

function validNote(note) {
  return note === null || note === undefined || (typeof note === 'string' && note.length <= MAX_ANNOTATION_TEXT)
}

/** Crea un subrayado (con comentario opcional) y lo devuelve con su id. */
export function createAnnotation(db, isbn, annotation) {
  assertKnownIsbn(db, isbn)
  if (!isPlainObject(annotation)) throw new ValidationError('Se esperaba un subrayado')
  const { location, text, note, color } = annotation
  if (!validLocation(location, { withRects: !('cfi' in (location ?? {})) })) throw new ValidationError('Sitio del subrayado no válido')
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_ANNOTATION_TEXT) throw new ValidationError('Texto subrayado no válido')
  if (!validNote(note)) throw new ValidationError('Comentario no válido')
  if (!ANNOTATION_COLORS.includes(color)) throw new ValidationError(`Color no válido: ${color}`)
  const { lastInsertRowid } = db
    .prepare('INSERT INTO annotations (isbn, location, text, note, color) VALUES (?, ?, ?, ?, ?)')
    .run(isbn, JSON.stringify(location), text, note || null, color)
  return rowToAnnotation(db.prepare('SELECT * FROM annotations WHERE id = ?').get(lastInsertRowid))
}

/** Cambia el comentario y/o el color de un subrayado. */
export function updateAnnotation(db, id, changes) {
  if (!isPlainObject(changes)) throw new ValidationError('Se esperaban los cambios del subrayado')
  const current = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id)
  if (!current) throw new ValidationError(`No existe el subrayado ${id}`)
  const note = 'note' in changes ? changes.note : current.note
  const color = changes.color ?? current.color
  if (!validNote(note)) throw new ValidationError('Comentario no válido')
  if (!ANNOTATION_COLORS.includes(color)) throw new ValidationError(`Color no válido: ${color}`)
  db.prepare('UPDATE annotations SET note = ?, color = ? WHERE id = ?').run(note || null, color, id)
  return rowToAnnotation(db.prepare('SELECT * FROM annotations WHERE id = ?').get(id))
}

/** Borra un subrayado. */
export function deleteAnnotation(db, id) {
  db.prepare('DELETE FROM annotations WHERE id = ?').run(id)
}

// Lee el cuerpo JSON de una petición, con límite de tamaño
function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new ValidationError('Petición demasiado grande'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new ValidationError('El cuerpo no es JSON válido'))
      }
    })
    req.on('error', reject)
  })
}

const WRITERS = { '/placements': writePlacements, '/flipped': writeFlipped, '/reading-status': writeReadingStatus }

/**
 * Manejador de la API (montado en /api):
 * - GET /state, PUT /placements, PUT /flipped, PUT /reading-status (la sala)
 * - GET /ebooks (qué libros tienen libro electrónico), GET /ebooks/:isbn (el archivo)
 * - GET /reader/:isbn, PUT /reader/:isbn/position, POST /reader/:isbn/annotations, POST /reader/:isbn/bookmarks,
 *   PATCH /annotations/:id, DELETE /annotations/:id, DELETE /bookmarks/:id (el lector)
 * - GET /catalog/search?q=, POST /books, PUT /books/:isbn/synopsis (añadir libros y escribir su sinopsis desde la sala;
 *   catalog: { booksMetaFile, isbnsFile, coversDir, googleBooksKey })
 */
export function createLibraryApi(db, { ebooksDir, catalog } = {}) {
  const send = (res, status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }
  return async (req, res, next) => {
    const route = req.url.split('?')[0]
    try {
      if (req.method === 'GET' && route === '/state') return send(res, 200, readState(db))
      if (req.method === 'PUT' && WRITERS[route]) {
        WRITERS[route](db, await readJsonBody(req))
        return send(res, 200, { ok: true })
      }

      if (req.method === 'GET' && route === '/catalog/search' && catalog) {
        const query = new URL(req.url, 'http://localhost').searchParams.get('q')
        try {
          return send(res, 200, await searchBooks(query, catalog))
        } catch (error) {
          if (error instanceof ValidationError) throw error
          console.warn('[api] Búsqueda de libros:', error.message)
          return send(res, 502, { error: 'No se pudo consultar el catálogo de libros. Inténtalo de nuevo.' })
        }
      }
      if (req.method === 'POST' && route === '/books' && catalog) {
        try {
          return send(res, 201, await addBook(db, catalog, await readJsonBody(req, MAX_BOOK_BODY_BYTES)))
        } catch (error) {
          if (error instanceof CatalogConflictError) return send(res, 409, { error: error.message })
          throw error
        }
      }

      const synopsisMatch = /^\/books\/([0-9X]+)\/synopsis$/i.exec(route)
      if (synopsisMatch && req.method === 'PUT' && catalog) {
        const { synopsis } = await readJsonBody(req)
        return send(res, 200, setSynopsis(catalog, synopsisMatch[1], synopsis))
      }

      if (req.method === 'GET' && route === '/ebooks') return send(res, 200, listEbooks(ebooksDir, db))
      let match = /^\/ebooks\/([0-9X]+)$/i.exec(route)
      if (req.method === 'GET' && match) {
        const isbn = match[1].toUpperCase()
        const ebooks = listEbooks(ebooksDir, db)
        const format = ebooks[isbn]
        if (!format) return send(res, 404, { error: 'Este libro no tiene libro electrónico' })
        const file = findEbookFile(ebooksDir, isbn, format, db)
        res.statusCode = 200
        res.setHeader('Content-Type', EBOOK_TYPES[format])
        res.setHeader('Content-Length', fs.statSync(file).size)
        return fs.createReadStream(file).pipe(res)
      }

      match = /^\/reader\/([0-9X]+)(\/position|\/annotations|\/bookmarks)?$/i.exec(route)
      if (match) {
        const [, isbn, action] = match
        if (req.method === 'GET' && !action) return send(res, 200, readReader(db, isbn))
        if (req.method === 'PUT' && action === '/position') {
          writePosition(db, isbn, await readJsonBody(req))
          return send(res, 200, { ok: true })
        }
        if (req.method === 'POST' && action === '/annotations') return send(res, 201, createAnnotation(db, isbn, await readJsonBody(req)))
        if (req.method === 'POST' && action === '/bookmarks') return send(res, 201, createBookmark(db, isbn, await readJsonBody(req)))
      }

      match = /^\/bookmarks\/(\d+)$/.exec(route)
      if (match && req.method === 'DELETE') {
        deleteBookmark(db, Number(match[1]))
        return send(res, 200, { ok: true })
      }

      match = /^\/annotations\/(\d+)$/.exec(route)
      if (match) {
        const id = Number(match[1])
        if (req.method === 'PATCH') return send(res, 200, updateAnnotation(db, id, await readJsonBody(req)))
        if (req.method === 'DELETE') {
          deleteAnnotation(db, id)
          return send(res, 200, { ok: true })
        }
      }
      return next()
    } catch (error) {
      if (error instanceof ValidationError) return send(res, 400, { error: error.message })
      console.error('[api] Error de la base de datos:', error)
      return send(res, 500, { error: 'Error interno de la base de datos' })
    }
  }
}

/**
 * Plugin de Vite: abre data/bookroom.sqlite, carga el catálogo desde booksMeta.json y sirve la API en /api
 * con el propio servidor de desarrollo.
 * shortcut: solo existe con `npm run dev`; para servir la versión construida hará falta un servidor que use createLibraryApi
 */
export function libraryApiPlugin({ dbFile, booksMetaFile, ebooksDir, catalog }) {
  return {
    name: 'library-api',
    configureServer(server) {
      const db = openLibraryDb(dbFile)
      seedBooks(db, JSON.parse(fs.readFileSync(booksMetaFile, 'utf8')))
      server.middlewares.use('/api', createLibraryApi(db, { ebooksDir, catalog: catalog && { booksMetaFile, ...catalog } }))
      server.httpServer?.on('close', () => db.close())
    },
  }
}
