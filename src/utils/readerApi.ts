// Llamadas a la API del lector de libros electrónicos (rutas /api/ebooks, /api/reader, /api/annotations y
// /api/bookmarks de server/library.ts, servidas por el servidor de Vite con la base de datos SQLite)
import type { Annotation, AnnotationColor, Bookmark, EbookFormat, ReaderLocation } from '@/types'
import { request, jsonBody as json } from '@/utils/apiRequest'

/** Lo que necesita el lector de un libro: por dónde se iba, sus subrayados y sus marcadores */
export interface ReaderData {
  position: ReaderLocation | null
  annotations: Annotation[]
  bookmarks: Bookmark[]
}

/** Libros que tienen libro electrónico: { isbn: 'epub' | 'pdf' }. Sin servidor, ninguno. */
export async function fetchEbooks(): Promise<Record<string, EbookFormat>> {
  try {
    return await (await request('/api/ebooks')).json()
  } catch (error) {
    console.warn('[lector] No se pudo saber qué libros tienen libro electrónico:', (error as Error).message)
    return {}
  }
}

/** Archivo del libro electrónico (EPUB o PDF) como ArrayBuffer (los bytes del archivo). */
export const fetchEbookFile = async (isbn: string): Promise<ArrayBuffer> => (await request(`/api/ebooks/${isbn}`)).arrayBuffer()

/** Por dónde se iba leyendo, los subrayados y los marcadores. */
export const fetchReaderData = async (isbn: string): Promise<ReaderData> => (await request(`/api/reader/${isbn}`)).json()

/** Guarda por dónde se va leyendo (si falla solo se avisa: no es un dato que se pierda de forma grave). */
export function saveReadingPosition(isbn: string, location: ReaderLocation): Promise<unknown> {
  return request(`/api/reader/${isbn}/position`, json('PUT', location)).catch((error: Error) =>
    console.warn('[lector] No se pudo guardar la posición de lectura:', error.message)
  )
}

/** Crea un subrayado y lo devuelve con su id. */
export const createAnnotation = async (
  isbn: string,
  annotation: { location: ReaderLocation; text: string; color: AnnotationColor; note?: string | null }
): Promise<Annotation> => (await request(`/api/reader/${isbn}/annotations`, json('POST', annotation))).json()

/** Cambia el comentario y/o el color de un subrayado. */
export const updateAnnotation = async (
  id: number,
  changes: { note?: string | null; color?: AnnotationColor }
): Promise<Annotation> => (await request(`/api/annotations/${id}`, json('PATCH', changes))).json()

/** Guarda un marcador y lo devuelve con su id. */
export const createBookmark = async (isbn: string, bookmark: { location: ReaderLocation; label: string }): Promise<Bookmark> =>
  (await request(`/api/reader/${isbn}/bookmarks`, json('POST', bookmark))).json()

/** Borra un marcador. */
export const deleteBookmark = (id: number): Promise<Response> => request(`/api/bookmarks/${id}`, { method: 'DELETE' })

/** Borra un subrayado. */
export const deleteAnnotation = (id: number): Promise<Response> => request(`/api/annotations/${id}`, { method: 'DELETE' })
