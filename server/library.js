// Base de datos SQLite de la biblioteca: catálogo de libros y lo que se hace con cada uno en la sala
// (estado de lectura, si está de frente y su sitio en la estantería). Usa el SQLite que trae Node (node:sqlite).
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const READING_STATUSES = ['finished', 'reading', 'unread']
// Tamaño máximo del cuerpo de una petición: el estado entero de la biblioteca ocupa unos pocos KB
const MAX_BODY_BYTES = 1024 * 1024

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS books (
    isbn TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    publisher TEXT,
    pages INTEGER
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
  return db
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
    INSERT INTO books (isbn, title, author, publisher, pages) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(isbn) DO UPDATE SET title = excluded.title, author = excluded.author,
      publisher = excluded.publisher, pages = excluded.pages
  `)
  const createState = db.prepare('INSERT OR IGNORE INTO book_state (isbn) VALUES (?)')
  transaction(db, () => {
    for (const book of booksMeta) {
      if (!book.isbn || !book.title) continue
      upsertBook.run(book.isbn, book.title, book.author ?? null, book.publisher ?? null, book.pages ?? null)
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

// Lee el cuerpo JSON de una petición, con límite de tamaño
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
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
 * Manejador de la API (montado en /api): GET /state, PUT /placements, PUT /flipped, PUT /reading-status.
 */
export function createLibraryApi(db) {
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
export function libraryApiPlugin({ dbFile, booksMetaFile }) {
  return {
    name: 'library-api',
    configureServer(server) {
      const db = openLibraryDb(dbFile)
      seedBooks(db, JSON.parse(fs.readFileSync(booksMetaFile, 'utf8')))
      server.middlewares.use('/api', createLibraryApi(db))
      server.httpServer?.on('close', () => db.close())
    },
  }
}
