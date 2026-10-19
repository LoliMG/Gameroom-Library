// El libro en grande, como si se tuviera en la mano: una caja 3D hecha con CSS (portada, contraportada, lomo y cantos)
// que se gira arrastrando, con flechas o con los botones. La contraportada lleva la sinopsis como texto de verdad
// (se lee bien a cualquier tamaño) y, si el libro no tiene, se puede escribir y guardar.
import { useEffect, useMemo, useRef, useState } from 'react'
import { generateSpineTexture, paletteFromCover } from '@/scene/books/bookTextureGenerator'
import { saveSynopsis } from '@/utils/catalogApi'
import '@/styles/bookViewer.css'

// Giro inicial (un poco de lado para que se vea que es un libro) y los de los botones, en grados
const START_ANGLE = { x: 8, y: -28 }
const VIEWS = [
  { label: 'Portada', y: 0 },
  { label: 'Lomo', y: 90 },
  { label: 'Contraportada', y: 180 },
]
const DRAG_DEGREES_PER_PX = 0.45
const MAX_TILT = 35
const KEY_STEP = 15
const MAX_SYNOPSIS = 3000
// Sinopsis guardadas en esta sesión (por ISBN): el libro del panel sigue siendo el de antes de guardar hasta recargar
const savedSynopses = new Map()

/**
 * @param {Object} book - Libro de la sala (cover, title, author, publisher, isbn, synopsis, medidas y colores del lomo)
 * @param {Function} onClose - Cierra la vista
 */
function BookViewer({ book, onClose }) {
  const [angle, setAngle] = useState(START_ANGLE)
  const [animate, setAnimate] = useState(true) // Transición suave con los botones; sin ella al arrastrar
  const [palette, setPalette] = useState(null) // Colores sacados de la portada (libros sin paleta hecha a mano)
  const [synopsis, setSynopsis] = useState(savedSynopses.get(book.isbn) ?? book.synopsis ?? '')
  const [draft, setDraft] = useState(null) // Sinopsis mientras se escribe
  const [status, setStatus] = useState(null) // null | 'saving' | mensaje de error
  const dragRef = useRef(null)

  // Libros sin colores propios: los del lomo y la contraportada salen de la portada, como en la estantería
  useEffect(() => {
    if (book.spineGradient) return
    const image = new Image()
    image.onload = () => setPalette(paletteFromCover(image))
    image.src = book.cover
  }, [book.cover, book.spineGradient])

  const styled = useMemo(() => ({ ...book, ...(book.spineGradient ? {} : palette) }), [book, palette])
  // El lomo es la misma imagen que en la estantería
  const spineImage = useMemo(() => {
    if (!book.spineGradient && !palette) return null
    const texture = generateSpineTexture(styled)
    const url = texture.image.toDataURL()
    texture.dispose()
    return url
  }, [styled, book.spineGradient, palette])

  // Esc cierra solo esta vista (no el panel del libro de detrás) y las flechas giran el libro. Mientras se escribe la
  // sinopsis, las teclas son del texto
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target.closest?.('textarea')) {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setDraft(null)
        }
        return
      }
      const turns = { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }
      if (event.key === 'Escape') onClose()
      else if (turns[event.key]) {
        setAnimate(true)
        setAngle((current) => ({ ...current, y: current.y + turns[event.key] }))
      } else return
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  // Arrastrar para girar (sin empezar sobre el texto de la sinopsis ni sobre botones, para poder desplazarse o pulsar)
  const onPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('button, textarea, .viewer-synopsis')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, start: angle }
    setAnimate(false)
  }
  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    setAngle({
      y: drag.start.y + (event.clientX - drag.x) * DRAG_DEGREES_PER_PX,
      x: Math.max(-MAX_TILT, Math.min(MAX_TILT, drag.start.x - (event.clientY - drag.y) * DRAG_DEGREES_PER_PX)),
    })
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  // Botón de vista: el giro más corto hasta ella (sin dar vueltas de más si ya se ha girado mucho)
  const showView = (y) => {
    setAnimate(true)
    setAngle((current) => ({ x: 0, y: current.y + ((((y - current.y) % 360) + 540) % 360) - 180 }))
  }

  async function save(event) {
    event.preventDefault()
    setStatus('saving')
    try {
      const saved = await saveSynopsis(book.isbn, draft)
      savedSynopses.set(book.isbn, saved.synopsis ?? '')
      setSynopsis(saved.synopsis ?? '')
      setDraft(null)
      setStatus(null)
    } catch (error) {
      setStatus(error.message)
    }
  }

  // Medidas en proporción a las del libro: alto fijo en pantalla, ancho y grosor según sus medidas reales
  const sizeStyle = {
    '--viewer-ratio-w': book.depth / book.height,
    '--viewer-ratio-t': Math.max(book.width / book.height, 0.02),
    '--back-bg': styled.backColor || '#1c1524',
    '--back-text': styled.backTextColor || '#f5ecf1',
    '--back-accent': styled.spineRibsColor || '#d4af37',
  }

  return (
    <div className="viewer-overlay" role="dialog" aria-modal="true" aria-label={`${book.title}, en grande`} onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="viewer-book"
          style={{
            ...sizeStyle,
            transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`,
            transition: animate ? 'transform 0.6s ease' : 'none',
          }}
        >
          <div className="viewer-face viewer-front">
            <img src={book.cover} alt={`Portada de ${book.title}`} draggable={false} />
          </div>

          <div className="viewer-face viewer-back">
            <p className="viewer-back-title">{book.title}</p>
            {draft === null ? (
              <>
                {synopsis ? (
                  <div className="viewer-synopsis" tabIndex={0} aria-label="Sinopsis">
                    {synopsis}
                  </div>
                ) : (
                  <p className="viewer-no-synopsis">Este libro aún no tiene sinopsis.</p>
                )}
                <button type="button" className="viewer-edit" onClick={() => setDraft(synopsis)}>
                  {synopsis ? 'Editar sinopsis' : 'Escribir sinopsis'}
                </button>
              </>
            ) : (
              <form className="viewer-edit-form" onSubmit={save}>
                <textarea
                  aria-label="Sinopsis"
                  autoFocus
                  maxLength={MAX_SYNOPSIS}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escribe aquí la sinopsis de la contraportada…"
                />
                {status && status !== 'saving' && (
                  <p className="viewer-error" role="alert">
                    {status}
                  </p>
                )}
                <div className="viewer-edit-row">
                  <button type="submit" className="viewer-edit" disabled={status === 'saving'}>
                    {status === 'saving' ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" className="viewer-edit" onClick={() => setDraft(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            <p className="viewer-back-footer">
              {book.publisher} · ISBN {book.isbn}
            </p>
          </div>

          <div className="viewer-face viewer-spine" style={spineImage ? { backgroundImage: `url(${spineImage})` } : undefined} />
          <div className="viewer-face viewer-pages viewer-pages-side" />
          <div className="viewer-face viewer-pages viewer-pages-top" />
          <div className="viewer-face viewer-pages viewer-pages-bottom" />
        </div>
      </div>

      <div className="viewer-controls">
        {VIEWS.map(({ label, y }) => (
          <button key={label} type="button" onClick={() => showView(y)}>
            {label}
          </button>
        ))}
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="viewer-hint">Arrastra para girar el libro (o usa las flechas)</p>
    </div>
  )
}

export default BookViewer
