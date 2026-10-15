// Vela con llama titilante reutilizable (Fase 7)
import CandleLight from '@/scene/CandleLight'
// Cálculo de puntos de apoyo sobre las baldas con la misma geometría que las estanterías
import { getShelfSlot } from '@/scene/shelfWalls'

// Huecos de estantería con vela (máximo 3; la cuarta vela está en la mesa de café).
// wall: pared, module: módulo desde el extremo, shelf: balda (0 = abajo), along: posición a lo largo del hueco (-0.5…0.5),
// depth: avance hacia el frente desde el centro del fondo de la balda (m). Se evitan los huecos con libros (balda 0 del módulo 0 de d).
const CANDLE_SLOTS = [
  { wall: 'd', module: 1, shelf: 3, along: -0.32, depth: 0.06 },
  { wall: 'd', module: 2, shelf: 5, along: 0.3, depth: 0.06 },
  { wall: 'a', module: 3, shelf: 2, along: -0.25, depth: 0.06 },
]

/**
 * Velas decorativas repartidas en huecos seleccionados de las estanterías.
 */
function ShelfCandles() {
  return (
    <group>
      {CANDLE_SLOTS.map(({ wall, module, shelf, along, depth }) => {
        // Punto de apoyo sobre la superficie de la balda en coordenadas del mundo
        const { position } = getShelfSlot(wall, module, shelf, along, depth)
        return <CandleLight key={`${wall}-${module}-${shelf}`} position={position} />
      })}
    </group>
  )
}

export default ShelfCandles
