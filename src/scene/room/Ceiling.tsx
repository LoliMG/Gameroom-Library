// Importación de las dimensiones de la habitación para calcular techo y moldura
import {
  ROOM_WIDTH,
  ROOM_DEPTH,
  ROOM_HEIGHT,
  ROOM_CENTER_Z,
  BACK_WALL_Z,
  FRONT_WALL_INNER_Z,
  FLOOR_Y,
} from '@/scene/room/Room'
// Color de la madera de las estanterías
import { WOOD_COLOR } from '@/scene/shelves/Bookshelf'

// Color oscuro y cálido del techo
const CEILING_COLOR = '#3b2f27'
// Moldura perimetral: madera oscura a juego con las estanterías
// Moldura del mismo roble que las estanterías
const MOLDING_COLOR = WOOD_COLOR
const MOLDING_HEIGHT = 0.08 // Alto de la moldura (m)
const MOLDING_DEPTH = 0.06  // Vuelo de la moldura desde la pared (m)

// Cota del techo: suelo + altura de la habitación (-1.0 + 2.8 = +1.8 m)
const CEILING_Y = FLOOR_Y + ROOM_HEIGHT
// Centro vertical de la moldura, pegada al techo
const MOLDING_Y = CEILING_Y - MOLDING_HEIGHT / 2

// Cara interior de cada pared (donde se apoya la moldura)
const INNER_LEFT_X = -ROOM_WIDTH / 2                              // Pared a
const INNER_RIGHT_X = ROOM_WIDTH / 2                              // Pared b
const INNER_BACK_Z = BACK_WALL_Z                                  // Pared d
const INNER_FRONT_Z = FRONT_WALL_INNER_Z                         // Pared c (cara interior del muro del ventanal)

// Tramos de moldura: [posición, tamaño] de cada caja fina, calculados a partir de las caras interiores.
// Las molduras de las paredes largas (a, b) van completas; las de d y c encajan entre ellas para no solaparse.
const INNER_DEPTH = INNER_FRONT_Z - INNER_BACK_Z
const MOLDING_SEGMENTS = [
  // Pared d (fondo)
  {
    position: [0, MOLDING_Y, INNER_BACK_Z + MOLDING_DEPTH / 2],
    size: [ROOM_WIDTH - 2 * MOLDING_DEPTH, MOLDING_HEIGHT, MOLDING_DEPTH],
  },
  // Pared c (ventanal)
  {
    position: [0, MOLDING_Y, INNER_FRONT_Z - MOLDING_DEPTH / 2],
    size: [ROOM_WIDTH - 2 * MOLDING_DEPTH, MOLDING_HEIGHT, MOLDING_DEPTH],
  },
  // Pared a (izquierda)
  {
    position: [INNER_LEFT_X + MOLDING_DEPTH / 2, MOLDING_Y, INNER_BACK_Z + INNER_DEPTH / 2],
    size: [MOLDING_DEPTH, MOLDING_HEIGHT, INNER_DEPTH],
  },
  // Pared b (derecha)
  {
    position: [INNER_RIGHT_X - MOLDING_DEPTH / 2, MOLDING_Y, INNER_BACK_Z + INNER_DEPTH / 2],
    size: [MOLDING_DEPTH, MOLDING_HEIGHT, INNER_DEPTH],
  },
]

/**
 * Techo plano y moldura perimetral.
 * El techo solo se ve desde dentro (cara frontal hacia abajo): si la cámara mira desde arriba
 * se descarta su cara trasera y el interior sigue visible.
 */
function Ceiling() {
  return (
    <group>
      {/* Plano del techo: rotación +90° en X para que su cara visible (normal) mire hacia abajo (-Y) */}
      {/* castShadow: impide que la luz del ventanal entre por encima del muro, donde antes no había techo */}
      <mesh position={[0, CEILING_Y, ROOM_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        {/* side por defecto (FrontSide): desde arriba es invisible */}
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.95} />
      </mesh>

      {/* Moldura: cajas finas a lo largo de las cuatro paredes, pegadas al techo */}
      {MOLDING_SEGMENTS.map(({ position, size }, i) => (
        <mesh key={i} position={position} receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={MOLDING_COLOR} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export default Ceiling
