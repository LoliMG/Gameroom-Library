// Importación de useMemo de React para clonar y optimizar la escena 3D
import { useMemo } from 'react'
// Hook useGLTF de drei para carga del modelo GLB
import { useGLTF } from '@react-three/drei'
// Clases de Three.js para dibujar el contorno de la pared y extruirlo con grosor
import { Shape, ExtrudeGeometry } from 'three'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'

// Constantes de dimensiones base de la habitación en metros
export const DEFAULT_WALL_WIDTH = 4.5     // Ancho de la pared frontal c
export const DEFAULT_WALL_HEIGHT = 2.8    // Altura de suelo a techo (Y = -1.0 a +1.8)
export const DEFAULT_FLOOR_Y = -1.0       // Cota del suelo

// Color y grosor de la pared opaca que rodea los dos arcos del ventanal
export const WALL_COLOR = '#2f3a2c' // Verde bosque oscuro (Fase 11); lo usan también las demás paredes (Room.jsx)
export const WALL_THICKNESS = 0.12 // Algo más gruesa que el marco (~0.056 m) para formar un pequeño derrame

// Parámetros calculados a partir de la caja envolvente original de window.glb:
// Caja original: ancho X = 8.1288 m, alto Y = 4.5988 m, prof Z = 0.7509 m, centro X = 2.1688 m, min Y = -2.2224 m
const WINDOW_SCALE = modelsManifest.window.scale // 0.5536
const ORIGINAL_CENTER_X = 2.16879
const ORIGINAL_MIN_Y = -2.22237

// Desplazamiento X para centrar el ventanal en X = 0 (cubre exactamente de -2.25 m a +2.25 m)
const LOCAL_OFFSET_X = -ORIGINAL_CENTER_X * WINDOW_SCALE // ~ -1.2006 m

// El modelo contiene dos arcos idénticos; centros X en unidades originales (el primero en 0, el segundo simétrico respecto al centro)
const ARCH_CENTERS_X = [0, ORIGINAL_CENTER_X * 2] // 0 y 4.3376

// Contorno del cristal de un arco (mitad derecha, de abajo hacia la clave) en unidades originales del modelo,
// extraído de los vértices de la malla "f_2_glass_0". La mitad izquierda se obtiene por simetría.
const ARCH_GLASS_HALF_OUTLINE = [
  [1.83254, -2.23504],
  [1.83254, 1.23714],
  [1.58635, 1.54206],
  [1.29974, 1.82749],
  [0.95599, 2.0641],
  [0.59125, 2.21483],
  [0, 2.27025],
]
// Desplazamiento vertical que aplican los nodos padre del cristal (31.40 - 23.70 cm)
const ARCH_NODE_OFFSET_Y = 0.07704
// Margen hacia fuera desde el borde del cristal: el hueco queda algo más pequeño que el marco (~0.065)
// para que la pared monte ~1 cm sobre el marco y no se vea ninguna rendija
const ARCH_FRAME_BORDER = 0.045

// Calcula el contorno del hueco de un arco (de suelo a suelo pasando por la clave) en coordenadas locales de la pared
function getArchHolePoints(centerX, localOffsetY, floorY, halfWallWidth) {
  // Desplaza cada vértice de la mitad derecha hacia fuera según la normal media de sus dos tramos vecinos
  const halfOutline = ARCH_GLASS_HALF_OUTLINE.map(([x, y], i, pts) => {
    const segmentNormal = (a, b) => {
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const len = Math.hypot(dx, dy)
      return [dy / len, -dx / len] // Normal exterior al recorrer el contorno de abajo hacia arriba
    }
    const prev = i > 0 ? segmentNormal(pts[i - 1], pts[i]) : null
    const next = i < pts.length - 1 ? segmentNormal(pts[i], pts[i + 1]) : null
    // En la clave la normal apunta hacia arriba por simetría
    const [nx, ny] =
      i === pts.length - 1 ? [0, 1] : prev ? [(prev[0] + next[0]) / 2, (prev[1] + next[1]) / 2] : next
    const nLen = Math.hypot(nx, ny)
    return [x + (nx / nLen) * ARCH_FRAME_BORDER, y + (ny / nLen) * ARCH_FRAME_BORDER]
  })

  // Recorrido completo: lado izquierdo de abajo arriba, clave y lado derecho de arriba abajo
  const leftSide = halfOutline.slice(0, -1).map(([x, y]) => [-x, y])
  const rightSide = [...halfOutline].reverse()
  const fullOutline = [...leftSide, ...rightSide]

  return fullOutline.map(([x, y], i) => {
    // Paso de unidades del modelo a coordenadas locales de la pared (escala + centrado del ventanal)
    const wallX = LOCAL_OFFSET_X + (centerX + x) * WINDOW_SCALE
    const wallY = localOffsetY + (y + ARCH_NODE_OFFSET_Y) * WINDOW_SCALE
    // Los extremos del arco bajan hasta el suelo, ya que el ventanal apoya directamente en él
    const isFloorPoint = i === 0 || i === fullOutline.length - 1
    // Se recorta al ancho de la pared por si el marco sobresale unos milímetros
    return [
      Math.min(halfWallWidth, Math.max(-halfWallWidth, wallX)),
      isFloorPoint ? floorY : wallY,
    ]
  })
}

// Construye la geometría de la pared c: un rectángulo de suelo a techo con los dos arcos recortados
function createWallGeometry(width, height, floorY, localOffsetY) {
  const halfWidth = width / 2
  const ceilingY = floorY + height

  // Contorno inferior de la pared recorriendo ambos huecos de izquierda a derecha
  let points = ARCH_CENTERS_X.flatMap((centerX) =>
    getArchHolePoints(centerX, localOffsetY, floorY, halfWidth)
  )

  // Si el arco llega al borde de la pared, se descartan los puntos repetidos sobre ese borde
  // (solo se conserva el más alto a la izquierda y el más alto a la derecha) para no crear tramos solapados
  while (points.length > 1 && points[0][0] === -halfWidth && points[1][0] === -halfWidth) points.shift()
  while (points.length > 1 && points.at(-1)[0] === halfWidth && points.at(-2)[0] === halfWidth) points.pop()
  // Si no llega al borde, se añaden las esquinas inferiores de la pared
  if (points[0][0] > -halfWidth) points = [[-halfWidth, floorY], ...points]
  if (points.at(-1)[0] < halfWidth) points = [...points, [halfWidth, floorY]]

  // Cierre por las esquinas superiores (techo)
  points = [...points, [halfWidth, ceilingY], [-halfWidth, ceilingY]]

  const shape = new Shape()
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()

  // Extrusión con el grosor de la pared, centrada en Z = 0 para que el marco quede dentro del derrame
  const geometry = new ExtrudeGeometry(shape, { depth: WALL_THICKNESS, bevelEnabled: false })
  geometry.translate(0, 0, -WALL_THICKNESS / 2)
  return geometry
}

// Helper para configurar sombras y transparencia del cristal
function setupWindowMeshes(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      if (node.material && node.material.name === 'glass') {
        // Material del cristal: aseguramos profundidad de escritura falsa para que el jardín exterior sea visible
        node.material.depthWrite = false
        node.material.transparent = true
        node.castShadow = false
        node.receiveShadow = false
      } else {
        // Marcos y perfiles metálicos: proyectan y reciben sombras
        node.castShadow = true
        node.receiveShadow = true
      }
    }
  })
  return scene
}

/**
 * Componente que representa la pared c (frontal) con el modelo 3D window.glb.
 * La parte inferior del ventanal toca el suelo (floorY = -1.0 m) y su altura llega a ~2.55 m.
 * Alrededor de los dos arcos se levanta una pared opaca de suelo a techo con los huecos recortados,
 * de modo que solo el cristal de los arcos es translúcido.
 */
function WindowWall({
  width = DEFAULT_WALL_WIDTH,
  height = DEFAULT_WALL_HEIGHT,
  floorY = DEFAULT_FLOOR_Y,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  // Carga del modelo GLB desde el manifiesto
  const { scene } = useGLTF(modelsManifest.window.url)

  // Clonación y configuración de sombras y materiales de cristal
  const clonedScene = useMemo(() => setupWindowMeshes(scene.clone()), [scene])

  // Cota Y local para que la base del ventanal apoye exactamente sobre el suelo (floorY)
  const localOffsetY = floorY - ORIGINAL_MIN_Y * WINDOW_SCALE // -1.0 + 1.2303 = +0.2303 m

  // Geometría de la pared con los huecos de los arcos; se recalcula solo si cambian las medidas
  const wallGeometry = useMemo(
    () => createWallGeometry(width, height, floorY, localOffsetY),
    [width, height, floorY, localOffsetY]
  )

  return (
    <group position={position} rotation={rotation}>
      {/* 1. MODELO 3D REAL DEL VENTANAL (window.glb) */}
      <primitive
        object={clonedScene}
        position={[LOCAL_OFFSET_X, localOffsetY, 0]}
        scale={WINDOW_SCALE}
        rotation={[0, 0, 0]}
      />

      {/* 2. PARED OPACA DE SUELO A TECHO con los dos arcos recortados; proyecta sombra para que la luz solo entre por el cristal */}
      <mesh geometry={wallGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    </group>
  )
}

export default WindowWall
