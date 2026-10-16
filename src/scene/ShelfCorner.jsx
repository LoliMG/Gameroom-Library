// Dimensiones de la habitación y de las estanterías para calcular el bloque
import { ROOM_WIDTH, BACK_WALL_Z } from '@/scene/Room'
import { SHELF_HEIGHT, BOOKSHELF_DEPTH } from '@/scene/Bookshelf'
import { SHELF_WALL_Y } from '@/scene/shelfWalls'
// Madera con el tono del mueble (misma textura que las estanterías)
import useShelfWood from '@/hooks/useShelfWood'

// Rellena exactamente el hueco de 35 × 35 cm entre las estanterías de las paredes a y d (esquina trasera izquierda)
const CORNER_BLOCK_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.425 m
const CORNER_BLOCK_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2     // -1.825 m

/**
 * Bloque rinconero recto que une las dos paredes de estanterías en un ángulo limpio de 90° sin picos.
 */
function ShelfCorner() {
  const wood = useShelfWood('cabinet')
  return (
    <mesh position={[CORNER_BLOCK_X, SHELF_WALL_Y, CORNER_BLOCK_Z]} castShadow receiveShadow>
      <boxGeometry args={[BOOKSHELF_DEPTH, SHELF_HEIGHT, BOOKSHELF_DEPTH]} />
      {/* Pieza de pie: veta vertical */}
      <meshStandardMaterial map={wood.grainVertical} />
    </mesh>
  )
}

export default ShelfCorner
