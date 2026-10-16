import { useEffect } from 'react'
import '@/styles/bookDetailPanel.css'

/**
 * Panel con los datos del libro pulsado. El botón de volteo (abajo a la derecha) lo pone en la estantería
 * con la portada hacia la sala, o lo devuelve de canto con el lomo.
 *
 * @param {boolean} flipped - Si el libro está ahora de frente
 * @param {Function} onToggleFlip - Cambia entre de frente y de canto
 */
function BookDetailPanel({ book, onClose, flipped, onToggleFlip }) {
  // useEffect para escuchar la pulsación de la tecla Escape y cerrar el panel
  useEffect(() => {
    // Función que evalúa si la tecla pulsada es "Escape" para invocar onClose
    const handleKeyDown = (event) => {
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
          <p className="book-detail-meta">
            <strong>Editorial:</strong> {book.publisher}
          </p>
          <p className="book-detail-meta">
            <strong>Páginas:</strong> {book.pages}
          </p>
        </div>
      </div>

      <div className="book-detail-footer">
        <button type="button" className="book-detail-flip-btn" aria-pressed={flipped} onClick={onToggleFlip}>
          {flipped ? 'Voltear: mostrar el lomo' : 'Voltear: mostrar la portada'}
        </button>
      </div>
    </aside>
  )
}

export default BookDetailPanel
