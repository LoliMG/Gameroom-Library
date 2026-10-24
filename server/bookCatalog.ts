// Añadir libros a la colección desde la consola en el servidor local de desarrollo: escribe la portada en
// src/assets/covers, la entrada en booksMeta.json e isbns.json y la fila en la base de datos. La búsqueda, las portadas,
// la sinopsis y la comprobación del libro son las mismas que usa la Edge Function catalog (supabase/functions/catalog)
import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { BookFormat, BookMeta } from '../src/types.ts'
import { seedBooks, ValidationError, isPlainObject } from './library.ts'
import { cleanText, isIntegerBetween, prepareNewBook } from '../supabase/functions/catalog/catalog.ts'
// Lo que usan las pruebas y los scripts (scripts/checkLibraryDb.ts, scripts/fillSynopses.ts) y server/library.ts
export { CatalogConflictError, cleanSynopsis, findSynopsis, guessSaga, hasValidCheckDigit, isbn10Of, looksSpanish, matchWords, searchBooks } from '../supabase/functions/catalog/catalog.ts'

const MAX_SYNOPSIS = 3000

/** Archivos que toca el alta de libros y la clave de Google Books (las pone vite.config.ts) */
export interface CatalogOptions {
  booksMetaFile: string
  isbnsFile: string
  coversDir: string
  /** Sin clave no se consulta Google Books (su cuota sin clave es 0) */
  googleBooksKey?: string
}

/** Guarda (o, con texto vacío, quita) la sinopsis de un libro de la colección en booksMeta.json. */
export function setSynopsis({ booksMetaFile }: Pick<CatalogOptions, 'booksMetaFile'>, isbn: string, synopsis: unknown) {
  if (typeof synopsis !== 'string') throw new ValidationError('Sinopsis no válida')
  if (synopsis.length > MAX_SYNOPSIS) throw new ValidationError(`La sinopsis es demasiado larga (máximo ${MAX_SYNOPSIS} caracteres)`)
  const booksMeta: BookMeta[] = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  const entry = booksMeta.find((item) => item.isbn === isbn)
  if (!entry) throw new ValidationError('Ese libro no está en la colección')
  const text = synopsis.trim()
  if (text) entry.synopsis = text
  else delete entry.synopsis
  fs.writeFileSync(booksMetaFile, `${JSON.stringify(booksMeta, null, 2)}\n`)
  return { isbn, synopsis: text || null }
}

// Formatos que se pueden elegir al editar un libro (al añadirlo solo novela o manga; bolsillo ya existe en la colección)
const EDIT_FORMATS: readonly BookFormat[] = ['book', 'manga', 'bolsillo']

/**
 * Cambia los datos de un libro de la colección en booksMeta.json y en la base de datos. Solo se tocan los campos que
 * llegan: title, author, publisher, pages, format, saga, saga_index (null o texto vacío = quitarlo).
 */
export function updateBook(db: DatabaseSync, { booksMetaFile }: Pick<CatalogOptions, 'booksMetaFile'>, isbn: string, changes: unknown): BookMeta {
  if (!isPlainObject(changes)) throw new ValidationError('Cambios no válidos')
  const booksMeta: BookMeta[] = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  const entry = booksMeta.find((item) => item.isbn === isbn)
  if (!entry) throw new ValidationError('Ese libro no está en la colección')
  if ('title' in changes) {
    const title = cleanText(changes.title)
    if (!title) throw new ValidationError('Falta el título')
    entry.title = title
  }
  if ('author' in changes) entry.author = cleanText(changes.author)
  if ('publisher' in changes) entry.publisher = cleanText(changes.publisher)
  if ('pages' in changes) {
    if (changes.pages !== null && !isIntegerBetween(changes.pages, 0, 10000)) throw new ValidationError('Páginas no válidas')
    entry.pages = changes.pages
  }
  if ('format' in changes) {
    const { format } = changes
    if (!(EDIT_FORMATS as readonly unknown[]).includes(format)) throw new ValidationError('Formato no válido')
    entry.format = format as BookFormat
  }
  if ('saga' in changes) entry.saga = cleanText(changes.saga)
  if ('saga_index' in changes) {
    if (changes.saga_index !== null && !isIntegerBetween(changes.saga_index, 0, 1000)) throw new ValidationError('Número de tomo no válido')
    entry.saga_index = changes.saga_index
  }
  if (!entry.saga) entry.saga_index = null
  // Primero la base de datos; el JSON al final, porque al cambiarlo Vite actualiza la sala
  seedBooks(db, [entry])
  fs.writeFileSync(booksMetaFile, `${JSON.stringify(booksMeta, null, 2)}\n`)
  return entry
}

/**
 * Quita un libro de la colección: de booksMeta.json, de isbns.json y de la base de datos (con su estado, sus subrayados
 * y sus marcadores).
 * shortcut: la portada de src/assets/covers se queda (si se vuelve a añadir el libro, se sustituye); borrarla si llegan a
 * acumularse muchas
 */
export function deleteBook(db: DatabaseSync, { booksMetaFile, isbnsFile }: Pick<CatalogOptions, 'booksMetaFile' | 'isbnsFile'>, isbn: string) {
  const booksMeta: BookMeta[] = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  if (!booksMeta.some((item) => item.isbn === isbn)) throw new ValidationError('Ese libro no está en la colección')
  db.prepare('DELETE FROM books WHERE isbn = ?').run(isbn)
  const isbns: string[] = JSON.parse(fs.readFileSync(isbnsFile, 'utf8'))
  fs.writeFileSync(isbnsFile, `${JSON.stringify(isbns.filter((item) => item !== isbn), null, 2)}\n`)
  fs.writeFileSync(booksMetaFile, `${JSON.stringify(booksMeta.filter((item) => item.isbn !== isbn), null, 2)}\n`)
}

/**
 * Añade un libro a la colección, de la búsqueda o escrito a mano (ver prepareNewBook). Escribe la portada,
 * booksMeta.json e isbns.json (Vite recarga la sala con el libro nuevo) y lo da de alta en la base de datos. Devuelve la
 * entrada guardada en booksMeta.json y si su sinopsis está en español.
 *
 * @param book - El cuerpo de POST /api/books, sin comprobar (lo que envía la consola como NewBook)
 */
export async function addBook(db: DatabaseSync, { booksMetaFile, isbnsFile, coversDir, googleBooksKey }: CatalogOptions, book: unknown) {
  const booksMeta: BookMeta[] = JSON.parse(fs.readFileSync(booksMetaFile, 'utf8'))
  const { entry, cover, synopsisInSpanish } = await prepareNewBook(book, {
    googleBooksKey,
    exists: async (isbn) => booksMeta.some((item) => item.isbn === isbn),
  })
  // Primero la portada y la base de datos; los JSON al final, porque al cambiarlos Vite recarga la sala
  fs.writeFileSync(path.join(coversDir, `${entry.isbn}.${cover.extension}`), cover.bytes)
  seedBooks(db, [entry])
  fs.writeFileSync(booksMetaFile, `${JSON.stringify([...booksMeta, entry], null, 2)}
`)
  const isbns: string[] = JSON.parse(fs.readFileSync(isbnsFile, 'utf8'))
  if (!isbns.includes(entry.isbn)) fs.writeFileSync(isbnsFile, `${JSON.stringify([...isbns, entry.isbn], null, 2)}
`)
  return { ...entry, synopsisInSpanish }
}
