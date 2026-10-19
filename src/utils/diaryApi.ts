// Llamadas a la API del diario de lecturas (rutas /api/readings de server/library.ts)
import type { Reading } from '@/types'
import { request, jsonBody } from '@/utils/apiRequest'

/** Lo que se escribe de una lectura (sin su id) */
export type ReadingInput = Omit<Reading, 'id'>

/** Todas las lecturas, de la más reciente a la más antigua */
export const fetchReadings = async (): Promise<Reading[]> => (await request('/api/readings')).json()

/** Añade una lectura y la devuelve con su id */
export const createReading = async (reading: ReadingInput): Promise<Reading> =>
  (await request('/api/readings', jsonBody('POST', reading))).json()

/** Cambia las fechas, la puntuación y el comentario de una lectura */
export const updateReading = async (id: number, reading: Omit<ReadingInput, 'isbn'>): Promise<Reading> =>
  (await request(`/api/readings/${id}`, jsonBody('PUT', reading))).json()

/** Borra una lectura */
export const deleteReading = (id: number) => request(`/api/readings/${id}`, { method: 'DELETE' })
