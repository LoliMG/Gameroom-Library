// Base de datos SQLite de la biblioteca: catálogo de libros y lo que se hace con cada uno en la sala
// (estado de lectura, si está de frente, su sitio en la estantería y, para los que tienen libro electrónico, por dónde
// se va leyendo y los subrayados y comentarios). Usa el SQLite que trae Node (node:sqlite).
//
// Node 24 ejecuta este archivo tal cual: quita los tipos al cargarlo (por eso los imports llevan la extensión .ts y los
// de solo tipos van con "import type", que desaparecen sin más).
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
// Tipos de Node para la petición y la respuesta HTTP que recibe el manejador de la API
import type { IncomingMessage, ServerResponse } from 'node:http'
// Tipo de Vite para el plugin que monta la API en el servidor de desarrollo
import type { Plugin } from 'vite'
// Tipos compartidos con la sala (la forma de los datos que van y vienen por la API)
import type { Annotation, AnnotationColor, AppSettings, BookMeta, Bookmark, EbookFormat, LibraryState, ReaderLocation, ReadingStatus, Slot, SoundVolumes, WishItem } from '../src/types.ts'
import { DEFAULT_SETTINGS, MAX_SOUND_VOLUME, withDefaultSettings } from '../src/types.ts'
// Búsqueda y alta de libros nuevos desde la consola (usa seedBooks, ValidationError e isPlainObject de aquí, solo dentro
// de funciones: así la importación circular entre los dos archivos no da problemas)
import { searchBooks, addBook, setSynopsis, updateBook, deleteBook, CatalogConflictError } from './bookCatalog.ts'
import type { CatalogOptions } from './bookCatalog.ts'

export const READING_STATUSES: readonly ReadingStatus[] = ['finished', 'reading', 'unread']
// Colores de subrayado del lector
export const ANNOTATION_COLORS: readonly AnnotationColor[] = ['yellow', 'pink', 'green', 'blue']
// Libros electrónicos: ebooks/<isbn>.epub o ebooks/<isbn>.pdf (el nombre solo puede ser un ISBN: nada de rutas)
const EBOOK_FILE = /^([0-9]{9}[0-9X]|[0-9]{13})\.(epub|pdf)$/i
const ISBN = /^([0-9]{9}[0-9X]|[0-9]{13})$/
const EBOOK_TYPES: Record<EbookFormat, string> = { epub: 'application/epub+zip', pdf: 'application/pdf' }
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
  -- Datos de la sala que no son de un libro concreto, como JSON: etiquetas, lista de deseos y ajustes
  CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`

// Filas de las tablas tal como las devuelve node:sqlite (una columna = una propiedad; SQLite no tiene booleanos: 0/1).
// node:sqlite las tipa como Record<string, valor SQL>; se convierten a estos tipos con "as", porque la forma la fija
// SCHEMA de arriba. (Son "type" y no "interface" para que TypeScript acepte esa conversión.)
type BookStateRow = {
  isbn: string
  reading_status: ReadingStatus
  flipped: number
  wall: string | null
  module: number | null
  shelf: number | null
  x: number | null
  reading_position: string | null
}
type AnnotationRow = { id: number; location: string; text: string; note: string | null; color: AnnotationColor; created_at: string }
type BookmarkRow = { id: number; location: string; label: string; created_at: string }
type TitleRow = { isbn: string; title: string | null }

// Error de datos recibidos: el servidor responde 400 con su mensaje
export class ValidationError extends Error {}

/**
 * Abre (o crea) la base de datos con sus tablas. file puede ser ':memory:' (pruebas).
 */
export function openLibraryDb(file: string): DatabaseSync {
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
function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((info) => info.name === column)
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

// Ejecuta fn dentro de una transacción: o se guarda todo o nada
function transaction(db: DatabaseSync, fn: () => void) {
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
export function seedBooks(db: DatabaseSync, booksMeta: BookMeta[]) {
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

// Valor guardado en app_data (o fallback si aún no hay ninguno)
function readAppData<T>(db: DatabaseSync, key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM app_data WHERE key = ?').get(key) as { value: string } | undefined
  return row ? (JSON.parse(row.value) as T) : fallback
}

function writeAppData(db: DatabaseSync, key: string, value: unknown) {
  db.prepare('INSERT INTO app_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value))
}

/**
 * Estado de la biblioteca con la misma forma que usa la sala:
 * { placements: { isbn: { wall, module, shelf, x } }, flipped: [isbn], readingStatus: { isbn: estado }, tags, wishlist,
 * settings }
 */
export function readState(db: DatabaseSync): LibraryState {
  const state: LibraryState = {
    placements: {},
    flipped: [],
    readingStatus: {},
    tags: readAppData(db, 'tags', {}),
    wishlist: readAppData(db, 'wishlist', []),
    settings: withDefaultSettings(readAppData(db, 'settings', {})),
  }
  for (const row of db.prepare('SELECT * FROM book_state').all() as BookStateRow[]) {
    // Con pared hay sitio guardado: las cuatro columnas se escriben juntas (writePlacements)
    if (row.wall !== null) state.placements[row.isbn] = { wall: row.wall, module: row.module!, shelf: row.shelf!, x: row.x! }
    if (row.flipped) state.flipped.push(row.isbn)
    if (row.reading_status !== 'unread') state.readingStatus[row.isbn] = row.reading_status
  }
  return state
}

// ISBN que existen en el catálogo (los demás se ignoran: libros que ya no están)
const knownIsbns = (db: DatabaseSync) => new Set((db.prepare('SELECT isbn FROM books').all() as TitleRow[]).map((row) => row.isbn))

// Lo que llega en el cuerpo de una petición es "unknown": estas funciones comprueban su forma antes de usarlo.
// Las que acaban en "value is …" le dicen además a TypeScript qué tipo tiene el valor si devuelven true.
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const integerBelow = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < max
const isReadingStatus = (value: unknown): value is ReadingStatus => (READING_STATUSES as readonly unknown[]).includes(value)
const isAnnotationColor = (value: unknown): value is AnnotationColor => (ANNOTATION_COLORS as readonly unknown[]).includes(value)

function validSlot(slot: unknown): slot is Slot {
  return (
    isPlainObject(slot) &&
    typeof slot.wall === 'string' && slot.wall.length > 0 && slot.wall.length <= 20 &&
    integerBelow(slot.module, 100) &&
    integerBelow(slot.shelf, 100) &&
    typeof slot.x === 'number' && Number.isFinite(slot.x) && Math.abs(slot.x) < 10
  )
}

/**
 * Sustituye los sitios de todos los libros por los recibidos ({ isbn: sitio }); los que no vienen vuelven al de por defecto.
 */
export function writePlacements(db: DatabaseSync, placements: unknown) {
  if (!isPlainObject(placements)) throw new ValidationError('Se esperaba un objeto { isbn: sitio }')
  const slots: [string, Slot][] = []
  for (const [isbn, slot] of Object.entries(placements)) {
    if (!validSlot(slot)) throw new ValidationError(`Sitio no válido para ${isbn}`)
    slots.push([isbn, slot])
  }
  const known = knownIsbns(db)
  const update = db.prepare("UPDATE book_state SET wall = ?, module = ?, shelf = ?, x = ?, updated_at = datetime('now') WHERE isbn = ?")
  transaction(db, () => {
    db.exec('UPDATE book_state SET wall = NULL, module = NULL, shelf = NULL, x = NULL')
    for (const [isbn, slot] of slots) {
      if (known.has(isbn)) update.run(slot.wall, slot.module, slot.shelf, slot.x, isbn)
    }
  })
}

/**
 * Sustituye la lista de libros de frente (volteados) por la recibida ([isbn]).
 */
export function writeFlipped(db: DatabaseSync, isbns: unknown) {
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
export function writeReadingStatus(db: DatabaseSync, statuses: unknown) {
  if (!isPlainObject(statuses)) throw new ValidationError('Se esperaba un objeto { isbn: estado }')
  for (const [isbn, status] of Object.entries(statuses)) {
    if (!isReadingStatus(status)) throw new ValidationError(`Estado no válido para ${isbn}: ${status}`)
  }
  const update = db.prepare("UPDATE book_state SET reading_status = ?, updated_at = datetime('now') WHERE isbn = ?")
  transaction(db, () => {
    db.exec("UPDATE book_state SET reading_status = 'unread'")
    for (const [isbn, status] of Object.entries(statuses)) update.run(status as ReadingStatus, isbn)
  })
}

const MAX_TAG_LENGTH = 40
const MAX_TAGS_PER_BOOK = 20
const MAX_WISHLIST = 500
const ISBN13 = /^97[89][0-9]{10}$/
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max

/** Sustituye las etiquetas por las recibidas ({ isbn: [etiqueta] }); las de libros que ya no están se descartan. */
export function writeTags(db: DatabaseSync, tags: unknown) {
  if (!isPlainObject(tags)) throw new ValidationError('Se esperaba un objeto { isbn: [etiquetas] }')
  const known = knownIsbns(db)
  const clean: Record<string, string[]> = {}
  for (const [isbn, list] of Object.entries(tags)) {
    if (!Array.isArray(list) || list.length > MAX_TAGS_PER_BOOK || !list.every((tag) => shortText(tag, MAX_TAG_LENGTH))) {
      throw new ValidationError(`Etiquetas no válidas para ${isbn}`)
    }
    if (known.has(isbn) && list.length > 0) clean[isbn] = [...new Set(list.map((tag: string) => tag.trim()))]
  }
  writeAppData(db, 'tags', clean)
}

function validWish(item: unknown): item is WishItem {
  return (
    isPlainObject(item) &&
    typeof item.isbn === 'string' && ISBN13.test(item.isbn) &&
    shortText(item.title, 300) &&
    (item.author === null || shortText(item.author, 300)) &&
    (item.publisher === null || shortText(item.publisher, 300)) &&
    (item.pages === null || integerBelow(item.pages, 10000)) &&
    typeof item.coverUrl === 'string' && item.coverUrl.startsWith('https://') && item.coverUrl.length <= 500 &&
    (item.format === 'book' || item.format === 'manga')
  )
}

/** Sustituye la lista de deseos por la recibida. */
export function writeWishlist(db: DatabaseSync, wishlist: unknown) {
  if (!Array.isArray(wishlist) || wishlist.length > MAX_WISHLIST) throw new ValidationError('Se esperaba una lista de libros')
  if (!wishlist.every(validWish)) throw new ValidationError('Hay un libro no válido en la lista de deseos')
  // Solo los campos conocidos (lo demás que mande el navegador no se guarda)
  writeAppData(db, 'wishlist', wishlist.map(({ isbn, title, author, publisher, pages, coverUrl, format }: WishItem) => ({ isbn, title, author, publisher, pages, coverUrl, format })))
}

const SOUND_NAMES = Object.keys(DEFAULT_SETTINGS.volumes) as (keyof SoundVolumes)[]
const validVolumes = (volumes: unknown): volumes is SoundVolumes =>
  isPlainObject(volumes) &&
  SOUND_NAMES.every((name) => typeof volumes[name] === 'number' && volumes[name] >= 0 && volumes[name] <= MAX_SOUND_VOLUME)

/** Guarda los ajustes de la sala ({ city, latitude, longitude, sound, volumes }). */
export function writeSettings(db: DatabaseSync, settings: unknown) {
  if (
    !isPlainObject(settings) ||
    !shortText(settings.city, 100) ||
    typeof settings.latitude !== 'number' || Math.abs(settings.latitude) > 90 ||
    typeof settings.longitude !== 'number' || Math.abs(settings.longitude) > 180 ||
    typeof settings.sound !== 'boolean' ||
    !validVolumes(settings.volumes)
  ) {
    throw new ValidationError('Ajustes no válidos')
  }
  // Solo los sonidos conocidos (validVolumes ya ha comprobado cada uno)
  const volumes = Object.fromEntries(SOUND_NAMES.map((name) => [name, (settings.volumes as SoundVolumes)[name]])) as unknown as SoundVolumes
  const clean: AppSettings = { city: settings.city.trim(), latitude: settings.latitude, longitude: settings.longitude, sound: settings.sound, volumes }
  writeAppData(db, 'settings', clean)
}

// --- Lector de libros electrónicos ---

// Nombre de archivo o título para comparar: sin tildes, espacios ni signos, en minúsculas
const normalizeName = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

// Carpetas donde se buscan los libros electrónicos: la indicada (ebooks/) y, si existe, pdfs/ a su lado
function ebookDirs(dir: string): string[] {
  const altPdfDir = path.join(path.dirname(dir), 'pdfs')
  return altPdfDir !== dir && fs.existsSync(altPdfDir) ? [dir, altPdfDir] : [dir]
}

/**
 * Libros electrónicos que hay en las carpetas: { isbn: 'epub' | 'pdf' } (si un ISBN tiene los dos, gana el EPUB).
 * Permite nombrarlos tanto por ISBN (<isbn>.pdf / .epub) como por título del libro (<titulo>.pdf / .epub).
 */
export function listEbooks(dir: string | undefined, db: DatabaseSync | null = null): Record<string, EbookFormat> {
  if (!dir) return {}

  // Mapa de títulos a ISBN si la base de datos está disponible
  const titleToIsbn = new Map<string, string>()
  if (db) {
    try {
      const rows = db.prepare('SELECT isbn, title FROM books').all() as TitleRow[]
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

  const ebooks: Record<string, EbookFormat> = {}
  for (const d of ebookDirs(dir)) {
    if (!fs.existsSync(d)) continue
    for (const file of fs.readdirSync(d)) {
      const extMatch = /\.(epub|pdf)$/i.exec(file)
      if (!extMatch) continue
      const format = extMatch[1].toLowerCase() as EbookFormat
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

/** Ruta del archivo del libro electrónico de un ISBN: por su ISBN o, si no, por su título. */
export function findEbookFile(dir: string, isbn: string, format: EbookFormat, db: DatabaseSync | null = null): string {
  const dirs = ebookDirs(dir)

  // 1. Coincidencia directa por ISBN
  for (const d of dirs) {
    const direct = path.join(d, `${isbn}.${format}`)
    if (fs.existsSync(direct)) return direct
  }

  // 2. Coincidencia por título
  if (db) {
    try {
      const row = db.prepare('SELECT title FROM books WHERE isbn = ?').get(isbn) as TitleRow | undefined
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

function assertKnownIsbn(db: DatabaseSync, isbn: string) {
  if (!ISBN.test(isbn) || !db.prepare('SELECT 1 FROM books WHERE isbn = ?').get(isbn)) {
    throw new ValidationError(`Libro desconocido: ${isbn}`)
  }
}

// Sitio dentro del libro: EPUB { cfi } o PDF { page[, rects] }; se guarda como JSON de tamaño acotado
function validLocation(location: unknown, { withRects = false } = {}): location is ReaderLocation {
  if (!isPlainObject(location)) return false
  if (JSON.stringify(location).length > MAX_LOCATION_JSON) return false
  if ('cfi' in location) return typeof location.cfi === 'string' && location.cfi.startsWith('epubcfi(') && location.cfi.length <= 2000
  if (!integerBelow(location.page, Infinity) || location.page < 1) return false
  if (!withRects) return true
  return (
    Array.isArray(location.rects) && location.rects.length > 0 && location.rects.length <= 200 &&
    location.rects.every((r) => Array.isArray(r) && r.length === 4 && r.every((n) => Number.isFinite(n) && n > -0.5 && n < 1.5))
  )
}

// Fila de la base de datos → objeto de la API (la ubicación se guarda como texto JSON)
const rowToAnnotation = (row: AnnotationRow): Annotation => ({
  id: row.id,
  location: JSON.parse(row.location),
  text: row.text,
  note: row.note,
  color: row.color,
  createdAt: row.created_at,
})

const rowToBookmark = (row: BookmarkRow): Bookmark => ({ id: row.id, location: JSON.parse(row.location), label: row.label, createdAt: row.created_at })

/**
 * Lo que necesita el lector de un libro: { position, annotations, bookmarks } (en orden de creación).
 */
export function readReader(db: DatabaseSync, isbn: string) {
  assertKnownIsbn(db, isbn)
  const state = db.prepare('SELECT reading_position FROM book_state WHERE isbn = ?').get(isbn) as Pick<BookStateRow, 'reading_position'> | undefined
  return {
    position: state?.reading_position ? (JSON.parse(state.reading_position) as ReaderLocation) : null,
    annotations: (db.prepare('SELECT * FROM annotations WHERE isbn = ? ORDER BY id').all(isbn) as AnnotationRow[]).map(rowToAnnotation),
    bookmarks: (db.prepare('SELECT * FROM bookmarks WHERE isbn = ? ORDER BY id').all(isbn) as BookmarkRow[]).map(rowToBookmark),
  }
}

/** Guarda un marcador ({ location, label }) y lo devuelve con su id. */
export function createBookmark(db: DatabaseSync, isbn: string, bookmark: unknown): Bookmark {
  assertKnownIsbn(db, isbn)
  if (!isPlainObject(bookmark) || !validLocation(bookmark.location)) throw new ValidationError('Sitio del marcador no válido')
  const { label } = bookmark
  if (typeof label !== 'string' || label.trim().length === 0 || label.length > MAX_BOOKMARK_LABEL) {
    throw new ValidationError('Nombre del marcador no válido')
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO bookmarks (isbn, location, label) VALUES (?, ?, ?)')
    .run(isbn, JSON.stringify(bookmark.location), label.trim())
  return rowToBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(lastInsertRowid) as BookmarkRow)
}

/** Borra un marcador. */
export function deleteBookmark(db: DatabaseSync, id: number) {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
}

/** Guarda por dónde se va leyendo. */
export function writePosition(db: DatabaseSync, isbn: string, location: unknown) {
  assertKnownIsbn(db, isbn)
  if (!validLocation(location)) throw new ValidationError('Posición de lectura no válida')
  db.prepare("UPDATE book_state SET reading_position = ?, updated_at = datetime('now') WHERE isbn = ?").run(JSON.stringify(location), isbn)
}

function validNote(note: unknown): note is string | null | undefined {
  return note === null || note === undefined || (typeof note === 'string' && note.length <= MAX_ANNOTATION_TEXT)
}

/** Crea un subrayado (con comentario opcional) y lo devuelve con su id. */
export function createAnnotation(db: DatabaseSync, isbn: string, annotation: unknown): Annotation {
  assertKnownIsbn(db, isbn)
  if (!isPlainObject(annotation)) throw new ValidationError('Se esperaba un subrayado')
  const { location, text, note, color } = annotation
  // Los subrayados de PDF (sin cfi) necesitan los rectángulos marcados
  const withRects = !(isPlainObject(location) && 'cfi' in location)
  if (!validLocation(location, { withRects })) throw new ValidationError('Sitio del subrayado no válido')
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_ANNOTATION_TEXT) throw new ValidationError('Texto subrayado no válido')
  if (!validNote(note)) throw new ValidationError('Comentario no válido')
  if (!isAnnotationColor(color)) throw new ValidationError(`Color no válido: ${color}`)
  const { lastInsertRowid } = db
    .prepare('INSERT INTO annotations (isbn, location, text, note, color) VALUES (?, ?, ?, ?, ?)')
    .run(isbn, JSON.stringify(location), text, note || null, color)
  return rowToAnnotation(db.prepare('SELECT * FROM annotations WHERE id = ?').get(lastInsertRowid) as AnnotationRow)
}

/** Cambia el comentario y/o el color de un subrayado. */
export function updateAnnotation(db: DatabaseSync, id: number, changes: unknown): Annotation {
  if (!isPlainObject(changes)) throw new ValidationError('Se esperaban los cambios del subrayado')
  const current = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id) as AnnotationRow | undefined
  if (!current) throw new ValidationError(`No existe el subrayado ${id}`)
  const note = 'note' in changes ? changes.note : current.note
  const color = changes.color ?? current.color
  if (!validNote(note)) throw new ValidationError('Comentario no válido')
  if (!isAnnotationColor(color)) throw new ValidationError(`Color no válido: ${color}`)
  db.prepare('UPDATE annotations SET note = ?, color = ? WHERE id = ?').run(note || null, color, id)
  return rowToAnnotation(db.prepare('SELECT * FROM annotations WHERE id = ?').get(id) as AnnotationRow)
}

/** Borra un subrayado. */
export function deleteAnnotation(db: DatabaseSync, id: number) {
  db.prepare('DELETE FROM annotations WHERE id = ?').run(id)
}

// Lee el cuerpo JSON de una petición, con límite de tamaño. Devuelve "unknown": quien lo usa comprueba su forma
function readJsonBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
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

const WRITERS: Partial<Record<string, (db: DatabaseSync, value: unknown) => void>> = {
  '/placements': writePlacements,
  '/flipped': writeFlipped,
  '/reading-status': writeReadingStatus,
  '/tags': writeTags,
  '/wishlist': writeWishlist,
  '/settings': writeSettings,
}

/** Opciones de la API: carpeta de los libros electrónicos y, para añadir libros desde la consola, el catálogo */
export interface LibraryApiOptions {
  ebooksDir?: string
  catalog?: CatalogOptions
}

/**
 * Manejador de la API (montado en /api):
 * - GET /state, PUT /placements, PUT /flipped, PUT /reading-status (la sala)
 * - GET /ebooks (qué libros tienen libro electrónico), GET /ebooks/:isbn (el archivo)
 * - GET /reader/:isbn, PUT /reader/:isbn/position, POST /reader/:isbn/annotations, POST /reader/:isbn/bookmarks,
 *   PATCH /annotations/:id, DELETE /annotations/:id, DELETE /bookmarks/:id (el lector)
 * - PUT /tags, PUT /wishlist, PUT /settings (etiquetas, lista de deseos y ajustes de la consola)
 * - GET /catalog/search?q=, POST /books, PUT /books/:isbn, DELETE /books/:isbn, PUT /books/:isbn/synopsis (añadir,
 *   editar, quitar y escribir la sinopsis de libros desde la sala; catalog: { booksMetaFile, isbnsFile, coversDir,
 *   googleBooksKey })
 */
export function createLibraryApi(db: DatabaseSync, { ebooksDir, catalog }: LibraryApiOptions = {}) {
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }
  // Middleware al estilo de Connect (el que usa Vite): si la ruta no es de la API, next() la pasa al siguiente
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? '/'
    const route = url.split('?')[0]
    try {
      if (req.method === 'GET' && route === '/state') return send(res, 200, readState(db))
      const writer = WRITERS[route]
      if (req.method === 'PUT' && writer) {
        writer(db, await readJsonBody(req))
        return send(res, 200, { ok: true })
      }

      if (req.method === 'GET' && route === '/catalog/search' && catalog) {
        const query = new URL(url, 'http://localhost').searchParams.get('q')
        try {
          return send(res, 200, await searchBooks(query, catalog))
        } catch (error) {
          if (error instanceof ValidationError) throw error
          console.warn('[api] Búsqueda de libros:', (error as Error).message)
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

      const bookMatch = /^\/books\/([0-9X]+)$/i.exec(route)
      if (bookMatch && catalog) {
        if (req.method === 'PUT') return send(res, 200, updateBook(db, catalog, bookMatch[1], await readJsonBody(req)))
        if (req.method === 'DELETE') {
          deleteBook(db, catalog, bookMatch[1])
          return send(res, 200, { ok: true })
        }
      }

      const synopsisMatch = /^\/books\/([0-9X]+)\/synopsis$/i.exec(route)
      if (synopsisMatch && req.method === 'PUT' && catalog) {
        const body = await readJsonBody(req)
        return send(res, 200, setSynopsis(catalog, synopsisMatch[1], isPlainObject(body) ? body.synopsis : undefined))
      }

      if (req.method === 'GET' && route === '/ebooks') return send(res, 200, listEbooks(ebooksDir, db))
      let match = /^\/ebooks\/([0-9X]+)$/i.exec(route)
      if (req.method === 'GET' && match) {
        const isbn = match[1].toUpperCase()
        const format = listEbooks(ebooksDir, db)[isbn]
        if (!format || !ebooksDir) return send(res, 404, { error: 'Este libro no tiene libro electrónico' })
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

/** Opciones del plugin (las pone vite.config.ts): archivos de la base de datos y del catálogo */
export interface LibraryApiPluginOptions {
  dbFile: string
  booksMetaFile: string
  ebooksDir?: string
  /** Sin booksMetaFile: el plugin le pasa el de arriba */
  catalog?: Omit<CatalogOptions, 'booksMetaFile'>
}

/**
 * Plugin de Vite: abre data/bookroom.sqlite, carga el catálogo desde booksMeta.json y sirve la API en /api
 * con el propio servidor de desarrollo.
 * shortcut: solo existe con `npm run dev`; para servir la versión construida hará falta un servidor que use createLibraryApi
 */
export function libraryApiPlugin({ dbFile, booksMetaFile, ebooksDir, catalog }: LibraryApiPluginOptions): Plugin {
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
