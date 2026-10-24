// Importación de useMemo de React para preparar el modelo una vez
import { useMemo } from 'react'
// useGLTF para cargar el modelo
import { useGLTF } from '@react-three/drei'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
import type { ModelName } from '@/data/modelsManifest'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'
// Mide, centra y escala el modelo a su altura objetivo
import { prepareModel } from '@/utils/prepareModel'
// Soporte de la extensión antigua de materiales (si no, los modelos que la usan salen sin colores)
import { withSpecularGlossiness } from '@/utils/specularGlossiness'
// Activa sombras en todas las mallas
import { enableShadows } from '@/utils/shadows'

/**
 * Figura u objeto decorativo apoyado sobre una repisa, escalado a una altura sin deformarlo y con sombras.
 * `position` es el punto de apoyo (centro de la base).
 */
interface ShelfFigureProps {
  model: ModelName
  height: number
  position: Vector3Tuple
  rotationY?: number
}

function ShelfFigure({ model, height, position, rotationY = 0 }: ShelfFigureProps) {
  // Draco y Meshopt como en el resto de cargas (valores por defecto de drei) más el plugin de materiales antiguos
  const { scene } = useGLTF(modelsManifest[model].url, true, true, withSpecularGlossiness)
  const { wrapper, scale } = useMemo(() => {
    const prepared = prepareModel(scene, undefined, height)
    enableShadows(prepared.wrapper)
    return prepared
  }, [scene, height])
  return <primitive object={wrapper} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

export default ShelfFigure
