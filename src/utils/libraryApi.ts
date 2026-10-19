// Estado de la biblioteca (sitio de los libros, libros de frente, estados de lectura, etiquetas, lista de deseos y
// ajustes): se guarda en la base de datos
// SQLite a través de la API (/api, la sirve server/library.ts con el servidor de Vite) y, como copia de seguridad, en
// localStorage, por si el servidor no está disponible.
import type { AppSettings, LibraryState, ReadingStatus, WishItem } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const READING_STATUSES: ReadingStatus[] = ['finished', 'reading', 'unread']

/** Cada parte del estado se guarda por separado */
export type LibraryPart = keyof LibraryState

// Claves de localStorage y rutas de la API de cada parte
const PARTS: Record<LibraryPart, { key: string; route: string }> = {
  placements: { key: 'fantasy-bookroom:book-placements', route: '/api/placements' },
  flipped: { key: 'fantasy-bookroom:flipped-books', route: '/api/flipped' },
  readingStatus: { key: 'fantasy-bookroom:reading-status', route: '/api/reading-status' },
  tags: { key: 'fantasy-bookroom:tags', route: '/api/tags' },
  wishlist: { key: 'fantasy-bookroom:wishlist', route: '/api/wishlist' },
  settings: { key: 'fantasy-bookroom:settings', route: '/api/settings' },
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Deja solo datos con la forma esperada (lo de localStorage puede venir viejo o roto); los sitios los valida la sala
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
  // La lista de deseos y los ajustes los vuelve a comprobar el servidor al guardarlos
  const wishlist = Array.isArray(library?.wishlist)
    ? library.wishlist.filter((item): item is WishItem => isPlainObject(item) && typeof item.isbn === 'string' && typeof item.title === 'string')
    : []
  const settings: AppSettings =
    isPlainObject(library?.settings) && typeof library.settings.city === 'string' && typeof library.settings.latitude === 'number' && typeof library.settings.longitude === 'number'
      ? (library.settings as unknown as AppSettings)
      : DEFAULT_SETTINGS
  return { placements, flipped, readingStatus, tags, wishlist, settings }
}

function readLocal(): LibraryState {
  const read = (key: string): unknown => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      return null
    }
  }
  return sanitize(Object.fromEntries((Object.keys(PARTS) as LibraryPart[]).map((part) => [part, read(PARTS[part].key)])))
}

// ¿Base de datos sin nada guardado aún? (las etiquetas, la lista de deseos y los ajustes son nuevos: no cuentan)
const isEmpty = (library: LibraryState) =>
  Object.keys(library.placements).length === 0 && library.flipped.length === 0 && Object.keys(library.readingStatus).length === 0

/**
 * Guarda una parte del estado en la base de datos y en localStorage.
 * Si el servidor falla se avisa en la consola y queda la copia del navegador.
 *
 * @param part - 'placements' | 'flipped' | 'readingStatus'
 * @param value - El valor completo de esa parte (sustituye al guardado)
 */
export function saveLibraryPart<P extends LibraryPart>(part: P, value: LibraryState[P]): Promise<void> {
  try {
    localStorage.setItem(PARTS[part].key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento en el navegador: queda la base de datos
  }
  return fetch(PARTS[part].route, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    })
    .catch((error: Error) => console.warn(`[biblioteca] No se pudo guardar ${part} en la base de datos:`, error.message))
}

/**
 * Carga el estado de la biblioteca: de la base de datos o, si el servidor no responde, de la copia del navegador.
 * La primera vez con base de datos (vacía), sube lo que hubiera guardado en el navegador para no perderlo.
 */
export async function loadLibrary(): Promise<LibraryState> {
  const local = readLocal()
  try {
    const response = await fetch('/api/state')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const remote = sanitize(await response.json())
    if (isEmpty(remote) && !isEmpty(local)) {
      await Promise.all((Object.keys(PARTS) as LibraryPart[]).map((part) => saveLibraryPart(part, local[part])))
      return local
    }
    return remote
  } catch (error) {
    console.warn('[biblioteca] Sin base de datos; se usa lo guardado en el navegador:', (error as Error).message)
    return local
  }
}
