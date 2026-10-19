// Cuentas del diario de lecturas (sin pantalla, para poder probarlas): qué días se estaba leyendo cada libro, qué
// lecturas tocan un año y cuántos libros se terminaron en él. Las fechas van como 'AAAA-MM-DD' (como las guarda la base
// de datos); se recorren en UTC para que un cambio de hora no salte ni repita un día. Lo prueba scripts/checkDiary.ts.
import type { Reading } from '@/types'

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
