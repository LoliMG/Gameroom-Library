// Búsqueda, filtro y selección del panel de la biblioteca
import { useMemo, useState } from 'react'
import '@/styles/bookDashboard.css'

// Estados de lectura (mismas claves que guarda App): etiqueta para filtros, botones e insignias
const READING_LABELS = { finished: 'Acabado', reading: 'Leyendo', unread: 'Sin leer' }
// Filtros: todos o uno de los estados
const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'finished', label: 'Acabados' },
  { value: 'reading', label: 'Leyendo' },
  { value: 'unread', label: 'Sin leer' },
]

// Búsqueda sin distinguir mayúsculas ni tildes ("idhun" encuentra "Idhún")
const normalize = (text) => (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Panel de control de la biblioteca: todas las portadas, búsqueda por título o autor, filtro por estado de lectura
 * y selección de varios libros para cambiarles el estado de una vez. Pulsar una portada abre el panel del libro.
 *
 * @param {Array<Object>} books - Libros (con isbn, title, author, cover)
 * @param {Object<string, string>} readingStatus - Estado por ISBN ('finished' | 'reading'; sin entrada = sin leer)
 * @param {Function} onSetStatus - (isbns, estado) cambia el estado de esos libros
 * @param {Function} onOpenBook - (libro) abre su panel de detalle
 */
function BookDashboard({ books, readingStatus, onSetStatus, onOpenBook }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(() => new Set())

  const statusOf = (book) => readingStatus[book.isbn] ?? 'unread'

  // Cuántos libros hay en cada estado (para las pestañas)
  const counts = useMemo(() => {
    const result = { all: books.length, finished: 0, reading: 0, unread: 0 }
    books.forEach((book) => result[readingStatus[book.isbn] ?? 'unread']++)
    return result
  }, [books, readingStatus])

  const visibleBooks = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return books.filter((book) => {
      if (filter !== 'all' && (readingStatus[book.isbn] ?? 'unread') !== filter) return false
      const text = normalize(`${book.title} ${book.author} ${book.publisher}`)
      return words.every((word) => text.includes(word))
    })
  }, [books, readingStatus, query, filter])

  const toggleSelected = (isbn) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(isbn)) next.delete(isbn)
      else next.add(isbn)
      return next
    })
  const allVisibleSelected = visibleBooks.length > 0 && visibleBooks.every((book) => selected.has(book.isbn))
  const toggleAllVisible = () =>
    setSelected((current) => {
      const next = new Set(current)
      visibleBooks.forEach((book) => (allVisibleSelected ? next.delete(book.isbn) : next.add(book.isbn)))
      return next
    })
  const applyStatus = (status) => {
    onSetStatus([...selected], status)
    setSelected(new Set())
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2 className="dashboard-title">Mi biblioteca</h2>
        <input
          type="search"
          className="dashboard-search"
          placeholder="Buscar por título, autor o editorial…"
          aria-label="Buscar libros"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>

      <div className="dashboard-filters" role="group" aria-label="Filtrar por estado de lectura">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="dashboard-filter"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label} <span className="dashboard-count">{counts[value]}</span>
          </button>
        ))}
      </div>

      {/* Barra de selección: marcar todos los visibles y cambiar el estado de los seleccionados */}
      <div className="dashboard-toolbar">
        <label className="dashboard-select-all">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
          Seleccionar visibles
        </label>
        {selected.size > 0 && (
          <div className="dashboard-bulk" role="group" aria-label="Cambiar estado de los seleccionados">
            <span>{selected.size} seleccionados →</span>
            {Object.entries(READING_LABELS).map(([value, label]) => (
              <button key={value} type="button" className={`dashboard-bulk-btn status-${value}`} onClick={() => applyStatus(value)}>
                {label}
              </button>
            ))}
            <button type="button" className="dashboard-bulk-clear" onClick={() => setSelected(new Set())}>
              Quitar selección
            </button>
          </div>
        )}
      </div>

      {visibleBooks.length === 0 ? (
        <p className="dashboard-empty">Ningún libro coincide con la búsqueda.</p>
      ) : (
        <ul className="dashboard-grid">
          {visibleBooks.map((book) => {
            const status = statusOf(book)
            const isSelected = selected.has(book.isbn)
            return (
              <li key={book.isbn} className={`dashboard-card${isSelected ? ' is-selected' : ''}`}>
                <input
                  type="checkbox"
                  className="dashboard-card-check"
                  aria-label={`Seleccionar ${book.title}`}
                  checked={isSelected}
                  onChange={() => toggleSelected(book.isbn)}
                />
                <button type="button" className="dashboard-card-open" onClick={() => onOpenBook(book)}>
                  <img src={book.cover} alt="" className="dashboard-cover" />
                  <span className="dashboard-card-title">{book.title}</span>
                  <span className={`dashboard-badge status-${status}`}>{READING_LABELS[status]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default BookDashboard
