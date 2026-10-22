// Importación de useMemo de React para clonar y optimizar la escena 3D
import { useLayoutEffect, useMemo, useRef } from 'react'
// useFrame abre y cierra las hojas poco a poco
import { useFrame } from '@react-three/fiber'
import Clickable from '@/scene/shared/Clickable'
// Hook useGLTF de drei para carga del modelo GLB
import { useGLTF } from '@react-three/drei'
// Clases de Three.js para dibujar el contorno de la pared y extruirlo con grosor
import { Box3, MathUtils, Object3D as Pivot, Quaternion, Shape, ExtrudeGeometry, Vector3 } from 'three'
import type { Material, Mesh, Object3D } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Papel pintado de las paredes
import useWallpaper, { WALLPAPER_TILE_SIZE, WALLPAPER_TINT } from '@/hooks/useWallpaper'

// Punto [x, y] de un contorno plano
type Point = [number, number]

// Hojas de los dos arcos (dos por arco, cada una con su marco y su cristal), lo que se abren hacia el jardín y rapidez
const LEAF_NODES = ['win', 'win_1', 'win_2', 'win_1_2']
const OPEN_ANGLE = MathUtils.degToRad(75)
const OPEN_DAMPING = 3

// Bisagra de una hoja: un pivote en el canto exterior de la hoja (el que da al marco del arco) que la hace girar sobre
// la vertical. sign: hacia dónde gira para abrirse hacia el jardín (+Z). Se guarda en la hoja: si se vuelve a preparar
// (React lo hace dos veces en desarrollo) se reutiliza
interface Hinge {
  pivot: Pivot
  axis: Vector3
  sign: number
}
function hingeLeaf(scene: Object3D, name: string): Hinge | null {
  const leaf = scene.getObjectByName(name)
  if (!leaf) return null
  if (leaf.userData.hinge) return leaf.userData.hinge as Hinge
  const arch = leaf.parent!
  // En window.glb las hojas de un arco vienen entreabiertas: cerradas, como las del otro, hasta que se abra la ventana
  leaf.rotation.set(0, 0, 0)
  scene.updateMatrixWorld(true)
  const leafBox = new Box3().setFromObject(leaf)
  const archCenter = new Box3().setFromObject(arch).getCenter(new Vector3())
  const center = leafBox.getCenter(new Vector3())
  // La hoja de la izquierda de su arco gira sobre su canto izquierdo; la de la derecha, sobre el derecho
  const hingeOnLeft = center.x < archCenter.x
  const pivot = new Pivot()
  arch.add(pivot)
  pivot.position.copy(arch.worldToLocal(new Vector3(hingeOnLeft ? leafBox.min.x : leafBox.max.x, center.y, center.z)))
  pivot.updateMatrixWorld(true)
  pivot.attach(leaf)
  // La vertical de la escena en el espacio del arco (los nodos del modelo pueden venir girados)
  const axis = new Vector3(0, 1, 0).applyQuaternion(arch.getWorldQuaternion(new Quaternion()).invert())
  const hinge = { pivot, axis, sign: hingeOnLeft ? -1 : 1 }
  leaf.userData.hinge = hinge
  return hinge
}

// Valores por defecto de la pared en metros (el ancho no tiene: lo marca la habitación, ROOM_WIDTH en Room.tsx)
export const DEFAULT_WALL_HEIGHT = 2.8    // Altura de suelo a techo (Y = -1.0 a +1.8)
export const DEFAULT_FLOOR_Y = -1.0       // Cota del suelo

// Color y grosor de la pared opaca que rodea los dos arcos del ventanal
export const WALL_THICKNESS = 0.12 // Algo más gruesa que el marco (~0.056 m) para formar un pequeño derrame

// Parámetros calculados a partir de la caja envolvente original de window.glb:
// Caja original: ancho X = 8.1288 m, alto Y = 4.5988 m, prof Z = 0.7509 m, centro X = 2.1688 m, min Y = -2.2224 m
const WINDOW_SCALE = modelsManifest.window.scale // 0.5536
const ORIGINAL_CENTER_X = 2.16879
const ORIGINAL_MIN_Y = -2.22237
const ORIGINAL_WIDTH = 8.1288

// Ancho del ventanal ya escalado (8.1288 × 0.5536 ≈ 4.50 m): la habitación se dimensiona a partir de él
export const WINDOW_WIDTH = ORIGINAL_WIDTH * WINDOW_SCALE
// Medio ancho exterior del marco de cada arco (caja del nodo f_2: de -1.9 a 1.9 unidades originales)
const ARCH_FRAME_HALF_WIDTH = 1.9
// Muro visible entre los dos arcos: separación entre centros menos un marco entero ((4.3376 - 3.8) × 0.5536 ≈ 0.30 m)
export const WINDOW_PIER_WIDTH = (ORIGINAL_CENTER_X * 2 - 2 * ARCH_FRAME_HALF_WIDTH) * WINDOW_SCALE

// Desplazamiento X para centrar el ventanal en X = 0 (cubre de -2.25 m a +2.25 m)
const LOCAL_OFFSET_X = -ORIGINAL_CENTER_X * WINDOW_SCALE // ~ -1.2006 m

// El modelo contiene dos arcos idénticos; centros X en unidades originales (el primero en 0, el segundo simétrico respecto al centro)
const ARCH_CENTERS_X = [0, ORIGINAL_CENTER_X * 2] // 0 y 4.3376

// Contorno del cristal de un arco (mitad derecha, de abajo hacia la clave) en unidades originales del modelo,
// extraído de los vértices de la malla "f_2_glass_0". La mitad izquierda se obtiene por simetría.
const ARCH_GLASS_HALF_OUTLINE: Point[] = [
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
function getArchHolePoints(centerX: number, localOffsetY: number, floorY: number, halfWallWidth: number): Point[] {
  // Desplaza cada vértice de la mitad derecha hacia fuera según la normal media de sus dos tramos vecinos
  const halfOutline = ARCH_GLASS_HALF_OUTLINE.map(([x, y], i, pts): Point => {
    const segmentNormal = (a: Point, b: Point): Point => {
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const len = Math.hypot(dx, dy)
      return [dy / len, -dx / len] // Normal exterior al recorrer el contorno de abajo hacia arriba
    }
    const prev = i > 0 ? segmentNormal(pts[i - 1], pts[i]) : null
    const next = i < pts.length - 1 ? segmentNormal(pts[i], pts[i + 1]) : null
    // En la clave la normal apunta hacia arriba por simetría. Fuera de la clave siempre hay tramo siguiente (next!)
    const [nx, ny] =
      i === pts.length - 1 ? [0, 1] : prev ? [(prev[0] + next![0]) / 2, (prev[1] + next![1]) / 2] : next!
    const nLen = Math.hypot(nx, ny)
    return [x + (nx / nLen) * ARCH_FRAME_BORDER, y + (ny / nLen) * ARCH_FRAME_BORDER]
  })

  // Recorrido completo: lado izquierdo de abajo arriba, clave y lado derecho de arriba abajo
  const leftSide = halfOutline.slice(0, -1).map(([x, y]): Point => [-x, y])
  const rightSide = [...halfOutline].reverse()
  const fullOutline = [...leftSide, ...rightSide]

  return fullOutline.map(([x, y], i): Point => {
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
function createWallGeometry(width: number, height: number, floorY: number, localOffsetY: number) {
  const halfWidth = width / 2
  const ceilingY = floorY + height

  // Contorno inferior de la pared recorriendo ambos huecos de izquierda a derecha
  let points: Point[] = ARCH_CENTERS_X.flatMap((centerX) =>
    getArchHolePoints(centerX, localOffsetY, floorY, halfWidth)
  )

  // Si el arco llega al borde de la pared, se descartan los puntos repetidos sobre ese borde
  // (solo se conserva el más alto a la izquierda y el más alto a la derecha) para no crear tramos solapados
  while (points.length > 1 && points[0][0] === -halfWidth && points[1][0] === -halfWidth) points.shift()
  while (points.length > 1 && points.at(-1)![0] === halfWidth && points.at(-2)![0] === halfWidth) points.pop()
  // Si no llega al borde, se añaden las esquinas inferiores de la pared
  if (points[0][0] > -halfWidth) points = [[-halfWidth, floorY], ...points]
  if (points.at(-1)![0] < halfWidth) points = [...points, [halfWidth, floorY]]

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
// (traverse da Object3D: con isMesh se sabe que es una malla y se trata como Mesh, con un solo material)
function setupWindowMeshes<T extends Object3D>(scene: T): T {
  scene.traverse((node) => {
    const mesh = node as Mesh
    if (mesh.isMesh) {
      const material = mesh.material as Material
      if (material && material.name === 'glass') {
        // Material del cristal: aseguramos profundidad de escritura falsa para que el jardín exterior sea visible
        material.depthWrite = false
        material.transparent = true
        mesh.castShadow = false
        mesh.receiveShadow = false
      } else {
        // Marcos y perfiles metálicos: proyectan y reciben sombras
        mesh.castShadow = true
        mesh.receiveShadow = true
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
interface WindowWallProps {
  /** Obligatorio: ancho de la habitación (ventanal + fondo de estantería a cada lado) */
  width: number
  /** Hojas abiertas hacia el jardín */
  open: boolean
  /** Pulsar el ventanal: abrirlo o cerrarlo */
  onToggle: () => void
  height?: number
  floorY?: number
  position?: Vector3Tuple
  rotation?: Vector3Tuple
}

function WindowWall({
  width,
  open,
  onToggle,
  height = DEFAULT_WALL_HEIGHT,
  floorY = DEFAULT_FLOOR_Y,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: WindowWallProps) {
  // Carga del modelo GLB desde el manifiesto
  const { scene } = useGLTF(modelsManifest.window.url)

  // Clonación y configuración de sombras y materiales de cristal
  const clonedScene = useMemo(() => setupWindowMeshes(scene.clone()), [scene])

  // Bisagras de las hojas (en una ref: se giran en cada fotograma) y cuánto están abiertas (0 a 1)
  const hingesRef = useRef<Hinge[]>([])
  const opennessRef = useRef(0)
  useLayoutEffect(() => {
    hingesRef.current = LEAF_NODES.map((name) => hingeLeaf(clonedScene, name)).filter((hinge): hinge is Hinge => hinge !== null)
  }, [clonedScene])
  useFrame((_, delta) => {
    const target = open ? 1 : 0
    if (Math.abs(opennessRef.current - target) < 0.001) return
    opennessRef.current = MathUtils.damp(opennessRef.current, target, OPEN_DAMPING, Math.min(delta, 0.1))
    for (const { pivot, axis, sign } of hingesRef.current) pivot.quaternion.setFromAxisAngle(axis, sign * OPEN_ANGLE * opennessRef.current)
  })

  // Cota Y local para que la base del ventanal apoye exactamente sobre el suelo (floorY)
  const localOffsetY = floorY - ORIGINAL_MIN_Y * WINDOW_SCALE // -1.0 + 1.2303 = +0.2303 m

  // Geometría de la pared con los huecos de los arcos; se recalcula solo si cambian las medidas
  // Papel pintado con repetición en metros (las coordenadas de textura del muro extruido van en metros)
  const wallpaper = useWallpaper(1 / WALLPAPER_TILE_SIZE, 1 / WALLPAPER_TILE_SIZE)

  const wallGeometry = useMemo(
    () => createWallGeometry(width, height, floorY, localOffsetY),
    [width, height, floorY, localOffsetY]
  )

  return (
    <group position={position} rotation={rotation}>
      {/* 1. MODELO 3D REAL DEL VENTANAL (window.glb) */}
      <Clickable onClick={onToggle}>
        <primitive
          object={clonedScene}
          position={[LOCAL_OFFSET_X, localOffsetY, 0]}
          scale={WINDOW_SCALE}
          rotation={[0, 0, 0]}
        />
      </Clickable>

      {/* 2. PARED OPACA DE SUELO A TECHO con los dos arcos recortados; proyecta sombra para que la luz solo entre por el cristal */}
      <mesh geometry={wallGeometry} castShadow receiveShadow>
        {/* Papel pintado: ExtrudeGeometry da coordenadas de textura en metros */}
        <meshStandardMaterial map={wallpaper} color={WALLPAPER_TINT} />
      </mesh>
    </group>
  )
}

export default WindowWall
