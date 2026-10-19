// Lector de libros electrónicos (EPUB o PDF) con aspecto de libro abierto: pasar página con clic, arrastrando o con las
// flechas, subrayar, comentar (burbujas en el margen), marcar páginas. Todo se guarda en la base de datos.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createEpubEngine } from '@/components/reader/epubEngine'
import { ANNOTATION_FILL, ANNOTATION_LABELS } from '@/components/reader/annotationColors'
import {
  fetchEbookFile,
  fetchReaderData,
  saveReadingPosition,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  createBookmark,
  deleteBookmark,
} from '@/utils/readerApi'
import '@/styles/bookReader.css'

// Duración de un giro completo de hoja (ms)
const FLIP_MS = 700
// Arrastrando, la página se pasa si al soltar va por más de esta fracción del giro; si no, vuelve a su sitio
const DRAG_TURN_FRACTION = 0.3
// Píxeles de movimiento por debajo de los cuales pulsar un borde es un clic (pasa la página entera)
const CLICK_DISTANCE = 6
// Espera antes de guardar por dónde se va leyendo (para no guardar en cada página si se pasan rápido)
const POSITION_SAVE_DELAY = 800
// Tiempo que se muestra un aviso de error
const NOTICE_MS = 4000
// Burbujas de comentario: separación mínima entre dos del mismo margen y ancho de la tarjeta que despliegan
const BUBBLE_GAP = 26
const CARD_WIDTH = 280

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const toRect = (r) => ({ left: r.left, top: r.top, width: r.width, height: r.height })

// Botones de color para subrayar (o cambiar el color de un subrayado)
function ColorSwatches({ current, onPick }) {
  return Object.entries(ANNOTATION_FILL).map(([color, fill]) => (
    <button
      key={color}
      type="button"
      className={`reader-swatch${current === color ? ' is-current' : ''}`}
      style={{ background: fill }}
      aria-label={`Subrayar en ${ANNOTATION_LABELS[color].toLowerCase()}`}
      title={ANNOTATION_LABELS[color]}
      onClick={() => onPick(color)}
    />
  ))
}

// Copia de las páginas (de engine.snapshot()) colocada con el estilo dado
function Snapshot({ mount, style, className = 'reader-snap' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (mount) mount(ref.current)
  }, [mount])
  return <div ref={ref} className={className} style={style} />
}

/**
 * @param {Object} book - Libro de la sala (isbn, title, author)
 * @param {'epub'|'pdf'} format - Formato de su libro electrónico
 * @param {Function} onClose - Cierra el lector
 */
function BookReader({ book, format, onClose }) {
  const pagesRef = useRef(null)
  const bookRef = useRef(null)
  const engineRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [place, setPlace] = useState({ atStart: true, atEnd: false, label: '' })
  const [markedId, setMarkedId] = useState(null) // Marcador de las páginas que se ven, si lo hay
  // Ventanita: { kind: 'selection', selection } o { kind: 'annotation', id, anchor, from: 'bubble' | 'highlight' }
  const [popup, setPopup] = useState(null)
  const [noteDraft, setNoteDraft] = useState(null) // Texto del comentario mientras se escribe
  const [panel, setPanel] = useState(null) // 'notes' | 'bookmarks' | null
  const [bubbles, setBubbles] = useState([]) // [{ id, side, top }] en px dentro del libro
  // Hoja que se está pasando: { direction, phase: 'cover' | 'turn', oldMount, newMount, geometry, angle, ms }
  const [flip, setFlip] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pageRatio, setPageRatio] = useState(null) // Solo PDF: ancho / alto de sus páginas
  const flipBusyRef = useRef(false)
  const bookmarkBusyRef = useRef(false) // Evita guardar dos veces el mismo marcador con un doble clic
  const dragRef = useRef(null)
  const saveTimerRef = useRef(null)
  // Estado más reciente para los avisos del motor y de la ventana (que se registran una sola vez)
  const latestRef = useRef({})

  const showError = (message) => {
    setNotice(message)
    setTimeout(() => setNotice(null), NOTICE_MS)
  }

  // Burbujas de los subrayados con comentario que se ven, en el margen exterior de su página
  const refreshMarginsAndBookmark = useCallback(() => {
    const engine = engineRef.current
    const bookEl = bookRef.current
    if (!engine || !bookEl) return
    const box = bookEl.getBoundingClientRect()
    const { annotations: currentAnnotations = [], bookmarks: currentBookmarks = [] } = latestRef.current
    const rects = engine.annotationRects(currentAnnotations.filter((annotation) => annotation.note))
    const list = Object.entries(rects)
      .map(([id, r]) => ({ id: Number(id), side: r.left < box.left + box.width / 2 ? 'left' : 'right', top: r.top - box.top + r.height / 2 }))
      .sort((a, b) => a.top - b.top)
    // Dos burbujas a la misma altura del mismo margen se apilan en vez de taparse
    const lastTop = { left: -Infinity, right: -Infinity }
    for (const bubble of list) {
      bubble.top = Math.max(bubble.top, lastTop[bubble.side] + BUBBLE_GAP)
      lastTop[bubble.side] = bubble.top
    }
    setBubbles(list)
    setMarkedId(currentBookmarks.find((bookmark) => engine.isVisible(bookmark.location))?.id ?? null)
  }, [])

  // Carga del archivo, de la posición, los subrayados y los marcadores, y arranque del motor del formato
  useEffect(() => {
    let cancelled = false
    let engine = null
    const handlers = {
      onSelect: (selection) => {
        setNoteDraft(null)
        setPopup({ kind: 'selection', selection })
      },
      onAnnotationClick: (id, rect) => {
        setNoteDraft(null)
        setPopup({ kind: 'annotation', id, anchor: rect, from: 'highlight' })
      },
      onRelocate: (location, info) => {
        setPlace({ label: '', ...info })
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveReadingPosition(book.isbn, location), POSITION_SAVE_DELAY)
        requestAnimationFrame(refreshMarginsAndBookmark)
      },
      onKey: (event) => latestRef.current.onKey?.(event),
      onPointerDown: () => latestRef.current.closeOutside?.(),
    }
    ;(async () => {
      try {
        const [data, reader] = await Promise.all([fetchEbookFile(book.isbn), fetchReaderData(book.isbn)])
        if (cancelled) return
        // PDF.js solo se descarga si hace falta (es grande)
        const create = format === 'pdf' ? (await import('@/components/reader/pdfEngine')).createPdfEngine : createEpubEngine
        engine = await create(pagesRef.current, data, handlers)
        if (cancelled) return engine.destroy()
        engineRef.current = engine
        setPageRatio(engine.pageRatio ?? null)
        reader.annotations.forEach((annotation) => engine.addHighlight(annotation))
        latestRef.current.annotations = reader.annotations
        latestRef.current.bookmarks = reader.bookmarks
        setAnnotations(reader.annotations)
        setBookmarks(reader.bookmarks)
        // Si la posición guardada ya no vale (por ejemplo, se cambió el archivo del libro), se empieza por el principio
        await engine.display(reader.position).catch(() => engine.display(null))
        if (!cancelled) setStatus('ready')
      } catch (error) {
        if (cancelled) return
        console.error('[lector] No se pudo abrir el libro:', error)
        setLoadError(error.message)
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(saveTimerRef.current)
      engineRef.current = null
      engine?.destroy()
    }
  }, [book.isbn, format, refreshMarginsAndBookmark])

  // Burbujas y marcador al cambiar los subrayados o los marcadores, y al cambiar el tamaño del libro
  useEffect(() => {
    latestRef.current.annotations = annotations
    latestRef.current.bookmarks = bookmarks
    refreshMarginsAndBookmark()
  }, [annotations, bookmarks, refreshMarginsAndBookmark])
  useEffect(() => {
    const observer = new ResizeObserver(() => requestAnimationFrame(refreshMarginsAndBookmark))
    observer.observe(bookRef.current)
    return () => observer.disconnect()
  }, [refreshMarginsAndBookmark])

  // --- Pasar página: la hoja lleva por delante la página actual y por detrás la nueva ---
  // Medidas para colocar las copias de las páginas dentro de las caras de la hoja
  const measure = () => ({
    bookWidth: bookRef.current.offsetWidth,
    pages: {
      left: pagesRef.current.offsetLeft,
      top: pagesRef.current.offsetTop,
      width: pagesRef.current.offsetWidth,
      height: pagesRef.current.offsetHeight,
    },
  })

  // Prepara el giro: copia de lo que se ve, cambio de página por debajo y copia de lo nuevo. Devuelve si empezó.
  async function startTurn(direction) {
    const engine = engineRef.current
    const { place: currentPlace } = latestRef.current
    if (!engine || flipBusyRef.current) return false
    if (direction === 'next' ? currentPlace.atEnd : currentPlace.atStart) return false
    flipBusyRef.current = true
    setPopup(null)
    setNoteDraft(null)
    engine.clearSelection()
    const oldMount = engine.snapshot()
    setFlip({ direction, phase: 'cover', oldMount, geometry: measure(), angle: 0, ms: 0 })
    try {
      await (direction === 'next' ? engine.next() : engine.prev())
      await nextFrame()
    } catch (error) {
      console.warn('[lector] No se pudo pasar la página:', error)
    }
    const newMount = engine.snapshot()
    setFlip((current) => current && { ...current, phase: 'turn', newMount })
    await nextFrame()
    return true
  }

  const endTurn = (ms) =>
    setTimeout(() => {
      setFlip(null)
      flipBusyRef.current = false
      refreshMarginsAndBookmark()
    }, ms)

  // Termina de girar la hoja desde el ángulo en que esté
  const completeTurn = (fromAngle) => {
    const ms = Math.max(150, FLIP_MS * (1 - fromAngle / 180))
    setFlip((current) => current && { ...current, angle: 180, ms })
    endTurn(ms)
  }

  // La hoja vuelve a su sitio y la página se deshace por debajo (sin que se vea el cambio)
  const cancelTurn = (direction, fromAngle) => {
    const ms = Math.max(150, FLIP_MS * (fromAngle / 180))
    setFlip((current) => current && { ...current, angle: 0, ms })
    setTimeout(async () => {
      const engine = engineRef.current
      await (direction === 'next' ? engine?.prev() : engine?.next())?.catch?.(() => {})
      await nextFrame()
      endTurn(0)
    }, ms)
  }

  const turn = async (direction) => {
    if (await startTurn(direction)) completeTurn(0)
  }

  // Bordes de las páginas: clic = pasar página; arrastrar = la hoja sigue a la mano
  const onEdgeDown = (direction, event) => {
    if (flipBusyRef.current || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { direction, startX: event.clientX, angle: 0, moved: false, ready: null }
  }
  const onEdgeMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const halfWidth = bookRef.current.getBoundingClientRect().width / 2
    const dx = drag.direction === 'next' ? drag.startX - event.clientX : event.clientX - drag.startX
    if (!drag.moved) {
      if (Math.abs(dx) < CLICK_DISTANCE) return
      drag.moved = true
      drag.ready = startTurn(drag.direction)
    }
    drag.angle = Math.min(180, Math.max(0, (dx / halfWidth) * 180))
    // Mientras se prepara la página nueva (fase 'cover') solo se apunta el ángulo; se aplica en el siguiente movimiento
    setFlip((current) => (current?.phase === 'turn' ? { ...current, angle: drag.angle, ms: 0 } : current))
  }
  const onEdgeUp = async () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (!drag.moved) return turn(drag.direction)
    if (!(await drag.ready)) return
    if (drag.angle / 180 > DRAG_TURN_FRACTION) completeTurn(drag.angle)
    else cancelTurn(drag.direction, drag.angle)
  }

  // --- Ventanitas: se cierran al pulsar fuera (salvo mientras se escribe un comentario) ---
  const closeOutside = () => {
    if (latestRef.current.noteDraft !== null) return
    setPopup(null)
  }
  useEffect(() => {
    if (!popup) return
    const onPointerDown = (event) => {
      if (event.target.closest?.('.reader-popup, .reader-card, .reader-bubble')) return
      latestRef.current.closeOutside()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [popup])

  // --- Teclado: flechas para pasar página, Esc para cerrar. Se capturan para que no muevan la sala de detrás ---
  const onKey = (event) => {
    const typing = event.target?.closest?.('textarea, input')
    if (event.key === 'Escape') {
      if (noteDraft !== null) setNoteDraft(null)
      else if (popup) setPopup(null)
      else onClose()
    } else if (!typing && event.key === 'ArrowRight') turn('next')
    else if (!typing && event.key === 'ArrowLeft') turn('prev')
  }
  useEffect(() => {
    latestRef.current = { ...latestRef.current, onKey, closeOutside, noteDraft, place }
  })
  useEffect(() => {
    const listener = (event) => {
      event.stopPropagation()
      latestRef.current.onKey?.(event)
    }
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [])

  // --- Subrayados y comentarios ---
  const findAnnotation = (id) => annotations.find((annotation) => annotation.id === id)

  async function addHighlight(color, withNote) {
    const { selection } = popup
    try {
      const annotation = await createAnnotation(book.isbn, { location: selection.location, text: selection.text, color })
      engineRef.current?.addHighlight(annotation)
      engineRef.current?.clearSelection()
      setAnnotations((list) => [...list, annotation])
      if (withNote) {
        setPopup({ kind: 'annotation', id: annotation.id, anchor: selection.rect, from: 'highlight' })
        setNoteDraft('')
      } else {
        setPopup(null)
      }
    } catch (error) {
      showError(`No se pudo guardar el subrayado: ${error.message}`)
    }
  }

  async function changeAnnotation(id, changes) {
    const previous = findAnnotation(id)
    try {
      const updated = await updateAnnotation(id, changes)
      if (changes.color && previous) {
        engineRef.current?.removeHighlight(previous)
        engineRef.current?.addHighlight(updated)
      }
      setAnnotations((list) => list.map((annotation) => (annotation.id === id ? updated : annotation)))
      setNoteDraft(null)
    } catch (error) {
      showError(`No se pudo guardar el cambio: ${error.message}`)
    }
  }

  async function removeAnnotation(id) {
    const annotation = findAnnotation(id)
    try {
      await deleteAnnotation(id)
      if (annotation) engineRef.current?.removeHighlight(annotation)
      setAnnotations((list) => list.filter((item) => item.id !== id))
      setPopup(null)
      setNoteDraft(null)
    } catch (error) {
      showError(`No se pudo borrar el subrayado: ${error.message}`)
    }
  }

  const goTo = (location) => {
    setPopup(null)
    engineRef.current?.display(location)
  }

  const openFromBubble = (id, event) => {
    if (popup?.kind === 'annotation' && popup.id === id) {
      setPopup(null)
      setNoteDraft(null)
      return
    }
    setNoteDraft(null)
    setPopup({ kind: 'annotation', id, anchor: toRect(event.currentTarget.getBoundingClientRect()), from: 'bubble' })
  }

  // --- Marcadores ---
  async function toggleBookmark() {
    const engine = engineRef.current
    if (!engine || flipBusyRef.current || bookmarkBusyRef.current) return
    bookmarkBusyRef.current = true
    try {
      if (markedId !== null) {
        await deleteBookmark(markedId)
        setBookmarks((list) => list.filter((bookmark) => bookmark.id !== markedId))
      } else {
        const here = engine.currentPlace()
        if (!here) return
        const bookmark = await createBookmark(book.isbn, here)
        setBookmarks((list) => [...list, bookmark])
      }
    } catch (error) {
      showError(`No se pudo guardar el marcador: ${error.message}`)
    } finally {
      bookmarkBusyRef.current = false
    }
  }

  async function removeBookmark(id) {
    try {
      await deleteBookmark(id)
      setBookmarks((list) => list.filter((bookmark) => bookmark.id !== id))
    } catch (error) {
      showError(`No se pudo borrar el marcador: ${error.message}`)
    }
  }

  // --- Posición de las ventanitas (en la ventana) ---
  const activeAnnotation = popup?.kind === 'annotation' ? findAnnotation(popup.id) : null
  let popupStyle = null
  if (popup?.kind === 'selection') {
    const r = popup.selection.rect
    const below = r.top < 140
    popupStyle = {
      left: Math.min(Math.max(r.left + r.width / 2, 170), window.innerWidth - 170),
      top: below ? r.top + r.height + 10 : r.top - 10,
      transform: below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    }
  } else if (activeAnnotation) {
    const r = popup.anchor
    // Desde una burbuja: la tarjeta sale hacia dentro de la página, a su altura (como los comentarios de Drive)
    const fromRightMargin = popup.from === 'bubble' && r.left > window.innerWidth / 2
    const left = popup.from === 'bubble' ? (fromRightMargin ? r.left - CARD_WIDTH - 10 : r.left + r.width + 10) : r.left + r.width / 2 - CARD_WIDTH / 2
    const top = popup.from === 'bubble' ? r.top - 12 : r.top + r.height + 10
    popupStyle = {
      left: Math.min(Math.max(left, 12), window.innerWidth - CARD_WIDTH - 12),
      top: Math.min(Math.max(top, 12), window.innerHeight - 260),
    }
  }

  // Caras de la hoja: cada una enseña su media página (las copias se desplazan para que el texto quede en su sitio)
  const geometry = flip?.geometry
  const snapStyle = (offsetLeft) =>
    geometry && { left: offsetLeft, top: geometry.pages.top, width: geometry.pages.width, height: geometry.pages.height }
  const leftHalf = geometry && snapStyle(geometry.pages.left)
  const rightHalf = geometry && snapStyle(geometry.pages.left - geometry.bookWidth / 2)

  return (
    <div className="reader-overlay" role="dialog" aria-modal="true" aria-label={`Leyendo ${book.title}`}>
      <header className="reader-header">
        <div className="reader-heading">
          <h2 className="reader-title">{book.title}</h2>
          <span className="reader-subtitle">
            {book.author}
            {place.label && ` · ${place.label}`}
          </span>
        </div>
        <button type="button" className="reader-btn" aria-pressed={panel === 'notes'} onClick={() => setPanel((p) => (p === 'notes' ? null : 'notes'))}>
          Notas ({annotations.length})
        </button>
        <button
          type="button"
          className="reader-btn"
          aria-pressed={panel === 'bookmarks'}
          onClick={() => setPanel((p) => (p === 'bookmarks' ? null : 'bookmarks'))}
        >
          Marcadores ({bookmarks.length})
        </button>
        <button type="button" className="reader-btn" onClick={onClose}>
          Cerrar
        </button>
      </header>

      <div className="reader-stage">
        <div
          className={`reader-book${pageRatio ? ' is-fitted' : ''}`}
          ref={bookRef}
          style={pageRatio ? { '--spread-ratio': pageRatio * 2 } : undefined}
        >
          <div className="reader-pages" ref={pagesRef} />
          <div className="reader-spine" aria-hidden="true" />

          {status === 'ready' && (
            <>
              <button
                type="button"
                className="reader-edge reader-edge-prev"
                aria-label="Página anterior"
                disabled={place.atStart}
                onPointerDown={(event) => onEdgeDown('prev', event)}
                onPointerMove={onEdgeMove}
                onPointerUp={onEdgeUp}
                onPointerCancel={onEdgeUp}
              />
              <button
                type="button"
                className="reader-edge reader-edge-next"
                aria-label="Página siguiente"
                disabled={place.atEnd}
                onPointerDown={(event) => onEdgeDown('next', event)}
                onPointerMove={onEdgeMove}
                onPointerUp={onEdgeUp}
                onPointerCancel={onEdgeUp}
              />
              <button
                type="button"
                className={`reader-ribbon${markedId !== null ? ' is-marked' : ''}`}
                aria-pressed={markedId !== null}
                aria-label={markedId !== null ? 'Quitar el marcador de estas páginas' : 'Marcar estas páginas'}
                title={markedId !== null ? 'Quitar marcador' : 'Marcar estas páginas'}
                onClick={toggleBookmark}
              />
            </>
          )}

          {/* Burbujas de comentario en el margen exterior, a la altura de su texto */}
          {status === 'ready' &&
            !flip &&
            bubbles.map((bubble) => {
              const annotation = findAnnotation(bubble.id)
              if (!annotation) return null
              const open = popup?.kind === 'annotation' && popup.id === bubble.id
              return (
                <button
                  key={bubble.id}
                  type="button"
                  className={`reader-bubble reader-bubble-${bubble.side}${open ? ' is-open' : ''}`}
                  style={{ top: bubble.top, '--bubble-color': ANNOTATION_FILL[annotation.color] }}
                  aria-label={`Comentario: ${annotation.note}`}
                  aria-expanded={open}
                  title={annotation.note}
                  onClick={(event) => openFromBubble(bubble.id, event)}
                />
              )
            })}

          {/* Hoja que se pasa: por delante la página que se va, por detrás la que llega */}
          {flip && (
            <div className="reader-flip-layer" aria-hidden="true">
              {flip.phase === 'cover' ? (
                <Snapshot mount={flip.oldMount} style={leftHalf} />
              ) : (
                <>
                  <Snapshot
                    mount={flip.oldMount}
                    style={{ ...leftHalf, clipPath: flip.direction === 'next' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}
                  />
                  <div
                    className={`reader-sheet reader-sheet-${flip.direction}`}
                    style={{
                      transform: `rotateY(${flip.direction === 'next' ? -flip.angle : flip.angle}deg)`,
                      transition: flip.ms ? `transform ${flip.ms}ms ease-in-out` : 'none',
                    }}
                  >
                    <div className="reader-sheet-face reader-sheet-front">
                      <Snapshot mount={flip.oldMount} style={flip.direction === 'next' ? rightHalf : leftHalf} />
                    </div>
                    <div className="reader-sheet-face reader-sheet-back">
                      <Snapshot mount={flip.newMount} style={flip.direction === 'next' ? leftHalf : rightHalf} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {status === 'loading' && <p className="reader-message">Abriendo el libro…</p>}
          {status === 'error' && <p className="reader-message">No se pudo abrir el libro: {loadError}</p>}
        </div>

        {panel === 'notes' && (
          <aside className="reader-panel" aria-label="Subrayados y comentarios">
            <h3>Subrayados y comentarios</h3>
            {annotations.length === 0 && <p className="reader-panel-empty">Selecciona texto en el libro para subrayarlo.</p>}
            <ul>
              {annotations.map((annotation) => (
                <li key={annotation.id} style={{ borderLeftColor: ANNOTATION_FILL[annotation.color] }}>
                  <button type="button" className="reader-panel-go" onClick={() => goTo(annotation.location)}>
                    <q>{annotation.text}</q>
                    {annotation.note && <span className="reader-panel-note">{annotation.note}</span>}
                    {annotation.location.page && <span className="reader-panel-meta">Página {annotation.location.page}</span>}
                  </button>
                  <button type="button" className="reader-panel-delete" onClick={() => removeAnnotation(annotation.id)}>
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {panel === 'bookmarks' && (
          <aside className="reader-panel" aria-label="Marcadores">
            <h3>Marcadores</h3>
            {bookmarks.length === 0 && <p className="reader-panel-empty">Pulsa la cinta de la esquina del libro para marcar las páginas que estás leyendo.</p>}
            <ul>
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="reader-panel-bookmark">
                  <button type="button" className="reader-panel-go" onClick={() => goTo(bookmark.location)}>
                    <span>{bookmark.label}</span>
                    <span className="reader-panel-meta">{new Date(`${bookmark.createdAt.replace(' ', 'T')}Z`).toLocaleDateString()}</span>
                  </button>
                  <button type="button" className="reader-panel-delete" onClick={() => removeBookmark(bookmark.id)}>
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {popup?.kind === 'selection' && popupStyle && (
        <div className="reader-popup" style={popupStyle}>
          <ColorSwatches onPick={(color) => addHighlight(color, false)} />
          <button type="button" className="reader-btn" onClick={() => addHighlight('yellow', true)}>
            Comentar
          </button>
        </div>
      )}

      {/* Tarjeta del subrayado (como un comentario de Drive): texto citado, comentario y acciones */}
      {activeAnnotation && popupStyle && (
        <div className="reader-card" style={{ ...popupStyle, width: CARD_WIDTH }} role="dialog" aria-label="Comentario">
          <q className="reader-card-quote" style={{ borderLeftColor: ANNOTATION_FILL[activeAnnotation.color] }}>
            {activeAnnotation.text}
          </q>
          {noteDraft === null ? (
            <>
              {activeAnnotation.note ? (
                <p className="reader-card-note">{activeAnnotation.note}</p>
              ) : (
                <p className="reader-card-empty">Sin comentario</p>
              )}
              <div className="reader-card-row">
                <ColorSwatches current={activeAnnotation.color} onPick={(color) => changeAnnotation(activeAnnotation.id, { color })} />
              </div>
              <div className="reader-card-row">
                <button type="button" className="reader-btn" onClick={() => setNoteDraft(activeAnnotation.note ?? '')}>
                  {activeAnnotation.note ? 'Editar' : 'Comentar'}
                </button>
                <button type="button" className="reader-btn reader-btn-danger" onClick={() => removeAnnotation(activeAnnotation.id)}>
                  Borrar
                </button>
              </div>
            </>
          ) : (
            <form
              className="reader-card-form"
              onSubmit={(event) => {
                event.preventDefault()
                changeAnnotation(activeAnnotation.id, { note: noteDraft.trim() || null })
              }}
            >
              <textarea
                aria-label="Comentario"
                autoFocus
                rows={4}
                maxLength={5000}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Escribe tu comentario…"
              />
              <div className="reader-card-row">
                <button type="submit" className="reader-btn reader-btn-primary">
                  Guardar
                </button>
                <button type="button" className="reader-btn" onClick={() => setNoteDraft(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {notice && (
        <p className="reader-notice" role="alert">
          {notice}
        </p>
      )}
    </div>
  )
}

export default BookReader
