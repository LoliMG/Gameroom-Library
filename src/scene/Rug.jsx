// Importación de useMemo de React para memorizar la escena clonada
import { useMemo } from 'react'
// Hook useGLTF de drei para carga de modelos GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Importación del nivel del suelo de la estancia
import { FLOOR_Y } from '@/scene/Room'

// Medidas máximas de la alfombra en metros (Fase 6)
export const RUG_WIDTH = 2.3 // Lado largo, paralelo al sofá (eje Z)
export const RUG_DEPTH = 1.8 // Lado corto, desde el sofá hacia el interior de la sala (eje X)

// Caja envolvente original de rug.glb (unidades del modelo), medida en la auditoría de la Fase A
const ORIGINAL_SIZE_X = 2.541   // Lado corto
const ORIGINAL_SIZE_Z = 3.6883  // Lado largo
const ORIGINAL_CENTER_X = -0.0475 // Centro de la caja en X (min -1.318 + 2.541 / 2)
const ORIGINAL_CENTER_Z = -0.026  // Centro de la caja en Z (min -1.8702 + 3.6883 / 2)
const ORIGINAL_MIN_Y = 0.0089     // La base del modelo no está en Y = 0
const ORIGINAL_HEIGHT = 0.0141    // Grosor del tejido con borlas

// Escala uniforme para que la alfombra quepa en RUG_WIDTH x RUG_DEPTH sin deformar el estampado ni las borlas:
// min(1.8 / 2.541, 2.3 / 3.6883) = min(0.708, 0.624) = 0.624 → resultado 2.30 m x 1.58 m
const RUG_SCALE = Math.min(RUG_DEPTH / ORIGINAL_SIZE_X, RUG_WIDTH / ORIGINAL_SIZE_Z)

// Pequeña separación sobre el suelo para evitar parpadeos (z-fighting) con la madera
const RUG_FLOOR_GAP = 0.002

// Altura de la cara superior de la alfombra sobre el suelo (para apoyar encima la mesa de café)
export const RUG_TOP_HEIGHT = RUG_FLOOR_GAP + ORIGINAL_HEIGHT * RUG_SCALE // 0.002 + 0.0088 ≈ 0.011 m

// Desplazamiento interno del modelo para que su centro quede en el origen del grupo y su base a RUG_FLOOR_GAP
const MODEL_OFFSET = [
  -ORIGINAL_CENTER_X * RUG_SCALE,
  RUG_FLOOR_GAP - ORIGINAL_MIN_Y * RUG_SCALE,
  -ORIGINAL_CENTER_Z * RUG_SCALE,
]

// Helper para habilitar recepción de sombras en la alfombra
function enableReceiveShadow(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      node.receiveShadow = true
    }
  })
  return scene
}

/**
 * Componente para renderizar la alfombra estampada con borlas (rug.glb).
 * `position` es el punto del suelo donde se centra la alfombra (Y = cota del suelo).
 */
function Rug({ position = [0, FLOOR_Y, 0], rotationY = 0 }) {
  // Carga del modelo GLB desde el manifiesto
  const { scene } = useGLTF(modelsManifest.rug.url)

  // Clonación y configuración de sombras
  const clonedScene = useMemo(() => enableReceiveShadow(scene.clone()), [scene])

  return (
    // Grupo centrado sobre el punto del suelo indicado; la rotación gira la alfombra sobre su propio centro
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={clonedScene} position={MODEL_OFFSET} scale={RUG_SCALE} />
    </group>
  )
}

export default Rug
