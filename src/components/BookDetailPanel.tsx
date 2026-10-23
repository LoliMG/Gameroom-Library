import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ChangeEvent, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Book, EbookFormat, ReadingStatus } from '@/types'
import { READING_LABELS } from '@/types'
import BookViewer from '@/components/BookViewer'
import { removeEbookFile, saveEbookFile } from '@/utils/readerApi'
import '@/styles/bookDetailPanel.css'

// Iconos de los botones del pie (trazos SVG: heredan el color del botón)
const ICONS = {
  // Ojo: ver el libro en grande
  view: (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Libro abierto: leerlo
  read: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </>
  ),
  // Flechas que giran: voltearlo en la estantería
  flip: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" />
    </>
  ),
  // Libros apilados: mandarlo a la pila "por leer"
  pile: (
    <>
      <rect x="3" y="15" width="18" height="5" rx="1" />
      <rect x="5" y="10" width="15" height="5" rx="1" />
      <rect x="4" y="5" width="16" height="5" rx="1" />
    </>
  ),
  // Flecha hacia una bandeja: añadir su PDF o EPUB
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  // Papelera: quitar su PDF o EPUB
  remove: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </>
  ),
  // Cuadro colgado de un clavo: póster sobre la chimenea
  poster: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="1" />
      <polyline points="8 7 12 3 16 7" />
      <polyline points="7 18 11 13 14 16 17 12" />
    </>
  ),
}

// Propiedades del botón de icono: las de un <button> normal (onClick, aria-pressed…) más el icono y su explicación
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: keyof typeof ICONS
  label: string
}

// Botón de icono con su explicación al pasar el puntero o al llegar con el teclado (la misma que lee el lector de
// pantalla)
function IconButton({ icon, label, className = '', ...props }: IconButtonProps) {
  return (
    <button type="button" className={`book-detail-icon-btn ${className}`} aria-label={label} data-tooltip={label} {...props}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </button>
  )
}

/**
 * Libro que se está leyendo: la página por la que se va (se guarda al pulsar Intro o al salir del campo) y el botón para
 * marcarlo como terminado. Con un key por libro, el borrador vuelve a la página guardada al cambiar de libro.
 */
function ReadingProgressForm({ book, page, onSetPage, onFinish }: { book: Book; page: number | undefined; onSetPage: (page: number) => void; onFinish: () => void }) {
  const [draft, setDraft] = useState(page === undefined ? '' : String(page))
  const total = book.pages ?? 0 // 0: no se sabe cuántas páginas tiene
  const save = (event?: FormEvent) => {
    event?.preventDefault()
    const value = Number(draft)
    // Vacío o fuera de rango: no se guarda (el campo ya limita, pero se puede escribir a mano)
    if (draft === '' || !Number.isInteger(value) || value < 0 || (total > 0 && value > total) || value === page) return
    onSetPage(value)
  }
  return (
    <form className="book-detail-progress" onSubmit={save}>
      <label>
        Voy por la página{' '}
        <input type="number" min={0} max={total || undefined} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => save()} />
        {total > 0 && ` de ${total}`}
      </label>
      <button type="button" className="book-detail-finish" onClick={onFinish}>
        ¡Terminado!
      </button>
    </form>
  )
}

/**
 * Panel con los datos del libro pulsado. El botón de volteo (abajo a la derecha) lo pone en la estantería
 * con la portada hacia la sala, o lo devuelve de canto con el lomo.
 *
 * Si el libro tiene su PDF o EPUB en este navegador, el botón "Leer" abre el lector; si no, se puede añadir (se guarda
 * solo en este navegador, ver ebookStore.ts) y también quitar. "Ver el libro" lo
 * muestra en grande para girarlo y leer la sinopsis de la contraportada.
 *
 */
interface BookDetailPanelProps {
  /** Libro pulsado en la sala (null: el panel no se muestra) */
  book: Book | null
  onClose: () => void
  /** Si el libro está ahora de frente */
  flipped: boolean
  /** Cambia entre de frente y de canto */
  onToggleFlip: () => void
  /** Formato de su libro electrónico, si lo tiene */
  ebookFormat: EbookFormat | undefined
  /** Abre el lector */
  onRead: () => void
  /** Se ha añadido (con su formato) o quitado (undefined) su PDF o EPUB */
  onEbookChange: (format: EbookFormat | undefined) => void
  /** Estado de lectura del libro: si se está leyendo, se puede apuntar la página y marcarlo como terminado */
  status: ReadingStatus
  /** Página por la que se va (escrita aquí antes), si la hay */
  currentPage: number | undefined
  onSetPage: (page: number) => void
  onFinish: () => void
  /** Favorito (★): se puede colgar como póster sobre la chimenea; posterOn: si ya está colgado */
  favorite: boolean
  posterOn: boolean
  onTogglePoster: () => void
  /** En la pila "por leer" junto al sofá (fuera de la estantería) */
  inPile: boolean
  onTogglePile: () => void
}

function BookDetailPanel({ book, onClose, flipped, onToggleFlip, ebookFormat, onRead, onEbookChange, status, currentPage, onSetPage, onFinish, favorite, posterOn, onTogglePoster, inPile, onTogglePile }: BookDetailPanelProps) {
  const [viewing, setViewing] = useState<string | null>(null) // ISBN del libro que se está viendo en grande
  // Añadir o quitar su PDF o EPUB: selector de archivos oculto y aviso del libro al que se refiere ('saving' o el error)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ebookNotice, setEbookNotice] = useState<{ isbn: string; text: string } | null>(null)
  // useEffect para escuchar la pulsación de la tecla Escape y cerrar el panel
  useEffect(() => {
    // Función que evalúa si la tecla pulsada es "Escape" para invocar onClose
    const handleKeyDown = (event: KeyboardEvent) => {
      // Comprueba si la tecla coincide con Escape
      if (event.key === 'Escape') {
        // Ejecuta la función de cierre proporcionada por el componente padre
        onClose()
      }
    }

    // Registra el escuchador de eventos en el objeto global window
    window.addEventListener('keydown', handleKeyDown)

    // Función de limpieza que elimina el escuchador al desmontar el componente o cambiar dependencias
    return () => {
      // Remueve el event listener para evitar fugas de memoria
      window.removeEventListener('keydown', handleKeyDown)
    }
    // Array de dependencias que actualiza el efecto si la función onClose cambia
  }, [onClose])

  // Si no hay ningún libro seleccionado, el panel no renderiza nada en el DOM
  if (!book) return null
  // El aviso solo se muestra en el libro al que se refiere
  const ebookStatus = ebookNotice?.isbn === book.isbn ? ebookNotice.text : null
  const setEbookStatus = (text: string | null) => setEbookNotice(text && book ? { isbn: book.isbn, text } : null)

  async function addEbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // Así se puede volver a elegir el mismo archivo
    if (!file || !book) return
    setEbookStatus('saving')
    try {
      onEbookChange(await saveEbookFile(book.isbn, file))
      setEbookStatus(null)
    } catch (error) {
      setEbookStatus((error as Error).message)
    }
  }

  async function removeEbook() {
    if (!book || !window.confirm(`¿Quitar el ${ebookFormat?.toUpperCase()} de «${book.title}» de este navegador? Sus subrayados y marcadores se quedan.`)) return
    try {
      await removeEbookFile(book.isbn)
      onEbookChange(undefined)
    } catch (error) {
      setEbookStatus((error as Error).message)
    }
  }

  return (
    <aside className="book-detail-panel" aria-label="Detalle del libro seleccionado">
      <div className="book-detail-header">
        <button
          type="button"
          className="book-detail-close-btn"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <div className="book-detail-content">
        <img
          src={book.cover}
          alt={`Portada de ${book.title}`}
          className="book-detail-cover"
        />

        <div className="book-detail-info">
          <h2 className="book-detail-title">{book.title}</h2>
          <p className="book-detail-author">{book.author}</p>
          <p className="book-detail-meta">
            <strong>Estado:</strong> <span className={`book-detail-status is-${status}`}>{READING_LABELS[status]}</span>
          </p>
          {book.saga && (
            <p className="book-detail-meta">
              <strong>Saga:</strong> {book.saga}{book.saga_index != null ? ` (${book.isManga ? 'Tomo' : 'Libro'} ${book.saga_index})` : ''}
            </p>
          )}
          {book.isManga && (
            <p className="book-detail-meta">
              <strong>Formato:</strong> Manga
            </p>
          )}
          {book.format === 'bolsillo' && (
            <p className="book-detail-meta">
              <strong>Formato:</strong> Bolsillo
            </p>
          )}
          {book.format === 'book' && book.saga === 'Cazadores oscuros' && (
            <p className="book-detail-meta">
              <strong>Formato:</strong> Tapa blanda (formato grande)
            </p>
          )}
          <p className="book-detail-meta">
            <strong>Editorial:</strong> {book.publisher}
          </p>
          <p className="book-detail-meta">
            <strong>Páginas:</strong> {book.pages}
          </p>
          {status === 'reading' && <ReadingProgressForm key={book.isbn} book={book} page={currentPage} onSetPage={onSetPage} onFinish={onFinish} />}
        </div>
      </div>

      <div className="book-detail-footer">
        <IconButton icon="view" label="Ver el libro en grande y leer su contraportada" onClick={() => setViewing(book.isbn)} />
        {ebookFormat && <IconButton icon="read" label={`Leer el libro (${ebookFormat.toUpperCase()})`} className="is-primary" onClick={onRead} />}
        {ebookFormat ? (
          <IconButton icon="remove" label={`Quitar el ${ebookFormat.toUpperCase()} de este navegador`} onClick={removeEbook} />
        ) : (
          <IconButton
            icon="upload"
            label={ebookStatus === 'saving' ? 'Guardando el archivo…' : 'Añadir su PDF o EPUB (se guarda solo en este navegador)'}
            disabled={ebookStatus === 'saving'}
            onClick={() => fileInputRef.current?.click()}
          />
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" hidden onChange={addEbook} />
        <IconButton
          icon="flip"
          label={flipped ? 'Voltear: dejarlo de canto, con el lomo a la vista' : 'Voltear: ponerlo de frente, con la portada a la vista'}
          aria-pressed={flipped}
          onClick={onToggleFlip}
        />
        <IconButton
          icon="pile"
          label={inPile ? 'Devolverlo a su sitio de la estantería' : 'Mandarlo a la pila «por leer» junto al sofá'}
          aria-pressed={inPile}
          onClick={onTogglePile}
        />
        {favorite && (
          <IconButton
            icon="poster"
            label={posterOn ? 'Descolgar el póster de la chimenea' : 'Colgarlo como póster sobre la chimenea (caben dos)'}
            aria-pressed={posterOn}
            onClick={onTogglePoster}
          />
        )}
      </div>

      {ebookStatus && ebookStatus !== 'saving' && (
        <p className="book-detail-ebook-error" role="alert">
          {ebookStatus}
        </p>
      )}

      {/* Si se elige otro libro en la sala, la vista en grande se cierra. Va en document.body: el desenfoque del panel
          (backdrop-filter) haría que su posición fija se midiera dentro del panel y no en toda la pantalla */}
      {viewing === book.isbn && createPortal(<BookViewer book={book} onClose={() => setViewing(null)} />, document.body)}
    </aside>
  )
}

export default BookDetailPanel
