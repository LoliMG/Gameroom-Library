import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import type { Book, EbookFormat } from '@/types'
import BookViewer from '@/components/BookViewer'
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
 * Panel con los datos del libro pulsado. El botón de volteo (abajo a la derecha) lo pone en la estantería
 * con la portada hacia la sala, o lo devuelve de canto con el lomo.
 *
 * Si el libro tiene libro electrónico (ebooks/<isbn>.epub o .pdf), el botón "Leer" abre el lector. "Ver el libro" lo
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
}

function BookDetailPanel({ book, onClose, flipped, onToggleFlip, ebookFormat, onRead }: BookDetailPanelProps) {
  const [viewing, setViewing] = useState<string | null>(null) // ISBN del libro que se está viendo en grande
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
        </div>
      </div>

      <div className="book-detail-footer">
        <IconButton icon="view" label="Ver el libro en grande y leer su contraportada" onClick={() => setViewing(book.isbn)} />
        {ebookFormat && <IconButton icon="read" label={`Leer el libro (${ebookFormat.toUpperCase()})`} className="is-primary" onClick={onRead} />}
        <IconButton
          icon="flip"
          label={flipped ? 'Voltear: dejarlo de canto, con el lomo a la vista' : 'Voltear: ponerlo de frente, con la portada a la vista'}
          aria-pressed={flipped}
          onClick={onToggleFlip}
        />
      </div>

      {/* Si se elige otro libro en la sala, la vista en grande se cierra. Va en document.body: el desenfoque del panel
          (backdrop-filter) haría que su posición fija se midiera dentro del panel y no en toda la pantalla */}
      {viewing === book.isbn && createPortal(<BookViewer book={book} onClose={() => setViewing(null)} />, document.body)}
    </aside>
  )
}

export default BookDetailPanel
