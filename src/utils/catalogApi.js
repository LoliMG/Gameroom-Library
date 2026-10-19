// Llamadas a la API para añadir libros a la colección desde la consola (servidor de desarrollo)

/** Formatos de libro y su nombre en la consola */
export const FORMAT_LABELS = { book: 'Novela', manga: 'Manga' }

async function request(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}

/** Libros que coinciden con un ISBN o un título: [{ isbn, title, author, publisher, pages, coverUrl, format, saga, saga_index, source }] */
export const searchCatalog = (query) => request(`/api/catalog/search?q=${encodeURIComponent(query)}`)

/** Añade un libro de la búsqueda a la colección (el servidor guarda su portada y sus datos) */
export const addBookToCollection = (book) =>
  request('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) })

/** Guarda la sinopsis de un libro de la colección (texto vacío = quitarla); devuelve { isbn, synopsis } */
export const saveSynopsis = (isbn, synopsis) =>
  request(`/api/books/${isbn}/synopsis`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synopsis }) })
