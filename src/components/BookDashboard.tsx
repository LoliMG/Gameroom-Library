// Búsqueda, filtro y selección del panel de la biblioteca, y sus pantallas: añadir, editar, lista de deseos y ajustes
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppSettings, Book, CatalogBook, Reading, ReadingStatus, WishItem } from '@/types'
import { FAVORITE_TAG, READING_LABELS } from '@/types'
import AddBookPanel from '@/components/AddBookPanel'
import BookEditForm from '@/components/BookEditForm'
import WishlistPanel from '@/components/WishlistPanel'
import SettingsPanel from '@/components/SettingsPanel'
import DiaryPanel from '@/components/DiaryPanel'
import { normalize } from '@/utils/normalize'
import '@/styles/bookDashboard.css'

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
  /** Retos de lectura por año */
  goals: Record<string, number>
  onSetGoal: (year: string, count: number) => void
  /** Lecturas del diario (null = cargando) y error al cargarlas; onReadingsChange las vuelve a pedir tras cambiarlas */
  readings: Reading[] | null
  readingsError: string | null
  onReadingsChange: () => void
}

// Pantalla de la consola: portadas, añadir libro, diario, lista de deseos o ajustes (editar va aparte: editingIsbn)
type View = 'books' | 'add' | 'diary' | 'wishlist' | 'settings'

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
  const { tags, onSetTags, wishlist, onSetWishlist, settings, onSetSettings, goals, onSetGoal, readings, readingsError, onReadingsChange } = collection
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [view, setView] = useState<View>('books')
  const [editingIsbn, setEditingIsbn] = useState<string | null>(null)
  const [selected, setSelected] = useState(() => new Set<string>())
  // Menú desplegable del tipo de libro (Todos, Mangas, Novelas): se cierra al elegir, al pulsar fuera o con Esc
  const [typesOpen, setTypesOpen] = useState(false)
  const typesRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!typesOpen) return
    const onPointerDown = (event: PointerEvent) => !typesRef.current?.contains(event.target as Node) && setTypesOpen(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setTypesOpen(false)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [typesOpen])
  // "Elige por mí": libro sin leer propuesto al azar (brilla en azul en la estantería), o 'none' si no queda ninguno
  const [suggestion, setSuggestion] = useState<Book | 'none' | null>(null)
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

  // "Elige por mí": un libro sin leer al azar (si hay más de uno, distinto del que se acaba de proponer); se enseña en la
  // consola y brilla en azul en su estantería
  const pickForMe = () => {
    const previous = suggestion && suggestion !== 'none' ? suggestion.isbn : null
    const unread = books.filter((book) => statusOf(book) === 'unread')
    const options = unread.length > 1 ? unread.filter((book) => book.isbn !== previous) : unread
    const book = options[Math.floor(Math.random() * options.length)]
    setView('books')
    setEditingIsbn(null)
    setSuggestion(book ?? 'none')
    if (book) onLocateBook(book)
  }

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
        <button type="button" className="dashboard-action is-quiet" onClick={pickForMe} title="Te propongo un libro sin leer al azar">
          🎲 Elige por mí
        </button>
        <button type="button" className="dashboard-action" aria-pressed={view === 'add'} onClick={() => setView(view === 'add' ? 'books' : 'add')}>
          Añadir libro
        </button>
        <button
          type="button"
          className="dashboard-action is-quiet is-icon"
          aria-pressed={view === 'diary'}
          aria-label="Diario de lecturas"
          title="Diario de lecturas"
          onClick={() => setView(view === 'diary' ? 'books' : 'diary')}
        >
          📖
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
      {!editingBook && view === 'diary' && <DiaryPanel books={books} onSetStatus={onSetStatus} goals={goals} onSetGoal={onSetGoal} readings={readings} error={readingsError} onReadingsChange={onReadingsChange} />}

      {!editingBook && view === 'books' && (
        <>
          {/* Libro propuesto por "Elige por mí" */}
          {suggestion === 'none' && (
            <p className="dashboard-suggestion" role="status">
              No te queda ningún libro sin leer. ¡Enhorabuena!
              <button type="button" className="dashboard-action is-quiet" onClick={() => setSuggestion(null)}>
                Cerrar
              </button>
            </p>
          )}
          {suggestion && suggestion !== 'none' && (
            <div className="dashboard-suggestion" role="status">
              <img src={suggestion.cover} alt="" />
              <div>
                <span>Te propongo leer…</span>
                <strong>{suggestion.title}</strong>
                <small>{suggestion.author} · brilla en azul en su estantería</small>
              </div>
              <button type="button" className="dashboard-action" onClick={() => onOpenBook(suggestion)}>
                Ver ficha
              </button>
              <button type="button" className="dashboard-action is-quiet" onClick={pickForMe}>
                Otro
              </button>
              <button type="button" className="dashboard-action is-quiet is-icon" aria-label="Cerrar la propuesta" onClick={() => setSuggestion(null)}>
                ×
              </button>
            </div>
          )}

          <input
            type="search"
            className="dashboard-search"
            placeholder="Buscar por título, autor, editorial o saga…"
            aria-label="Buscar libros"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {/* Filtros en una fila: estado de lectura, tipo y etiquetas (la estrella, los favoritos) */}
          <div className="dashboard-filterbar">
            <div className="dashboard-segmented" role="group" aria-label="Filtrar por estado de lectura">
              {FILTERS.map(({ value, label }) => (
                <button key={value} type="button" className="dashboard-filter" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {label} <span className="dashboard-count">{counts[value]}</span>
                </button>
              ))}
            </div>
            <div className="dashboard-type" ref={typesRef}>
              <button
                type="button"
                className="dashboard-filter"
                aria-haspopup="menu"
                aria-expanded={typesOpen}
                aria-pressed={formatFilter !== 'all'}
                onClick={() => setTypesOpen(!typesOpen)}
              >
                {formatFilter === 'all' ? 'Tipo' : FORMAT_FILTERS.find(({ value }) => value === formatFilter)!.label} ▾
              </button>
              {typesOpen && (
                <div className="dashboard-type-menu" role="menu" aria-label="Filtrar por tipo de libro">
                  {FORMAT_FILTERS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={formatFilter === value}
                      onClick={() => {
                        setFormatFilter(value)
                        setTypesOpen(false)
                      }}
                    >
                      {label} <span className="dashboard-count">{formatCounts[value]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
