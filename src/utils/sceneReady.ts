// Partes de la escena ya montadas (la sala, el jardín): las marca <SceneReady> al final de su Suspense, que solo se
// monta cuando todo lo de dentro ha cargado. La pantalla de carga espera a que estén todas.
import { useSyncExternalStore } from 'react'

/** Partes que tiene que haber antes de quitar la pantalla de carga */
export type ScenePart = 'room' | 'garden'
const REQUIRED: ScenePart[] = ['room', 'garden']

const ready = new Set<ScenePart>()
const listeners = new Set<() => void>()

/** Marca una parte como montada */
export function markSceneReady(part: ScenePart) {
  if (ready.has(part)) return
  ready.add(part)
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const allReady = () => REQUIRED.every((part) => ready.has(part))

/** true cuando la sala y el jardín están montados */
export const useSceneReady = () => useSyncExternalStore(subscribe, allReady)
