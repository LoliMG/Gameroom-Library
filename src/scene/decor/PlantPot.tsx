// Importación de useMemo de React para clonar y optimizar la escena del modelo 3D
import { useMemo } from 'react'
// Hook useGLTF de drei para cargar modelos GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Activa sombras en todas las mallas de un modelo clonado
import { enableShadows } from '@/utils/shadows'

// Escala por defecto definida a partir del manifiesto para rosal de interior (~1.4 m de altura)
const DEFAULT_SCALE = modelsManifest.roseInAPot.scale

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
