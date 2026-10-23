// Estado de la biblioteca (sitio de los libros, libros de frente, estados de lectura, etiquetas, lista de deseos,
// ajustes, retos, pósters, pila y corcho) de la cuenta con la que se ha entrado, en Supabase:
// - lo de cada libro, en la tabla book_state (una fila por libro)
// - lo demás, en app_data (una fila por parte, con su valor en JSON)
// Las reglas RLS de la base de datos hacen que cada cuenta solo lea y escriba lo suyo.
import type { AppSettings, BoardItem, LibraryState, ReadingStatus, WishItem } from '@/types'
import { DEFAULT_SETTINGS, MAX_PILE, MAX_POSTERS, withDefaultSettings } from '@/types'
import { getBooks } from '@/data/books'
import { supabase } from '@/utils/supabase'

const READING_STATUSES: ReadingStatus[] = ['finished', 'reading', 'unread']

/** Cada parte del estado se guarda por separado */
export type LibraryPart = keyof LibraryState

// Partes que van en book_state (columnas de cada libro); las demás van en app_data
const BOOK_STATE_PARTS = ['placements', 'flipped', 'readingStatus'] as const
type BookStatePart = (typeof BOOK_STATE_PARTS)[number]

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Deja solo datos con la forma esperada (lo guardado puede venir de una versión antigua); los sitios los valida la sala
function sanitize(library: Partial<Record<LibraryPart, unknown>> | null | undefined): LibraryState {
  const placements = isPlainObject(library?.placements) ? (library.placements as LibraryState['placements']) : {}
  const flipped = Array.isArray(library?.flipped) ? library.flipped.filter((isbn): isbn is string => typeof isbn === 'string') : []
  const readingStatus = isPlainObject(library?.readingStatus)
    ? (Object.fromEntries(
        Object.entries(library.readingStatus).filter(([, status]) => READING_STATUSES.includes(status as ReadingStatus))
      ) as LibraryState['readingStatus'])
    : {}
  const tags = isPlainObject(library?.tags)
    ? (Object.fromEntries(
        Object.entries(library.tags).filter(([, list]) => Array.isArray(list) && list.every((tag) => typeof tag === 'string'))
      ) as LibraryState['tags'])
    : {}
  const wishlist = Array.isArray(library?.wishlist)
    ? library.wishlist.filter((item): item is WishItem => isPlainObject(item) && typeof item.isbn === 'string' && typeof item.title === 'string')
    : []
  const settings: AppSettings =
    isPlainObject(library?.settings) && typeof library.settings.city === 'string' && typeof library.settings.latitude === 'number' && typeof library.settings.longitude === 'number'
      ? withDefaultSettings(library.settings as Partial<AppSettings>)
      : DEFAULT_SETTINGS
  const goals = isPlainObject(library?.goals)
    ? (Object.fromEntries(Object.entries(library.goals).filter(([, count]) => Number.isInteger(count))) as LibraryState['goals'])
    : {}
  const posters = Array.isArray(library?.posters) ? library.posters.filter((isbn): isbn is string => typeof isbn === 'string').slice(0, MAX_POSTERS) : []
  const pile = Array.isArray(library?.pile) ? library.pile.filter((isbn): isbn is string => typeof isbn === 'string').slice(0, MAX_PILE) : []
  const board = Array.isArray(library?.board)
    ? library.board.filter((item): item is BoardItem => isPlainObject(item) && typeof item.id === 'string' && typeof item.x === 'number' && typeof item.y === 'number')
    : []
  return { placements, flipped, readingStatus, tags, wishlist, settings, goals, posters, pile, board }
}

/** Id de la cuenta con la que se ha entrado (la sala solo se monta con sesión) */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('No hay sesión')
  return data.session.user.id
}

// Filas de book_state con la columna de esa parte para cada libro de la sala (sustituye lo guardado: los libros que
// no están en la parte quedan sin sitio, de espaldas o sin leer)
function bookStateRows(userId: string, part: BookStatePart, value: LibraryState[BookStatePart]) {
  return getBooks().map(({ isbn }) => {
    if (part === 'placements') {
      const slot = (value as LibraryState['placements'])[isbn]
      return { user_id: userId, isbn, wall: slot?.wall ?? null, module: slot?.module ?? null, shelf: slot?.shelf ?? null, x: slot?.x ?? null }
    }
    if (part === 'flipped') return { user_id: userId, isbn, flipped: (value as string[]).includes(isbn) }
    return { user_id: userId, isbn, reading_status: (value as LibraryState['readingStatus'])[isbn] ?? 'unread' }
  })
}

/**
 * Guarda una parte del estado en Supabase. Si falla se avisa en la consola: el cambio sigue en la sala y se vuelve a
 * guardar entero con el siguiente cambio de esa parte.
 *
 * @param part - La parte del estado
 * @param value - El valor completo de esa parte (sustituye al guardado)
 */
export async function saveLibraryPart<P extends LibraryPart>(part: P, value: LibraryState[P]): Promise<void> {
  try {
    const userId = await currentUserId()
    const { error } = (BOOK_STATE_PARTS as readonly LibraryPart[]).includes(part)
      ? await supabase.from('book_state').upsert(bookStateRows(userId, part as BookStatePart, value as LibraryState[BookStatePart]))
      : await supabase.from('app_data').upsert({ user_id: userId, key: part, value })
    if (error) throw new Error(error.message)
  } catch (error) {
    console.warn(`[biblioteca] No se pudo guardar ${part}:`, (error as Error).message)
  }
}

/**
 * Carga el estado de la biblioteca de la cuenta. Lanza un error si Supabase falla (la sala no debe montarse con un
 * estado vacío: lo guardaría encima del bueno).
 */
export async function loadLibrary(): Promise<LibraryState> {
  const [states, data] = await Promise.all([
    supabase.from('book_state').select('isbn, reading_status, flipped, wall, module, shelf, x'),
    supabase.from('app_data').select('key, value'),
  ])
  if (states.error || data.error) throw new Error(`No se pudo cargar el estado de la biblioteca: ${(states.error ?? data.error)!.message}`)
  const library: Partial<Record<LibraryPart, unknown>> = Object.fromEntries(data.data.map((row) => [row.key, row.value]))
  const placements: LibraryState['placements'] = {}
  const flipped: string[] = []
  const readingStatus: LibraryState['readingStatus'] = {}
  for (const row of states.data) {
    // Con pared hay sitio guardado: las cuatro columnas se escriben juntas
    if (row.wall !== null) placements[row.isbn] = { wall: row.wall, module: row.module, shelf: row.shelf, x: row.x }
    if (row.flipped) flipped.push(row.isbn)
    if (row.reading_status !== 'unread') readingStatus[row.isbn] = row.reading_status
  }
  return sanitize({ ...library, placements, flipped, readingStatus })
}
