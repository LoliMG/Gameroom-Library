// Importación de useMemo de React para clonar y optimizar la escena 3D
import { useMemo } from 'react'
// Hook useGLTF de drei para carga del modelo GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'

// Constantes de dimensiones base de la habitación en metros
export const DEFAULT_WALL_WIDTH = 4.5     // Ancho de la pared frontal c
export const DEFAULT_WALL_HEIGHT = 2.8    // Altura de suelo a techo (Y = -1.0 a +1.8)
export const DEFAULT_FLOOR_Y = -1.0       // Cota del suelo

// Color de las paredes para el remate superior (dintel sobre la ventana)
const WALL_COLOR = '#ebe5dc'
const WALL_THICKNESS = 0.10

// Parámetros calculados a partir de la caja envolvente original de window.glb:
// Caja original: ancho X = 8.1288 m, alto Y = 4.5988 m, prof Z = 0.7509 m, centro X = 2.1688 m, min Y = -2.2224 m
const WINDOW_SCALE = modelsManifest.window.scale // 0.5536
const ORIGINAL_CENTER_X = 2.16879
const ORIGINAL_MIN_Y = -2.22237
const ORIGINAL_HEIGHT = 4.59882

// Altura escalada del ventanal: 4.59882 * 0.5536 = ~2.546 m (llega casi al final de las estanterías de 2.7 m)
const SCALED_WINDOW_HEIGHT = ORIGINAL_HEIGHT * WINDOW_SCALE
// Desplazamiento X para centrar el ventanal en X = 0 (cubre exactamente de -2.25 m a +2.25 m)
const LOCAL_OFFSET_X = -ORIGINAL_CENTER_X * WINDOW_SCALE // ~ -1.2006 m

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
 * Componente que representa la pared c (frontal) sustituida por el modelo 3D window.glb.
 * La parte inferior del ventanal toca el suelo (floorY = -1.0 m) y su altura se extiende
 * casi hasta el final de las estanterías (altura ~2.55 m, cota superior ~+1.55 m).
 * Un dintel superior remata el espacio restante hasta el techo (2.8 m).
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

  // Remate superior de pared (dintel) entre el marco superior del ventanal y el techo
  const ceilingY = floorY + height // -1.0 + 2.8 = +1.8 m
  const windowTopY = floorY + SCALED_WINDOW_HEIGHT // -1.0 + 2.546 = +1.546 m
  const headerHeight = Math.max(0, ceilingY - windowTopY) // ~0.254 m
  const headerCenterY = windowTopY + headerHeight / 2 // ~1.673 m

  return (
    <group position={position} rotation={rotation}>
      {/* 1. MODELO 3D REAL DEL VENTANAL (window.glb) */}
      <primitive
        object={clonedScene}
        position={[LOCAL_OFFSET_X, localOffsetY, 0]}
        scale={WINDOW_SCALE}
        rotation={[0, 0, 0]}
      />

      {/* 2. DINTEL SUPERIOR DE PARED: Remata el espacio entre la parte superior del ventanal y el techo */}
      {headerHeight > 0 && (
        <mesh position={[0, headerCenterY, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, headerHeight, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      )}
    </group>
  )
}

export default WindowWall
