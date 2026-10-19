// Búsqueda, filtro y selección del panel de la biblioteca, y sus pantallas: añadir, editar, lista de deseos y ajustes
import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppSettings, Book, CatalogBook, ReadingStatus, WishItem } from '@/types'
import { FAVORITE_TAG } from '@/types'
import AddBookPanel from '@/components/AddBookPanel'
import BookEditForm from '@/components/BookEditForm'
import WishlistPanel from '@/components/WishlistPanel'
import SettingsPanel from '@/components/SettingsPanel'
import '@/styles/bookDashboard.css'

// Estados de lectura (mismas claves que guarda App): etiqueta para filtros, botones e insignias
const READING_LABELS: Record<ReadingStatus, string> = { finished: 'Acabado', reading: 'Leyendo', unread: 'Sin leer' }
// Filtros: todos o uno de los estados
type StatusFilter = ReadingStatus | 'all'
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'finished', label: 'Acabados' },
  { value: 'reading', label: 'Leyendo' },
  { value: 'unread', label: 'Sin leer' },
]
// Filtro por tipo: manga o novela (las de bolsillo cuentan como novelas)
type FormatGroup = 'manga' | 'novel'
type FormatFilter = FormatGroup | 'all'
const FORMAT_FILTERS: { value: FormatFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'manga', label: 'Mangas' },
  { value: 'novel', label: 'Novelas' },
]
const formatGroup = (book: Book): FormatGroup => (book.format === 'manga' ? 'manga' : 'novel')

/** Etiquetas, lista de deseos y ajustes: los guarda App como el resto del estado de la biblioteca */
export interface CollectionTools {
  tags: Record<string, string[]>
  /** Sustituye las etiquetas de un libro (lista vacía = sin etiquetas) */
  onSetTags: (isbn: string, tags: string[]) => void
  wishlist: WishItem[]
  /** Como el setState de React: acepta la lista nueva o una función que la calcula a partir de la actual */
  onSetWishlist: Dispatch<SetStateAction<WishItem[]>>
  settings: AppSettings
  onSetSettings: (settings: AppSettings) => void
}

// Pantalla de la consola: portadas, añadir libro, lista de deseos o ajustes (editar va aparte: editingIsbn)
type View = 'books' | 'add' | 'wishlist' | 'settings'

// Búsqueda sin distinguir mayúsculas ni tildes ("idhun" encuentra "Idhún")
const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Panel de control de la biblioteca: todas las portadas, búsqueda por título o autor, filtros por estado de lectura
 * y por tipo (manga o novela), selección de varios libros para cambiarles el estado de una vez y alta de libros nuevos.
 * Pulsar una portada abre el panel del libro.
 *
 */
interface BookDashboardProps {
  books: Book[]
  /** Estado por ISBN ('finished' | 'reading'; sin entrada = sin leer) */
  readingStatus: Record<string, ReadingStatus>
  /** Cambia el estado de esos libros */
  onSetStatus: (isbns: string[], status: ReadingStatus) => void
  /** Abre el panel de detalle del libro */
  onOpenBook: (book: Book) => void
  /** Hace brillar el libro en azul en su estantería (deja de brillar al pulsarlo) */
  onLocateBook: (book: Book) => void
  collection: CollectionTools
}

function BookDashboard({ books, readingStatus, onSetStatus, onOpenBook, onLocateBook, collection }: BookDashboardProps) {
  const { tags, onSetTags, wishlist, onSetWishlist, settings, onSetSettings } = collection
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [view, setView] = useState<View>('books')
  const [editingIsbn, setEditingIsbn] = useState<string | null>(null)
  const [selected, setSelected] = useState(() => new Set<string>())
  const editingBook = books.find((book) => book.isbn === editingIsbn) ?? null

  // Etiquetas que se usan en la colección, para filtrar: favoritos primero y el resto por orden alfabético
  const allTags = useMemo(() => {
    const used = new Set(Object.values(tags).flat())
    used.delete(FAVORITE_TAG)
    return [FAVORITE_TAG, ...[...used].sort((a, b) => a.localeCompare(b, 'es'))]
  }, [tags])
  const isFavorite = (book: Book) => tags[book.isbn]?.includes(FAVORITE_TAG) ?? false
  const toggleFavorite = (book: Book) => {
    const current = tags[book.isbn] ?? []
    onSetTags(book.isbn, isFavorite(book) ? current.filter((tag) => tag !== FAVORITE_TAG) : [FAVORITE_TAG, ...current])
  }
  const wishedIsbns = useMemo(() => new Set(wishlist.map((item) => item.isbn)), [wishlist])
  const addWish = ({ isbn, title, author, publisher, pages, coverUrl, format }: CatalogBook) =>
    onSetWishlist((list) => [...list, { isbn, title, author, publisher, pages, coverUrl, format }])
  // Título "Mi biblioteca": vuelve a la pantalla de inicio (todas las portadas, sin búsqueda ni filtros)
  const goHome = () => {
    setView('books')
    setEditingIsbn(null)
    setQuery('')
    setFilter('all')
    setFormatFilter('all')
    setTagFilter(null)
  }

  const statusOf = (book: Book) => readingStatus[book.isbn] ?? 'unread'

  // Cuántos libros hay en cada estado (para las pestañas)
  const counts = useMemo(() => {
    const result = { all: books.length, finished: 0, reading: 0, unread: 0 }
    books.forEach((book) => result[readingStatus[book.isbn] ?? 'unread']++)
    return result
  }, [books, readingStatus])
  const formatCounts = useMemo(() => {
    const result = { all: books.length, manga: 0, novel: 0 }
    books.forEach((book) => result[formatGroup(book)]++)
    return result
  }, [books])
  const ownedIsbns = useMemo(() => new Set(books.map((book) => book.isbn)), [books])

  const visibleBooks = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return books.filter((book) => {
      if (filter !== 'all' && (readingStatus[book.isbn] ?? 'unread') !== filter) return false
      if (formatFilter !== 'all' && formatGroup(book) !== formatFilter) return false
      if (tagFilter && !tags[book.isbn]?.includes(tagFilter)) return false
      const text = normalize(`${book.title} ${book.author} ${book.publisher} ${book.saga ?? ''}`)
      return words.every((word) => text.includes(word))
    })
  }, [books, readingStatus, query, filter, formatFilter, tagFilter, tags])

  const toggleSelected = (isbn: string) =>
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
  const applyStatus = (status: ReadingStatus) => {
    onSetStatus([...selected], status)
    setSelected(new Set())
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2 className="dashboard-title">
          <button type="button" onClick={goHome} title="Volver al inicio">
            Mi biblioteca
          </button>
        </h2>
        <input
          type="search"
          className="dashboard-search"
          placeholder="Buscar por título, autor o editorial…"
          aria-label="Buscar libros"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="dashboard-action" aria-pressed={view === 'add'} onClick={() => setView(view === 'add' ? 'books' : 'add')}>
          Añadir libro
        </button>
        <button
          type="button"
          className="dashboard-action is-quiet is-icon"
          aria-pressed={view === 'wishlist'}
          aria-label={`Lista de deseos (${wishlist.length})`}
          title={`Lista de deseos (${wishlist.length})`}
          onClick={() => setView(view === 'wishlist' ? 'books' : 'wishlist')}
        >
          ♡
        </button>
        <button
          type="button"
          className="dashboard-action is-quiet is-icon"
          aria-pressed={view === 'settings'}
          aria-label="Ajustes"
          title="Ajustes"
          onClick={() => setView(view === 'settings' ? 'books' : 'settings')}
        >
          ⚙
        </button>
      </header>

      {editingBook && (
        <BookEditForm key={editingBook.isbn} book={editingBook} tags={tags[editingBook.isbn] ?? []} onSetTags={onSetTags} onDone={() => setEditingIsbn(null)} />
      )}
      {!editingBook && view === 'add' && (
        <AddBookPanel ownedIsbns={ownedIsbns} wishedIsbns={wishedIsbns} onWish={addWish} onClose={() => setView('books')} />
      )}
      {!editingBook && view === 'wishlist' && <WishlistPanel wishlist={wishlist} onSetWishlist={onSetWishlist} onSearch={() => setView('add')} />}
      {!editingBook && view === 'settings' && <SettingsPanel settings={settings} onSetSettings={onSetSettings} />}

      {!editingBook && view === 'books' && (
        <>
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

          <div className="dashboard-filters is-format" role="group" aria-label="Filtrar por tipo de libro">
            {FORMAT_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className="dashboard-filter"
                aria-pressed={formatFilter === value}
                onClick={() => setFormatFilter(value)}
              >
                {label} <span className="dashboard-count">{formatCounts[value]}</span>
              </button>
            ))}
            {/* Etiquetas en la misma fila: la estrella filtra los favoritos */}
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="dashboard-filter is-tag"
                aria-pressed={tagFilter === tag}
                aria-label={tag === FAVORITE_TAG ? 'Ver solo los favoritos' : `Ver solo los libros con la etiqueta ${tag}`}
                title={tag === FAVORITE_TAG ? 'Favoritos' : tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                {tag === FAVORITE_TAG ? '★' : tag}
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
                {/* Object.entries pierde el tipo de las claves (las da como string): se recupera con "as" */}
                {(Object.entries(READING_LABELS) as [ReadingStatus, string][]).map(([value, label]) => (
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
                    <button
                      type="button"
                      className={`dashboard-card-star${isFavorite(book) ? ' is-on' : ''}`}
                      aria-pressed={isFavorite(book)}
                      aria-label={`${isFavorite(book) ? 'Quitar de favoritos' : 'Marcar como favorito'}: ${book.title}`}
                      title={isFavorite(book) ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      onClick={() => toggleFavorite(book)}
                    >
                      {isFavorite(book) ? '★' : '☆'}
                    </button>
                    <button type="button" className="dashboard-card-open" onClick={() => onOpenBook(book)}>
                      <img src={book.cover} alt="" className="dashboard-cover" />
                      <span className="dashboard-card-title">{book.title}</span>
                      <span className={`dashboard-badge status-${status}`}>{READING_LABELS[status]}</span>
                    </button>
                    {/* Iconos junto al estado de lectura: localizar en la sala (diana) y editar (lápiz) */}
                    <div className="dashboard-card-actions">
                      <button type="button" onClick={() => onLocateBook(book)} aria-label={`Localizar ${book.title} en la sala`} title="Localizar en la sala">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="7" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setEditingIsbn(book.isbn)} aria-label={`Editar ${book.title}`} title="Editar">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16z" />
                          <path d="M14 6l4 4" />
                        </svg>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default BookDashboard
