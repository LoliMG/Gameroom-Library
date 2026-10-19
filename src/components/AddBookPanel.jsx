// Añadir libros a la colección desde la consola: se busca por ISBN o título (Open Library y, con clave, Google Books)
// y se pulsa el resultado que es; si no aparece, se añade a mano. El servidor guarda la portada y los datos, y la sala
// coloca el libro nuevo en un hueco libre sin recargar la página (ver Experience).
import { useState } from 'react'
import { searchCatalog, addBookToCollection, FORMAT_LABELS } from '@/utils/catalogApi'
import ManualBookForm from '@/components/ManualBookForm'

/**
 * @param {Set<string>} ownedIsbns - ISBN de los libros que ya están en la colección
 * @param {Function} onClose - Vuelve a las portadas de la colección
 */
function AddBookPanel({ ownedIsbns, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = aún no se ha buscado
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [formats, setFormats] = useState({}) // Formato elegido por ISBN (si se cambia el que se adivinó)
  const [adding, setAdding] = useState({}) // Por ISBN: 'adding' | 'added' | mensaje de error
  const [manual, setManual] = useState(false) // ¿Formulario para añadirlo a mano?

  async function search(event) {
    event.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchCatalog(query.trim()))
    } catch (searchError) {
      setError(searchError.message)
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  async function add(book) {
    setAdding((current) => ({ ...current, [book.isbn]: 'adding' }))
    try {
      await addBookToCollection({ ...book, format: formats[book.isbn] ?? book.format })
      setAdding((current) => ({ ...current, [book.isbn]: 'added' }))
    } catch (addError) {
      setAdding((current) => ({ ...current, [book.isbn]: addError.message }))
    }
  }

  if (manual) {
    // Si lo último que se buscó era un ISBN, el formulario empieza con él
    const searchedIsbn = /^[\d\s-]{9,16}[\dX]$/i.test(query.trim()) ? query.trim() : ''
    return (
      <section className="add-book" aria-label="Añadir un libro">
        <ManualBookForm initialIsbn={searchedIsbn} onCancel={() => setManual(false)} />
      </section>
    )
  }

  return (
    <section className="add-book" aria-label="Añadir un libro">
      <form className="add-book-form" onSubmit={search}>
        <input
          type="search"
          className="dashboard-search"
          placeholder="ISBN o título del libro…"
          aria-label="ISBN o título del libro"
          maxLength={200}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="dashboard-action" disabled={searching}>
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
        <button type="button" className="dashboard-action is-quiet" onClick={() => setManual(true)}>
          Añadir a mano
        </button>
        <button type="button" className="dashboard-action is-quiet" onClick={onClose}>
          Volver
        </button>
      </form>

      {error && (
        <p className="add-book-message is-error" role="alert">
          {error}
        </p>
      )}
      {results?.length === 0 && (
        <p className="add-book-message">
          No se ha encontrado ningún libro con portada.{' '}
          <button type="button" className="add-book-link" onClick={() => setManual(true)}>
            Añádelo a mano
          </button>
        </p>
      )}

      {results?.length > 0 && (
        <ul className="add-book-results">
          {results.map((book) => {
            const state = adding[book.isbn]
            const owned = ownedIsbns.has(book.isbn) || state === 'added'
            return (
              <li key={book.isbn} className="add-book-result">
                <img src={book.coverUrl} alt="" className="add-book-cover" loading="lazy" />
                <div className="add-book-info">
                  <strong>{book.title}</strong>
                  <span>{book.author ?? 'Autor desconocido'}</span>
                  <span className="add-book-meta">
                    {[book.publisher, book.pages && `${book.pages} págs.`, `ISBN ${book.isbn}`, book.source].filter(Boolean).join(' · ')}
                  </span>
                  {book.saga && (
                    <span className="add-book-meta">
                      Saga: {book.saga}
                      {book.saga_index && ` (tomo ${book.saga_index})`}
                    </span>
                  )}
                  {state && state !== 'adding' && state !== 'added' && (
                    <span className="add-book-message is-error" role="alert">
                      {state}
                    </span>
                  )}
                  {state === 'added' && <span className="add-book-message">Añadido: ya está en el primer hueco libre de las estanterías.</span>}
                </div>
                <div className="add-book-actions">
                  <select
                    aria-label={`Formato de ${book.title}`}
                    value={formats[book.isbn] ?? book.format}
                    disabled={owned}
                    onChange={(event) => setFormats((current) => ({ ...current, [book.isbn]: event.target.value }))}
                  >
                    {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="dashboard-action" disabled={owned || state === 'adding'} onClick={() => add(book)}>
                    {owned ? 'En tu colección' : state === 'adding' ? 'Añadiendo…' : 'Añadir'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default AddBookPanel
