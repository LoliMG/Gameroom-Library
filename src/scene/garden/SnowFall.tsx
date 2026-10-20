// Nieve tras el ventanal: copos redondos y suaves que caen despacio meciéndose, empujados por el viento. Cuantos más copos
// se pintan, más fuerte nieva. Misma idea que RainFall (posiciones movidas en cada fotograma), con puntos en vez de trazos
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Color } from 'three'
import type { Points } from 'three'
import { FLOOR_Y, FRONT_WALL_Z } from '@/scene/room/Room'
import { createRandom } from '@/utils/random'

// Copos como mucho (con nevada fuerte) y zona del jardín por la que caen (m), la misma que la lluvia
const MAX_FLAKES = 2500
const AREA = { minX: -10, maxX: 10, minZ: FRONT_WALL_Z + 0.4, maxZ: 16, top: FLOOR_Y + 8 }
// Velocidad de caída (m/s) de cada copo, al azar en este rango
const FALL_SPEED: [number, number] = [0.5, 1.1]
// Vaivén de lado: metros por segundo y veces por segundo (× 2π)
const SWAY = 0.35
const SWAY_RATE: [number, number] = [0.3, 0.8]
// Deriva por el viento: metros por segundo por cada km/h (con tope)
const WIND_DRIFT_PER_KMH = 0.05
const MAX_DRIFT = 2
// Tamaño del copo (m, se ve más pequeño cuanto más lejos) y su color de día y de noche
const FLAKE_SIZE = 0.06
const DAY_COLOR = new Color('#ffffff')
const NIGHT_COLOR = new Color('#6f7a94')

// Copo: un punto blanco que se difumina hacia el borde (sin textura, los puntos se pintan cuadrados)
function createFlakeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.6)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 32, 32)
  }
  return new CanvasTexture(canvas)
}

// Un punto por copo repartido por toda la zona; userData guarda su velocidad, su ritmo de vaivén y su fase
function createFlakesGeometry() {
  const random = createRandom(57)
  const between = ([min, max]: [number, number]) => min + random() * (max - min)
  const positions = new Float32Array(MAX_FLAKES * 3)
  const speeds = new Float32Array(MAX_FLAKES)
  const rates = new Float32Array(MAX_FLAKES)
  const phases = new Float32Array(MAX_FLAKES)
  for (let i = 0; i < MAX_FLAKES; i++) {
    positions.set([between([AREA.minX, AREA.maxX]), between([FLOOR_Y, AREA.top]), between([AREA.minZ, AREA.maxZ])], i * 3)
    speeds[i] = between(FALL_SPEED)
    rates[i] = between(SWAY_RATE) * 2 * Math.PI
    phases[i] = random() * 2 * Math.PI
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.userData = { speeds, rates, phases }
  return geometry
}

/**
 * @param intensity - Nieve: 0 (nada, no se pinta) a 1 (fuerte)
 * @param windSpeed - Viento en km/h (arrastra los copos)
 * @param night - 0 (día) a 1 (noche cerrada): de noche los copos no brillan blancos, se ven grises azulados
 */
function SnowFall({ intensity, windSpeed, night }: { intensity: number; windSpeed: number; night: number }) {
  const geometry = useMemo(() => createFlakesGeometry(), [])
  const texture = useMemo(() => createFlakeTexture(), [])
  useEffect(
    () => () => {
      geometry.dispose()
      texture.dispose()
    },
    [geometry, texture]
  )
  const color = useMemo(() => DAY_COLOR.clone().lerp(NIGHT_COLOR, night), [night])
  const pointsRef = useRef<Points>(null)

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current
    if (!points) return
    // Solo se pintan (y se mueven) los primeros copos, tantos como fuerte nieve
    const visible = Math.round(MAX_FLAKES * intensity)
    points.geometry.setDrawRange(0, visible)
    const positions = points.geometry.attributes.position as BufferAttribute
    const array = positions.array as Float32Array
    const { speeds, rates, phases } = points.geometry.userData as { speeds: Float32Array; rates: Float32Array; phases: Float32Array }
    const step = Math.min(delta, 0.1)
    const drift = Math.min(MAX_DRIFT, windSpeed * WIND_DRIFT_PER_KMH)
    const time = clock.elapsedTime
    for (let i = 0; i < visible; i++) {
      let x = array[i * 3] + (drift + Math.sin(time * rates[i] + phases[i]) * SWAY) * step
      let y = array[i * 3 + 1] - speeds[i] * step
      // Al llegar al suelo vuelve a caer desde arriba (y si sale por un lado, entra por el otro)
      if (y < FLOOR_Y) y += AREA.top - FLOOR_Y
      if (x > AREA.maxX) x -= AREA.maxX - AREA.minX
      if (x < AREA.minX) x += AREA.maxX - AREA.minX
      array[i * 3] = x
      array[i * 3 + 1] = y
    }
    positions.needsUpdate = true
  })

  if (intensity <= 0) return null
  return (
    // frustumCulled=false: los copos se mueven y la caja calculada al principio ya no vale
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial map={texture} color={color} size={FLAKE_SIZE} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  )
}

export default SnowFall
