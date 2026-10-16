// Importación de useMemo de React para clonar y optimizar la escena del modelo 3D
import { useMemo } from 'react'
// Hook useGLTF de drei para cargar modelos GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'

// Escala por defecto definida a partir del manifiesto para rosal de interior (~1.4 m de altura)
const DEFAULT_SCALE = modelsManifest.roseInAPot.scale

// Helper para habilitar recursivamente sombras en todas las mallas del modelo
function enableShadows(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return scene
}

/**
 * Componente reutilizable para macetas con plantas decorativas de interior.
 * Utiliza el modelo 3D rose_in_a_pot.glb con sombras habilitadas.
 */
function PlantPot({ position = [0, -1.0, 0], scale = DEFAULT_SCALE, rotationY = 0 }) {
  // Carga del modelo GLB a través de la URL gestionada por Vite en modelsManifest
  const { scene } = useGLTF(modelsManifest.roseInAPot.url)

  // Clonación y configuración de sombras para evitar interferencias si se usa varias veces
  const clonedScene = useMemo(() => enableShadows(scene.clone()), [scene])

  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, rotationY, 0]}
      // collider: FirstPersonControls no deja atravesar la maceta
      userData={{ collider: true }}
    />
  )
}

export default PlantPot
