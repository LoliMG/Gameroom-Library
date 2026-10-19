// Sparkles de drei: partículas que flotan y parpadean suavemente
import { Sparkles } from '@react-three/drei'
// Importación de las dimensiones de la habitación para situar el polvo en la luz del ventanal
import { ROOM_WIDTH, FRONT_WALL_INNER_Z, FLOOR_Y } from '@/scene/room/Room'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

// Constantes del polvo flotante
const DUST_COUNT = 70                 // Pocas partículas para no recargar
const DUST_SIZE = 1.0                 // Tamaño de cada partícula (en píxeles de Sparkles)
const DUST_SPEED = 0.18               // Velocidad de flotación
const DUST_OPACITY = 0.3
const DUST_NOISE = 0.6                // Irregularidad del movimiento
const DUST_COLOR = '#f3e6cf'          // Blanco cálido
// Volumen de la zona iluminada junto al ventanal: casi todo el ancho, de 0.2 a 2.2 m de altura y 2 m hacia dentro
const DUST_VOLUME_DEPTH = 2.0
const DUST_VOLUME_HEIGHT = 2.0
const DUST_VOLUME: Vector3Tuple = [ROOM_WIDTH * 0.8, DUST_VOLUME_HEIGHT, DUST_VOLUME_DEPTH]
// Centro del volumen: delante del cristal (cara interior del muro del ventanal)
const DUST_CENTER: Vector3Tuple = [0, FLOOR_Y + 0.2 + DUST_VOLUME_HEIGHT / 2, FRONT_WALL_INNER_Z - DUST_VOLUME_DEPTH / 2 - 0.1]

/**
 * Polvo flotando en la luz que entra por el ventanal.
 */
function DustParticles() {
  return (
    <Sparkles
      position={DUST_CENTER}
      scale={DUST_VOLUME}
      count={DUST_COUNT}
      size={DUST_SIZE}
      speed={DUST_SPEED}
      opacity={DUST_OPACITY}
      noise={DUST_NOISE}
      color={DUST_COLOR}
    />
  )
}

export default DustParticles
