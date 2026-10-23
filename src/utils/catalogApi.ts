// Libros de la colección de la cuenta (tabla books y cubo covers de Supabase): añadir, cambiar, quitar y sinopsis.
// Buscar y añadir aún pasan por la API local (rutas /api/catalog/search y /api/books de server/library.ts, que usan
// server/bookCatalog.ts): busca en los catálogos, la portada y la sinopsis.
// shortcut: solo funciona con `npm run dev`; pasará a una Edge Function de Supabase (catalog) antes de publicar
import type { BookFormat, BookMeta, CatalogBook } from '@/types'
import { request, jsonBody } from '@/utils/apiRequest'
import { loadBooks } from '@/data/books'
import { currentUserId } from '@/utils/libraryApi'
import { removeEbookFile } from '@/utils/readerApi'
import { check, supabase } from '@/utils/supabase'

/** Formatos que se pueden elegir al añadir un libro y su nombre en la consola */
export const FORMAT_LABELS: Partial<Record<BookFormat, string>> = { book: 'Novela', manga: 'Manga' }

/** Datos de un libro que se añade: los de un resultado de búsqueda o los escritos a mano en el formulario */
export interface NewBook {
  isbn: string
  title: string
  author?: string | null
  publisher?: string | null
  pages?: number | null
  format: BookFormat
  saga?: string | null
  saga_index?: number | null
  synopsis?: string
  /** Portada: dirección de un resultado de búsqueda… */
  coverUrl?: string
  /** …o imagen subida desde el ordenador, en base64 (si no hay ninguna, el servidor la busca por el ISBN) */
  coverData?: string
  source?: string
}

/** Lo que devuelve el servidor tras añadir un libro: la entrada guardada en booksMeta.json y si su sinopsis es española */
export interface AddedBook {
  isbn: string
  title: string
  synopsis: string | null
  synopsisInSpanish: boolean
}

// JSON de la respuesta, con el tipo que dice quien llama (es lo que devuelve server/library.ts en esa ruta)
const requestJson = async <T>(url: string, options?: RequestInit): Promise<T> => (await request(url, options)).json()

/** Libros que coinciden con un ISBN o un título */
export const searchCatalog = (query: string) => requestJson<CatalogBook[]>(`/api/catalog/search?q=${encodeURIComponent(query)}`)

// Portada que la API local acaba de guardar en src/assets/covers (Vite la sirve tal cual)
async function localCover(isbn: string): Promise<{ blob: Blob; extension: string }> {
  for (const extension of ['jpg', 'png', 'webp', 'jpeg']) {
    const response = await fetch(`/src/assets/covers/${isbn}.${extension}`)
    if (response.ok && response.headers.get('Content-Type')?.startsWith('image/')) return { blob: await response.blob(), extension }
  }
  throw new Error('No se encontró la portada del libro añadido')
}

// Texto limpio (vacío = sin dato)
const clean = (text: string | null | undefined) => text?.trim() || null

/** Añade un libro a la colección: la API local busca su portada y sinopsis, y se guarda en la cuenta */
export async function addBookToCollection(book: NewBook): Promise<AddedBook> {
  const entry = await requestJson<AddedBook & BookMeta>('/api/books', jsonBody('POST', book))
  const userId = await currentUserId()
  const cover = await localCover(entry.isbn)
  const coverPath = `${userId}/${entry.isbn}.${cover.extension}`
  check(await supabase.storage.from('covers').upload(coverPath, cover.blob, { contentType: cover.blob.type, upsert: true }))
  check(
    await supabase.from('books').upsert({
      isbn: entry.isbn,
      title: entry.title,
      author: clean(entry.author),
      publisher: clean(entry.publisher),
      pages: entry.pages || null,
      saga: clean(entry.saga),
      saga_index: entry.saga ? (entry.saga_index ?? null) : null,
      format: entry.format === 'pocket' ? 'bolsillo' : (entry.format ?? 'book'),
      synopsis: entry.synopsis,
      source: entry.source ?? null,
      complete: entry.complete ?? false,
      cover_path: coverPath,
    })
  )
  await loadBooks()
  return entry
}

/** Guarda la sinopsis de un libro de la colección (texto vacío = quitarla) */
export async function saveSynopsis(isbn: string, synopsis: string): Promise<{ isbn: string; synopsis: string | null }> {
  if (synopsis.length > 3000) throw new Error('La sinopsis es demasiado larga (máximo 3000 caracteres)')
  check(await supabase.from('books').update({ synopsis: clean(synopsis) }).eq('isbn', isbn))
  return { isbn, synopsis: clean(synopsis) }
}

/** Datos de un libro que se pueden cambiar desde la consola */
export type BookChanges = Pick<NewBook, 'title' | 'author' | 'publisher' | 'pages' | 'format' | 'saga' | 'saga_index'>

/** Cambia los datos de un libro de la colección y vuelve a cargar los libros de la sala */
export async function updateBook(isbn: string, changes: BookChanges): Promise<void> {
  const title = clean(changes.title)
  if (!title) throw new Error('Falta el título')
  const saga = clean(changes.saga)
  check(
    await supabase
      .from('books')
      .update({
        title,
        author: clean(changes.author),
        publisher: clean(changes.publisher),
        // Sin páginas (o 0) = no se sabe
        pages: changes.pages || null,
        format: changes.format,
        saga,
        saga_index: saga ? (changes.saga_index ?? null) : null,
      })
      .eq('isbn', isbn)
  )
  await loadBooks()
}

/** Quita un libro de la colección, con su estado, subrayados, marcadores, diario y portada */
export async function deleteBook(isbn: string): Promise<void> {
  // La base de datos borra en cascada lo que cuelga del libro
  const deleted = check(await supabase.from('books').delete().eq('isbn', isbn).select('cover_path'))
  // shortcut: también se quita de booksMeta.json, que la API local mira al añadir (si no, no se podría volver a añadir);
  // sobra cuando añadir pase a la Edge Function
  await request(`/api/books/${isbn}`, { method: 'DELETE' }).catch((error: Error) => console.warn('[catálogo] No se pudo quitar de booksMeta.json:', error.message))
  const paths = deleted.flatMap((row) => (row.cover_path ? [row.cover_path as string] : []))
  // Si la portada no se puede borrar solo queda un archivo suelto: se avisa sin deshacer lo demás
  if (paths.length) {
    const { error } = await supabase.storage.from('covers').remove(paths)
    if (error) console.warn('[catálogo] No se pudo borrar la portada:', error.message)
  }
  // Su PDF o EPUB de este navegador, si lo tenía
  await removeEbookFile(isbn).catch((error: Error) => console.warn('[catálogo] No se pudo quitar su libro electrónico:', error.message))
  await loadBooks()
}

/** Mensaje tras añadir un libro: dónde queda y si su sinopsis falta o va en otro idioma */
export function addedMessage(entry: AddedBook): string {
  const placed = 'Añadido: ya está en el primer hueco libre de las estanterías.'
  if (!entry.synopsis) return `${placed} No se ha encontrado sinopsis: puedes escribirla con el botón del ojo del panel.`
  if (!entry.synopsisInSpanish) return `${placed} Solo había sinopsis en otro idioma: puedes cambiarla con el botón del ojo del panel.`
  return placed
}
