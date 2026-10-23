// Datos del lector de libros electrónicos de la cuenta, en Supabase: por dónde se va (book_state), subrayados
// (annotations) y marcadores (bookmarks).
// Los archivos EPUB y PDF están en el navegador de cada persona (ebookStore.ts), no en Supabase.
import type { Annotation, AnnotationColor, Bookmark, EbookFormat, Highlight, ReaderLocation } from '@/types'
import { deleteEbook, getEbook, listEbooks, saveEbook } from '@/utils/ebookStore'
import { getBooks } from '@/data/books'
import { currentUserId } from '@/utils/libraryApi'
import { check, supabase } from '@/utils/supabase'

/** Lo que necesita el lector de un libro: por dónde se iba, sus subrayados y sus marcadores */
export interface ReaderData {
  position: ReaderLocation | null
  annotations: Annotation[]
  bookmarks: Bookmark[]
}


const toAnnotation = (row: { id: number; location: ReaderLocation; text: string; note: string | null; color: AnnotationColor; created_at: string }): Annotation => ({
  id: row.id,
  location: row.location,
  text: row.text,
  note: row.note,
  color: row.color,
  createdAt: row.created_at,
})
const toBookmark = (row: { id: number; location: ReaderLocation; label: string; created_at: string }): Bookmark => ({
  id: row.id,
  location: row.location,
  label: row.label,
  createdAt: row.created_at,
})

/** Libros que tienen libro electrónico en este navegador: { isbn: 'epub' | 'pdf' }. Si falla, ninguno. */
export async function fetchEbooks(): Promise<Record<string, EbookFormat>> {
  try {
    return await listEbooks(await currentUserId())
  } catch (error) {
    console.warn('[lector] No se pudo saber qué libros tienen libro electrónico:', (error as Error).message)
    return {}
  }
}

/** Archivo del libro electrónico (EPUB o PDF) como ArrayBuffer (los bytes del archivo). */
export const fetchEbookFile = async (isbn: string): Promise<ArrayBuffer> => (await getEbook(await currentUserId(), isbn)).arrayBuffer()

/** Guarda en este navegador el PDF o EPUB de un libro y devuelve su formato (error si no es un PDF o EPUB). */
export const saveEbookFile = async (isbn: string, file: File): Promise<EbookFormat> => saveEbook(await currentUserId(), isbn, file)

/** Quita de este navegador el PDF o EPUB de un libro. */
export const removeEbookFile = async (isbn: string): Promise<void> => deleteEbook(await currentUserId(), isbn)

/** Por dónde se iba leyendo, los subrayados y los marcadores (en orden de creación). */
export async function fetchReaderData(isbn: string): Promise<ReaderData> {
  const [state, annotations, bookmarks] = await Promise.all([
    supabase.from('book_state').select('reading_position').eq('isbn', isbn).maybeSingle(),
    supabase.from('annotations').select('id, location, text, note, color, created_at').eq('isbn', isbn).order('id'),
    supabase.from('bookmarks').select('id, location, label, created_at').eq('isbn', isbn).order('id'),
  ])
  return {
    position: check(state)?.reading_position ?? null,
    annotations: check(annotations).map(toAnnotation),
    bookmarks: check(bookmarks).map(toBookmark),
  }
}

/** Cuánto se lleva leído: { progress: { isbn: 0 a 1 }, pages: { isbn: página escrita a mano }, lastRead }. */
export interface ReadingProgress {
  progress: Record<string, number>
  pages: Record<string, number>
  lastRead: string | null
}

/** Cuánto se lleva leído de cada libro, las páginas escritas a mano y el último leído. Si falla, nada. */
export async function fetchProgress(): Promise<ReadingProgress> {
  try {
    const rows = check(await supabase.from('book_state').select('isbn, reading_progress, current_page, read_at'))
    const last = rows.filter((row) => row.read_at).sort((a, b) => (a.read_at < b.read_at ? 1 : -1))[0]
    return {
      progress: Object.fromEntries(rows.filter((row) => row.reading_progress !== null).map((row) => [row.isbn, row.reading_progress])),
      pages: Object.fromEntries(rows.filter((row) => row.current_page !== null).map((row) => [row.isbn, row.current_page])),
      lastRead: last?.isbn ?? null,
    }
  } catch (error) {
    console.warn('[lector] No se pudo saber cuánto se lleva leído:', (error as Error).message)
    return { progress: {}, pages: {}, lastRead: null }
  }
}

/** Todas las frases subrayadas en el lector (para pegarlas en el corcho), de la más nueva a la más antigua */
export const fetchHighlights = async (): Promise<Highlight[]> =>
  check(await supabase.from('annotations').select('id, isbn, text').order('id', { ascending: false }))

/** Guarda la página por la que se va (escrita a mano en el panel del libro) y, si se sabe cuántas tiene, cuánto se lleva. */
export async function saveCurrentPage(isbn: string, page: number): Promise<void> {
  const pages = getBooks().find((book) => book.isbn === isbn)?.pages
  if (!Number.isInteger(page) || page < 0 || (pages && page > pages)) throw new Error('Página no válida')
  // upsert: un libro recién añadido aún puede no tener su fila (solo cambian estas columnas)
  check(await supabase.from('book_state').upsert({ user_id: await currentUserId(), isbn, current_page: page, ...(pages ? { reading_progress: page / pages } : {}) }))
}

/** Guarda por dónde se va leyendo y cuánto se lleva (si falla solo se avisa: no es un dato que se pierda de forma grave). */
export async function saveReadingPosition(isbn: string, location: ReaderLocation, progress: number): Promise<void> {
  try {
    check(await supabase.from('book_state').upsert({ user_id: await currentUserId(), isbn, reading_position: location, reading_progress: progress, read_at: new Date().toISOString() }))
  } catch (error) {
    console.warn('[lector] No se pudo guardar la posición de lectura:', (error as Error).message)
  }
}

/** Crea un subrayado y lo devuelve con su id. */
export const createAnnotation = async (
  isbn: string,
  annotation: { location: ReaderLocation; text: string; color: AnnotationColor; note?: string | null }
): Promise<Annotation> =>
  toAnnotation(check(await supabase.from('annotations').insert({ isbn, ...annotation, text: annotation.text.trim() }).select().single()))

/** Cambia el comentario y/o el color de un subrayado. */
export const updateAnnotation = async (id: number, changes: { note?: string | null; color?: AnnotationColor }): Promise<Annotation> =>
  toAnnotation(check(await supabase.from('annotations').update(changes).eq('id', id).select().single()))

/** Guarda un marcador y lo devuelve con su id. */
export const createBookmark = async (isbn: string, bookmark: { location: ReaderLocation; label: string }): Promise<Bookmark> =>
  toBookmark(check(await supabase.from('bookmarks').insert({ isbn, location: bookmark.location, label: bookmark.label.trim() }).select().single()))

/** Borra un marcador. */
export const deleteBookmark = async (id: number): Promise<void> => {
  check(await supabase.from('bookmarks').delete().eq('id', id))
}

/** Borra un subrayado. */
export const deleteAnnotation = async (id: number): Promise<void> => {
  check(await supabase.from('annotations').delete().eq('id', id))
}
