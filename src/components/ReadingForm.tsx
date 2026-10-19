// Formulario de una lectura del diario: el libro (al añadirla), las fechas, la puntuación con estrellas y un comentario
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Book, Reading, ReadingStatus } from '@/types'
import { createReading, deleteReading, updateReading } from '@/utils/diaryApi'
import { normalize } from '@/utils/normalize'

interface ReadingFormProps {
  books: Book[]
  /** La lectura que se edita, o null para añadir una nueva */
  reading: Reading | null
  /** Todas las lecturas del diario: para saber si la que se guarda es la última de su libro */
  readings: Reading[]
  /** Pone el estado de lectura del libro (con fecha de fin, acabado; solo con inicio, leyendo) */
  onSetStatus: (isbns: string[], status: ReadingStatus) => void
  /** Vuelve al diario (tras guardar, borrar o cancelar); saved: si ha cambiado algo */
  onDone: (saved: boolean) => void
}

const STARS = [1, 2, 3, 4, 5]
// Libros que se muestran como mucho al buscar
const MAX_MATCHES = 8

// Orden de una lectura en el tiempo: la que sigue en curso (con inicio y sin fin) es la más reciente; si no, su fin
const recency = ({ startDate, endDate }: Pick<Reading, 'startDate' | 'endDate'>) => endDate ?? (startDate ? '9999-12-31' : '')

function ReadingForm({ books, reading, readings, onSetStatus, onDone }: ReadingFormProps) {
  const [isbn, setIsbn] = useState(reading?.isbn ?? '')
  const [bookQuery, setBookQuery] = useState('')
  const [startDate, setStartDate] = useState(reading?.startDate ?? '')
  const [endDate, setEndDate] = useState(reading?.endDate ?? '')
  const [rating, setRating] = useState<number | null>(reading?.rating ?? null)
  const [comment, setComment] = useState(reading?.comment ?? '')
  const [status, setStatus] = useState<string | null>(null) // null | 'saving' | mensaje de error
  const book = books.find((item) => item.isbn === isbn)

  // El libro se elige buscándolo por título o autor y pulsándolo en la lista (la lista de la casa, no la del navegador:
  // la del navegador sale mal colocada dentro de la consola 3D, que es una página con perspectiva)
  const words = normalize(bookQuery).split(/\s+/).filter(Boolean)
  const matches = words.length === 0 ? [] : books.filter((item) => words.every((word) => normalize(`${item.title} ${item.author}`).includes(word))).slice(0, MAX_MATCHES)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isbn) return setStatus('Elige un libro de la lista')
    setStatus('saving')
    const data = { startDate: startDate || null, endDate: endDate || null, rating, comment: comment.trim() || null }
    try {
      if (reading) await updateReading(reading.id, data)
      else await createReading({ isbn, ...data })
      // El estado del libro solo lo cambia su lectura más reciente: apuntar cuándo se leyó la primera vez no quita el
      // "leyendo" de una relectura en curso
      const others = readings.filter((item) => item.isbn === isbn && item.id !== reading?.id)
      const isLatest = others.every((item) => recency(data) >= recency(item))
      if (isLatest && data.endDate) onSetStatus([isbn], 'finished')
      else if (isLatest && data.startDate) onSetStatus([isbn], 'reading')
      onDone(true)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  async function remove() {
    if (!reading || !window.confirm('¿Borrar esta lectura del diario?')) return
    setStatus('saving')
    try {
      await deleteReading(reading.id)
      onDone(true)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  const busy = status === 'saving'
  return (
    <form className="manual-book" onSubmit={save} aria-label={reading ? 'Editar lectura' : 'Añadir lectura'}>
      <div className="manual-book-cover">
        {book ? <img src={book.cover} alt={`Portada de ${book.title}`} /> : <span>Elige un libro</span>}
      </div>
      <div className="manual-book-fields">
        {book ? (
          <p className="diary-chosen">
            <span>
              Libro: <strong>{book.title}</strong>
            </span>
            {!reading && (
              <button type="button" className="add-book-link" onClick={() => setIsbn('')} disabled={busy}>
                Cambiar
              </button>
            )}
          </p>
        ) : (
          <div className="diary-picker">
            <label>
              Libro *
              <input
                type="search"
                autoFocus
                value={bookQuery}
                onChange={(event) => setBookQuery(event.target.value)}
                disabled={busy}
                placeholder="Busca por título o autor…"
              />
            </label>
            {words.length > 0 && (
              <ul className="diary-matches" aria-label="Libros que coinciden">
                {matches.length === 0 && <li className="add-book-message">Ningún libro coincide.</li>}
                {matches.map((item) => (
                  <li key={item.isbn}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsbn(item.isbn)
                        setBookQuery('')
                      }}
                    >
                      <img src={item.cover} alt="" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.author}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="manual-book-row">
          <label>
            Empecé
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} disabled={busy} />
          </label>
          <label>
            Terminé
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} disabled={busy} />
          </label>
        </div>
        <fieldset className="diary-stars" disabled={busy}>
          <legend>Puntuación</legend>
          {STARS.map((star) => (
            <button
              key={star}
              type="button"
              className={rating !== null && star <= rating ? 'is-on' : ''}
              aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
              aria-pressed={rating === star}
              onClick={() => setRating(rating === star ? null : star)}
            >
              ★
            </button>
          ))}
        </fieldset>
        <label>
          Comentario
          <textarea rows={4} maxLength={5000} value={comment} onChange={(event) => setComment(event.target.value)} disabled={busy} placeholder="¿Qué te ha parecido?" />
        </label>
        {status && status !== 'saving' && (
          <p className="add-book-message is-error" role="alert">
            {status}
          </p>
        )}
        <div className="manual-book-row">
          <button type="submit" className="dashboard-action" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="dashboard-action is-quiet" onClick={() => onDone(false)} disabled={busy}>
            Cancelar
          </button>
          {reading && (
            <button type="button" className="dashboard-action is-danger" onClick={remove} disabled={busy}>
              Borrar
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

export default ReadingForm
