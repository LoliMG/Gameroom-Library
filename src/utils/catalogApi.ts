// Llamadas a la API para añadir libros a la colección desde la consola (rutas /api/catalog/search, /api/books y
// /api/books/:isbn/synopsis de server/library.ts, que usan server/bookCatalog.ts)
import type { BookFormat, CatalogBook } from '@/types'
import { request, jsonBody } from '@/utils/apiRequest'

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

/** Añade un libro a la colección (el servidor guarda su portada y sus datos) */
export const addBookToCollection = (book: NewBook) => requestJson<AddedBook>('/api/books', jsonBody('POST', book))

/** Guarda la sinopsis de un libro de la colección (texto vacío = quitarla) */
export const saveSynopsis = (isbn: string, synopsis: string) =>
  requestJson<{ isbn: string; synopsis: string | null }>(`/api/books/${isbn}/synopsis`, jsonBody('PUT', { synopsis }))

/** Datos de un libro que se pueden cambiar desde la consola */
export type BookChanges = Pick<NewBook, 'title' | 'author' | 'publisher' | 'pages' | 'format' | 'saga' | 'saga_index'>

/** Cambia los datos de un libro de la colección (la sala se actualiza sola al cambiar booksMeta.json) */
export const updateBook = (isbn: string, changes: BookChanges) => request(`/api/books/${isbn}`, jsonBody('PUT', changes))

/** Quita un libro de la colección, con su estado, subrayados y marcadores */
export const deleteBook = (isbn: string) => request(`/api/books/${isbn}`, { method: 'DELETE' })

/** Mensaje tras añadir un libro: dónde queda y si su sinopsis falta o va en otro idioma */
export function addedMessage(entry: AddedBook): string {
  const placed = 'Añadido: ya está en el primer hueco libre de las estanterías.'
  if (!entry.synopsis) return `${placed} No se ha encontrado sinopsis: puedes escribirla con el botón del ojo del panel.`
  if (!entry.synopsisInSpanish) return `${placed} Solo había sinopsis en otro idioma: puedes cambiarla con el botón del ojo del panel.`
  return placed
}
