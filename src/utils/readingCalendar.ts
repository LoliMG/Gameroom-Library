// Cuentas del diario de lecturas (sin pantalla, para poder probarlas): qué días se estaba leyendo cada libro, qué
// lecturas tocan un año y cuántos libros se terminaron en él. Las fechas van como 'AAAA-MM-DD' (como las guarda la base
// de datos); se recorren en UTC para que un cambio de hora no salte ni repita un día. Lo prueba scripts/checkDiary.ts.
import type { Book, Reading } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toIso = (date: Date) => date.toISOString().slice(0, 10)

/** Hoy en la hora del ordenador, como 'AAAA-MM-DD' */
export function todayIso(): string {
  const now = new Date()
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
}

// Días que abarca una lectura: del inicio al fin; sin fin, hasta hoy (se está leyendo); sin inicio, solo el día del fin
function readingSpan({ startDate, endDate }: Reading, today: string): [string, string] | null {
  const start = startDate ?? endDate
  if (!start) return null
  return [start, endDate ?? (start > today ? start : today)]
}

/** Las lecturas que tocan ese año (empezadas, terminadas o en curso durante él) */
export function readingsInYear(readings: Reading[], year: number, today: string): Reading[] {
  return readings.filter((reading) => {
    const span = readingSpan(reading, today)
    return span !== null && span[0] <= `${year}-12-31` && span[1] >= `${year}-01-01`
  })
}

/** Lecturas terminadas en ese año (cada relectura cuenta) */
export const finishedInYear = (readings: Reading[], year: number) =>
  readings.filter((reading) => reading.endDate?.startsWith(`${year}-`)).length

/** Para cada día del año en que se estaba leyendo algo: los ISBN de lo que se leía ('AAAA-MM-DD' → [isbn]) */
export function readingDays(readings: Reading[], year: number, today: string): Map<string, string[]> {
  const days = new Map<string, string[]>()
  const first = `${year}-01-01`
  const last = `${year}-12-31`
  for (const reading of readings) {
    const span = readingSpan(reading, today)
    if (!span) continue
    const from = toDate(span[0] > first ? span[0] : first)
    const to = toDate(span[1] < last ? span[1] : last)
    for (let day = from.getTime(); day <= to.getTime(); day += DAY_MS) {
      const key = toIso(new Date(day))
      days.set(key, [...(days.get(key) ?? []), reading.isbn])
    }
  }
  return days
}

/** Todos los días del año, en orden, y en qué día de la semana cae el 1 de enero (0 = lunes … 6 = domingo) */
export function yearDays(year: number): { days: string[]; firstWeekday: number } {
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  const days: string[] = []
  for (let day = start; day <= end; day += DAY_MS) days.push(toIso(new Date(day)))
  return { days, firstWeekday: (new Date(start).getUTCDay() + 6) % 7 }
}

/** Resumen de un año de lecturas (las terminadas en él; cada relectura cuenta) */
export interface YearSummary {
  /** Lecturas terminadas */
  finished: number
  /** Páginas leídas (de los libros con número de páginas) */
  pages: number
  /** Media de estrellas de las puntuadas (null si no hay ninguna) */
  averageRating: number | null
  /** Mes con más libros terminados (0 = enero; null sin ninguno) */
  bestMonth: number | null
  /** Autor con más libros terminados (null sin ninguno) */
  topAuthor: string | null
}

// El que más veces sale en una lista (a igualdad, el primero que llegó a ese número)
function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>()
  let best: T | null = null
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1
    counts.set(value, count)
    if (best === null || count > counts.get(best)!) best = value
  }
  return best
}

/** Resumen del año: libros terminados, páginas, media de estrellas, mejor mes y autor más leído */
export function yearSummary(readings: Reading[], books: Book[], year: number): YearSummary {
  const done = readings.filter((reading) => reading.endDate?.startsWith(`${year}-`))
  const byIsbn = new Map(books.map((book) => [book.isbn, book]))
  const doneBooks = done.map((reading) => byIsbn.get(reading.isbn)).filter((book): book is Book => book !== undefined)
  const ratings = done.map((reading) => reading.rating).filter((rating): rating is number => rating !== null)
  return {
    finished: done.length,
    pages: doneBooks.reduce((sum, book) => sum + (book.pages ?? 0), 0),
    averageRating: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null,
    bestMonth: mostCommon(done.map((reading) => Number(reading.endDate!.slice(5, 7)) - 1)),
    topAuthor: mostCommon(doneBooks.map((book) => book.author).filter((author): author is string => Boolean(author))),
  }
}
