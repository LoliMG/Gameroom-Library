// useMemo crea las geometrías, texturas y materiales una sola vez
import { useMemo } from 'react'
// Clases de three.js para la cúpula del cielo, las siluetas de las colinas y el degradado del prado
import { BackSide, CanvasTexture, Color, Shape, ShapeGeometry, SRGBColorSpace, Vector3 } from 'three'
// Colores del cielo de la paleta activa
import { PALETTE } from '@/scene/ambiencePalette'
// Cota del suelo de la habitación
import { FLOOR_Y } from '@/scene/Room'
// Aleatorio con semilla: las colinas salen siempre iguales
import { createRandom } from '@/utils/random'

// Cúpula del cielo: esfera vista desde dentro que rodea todo el jardín
const SKY_RADIUS = 180
// Dirección del sol: al fondo (+Z), algo a la derecha vista desde la sala (X negativa) y justo sobre las colinas.
// La luz del ventanal (Lights.jsx) viene del mismo lado, un poco más alta para que entre en la sala.
const SUN_DIRECTION = new Vector3(-0.22, 0.055, 1).normalize()
// Color del disco del sol (por encima de 1 para que lo recoja el bloom)
const SUN_COLOR = new Color(1.6, 1.15, 0.6)

// Capas de colinas, de lejos a cerca: distancia, altura de las crestas sobre el suelo y color.
// Cuanto más lejos, más clara y rosada (se funden con la bruma del horizonte), como en un atardecer real
const HILL_LAYERS = [
  { distance: 120, minHeight: 6, maxHeight: 14, color: '#d49a8e', seed: 3 },
  { distance: 80, minHeight: 3, maxHeight: 9, color: '#a0768a', seed: 7 },
  { distance: 48, minHeight: 1.5, maxHeight: 5, color: '#5d546b', seed: 13 },
]

// Prado alrededor de la casa hasta las colinas: verde cerca y bruma violeta al fondo
const MEADOW_START_Z = -30
const MEADOW_LENGTH = 150
const MEADOW_NEAR_COLOR = '#3f4a2c'
const MEADOW_FAR_COLOR = '#6a5a6e'

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
function createHillGeometry({ distance, minHeight, maxHeight, seed }) {
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
function createMeadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, MEADOW_NEAR_COLOR)
  gradient.addColorStop(1, MEADOW_FAR_COLOR)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 4, 256)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Fondo del atardecer: cielo con el sol bajo, colinas en capas y prado hasta ellas.
 * Nada de esto lleva niebla ni luces: sus colores ya son los de la bruma del atardecer.
 */
function SunsetSky() {
  const skyUniforms = useMemo(
    () => ({
      zenithColor: { value: new Color(PALETTE.skyTop) },
      horizonColor: { value: new Color(PALETTE.skyBottom) },
      glowColor: { value: new Color(PALETTE.skyGlow) },
      sunColor: { value: SUN_COLOR },
      sunDirection: { value: SUN_DIRECTION },
    }),
    []
  )
  const hills = useMemo(() => HILL_LAYERS.map((layer) => ({ ...layer, geometry: createHillGeometry(layer) })), [])
  const meadowTexture = useMemo(() => createMeadowTexture(), [])

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
      {hills.map(({ distance, color, geometry }) => (
        <mesh key={distance} geometry={geometry} position={[0, FLOOR_Y, distance]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial color={color} fog={false} />
        </mesh>
      ))}

      {/* Prado hasta las colinas, un poco por debajo del césped del jardín */}
      <mesh position={[0, FLOOR_Y - 0.05, MEADOW_START_Z + MEADOW_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MEADOW_LENGTH * 2.5, MEADOW_LENGTH]} />
        <meshBasicMaterial map={meadowTexture} fog={false} />
      </mesh>
    </group>
  )
}

export default SunsetSky
