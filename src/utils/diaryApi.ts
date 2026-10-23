// Diario de lecturas de la cuenta, en Supabase (tabla readings)
import type { Reading } from '@/types'
import { check, supabase } from '@/utils/supabase'

/** Lo que se escribe de una lectura (sin su id) */
export type ReadingInput = Omit<Reading, 'id'>

type ReadingRow = { id: number; isbn: string; start_date: string | null; end_date: string | null; rating: number | null; comment: string | null }

const toReading = (row: ReadingRow): Reading => ({
  id: row.id,
  isbn: row.isbn,
  startDate: row.start_date,
  endDate: row.end_date,
  rating: row.rating,
  comment: row.comment,
})
// Lo que se guarda: el comentario sin espacios sobrantes (vacío = sin comentario)
const toRow = (reading: Omit<ReadingInput, 'isbn'>) => ({
  start_date: reading.startDate,
  end_date: reading.endDate,
  rating: reading.rating,
  comment: reading.comment?.trim() || null,
})

/** Todas las lecturas, de la más reciente a la más antigua (por la fecha de fin, o la de inicio, o cuándo se apuntó) */
export async function fetchReadings(): Promise<Reading[]> {
  const rows = check(await supabase.from('readings').select('id, isbn, start_date, end_date, rating, comment, created_at').order('id', { ascending: false }))
  const date = (row: (typeof rows)[number]) => row.end_date ?? row.start_date ?? row.created_at
  return rows.sort((a, b) => (date(a) < date(b) ? 1 : date(a) > date(b) ? -1 : b.id - a.id)).map(toReading)
}

/** Añade una lectura y la devuelve con su id */
export const createReading = async (reading: ReadingInput): Promise<Reading> =>
  toReading(check(await supabase.from('readings').insert({ isbn: reading.isbn, ...toRow(reading) }).select().single()))

/** Cambia las fechas, la puntuación y el comentario de una lectura */
export const updateReading = async (id: number, reading: Omit<ReadingInput, 'isbn'>): Promise<Reading> =>
  toReading(check(await supabase.from('readings').update(toRow(reading)).eq('id', id).select().single()))

/** Borra una lectura */
export const deleteReading = async (id: number): Promise<void> => {
  check(await supabase.from('readings').delete().eq('id', id))
}
