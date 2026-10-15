// Importación de useMemo de React para generar las texturas una sola vez
import { useMemo } from 'react'
// CanvasTexture y espacio de color para las texturas generadas (cuadro y globo)
import { CanvasTexture, SRGBColorSpace } from 'three'
// Cálculo de puntos de apoyo sobre las baldas con la misma geometría que las estanterías
import { getShelfSlot } from '@/scene/shelfWalls'

// --- Marcos de cuadro ---
const FRAME_WIDTH = 0.16           // Ancho exterior (m)
const FRAME_HEIGHT = 0.21          // Alto exterior (m), menor que el hueco entre baldas (~0.29 m)
const FRAME_BORDER = 0.018         // Ancho del marco
const FRAME_THICKNESS = 0.015      // Grosor del marco
const FRAME_LEAN = -0.18           // Inclinación hacia atrás (apoyado en el fondo de la balda), rad
const FRAME_COLORS = ['#6b4a1e', '#2b1d12', '#7a6232'] // Dorado viejo, ébano, latón

// --- Esfera de cristal sobre peana ---
const SPHERE_RADIUS = 0.06
const SPHERE_STAND_HEIGHT = 0.025
const SPHERE_STAND_RADIUS = 0.035
const SPHERE_STAND_COLOR = '#3b2a1a'
const GLASS_COLOR = '#cfe3ea'
const GLASS_OPACITY = 0.28

// --- Globo terráqueo pequeño ---
const GLOBE_RADIUS = 0.07
const GLOBE_BASE_RADIUS = 0.045
const GLOBE_BASE_HEIGHT = 0.015
const GLOBE_STEM_HEIGHT = 0.04
const GLOBE_TILT = 0.41            // Inclinación del eje terrestre (~23.5°)
const GLOBE_OCEAN_COLOR = '#2c4a63'
const GLOBE_LAND_COLOR = '#b49a63'
const GLOBE_METAL_COLOR = '#8a6a32'
const TEXTURE_WIDTH = 256
const TEXTURE_HEIGHT = 128

// Lista determinista de objetos y sus huecos. Se evitan los huecos con libros (balda 0 del módulo 0 de d)
// y los huecos con velas (ShelfCandles). along: -0.5…0.5 a lo largo del hueco; depth: avance desde el centro del fondo (m).
const DECOR_ITEMS = [
  { type: 'frame', wall: 'd', module: 2, shelf: 2, along: -0.2, depth: -0.07, variant: 0 },
  { type: 'frame', wall: 'a', module: 1, shelf: 4, along: 0.18, depth: -0.07, variant: 1 },
  { type: 'frame', wall: 'a', module: 4, shelf: 1, along: -0.22, depth: -0.07, variant: 2 },
  { type: 'sphere', wall: 'd', module: 1, shelf: 6, along: 0.22, depth: 0.0 },
  { type: 'globe', wall: 'a', module: 2, shelf: 3, along: 0.05, depth: 0.0 },
]

// Pinta en un lienzo un paisaje sencillo (cielo, colinas y luna) para el interior de los cuadros
function createPaintingTexture(variant) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const skies = [
    ['#1d2440', '#6a5a7a'],
    ['#2a3a2a', '#9aa77a'],
    ['#3a2418', '#c08a50'],
  ]
  const [top, bottom] = skies[variant % skies.length]
  const sky = ctx.createLinearGradient(0, 0, 0, 128)
  sky.addColorStop(0, top)
  sky.addColorStop(1, bottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 96, 128)
  // Luna
  ctx.fillStyle = 'rgba(240,230,200,0.85)'
  ctx.beginPath()
  ctx.arc(66, 34, 9, 0, Math.PI * 2)
  ctx.fill()
  // Colinas en dos capas
  ctx.fillStyle = 'rgba(20,28,20,0.85)'
  ctx.beginPath()
  ctx.moveTo(0, 96)
  ctx.quadraticCurveTo(30, 70, 60, 92)
  ctx.quadraticCurveTo(80, 104, 96, 88)
  ctx.lineTo(96, 128)
  ctx.lineTo(0, 128)
  ctx.fill()
  ctx.fillStyle = '#0f150f'
  ctx.beginPath()
  ctx.moveTo(0, 112)
  ctx.quadraticCurveTo(48, 96, 96, 114)
  ctx.lineTo(96, 128)
  ctx.lineTo(0, 128)
  ctx.fill()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Pinta un mapa simplificado (océano y manchas de tierra) para el globo terráqueo
function createGlobeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_WIDTH
  canvas.height = TEXTURE_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = GLOBE_OCEAN_COLOR
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)
  ctx.fillStyle = GLOBE_LAND_COLOR
  // Continentes como elipses fijas: [x, y, radio x, radio y, giro]
  const lands = [
    [40, 40, 22, 14, 0.4], [55, 78, 12, 22, 0.2], [120, 38, 30, 12, -0.2],
    [128, 72, 14, 18, 0.1], [180, 45, 26, 16, 0.3], [205, 92, 14, 8, 0], [90, 112, 60, 6, 0],
  ]
  lands.forEach(([x, y, rx, ry, rot]) => {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
    ctx.fill()
  })
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Marco de cuadro apoyado en la balda e inclinado hacia el fondo
function PictureFrame({ variant }) {
  const painting = useMemo(() => createPaintingTexture(variant), [variant])
  const color = FRAME_COLORS[variant % FRAME_COLORS.length]
  const innerWidth = FRAME_WIDTH - 2 * FRAME_BORDER
  const innerHeight = FRAME_HEIGHT - 2 * FRAME_BORDER
  return (
    // Giro en X desde la base para apoyarlo inclinado contra el fondo de la balda
    <group rotation={[FRAME_LEAN, 0, 0]}>
      {/* Cuatro listones del marco */}
      {[
        [0, FRAME_HEIGHT - FRAME_BORDER / 2, FRAME_WIDTH, FRAME_BORDER],
        [0, FRAME_BORDER / 2, FRAME_WIDTH, FRAME_BORDER],
        [-FRAME_WIDTH / 2 + FRAME_BORDER / 2, FRAME_HEIGHT / 2, FRAME_BORDER, innerHeight],
        [FRAME_WIDTH / 2 - FRAME_BORDER / 2, FRAME_HEIGHT / 2, FRAME_BORDER, innerHeight],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, FRAME_THICKNESS]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.3} />
        </mesh>
      ))}
      {/* Lienzo pintado, un poco hundido en el marco */}
      <mesh position={[0, FRAME_HEIGHT / 2, -FRAME_THICKNESS * 0.2]}>
        <planeGeometry args={[innerWidth, innerHeight]} />
        <meshStandardMaterial map={painting} roughness={0.9} />
      </mesh>
    </group>
  )
}

// Esfera de cristal sobre una peana de madera
function GlassSphere() {
  return (
    <group>
      <mesh position={[0, SPHERE_STAND_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[SPHERE_STAND_RADIUS * 0.8, SPHERE_STAND_RADIUS, SPHERE_STAND_HEIGHT, 20]} />
        <meshStandardMaterial color={SPHERE_STAND_COLOR} roughness={0.6} />
      </mesh>
      {/* Cristal: material físico transparente y muy liso; refleja el entorno (Environment) */}
      <mesh position={[0, SPHERE_STAND_HEIGHT + SPHERE_RADIUS * 0.92, 0]}>
        <sphereGeometry args={[SPHERE_RADIUS, 32, 24]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={GLASS_OPACITY}
          roughness={0.05}
          metalness={0}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// Globo terráqueo pequeño con peana, vástago y meridiano metálico
function Globe() {
  const map = useMemo(() => createGlobeTexture(), [])
  // Altura del centro del globo: base + vástago + radio
  const centerY = GLOBE_BASE_HEIGHT + GLOBE_STEM_HEIGHT + GLOBE_RADIUS
  return (
    <group>
      <mesh position={[0, GLOBE_BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[GLOBE_BASE_RADIUS * 0.7, GLOBE_BASE_RADIUS, GLOBE_BASE_HEIGHT, 20]} />
        <meshStandardMaterial color={GLOBE_METAL_COLOR} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, GLOBE_BASE_HEIGHT + GLOBE_STEM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.006, GLOBE_STEM_HEIGHT, 8]} />
        <meshStandardMaterial color={GLOBE_METAL_COLOR} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Globo y meridiano inclinados como el eje terrestre */}
      <group position={[0, centerY, 0]} rotation={[0, 0, GLOBE_TILT]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[GLOBE_RADIUS, 32, 20]} />
          <meshStandardMaterial map={map} roughness={0.55} />
        </mesh>
        {/* Meridiano: anillo fino que rodea el globo */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[GLOBE_RADIUS * 1.08, 0.003, 6, 40]} />
          <meshStandardMaterial color={GLOBE_METAL_COLOR} roughness={0.35} metalness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Objetos decorativos entre los libros: marcos de cuadro, una esfera de cristal y un globo terráqueo,
 * colocados en huecos fijos de las baldas.
 */
function ShelfDecor() {
  return (
    <group>
      {DECOR_ITEMS.map((item) => {
        const { position, rotationY } = getShelfSlot(item.wall, item.module, item.shelf, item.along, item.depth)
        return (
          // Cada objeto se orienta como su pared para mirar al interior de la sala
          <group key={`${item.type}-${item.wall}-${item.module}-${item.shelf}`} position={position} rotation={[0, rotationY, 0]}>
            {item.type === 'frame' && <PictureFrame variant={item.variant} />}
            {item.type === 'sphere' && <GlassSphere />}
            {item.type === 'globe' && <Globe />}
          </group>
        )
      })}
    </group>
  )
}

export default ShelfDecor
