// Diario de lecturas de la consola: reto del año, calendario con los días de lectura y las lecturas del año (con sus
// fechas, estrellas y comentarios). Las cuentas están en src/utils/readingCalendar.ts
import { useMemo, useState } from 'react'
import type { Book, Reading, ReadingStatus } from '@/types'
import { finishedInYear, readingDays, readingsInYear, todayIso, yearDays, yearSummary } from '@/utils/readingCalendar'
import ReadingForm from '@/components/ReadingForm'

interface DiaryPanelProps {
  books: Book[]
  onSetStatus: (isbns: string[], status: ReadingStatus) => void
  goals: Record<string, number>
  onSetGoal: (year: string, count: number) => void
  /** Lecturas del diario (null = cargando; las carga App, que también las usa la sala) y error al cargarlas */
  readings: Reading[] | null
  error: string | null
  /** Tras guardar o borrar una lectura: que se vuelvan a pedir */
  onReadingsChange: () => void
}

// Nombre del mes ("marzo") a partir de su número (0 = enero)
const monthName = (month: number) => new Date(2000, month, 1).toLocaleDateString('es-ES', { month: 'long' })

// Fecha corta en español: "3 mar" (con el año si no es el que se está viendo)
const shortDate = (iso: string, year: number) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(iso.startsWith(`${year}`) ? {} : { year: 'numeric' }) })

// Color de un día del calendario según cuántos libros se leían (0, 1, 2 o 3 o más)
const dayLevel = (count: number) => Math.min(3, count)

function DiaryPanel({ books, onSetStatus, goals, onSetGoal, readings, error, onReadingsChange }: DiaryPanelProps) {
  const today = todayIso()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const [editing, setEditing] = useState<Reading | 'new' | null>(null)
  const booksByIsbn = useMemo(() => new Map(books.map((book) => [book.isbn, book])), [books])
  // "Ver mi año": resumen del año (libros, páginas, estrellas, mejor mes y autor)
  const [showYear, setShowYear] = useState(false)
  const summary = useMemo(() => yearSummary(readings ?? [], books, year), [readings, books, year])

  const yearReadings = useMemo(() => readingsInYear(readings ?? [], year, today), [readings, year, today])
  const days = useMemo(() => readingDays(readings ?? [], year, today), [readings, year, today])
  const { days: allDays, firstWeekday } = useMemo(() => yearDays(year), [year])
  const finished = finishedInYear(readings ?? [], year)
  const goal = goals[String(year)] ?? 0

  if (editing) {
    return (
      <section className="add-book" aria-label="Diario de lecturas">
        <ReadingForm
          books={books}
          reading={editing === 'new' ? null : editing}
          readings={readings ?? []}
          onSetStatus={onSetStatus}
          onDone={(saved) => {
            setEditing(null)
            if (saved) onReadingsChange()
          }}
        />
      </section>
    )
  }

  return (
    <section className="add-book diary" aria-label="Diario de lecturas">
      <div className="diary-top">
        <div className="diary-year" role="group" aria-label="Año">
          <button type="button" className="dashboard-filter" aria-label="Año anterior" onClick={() => setYear(year - 1)}>
            ‹
          </button>
          <strong>{year}</strong>
          <button type="button" className="dashboard-filter" aria-label="Año siguiente" onClick={() => setYear(year + 1)}>
            ›
          </button>
        </div>
        <button type="button" className="dashboard-filter" aria-pressed={showYear} onClick={() => setShowYear(!showYear)}>
          ✨ Ver mi año
        </button>
        <button type="button" className="dashboard-action" onClick={() => setEditing('new')}>
          Añadir lectura
        </button>
      </div>

      {/* Resumen del año */}
      {showYear && (
        <dl className="diary-summary" aria-label={`Resumen de ${year}`}>
          <div>
            <dt>Libros terminados</dt>
            <dd>{summary.finished}</dd>
          </div>
          <div>
            <dt>Páginas leídas</dt>
            <dd>{summary.pages.toLocaleString('es-ES')}</dd>
          </div>
          <div>
            <dt>Media de estrellas</dt>
            <dd>{summary.averageRating === null ? '—' : `${summary.averageRating.toLocaleString('es-ES')} ★`}</dd>
          </div>
          <div>
            <dt>Mejor mes</dt>
            <dd>{summary.bestMonth === null ? '—' : monthName(summary.bestMonth)}</dd>
          </div>
          <div>
            <dt>Autor más leído</dt>
            <dd>{summary.topAuthor ?? '—'}</dd>
          </div>
        </dl>
      )}

      {/* Reto del año: libros terminados frente a los que se quieren leer */}
      <div className="diary-goal">
        <label>
          Reto {year}:{' '}
          <input
            type="number"
            min={0}
            max={9999}
            value={goal || ''}
            placeholder="¿cuántos?"
            aria-label={`Libros que quieres leer en ${year}`}
            onChange={(event) => onSetGoal(String(year), Math.max(0, Math.min(9999, Math.round(Number(event.target.value) || 0))))}
          />{' '}
          libros
        </label>
        <span>
          {`${finished} ${goal ? `de ${goal} ` : ''}terminado${finished === 1 ? '' : 's'}`}
        </span>
        {goal > 0 && (
          <progress className="diary-progress" max={goal} value={Math.min(finished, goal)} aria-label={`${finished} de ${goal} libros`} />
        )}
      </div>

      {/* Calendario: una columna por semana (de lunes a domingo), un cuadro por día, más oscuro cuantos más libros */}
      <div className="diary-calendar" role="img" aria-label={`Días de lectura de ${year}: ${days.size}`}>
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`empty-${i}`} className="diary-day is-empty" />
        ))}
        {allDays.map((day) => {
          const isbns = days.get(day) ?? []
          const titles = isbns.map((isbn) => booksByIsbn.get(isbn)?.title ?? isbn).join(', ')
          return <span key={day} className={`diary-day level-${dayLevel(isbns.length)}`} data-tooltip={`${shortDate(day, year)}${titles ? `: ${titles}` : ''}`} />
        })}
      </div>

      {error && (
        <p className="add-book-message is-error" role="alert">
          {error}
        </p>
      )}
      {readings && yearReadings.length === 0 && <p className="add-book-message">Aún no hay lecturas en {year}. Pulsa «Añadir lectura».</p>}

      <ul className="add-book-results">
        {yearReadings.map((reading) => {
          const book = booksByIsbn.get(reading.isbn)
          const dates = [reading.startDate && `desde el ${shortDate(reading.startDate, year)}`, reading.endDate ? `hasta el ${shortDate(reading.endDate, year)}` : reading.startDate && '(leyendo)']
          return (
            <li key={reading.id} className="add-book-result">
              {book && <img src={book.cover} alt="" className="add-book-cover" loading="lazy" />}
              <div className="add-book-info">
                <strong>{book?.title ?? reading.isbn}</strong>
                <span className="add-book-meta">{dates.filter(Boolean).join(' ') || 'Sin fechas'}</span>
                {reading.rating && (
                  <span className="diary-rating" aria-label={`${reading.rating} de 5 estrellas`}>
                    {'★'.repeat(reading.rating)}
                    {'☆'.repeat(5 - reading.rating)}
                  </span>
                )}
                {reading.comment && <span className="diary-comment">{reading.comment}</span>}
              </div>
              <div className="add-book-actions">
                <button type="button" className="dashboard-action is-quiet" onClick={() => setEditing(reading)}>
                  Editar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default DiaryPanel
