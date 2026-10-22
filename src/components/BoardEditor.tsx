// Editor del corcho en grande: añadir pósits, pegatinas (emojis o imágenes de src/assets/stickers) y frases (subrayadas
// en el lector o escritas a mano), y colocarlos arrastrándolos, girarlos o quitarlos. Lo pegado se dibuja igual en el
// corcho de la pared (Corkboard)
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { Book, BoardContent, BoardItem, Highlight, NoteColor } from '@/types'
import { MAX_BOARD_ITEMS, MAX_NOTE_TEXT, MAX_QUOTE_TEXT, NOTE_COLORS } from '@/types'
import { BOARD_ASPECT, EMOJI_STICKERS, NOTE_FILL, STICKER_IMAGES, stickerImage } from '@/utils/board'
import { fetchHighlights } from '@/utils/readerApi'
import { normalize } from '@/utils/normalize'
import '@/styles/boardEditor.css'

// Giro de los botones (grados) y paso de las flechas del teclado (fracción del corcho)
const ROTATE_STEP = 10
const KEY_STEP = 0.01
// Frases y libros que se muestran como mucho al buscar
const MAX_HIGHLIGHTS = 30
const MAX_BOOK_MATCHES = 6
const NOTE_LABELS: Record<NoteColor, string> = { yellow: 'Amarillo', pink: 'Rosa', mint: 'Verde', blue: 'Azul', lilac: 'Lila' }

type Panel = 'note' | 'sticker' | 'quote' | null
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface BoardEditorProps {
  items: BoardItem[]
  books: Book[]
  /** Lo pegado ha cambiado (se guarda) */
  onChange: (items: BoardItem[]) => void
  onClose: () => void
}

function BoardEditor({ items, books, onChange, onClose }: BoardEditorProps) {
  // Copia de trabajo: al arrastrar cambia en cada movimiento y solo se guarda al soltar
  const [draft, setDraft] = useState(items)
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [noteText, setNoteText] = useState('')
  const [noteColor, setNoteColor] = useState<NoteColor>('yellow')
  const [quoteText, setQuoteText] = useState('')
  // Libro de la frase escrita a mano (opcional: sale debajo, como subtítulo) y su buscador
  const [quoteIsbn, setQuoteIsbn] = useState<string | null>(null)
  const [bookQuery, setBookQuery] = useState('')
  const [quoteTab, setQuoteTab] = useState<'write' | 'highlights'>('write')
  const [highlights, setHighlights] = useState<Highlight[] | null>(null)
  const [highlightError, setHighlightError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const boardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const booksByIsbn = useMemo(() => new Map(books.map((book) => [book.isbn, book])), [books])
  const full = draft.length >= MAX_BOARD_ITEMS

  const commit = (next: BoardItem[]) => {
    setDraft(next)
    onChange(next)
  }

  // Esc cierra la ventana de añadir que esté abierta o, si no hay, el editor (lo escrito sin pegar no se guarda)
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (panel) setPanel(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, panel])

  // Tamaño de la letra del corcho: 1em = 1 % de su ancho (así todo se ve igual a cualquier tamaño, como en la pared)
  const [boardWidth, setBoardWidth] = useState(0)
  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    const observer = new ResizeObserver(([entry]) => setBoardWidth(entry.contentRect.width))
    observer.observe(board)
    return () => observer.disconnect()
  }, [])

  // Las frases subrayadas se piden al abrir su pestaña por primera vez
  useEffect(() => {
    if (panel !== 'quote' || quoteTab !== 'highlights' || highlights) return
    fetchHighlights()
      .then(setHighlights)
      .catch((error: Error) => setHighlightError(`No se pudieron cargar los subrayados: ${error.message}`))
  }, [panel, quoteTab, highlights])
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const bookWords = normalize(bookQuery).split(/\s+/).filter(Boolean)
  const bookMatches =
    bookWords.length === 0 ? [] : books.filter((book) => bookWords.every((word) => normalize(`${book.title} ${book.author}`).includes(word))).slice(0, MAX_BOOK_MATCHES)
  const shownHighlights = (highlights ?? [])
    .filter((highlight) => words.every((word) => normalize(`${highlight.text} ${booksByIsbn.get(highlight.isbn)?.title ?? ''}`).includes(word)))
    .slice(0, MAX_HIGHLIGHTS)

  // Lo nuevo va cerca del centro, un poco torcido, encima de todo y elegido
  const add = (content: BoardContent) => {
    if (full) return
    const id = crypto.randomUUID().slice(0, 12)
    const placed: BoardItem = { ...content, id, x: 0.4 + Math.random() * 0.2, y: 0.4 + Math.random() * 0.2, rotation: Math.round(Math.random() * 12 - 6) }
    commit([...draft, placed])
    setSelected(id)
    setPanel(null)
  }

  const update = (id: string, change: Partial<BoardItem>, save = true) => {
    const next = draft.map((item) => (item.id === id ? ({ ...item, ...change } as BoardItem) : item))
    if (save) commit(next)
    else setDraft(next)
  }
  const remove = (id: string) => {
    commit(draft.filter((item) => item.id !== id))
    setSelected(null)
  }
  const rotate = (id: string, by: number) => {
    const item = draft.find((each) => each.id === id)!
    update(id, { rotation: Math.max(-180, Math.min(180, item.rotation + by)) })
  }

  // Arrastrar: al pulsar se elige y se pone encima de todo; se mueve con el puntero y se guarda al soltar
  const startDrag = (event: PointerEvent<HTMLDivElement>, item: BoardItem) => {
    const rect = boardRef.current!.getBoundingClientRect()
    dragRef.current = { id: item.id, dx: (event.clientX - rect.left) / rect.width - item.x, dy: (event.clientY - rect.top) / rect.height - item.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelected(item.id)
    setDraft((list) => [...list.filter((each) => each.id !== item.id), item])
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const rect = boardRef.current!.getBoundingClientRect()
    update(drag.id, { x: clamp01((event.clientX - rect.left) / rect.width - drag.dx), y: clamp01((event.clientY - rect.top) / rect.height - drag.dy) }, false)
  }
  const endDrag = () => {
    if (!dragRef.current) return
    dragRef.current = null
    onChange(draft)
  }

  // Teclado sobre lo elegido: flechas para moverlo, Supr para quitarlo
  const onItemKey = (event: KeyboardEvent<HTMLDivElement>, item: BoardItem) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (event.key === 'Delete' || event.key === 'Backspace') return remove(item.id)
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    update(item.id, { x: clamp01(item.x + move[0] * KEY_STEP), y: clamp01(item.y + move[1] * KEY_STEP) })
  }

  const describe = (item: BoardItem) =>
    item.kind === 'note' ? `Pósit: ${item.text}` : item.kind === 'quote' ? `Frase: ${item.text}` : `Pegatina ${item.sticker.startsWith('img:') ? item.sticker.slice(4) : item.sticker}`

  return (
    <div className="board-editor" role="dialog" aria-modal="true" aria-label="Corcho">
      <header className="board-editor__bar">
        <h2>Mi corcho</h2>
        <div className="board-editor__tools" role="group" aria-label="Añadir al corcho">
          {(['note', 'sticker', 'quote'] as const).map((kind) => (
            <button key={kind} type="button" aria-pressed={panel === kind} disabled={full} onClick={() => setPanel(panel === kind ? null : kind)}>
              {kind === 'note' ? '📝 Pósit' : kind === 'sticker' ? '⭐ Pegatina' : '❝ Frase'}
            </button>
          ))}
        </div>
        {full && <span className="board-editor__hint">El corcho está lleno ({MAX_BOARD_ITEMS})</span>}
        <button type="button" className="board-editor__done" onClick={onClose}>
          Listo
        </button>
      </header>

      {panel === 'note' && (
        <form
          className="board-editor__panel"
          onSubmit={(event) => {
            event.preventDefault()
            if (noteText.trim()) add({ kind: 'note', text: noteText.trim(), color: noteColor })
            setNoteText('')
          }}
        >
          <div className="board-editor__colors" role="radiogroup" aria-label="Color del pósit">
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={noteColor === color}
                aria-label={NOTE_LABELS[color]}
                style={{ background: NOTE_FILL[color] }}
                onClick={() => setNoteColor(color)}
              />
            ))}
          </div>
          <textarea autoFocus rows={3} maxLength={MAX_NOTE_TEXT} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Escribe tu pósit…" />
          <button type="submit" disabled={!noteText.trim()}>
            Pegar
          </button>
        </form>
      )}

      {panel === 'sticker' && (
        <div className="board-editor__panel board-editor__stickers" role="group" aria-label="Pegatinas">
          {EMOJI_STICKERS.map((emoji) => (
            <button key={emoji} type="button" aria-label={`Pegatina ${emoji}`} onClick={() => add({ kind: 'sticker', sticker: emoji })}>
              {emoji}
            </button>
          ))}
          {Object.entries(STICKER_IMAGES).map(([name, url]) => (
            <button key={name} type="button" aria-label={`Pegatina ${name}`} onClick={() => add({ kind: 'sticker', sticker: `img:${name}` })}>
              <img src={url} alt="" />
            </button>
          ))}
          {Object.keys(STICKER_IMAGES).length === 0 && <p className="board-editor__hint">Tus propias pegatinas: pon imágenes en src/assets/stickers/</p>}
        </div>
      )}

      {/* Añadir una frase: ventana propia sobre el corcho, para escribirla (con su libro, opcional) o elegirla de los
          subrayados del lector. Se cierra con ×, pulsando fuera o con Esc */}
      {panel === 'quote' && (
        <div className="board-modal" onPointerDown={(event) => event.target === event.currentTarget && setPanel(null)}>
          <div className="board-modal__card" role="dialog" aria-modal="true" aria-labelledby="board-quote-title">
            <header className="board-modal__header">
              <h3 id="board-quote-title">Añadir una frase</h3>
              <button type="button" className="board-modal__close" aria-label="Cerrar" onClick={() => setPanel(null)}>
                ×
              </button>
            </header>
            <div className="board-modal__tabs" role="tablist" aria-label="De dónde sale la frase">
              <button type="button" role="tab" aria-selected={quoteTab === 'write'} onClick={() => setQuoteTab('write')}>
                Escribirla
              </button>
              <button type="button" role="tab" aria-selected={quoteTab === 'highlights'} onClick={() => setQuoteTab('highlights')}>
                De tus subrayados
              </button>
            </div>

            {quoteTab === 'write' ? (
              <form
                className="board-modal__form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (quoteText.trim()) add({ kind: 'quote', text: quoteText.trim(), isbn: quoteIsbn })
                  setQuoteText('')
                  setQuoteIsbn(null)
                }}
              >
                <label>
                  Frase
                  <textarea autoFocus rows={4} maxLength={MAX_QUOTE_TEXT} value={quoteText} onChange={(event) => setQuoteText(event.target.value)} placeholder="Escribe la frase…" />
                </label>
                <div className="board-modal__field">
                  <span>Libro (opcional: sale debajo de la frase)</span>
                  {quoteIsbn ? (
                    <p className="board-modal__chosen">
                      — {booksByIsbn.get(quoteIsbn)?.title}
                      <button type="button" onClick={() => setQuoteIsbn(null)}>
                        Quitar
                      </button>
                    </p>
                  ) : (
                    <>
                      <input
                        type="search"
                        value={bookQuery}
                        onChange={(event) => setBookQuery(event.target.value)}
                        placeholder="Busca por título o autor…"
                        aria-label="Libro de la frase"
                      />
                      {bookWords.length > 0 && (
                        <ul className="board-modal__list" aria-label="Libros que coinciden">
                          {bookMatches.length === 0 && <li className="board-editor__hint">Ningún libro coincide.</li>}
                          {bookMatches.map((book) => (
                            <li key={book.isbn}>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuoteIsbn(book.isbn)
                                  setBookQuery('')
                                }}
                              >
                                {book.title}
                                <small> — {book.author}</small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                <button type="submit" className="board-modal__submit" disabled={!quoteText.trim()}>
                  Pegar en el corcho
                </button>
              </form>
            ) : (
              <div className="board-modal__form">
                <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca en tus subrayados…" aria-label="Buscar en tus subrayados" />
                {highlightError && <p className="board-editor__hint" role="alert">{highlightError}</p>}
                {highlights?.length === 0 && <p className="board-editor__hint">Aún no has subrayado nada en el lector.</p>}
                <ul className="board-modal__list board-modal__highlights">
                  {shownHighlights.map((highlight) => (
                    <li key={highlight.id}>
                      <button type="button" onClick={() => add({ kind: 'quote', text: highlight.text.slice(0, MAX_QUOTE_TEXT), isbn: highlight.isbn })}>
                        «{highlight.text}»<small> — {booksByIsbn.get(highlight.isbn)?.title ?? highlight.isbn}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* El corcho: 1em = 1 % de su ancho */}
      <div
        ref={boardRef}
        className="board-editor__board"
        style={{ aspectRatio: BOARD_ASPECT, fontSize: boardWidth / 100 } as CSSProperties}
        onPointerDown={(event) => event.target === event.currentTarget && setSelected(null)}
      >
        {draft.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={describe(item)}
            aria-pressed={selected === item.id}
            className={`board-item board-item--${item.kind}${selected === item.id ? ' is-selected' : ''}`}
            // Tamaños en boardEditor.css (los mismos que ITEM_WIDTH, que usa el corcho de la pared)
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              ...(item.kind === 'note' ? { background: NOTE_FILL[item.color] } : {}),
            }}
            onPointerDown={(event) => startDrag(event, item)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => onItemKey(event, item)}
          >
            {item.kind === 'note' && <span>{item.text}</span>}
            {item.kind === 'sticker' && (stickerImage(item.sticker) ? <img src={stickerImage(item.sticker)!} alt="" draggable={false} /> : <span>{item.sticker}</span>)}
            {item.kind === 'quote' && (
              <>
                <span>«{item.text}»</span>
                {item.isbn && <small>— {booksByIsbn.get(item.isbn)?.title ?? item.isbn}</small>}
              </>
            )}
            {selected === item.id && (
              <span className="board-item__actions" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" aria-label="Girar a la izquierda" onClick={() => rotate(item.id, -ROTATE_STEP)}>
                  ⟲
                </button>
                <button type="button" aria-label="Girar a la derecha" onClick={() => rotate(item.id, ROTATE_STEP)}>
                  ⟳
                </button>
                <button type="button" aria-label="Quitar del corcho" onClick={() => remove(item.id)}>
                  🗑
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="board-editor__hint">Arrastra para colocar · pulsa algo para girarlo o quitarlo · flechas y Supr con el teclado</p>
    </div>
  )
}

export default BoardEditor
