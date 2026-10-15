// Importación de useMemo de React para memorizar la escena clonada
import { useMemo } from 'react'
// Hook useGLTF de drei para carga de modelos GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Importación del nivel del suelo de la estancia
import { FLOOR_Y } from '@/scene/Room'

// Dimensiones objetivo y escala de la alfombra desde modelsManifest
const DEFAULT_SCALE = modelsManifest.rug.scale
// Desplazamiento mínimo sobre el suelo para evitar z-fighting o parpadeos con la textura de madera
const RUG_GROUND_OFFSET = modelsManifest.rug.groundOffset // 0.002 m (2 mm)
const DEFAULT_Y = FLOOR_Y + RUG_GROUND_OFFSET // -1.0 + 0.002 = -0.998 m

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
 * Componente para renderizar la alfombra estampada con borlas (rug.glb)
 * debajo de la mesa de café y en la zona frontal del sofá.
 */
function Rug({
  position = [1.05, DEFAULT_Y, 1.0],
  scale = DEFAULT_SCALE,
  rotationY = 0,
}) {
  // Carga del modelo GLB desde el manifiesto
  const { scene } = useGLTF(modelsManifest.rug.url)

  // Clonación y configuración de sombras
  const clonedScene = useMemo(() => enableReceiveShadow(scene.clone()), [scene])

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, rotationY, 0]}
    />
  )
}

export default Rug
