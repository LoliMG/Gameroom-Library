// Nivel de gráficos de la sala (alto o bajo), para ordenadores a los que la sala les va lenta. Se guarda en este
// navegador y no en la cuenta: depende del ordenador, no de la persona
import { useSyncExternalStore } from 'react'

export type GraphicsLevel = 'high' | 'low'

/** Niveles en el orden en que se muestran en Ajustes, con su nombre */
export const GRAPHICS_LEVELS: { value: GraphicsLevel; label: string }[] = [
  { value: 'high', label: 'Alto' },
  { value: 'low', label: 'Bajo' },
]

/**
 * Qué cambia cada nivel. dpr: píxeles por píxel de pantalla ([mínimo, máximo]: en pantallas de alta densidad, más es más
 * nítido y más lento). multisampling: muestras del suavizado de bordes del postprocesado. bloom: brillo de las llamas.
 * shadows: sombras de la luz del ventanal. El postprocesado no se quita entero en ningún nivel: medido, pintar sin él
 * (directo al lienzo) costaba el doble de GPU que con él
 */
export const GRAPHICS: Record<GraphicsLevel, { dpr: number | [number, number]; multisampling: number; bloom: boolean; shadows: boolean }> = {
  high: { dpr: [1, 2], multisampling: 4, bloom: true, shadows: true },
  low: { dpr: 1, multisampling: 0, bloom: false, shadows: false },
}

const STORAGE_KEY = 'graphics'
const listeners = new Set<() => void>()

// localStorage puede fallar (ventana privada, datos bloqueados): entonces se queda en alto y no se recuerda
function readLevel(): GraphicsLevel {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return GRAPHICS_LEVELS.some((level) => level.value === saved) ? (saved as GraphicsLevel) : 'high'
  } catch {
    return 'high'
  }
}
let level = readLevel()

/** Cambia el nivel (y lo recuerda en este navegador) */
export function setGraphicsLevel(next: GraphicsLevel) {
  level = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento: vale para esta visita
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Nivel de gráficos actual (se vuelve a pintar quien lo use cuando cambia) */
export const useGraphicsLevel = () => useSyncExternalStore(subscribe, () => level)
