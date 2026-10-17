// Estado de la biblioteca (sitio de los libros, libros de frente y estados de lectura): se guarda en la base de datos
// SQLite a través de la API (/api) y, como copia de seguridad, en localStorage, por si el servidor no está disponible.

const READING_STATUSES = ['finished', 'reading', 'unread']
// Claves de localStorage y rutas de la API de cada parte
const PARTS = {
  placements: { key: 'fantasy-bookroom:book-placements', route: '/api/placements' },
  flipped: { key: 'fantasy-bookroom:flipped-books', route: '/api/flipped' },
  readingStatus: { key: 'fantasy-bookroom:reading-status', route: '/api/reading-status' },
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

// Deja solo datos con la forma esperada (lo de localStorage puede venir viejo o roto); los sitios los valida la sala
function sanitize(library) {
  const placements = isPlainObject(library?.placements) ? library.placements : {}
  const flipped = Array.isArray(library?.flipped) ? library.flipped.filter((isbn) => typeof isbn === 'string') : []
  const readingStatus = isPlainObject(library?.readingStatus)
    ? Object.fromEntries(Object.entries(library.readingStatus).filter(([, status]) => READING_STATUSES.includes(status)))
    : {}
  return { placements, flipped, readingStatus }
}

function readLocal() {
  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      return null
    }
  }
  return sanitize({
    placements: read(PARTS.placements.key),
    flipped: read(PARTS.flipped.key),
    readingStatus: read(PARTS.readingStatus.key),
  })
}

const isEmpty = (library) =>
  Object.keys(library.placements).length === 0 && library.flipped.length === 0 && Object.keys(library.readingStatus).length === 0

/**
 * Guarda una parte del estado ('placements' | 'flipped' | 'readingStatus') en la base de datos y en localStorage.
 * Si el servidor falla se avisa en la consola y queda la copia del navegador.
 */
export function saveLibraryPart(part, value) {
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
    .catch((error) => console.warn(`[biblioteca] No se pudo guardar ${part} en la base de datos:`, error.message))
}

/**
 * Carga el estado de la biblioteca: de la base de datos o, si el servidor no responde, de la copia del navegador.
 * La primera vez con base de datos (vacía), sube lo que hubiera guardado en el navegador para no perderlo.
 */
export async function loadLibrary() {
  const local = readLocal()
  try {
    const response = await fetch('/api/state')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const remote = sanitize(await response.json())
    if (isEmpty(remote) && !isEmpty(local)) {
      await Promise.all(Object.keys(PARTS).map((part) => saveLibraryPart(part, local[part])))
      return local
    }
    return remote
  } catch (error) {
    console.warn('[biblioteca] Sin base de datos; se usa lo guardado en el navegador:', error.message)
    return local
  }
}
