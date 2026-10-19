// Lluvia tras el ventanal: gotas que caen por el jardín, cada una un trazo fino que se desvanece hacia arriba (como la
// estela que deja una gota al caer), con su propia velocidad y largo. Cuantas más gotas se pintan, más fuerte llueve; el
// viento las inclina y la bruma apaga las lejanas. Las posiciones se mueven en cada fotograma (cuesta muy poco).
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import type { LineSegments } from 'three'
import { FLOOR_Y, FRONT_WALL_Z } from '@/scene/room/Room'
// Aleatorio con semilla: las gotas empiezan siempre en los mismos sitios (y el render no depende del azar)
import { createRandom } from '@/utils/random'

// Gotas como mucho (con lluvia fuerte) y zona del jardín por la que caen (m): delante del ventanal hasta el muro del fondo
const MAX_DROPS = 1600
const AREA = { minX: -10, maxX: 10, minZ: FRONT_WALL_Z + 0.4, maxZ: 16, top: FLOOR_Y + 8 }
// Largo (m) y velocidad (m/s) de cada gota, al azar en estos rangos
const DROP_LENGTH: [number, number] = [0.12, 0.26]
const FALL_SPEED: [number, number] = [7, 10]
// Inclinación por el viento: metros de lado por cada metro de caída, por cada km/h (con tope)
const WIND_SLANT_PER_KMH = 0.008
const MAX_SLANT = 0.35
// Gris azulado apagado y poco opaco: la lluvia se intuye más que se ve
const DROP_COLOR = '#9eabb8'
const DROP_OPACITY = 0.22

// Dos puntos por gota (arriba y abajo), cada uno con x, y, z, repartidas por toda la zona. El color lleva transparencia
// por punto (r, g, b, a): arriba 0 y abajo 1, así cada trazo se desvanece hacia arriba. userData guarda el largo y la
// velocidad de cada gota
function createDropsGeometry() {
  const random = createRandom(41)
  const between = ([min, max]: [number, number]) => min + random() * (max - min)
  const positions = new Float32Array(MAX_DROPS * 6)
  const colors = new Float32Array(MAX_DROPS * 8)
  const lengths = new Float32Array(MAX_DROPS)
  const speeds = new Float32Array(MAX_DROPS)
  const { r, g, b } = new Color(DROP_COLOR)
  for (let i = 0; i < MAX_DROPS; i++) {
    lengths[i] = between(DROP_LENGTH)
    speeds[i] = between(FALL_SPEED)
    const x = between([AREA.minX, AREA.maxX])
    const y = between([FLOOR_Y, AREA.top])
    const z = between([AREA.minZ, AREA.maxZ])
    positions.set([x, y, z, x, y - lengths[i], z], i * 6)
    colors.set([r, g, b, 0, r, g, b, 1], i * 8)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 4))
  geometry.userData = { lengths, speeds }
  return geometry
}

/**
 * @param intensity - Lluvia: 0 (nada, no se pinta) a 1 (fuerte)
 * @param windSpeed - Viento en km/h (inclina las gotas)
 */
function RainFall({ intensity, windSpeed }: { intensity: number; windSpeed: number }) {
  const geometry = useMemo(() => createDropsGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const linesRef = useRef<LineSegments>(null)

  useFrame((_, delta) => {
    const lines = linesRef.current
    if (!lines) return
    // Solo se pintan (y se mueven) las primeras gotas, tantas como fuerte llueva
    const visible = Math.round(MAX_DROPS * intensity)
    lines.geometry.setDrawRange(0, visible * 2)
    const positions = lines.geometry.attributes.position as BufferAttribute
    const array = positions.array as Float32Array
    const { lengths, speeds } = lines.geometry.userData as { lengths: Float32Array; speeds: Float32Array }
    const step = Math.min(delta, 0.1)
    const slant = Math.min(MAX_SLANT, windSpeed * WIND_SLANT_PER_KMH)
    for (let i = 0; i < visible; i++) {
      const top = i * 6
      const fall = speeds[i] * step
      let y = array[top + 1] - fall
      let x = array[top] + fall * slant
      // Al llegar al suelo vuelve a caer desde arriba (y si el viento la saca por un lado, entra por el otro)
      if (y < FLOOR_Y) y += AREA.top - FLOOR_Y
      if (x > AREA.maxX) x -= AREA.maxX - AREA.minX
      array[top] = x
      array[top + 1] = y
      array[top + 3] = x + lengths[i] * slant
      array[top + 4] = y - lengths[i]
    }
    positions.needsUpdate = true
  })

  if (intensity <= 0) return null
  return (
    // frustumCulled=false: las gotas se mueven y la caja calculada al principio ya no vale
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={DROP_OPACITY} depthWrite={false} />
    </lineSegments>
  )
}

export default RainFall
