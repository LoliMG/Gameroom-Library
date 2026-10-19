// Llamadas a la API del lector de libros electrónicos (servidor de desarrollo con la base de datos SQLite)

async function request(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  return response
}

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** Libros que tienen libro electrónico: { isbn: 'epub' | 'pdf' }. Sin servidor, ninguno. */
export async function fetchEbooks() {
  try {
    return await (await request('/api/ebooks')).json()
  } catch (error) {
    console.warn('[lector] No se pudo saber qué libros tienen libro electrónico:', error.message)
    return {}
  }
}

/** Archivo del libro electrónico (EPUB o PDF) como ArrayBuffer. */
export const fetchEbookFile = async (isbn) => (await request(`/api/ebooks/${isbn}`)).arrayBuffer()

/** Por dónde se iba leyendo, los subrayados y los marcadores: { position, annotations, bookmarks }. */
export const fetchReaderData = async (isbn) => (await request(`/api/reader/${isbn}`)).json()

/** Guarda por dónde se va leyendo (si falla solo se avisa: no es un dato que se pierda de forma grave). */
export function saveReadingPosition(isbn, location) {
  return request(`/api/reader/${isbn}/position`, json('PUT', location)).catch((error) =>
    console.warn('[lector] No se pudo guardar la posición de lectura:', error.message)
  )
}

/** Crea un subrayado ({ location, text, color, note? }) y lo devuelve con su id. */
export const createAnnotation = async (isbn, annotation) =>
  (await request(`/api/reader/${isbn}/annotations`, json('POST', annotation))).json()

/** Cambia el comentario y/o el color de un subrayado. */
export const updateAnnotation = async (id, changes) => (await request(`/api/annotations/${id}`, json('PATCH', changes))).json()

/** Guarda un marcador ({ location, label }) y lo devuelve con su id. */
export const createBookmark = async (isbn, bookmark) =>
  (await request(`/api/reader/${isbn}/bookmarks`, json('POST', bookmark))).json()

/** Borra un marcador. */
export const deleteBookmark = (id) => request(`/api/bookmarks/${id}`, { method: 'DELETE' })

/** Borra un subrayado. */
export const deleteAnnotation = (id) => request(`/api/annotations/${id}`, { method: 'DELETE' })
