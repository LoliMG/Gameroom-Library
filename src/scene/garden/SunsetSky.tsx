// useMemo crea las geometrías y texturas; useEffect pone los colores del momento del día en el cielo
import { useEffect, useMemo } from 'react'
// Clases de three.js para la cúpula del cielo, las siluetas de las colinas, el degradado del prado y las estrellas
import { BackSide, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Shape, ShapeGeometry, SRGBColorSpace } from 'three'
// Ambiente del momento del día (useAmbience): colores, dirección y altura del sol
import type { Ambience } from '@/hooks/useAmbience'
// Cota del suelo de la habitación
import { FLOOR_Y } from '@/scene/room/Room'
// Aleatorio con semilla: las colinas salen siempre iguales
import { createRandom } from '@/utils/random'

// Cúpula del cielo: esfera vista desde dentro que rodea todo el jardín
const SKY_RADIUS = 180
// Color del disco del sol (por encima de 1 para que lo recoja el bloom)
const SUN_COLOR = new Color(1.6, 1.15, 0.6)
// Estrellas: cuántas, a qué distancia (dentro de la cúpula) y su tamaño en píxeles
const STAR_COUNT = 1500
const STAR_RADIUS = 170
const STAR_SIZE = 1.6

// Capas de colinas, de lejos a cerca: distancia y altura de las crestas sobre el suelo. Sus colores son los del momento
// del día (palette.hills, de la más lejana a la más cercana): de día verdes azulados, al atardecer rosados, de noche azul oscuro
/** Capa de colinas: distancia a la casa, altura de las crestas y semilla de su forma */
interface HillLayer {
  distance: number
  minHeight: number
  maxHeight: number
  seed: number
}

const HILL_LAYERS: HillLayer[] = [
  { distance: 120, minHeight: 6, maxHeight: 14, seed: 3 },
  { distance: 80, minHeight: 3, maxHeight: 9, seed: 7 },
  { distance: 48, minHeight: 1.5, maxHeight: 5, seed: 13 },
]

// Prado alrededor de la casa hasta las colinas (sus dos colores, cerca y al fondo, son los del momento del día)
const MEADOW_START_Z = -30
const MEADOW_LENGTH = 150

// Sombreador del cielo: degradado del horizonte al cénit, resplandor dorado alrededor del sol y su disco
const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFragmentShader = /* glsl */ `
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 glowColor;
  uniform vec3 sunColor;
  uniform vec3 sunDirection;
  varying vec3 vDirection;
  void main() {
    vec3 direction = normalize(vDirection);
    float height = max(direction.y, 0.0);
    // Exponente < 1: el color cálido del horizonte sube poco y el cielo se oscurece hacia arriba
    vec3 color = mix(horizonColor, zenithColor, pow(height, 0.45));
    float towardSun = max(dot(direction, sunDirection), 0.0);
    // Resplandor amplio alrededor del sol, más fuerte cerca del horizonte
    color = mix(color, glowColor, pow(towardSun, 5.0) * (1.0 - height));
    // Disco del sol con un halo pequeño
    color += sunColor * (smoothstep(0.9994, 0.9997, towardSun) * 2.5 + pow(towardSun, 300.0) * 1.2);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

// Silueta de una capa de colinas: crestas suaves (suma de senos con fase al azar) y base muy por debajo del horizonte
function createHillGeometry({ distance, minHeight, maxHeight, seed }: HillLayer) {
  const random = createRandom(seed)
  const width = distance * 3
  const waves = [0, 1, 2].map((i) => ({ frequency: (1.5 + random() * 2) * (i + 1), phase: random() * Math.PI * 2 }))
  const shape = new Shape()
  shape.moveTo(-width / 2, -40)
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const wave = waves.reduce((sum, w, k) => sum + Math.sin(t * w.frequency * Math.PI + w.phase) / (k + 1), 0)
    // wave va de -1.83 a 1.83: se lleva al rango de alturas
    const height = minHeight + ((wave / 1.83 + 1) / 2) * (maxHeight - minHeight)
    shape.lineTo(-width / 2 + t * width, height)
  }
  shape.lineTo(width / 2, -40)
  return new ShapeGeometry(shape)
}

// Degradado del prado: arriba de la textura lo cercano (el plano tumbado lleva su borde superior hacia la casa, -Z)
function createMeadowTexture(nearColor: string, farColor: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256
  // Lienzo nuevo: getContext('2d') no puede devolver null
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, nearColor)
  gradient.addColorStop(1, farColor)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 4, 256)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Estrellas repartidas al azar (siempre igual) por la mitad de arriba de la cúpula
function createStarGeometry() {
  const random = createRandom(29)
  const positions: number[] = []
  for (let i = 0; i < STAR_COUNT; i++) {
    // Punto uniforme sobre la semiesfera: altura y en [0.03, 1] (no pegadas al horizonte, que tapan las colinas)
    const y = 0.03 + random() * 0.97
    const angle = random() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)
    positions.push(Math.cos(angle) * ring * STAR_RADIUS, y * STAR_RADIUS, Math.sin(angle) * ring * STAR_RADIUS)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

/**
 * Fondo de la sala según la hora: cielo con el sol donde está de verdad, colinas en capas, prado y estrellas de noche.
 * Nada de esto lleva niebla ni luces: sus colores ya son los de la bruma de cada momento del día.
 */
function SunsetSky({ ambience }: { ambience: Ambience }) {
  const { palette, sunDirection, sunElevation } = ambience
  const skyUniforms = useMemo(
    () => ({
      zenithColor: { value: new Color() },
      horizonColor: { value: new Color() },
      glowColor: { value: new Color() },
      sunColor: { value: new Color() },
      sunDirection: { value: sunDirection.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los valores se ponen abajo, en cada cambio del ambiente
    []
  )
  // Colores del momento y sol: su disco se ve solo cuando está sobre el horizonte (de -1° a 2° va apareciendo)
  useEffect(() => {
    skyUniforms.zenithColor.value.set(palette.skyTop)
    skyUniforms.horizonColor.value.set(palette.skyBottom)
    skyUniforms.glowColor.value.set(palette.skyGlow)
    skyUniforms.sunColor.value.copy(SUN_COLOR).multiplyScalar(Math.min(1, Math.max(0, (sunElevation + 1) / 3)))
    skyUniforms.sunDirection.value.copy(sunDirection)
  }, [skyUniforms, palette, sunDirection, sunElevation])
  const hills = useMemo(() => HILL_LAYERS.map((layer) => ({ ...layer, geometry: createHillGeometry(layer) })), [])
  const meadowTexture = useMemo(() => createMeadowTexture(palette.meadowNear, palette.meadowFar), [palette.meadowNear, palette.meadowFar])
  useEffect(() => () => meadowTexture.dispose(), [meadowTexture])
  const starGeometry = useMemo(() => createStarGeometry(), [])

  return (
    <group>
      {/* Cúpula del cielo: se dibuja la primera y no escribe profundidad, así queda detrás de todo */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
        <shaderMaterial
          uniforms={skyUniforms}
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Colinas: siluetas planas mirando a la casa (giradas 180° para verse desde -Z) */}
      {hills.map(({ distance, geometry }, i) => (
        <mesh key={distance} geometry={geometry} position={[0, FLOOR_Y, distance]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial color={palette.hills[i]} fog={false} />
        </mesh>
      ))}

      {/* Estrellas: aparecen en el crepúsculo y brillan del todo de noche (detrás de las colinas, como el cielo) */}
      {palette.stars > 0 && (
        <points geometry={starGeometry} renderOrder={-1}>
          <pointsMaterial color="#ffffff" size={STAR_SIZE} sizeAttenuation={false} transparent opacity={palette.stars} depthWrite={false} fog={false} />
        </points>
      )}

      {/* Prado hasta las colinas, un poco por debajo del césped del jardín */}
      <mesh position={[0, FLOOR_Y - 0.05, MEADOW_START_Z + MEADOW_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MEADOW_LENGTH * 2.5, MEADOW_LENGTH]} />
        <meshBasicMaterial map={meadowTexture} fog={false} />
      </mesh>
    </group>
  )
}

export default SunsetSky
