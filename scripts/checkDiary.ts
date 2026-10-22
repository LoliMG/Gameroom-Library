// Comprobación rápida de las cuentas del diario de lecturas: node scripts/checkDiary.ts
import assert from 'node:assert/strict'
import { readingDays, readingsInYear, finishedInYear, yearDays, yearSummary } from '../src/utils/readingCalendar.ts'
import type { Book, Reading } from '../src/types.ts'

const reading = (id: number, startDate: string | null, endDate: string | null): Reading => ({ id, isbn: `isbn${id}`, startDate, endDate, rating: null, comment: null })
const today = '2026-10-20'
const readings = [
  reading(1, '2025-12-30', '2026-01-02'), // Cruza el cambio de año
  reading(2, '2026-03-10', '2026-03-12'),
  reading(3, '2026-10-18', null), // Se está leyendo: hasta hoy
  reading(4, null, '2026-05-01'), // Solo fecha de fin: ese día
  reading(5, null, null), // Sin fechas: no sale en el calendario
  reading(6, '2026-03-11', '2026-03-11'), // Dos libros el mismo día
]

// Días de lectura de 2026: los de cada lectura, recortados al año
const days = readingDays(readings, 2026, today)
assert.deepEqual(days.get('2026-01-01'), ['isbn1'])
assert.equal(days.has('2025-12-31'), false)
assert.deepEqual(days.get('2026-03-11'), ['isbn2', 'isbn6'])
assert.deepEqual([days.has('2026-10-18'), days.has('2026-10-20'), days.has('2026-10-21')], [true, true, false])
assert.deepEqual(days.get('2026-05-01'), ['isbn4'])
assert.equal([...days.values()].flat().filter((isbn) => isbn === 'isbn2').length, 3)

// Lecturas del año y terminadas en él (el reto cuenta las terminadas)
assert.deepEqual(readingsInYear(readings, 2025, today).map((r) => r.id), [1])
assert.deepEqual(readingsInYear(readings, 2026, today).map((r) => r.id), [1, 2, 3, 4, 6])
assert.equal(finishedInYear(readings, 2026), 4)
assert.equal(finishedInYear(readings, 2025), 0)

// Días del año: 2026 empieza en jueves (3) y tiene 365 días; 2028 es bisiesto
assert.deepEqual([yearDays(2026).days.length, yearDays(2026).firstWeekday], [365, 3])
assert.equal(yearDays(2028).days.length, 366)

// Resumen del año: terminadas en 2026 son la 1, la 2, la 4 y la 6 (la 2 y la 6 en marzo); la 6 es una relectura del libro 2
const book = (isbn: string, author: string, pages: number | null) => ({ isbn, author, pages }) as Book
const summaryBooks = [book('isbn1', 'Ana', 300), book('isbn2', 'Ana', 200), book('isbn4', 'Luis', null)]
const rated = readings.map((r) => (r.id === 1 ? { ...r, rating: 5 } : r.id === 2 ? { ...r, rating: 4 } : r.id === 6 ? { ...r, isbn: 'isbn2' } : r))
assert.deepEqual(yearSummary(rated, summaryBooks, 2026), {
  finished: 4,
  pages: 300 + 200 + 200, // La 4 no tiene páginas; la relectura del libro 2 cuenta otra vez
  averageRating: 4.5,
  bestMonth: 2, // Marzo
  topAuthor: 'Ana',
})
assert.deepEqual(yearSummary([], summaryBooks, 2026), { finished: 0, pages: 0, averageRating: null, bestMonth: null, topAuthor: null })

console.log('Diario de lecturas (días, años, retos y resumen): OK')
