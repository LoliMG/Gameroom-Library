// Importación de useMemo de React para clonar el modelo una vez por repisa
import { useMemo } from 'react'
// useGLTF de drei para cargar repisalarga.glb
import { useGLTF } from '@react-three/drei'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Activa sombras en todas las mallas de un modelo clonado
import { enableShadows } from '@/utils/shadows'

// Caja original de repisalarga.glb (unidades del modelo)
const ORIGINAL_LENGTH = 200     // Largo de la tabla (eje X)
const ORIGINAL_TOP_Y = 53.28    // Cara superior de la tabla
const ORIGINAL_BACK_Z = 22.83   // Cara que apoya en la pared (las escuadras son verticales en ese lado)

// Fondo de la repisa por cada metro de largo (45.66 / 200): sirve para colocar objetos encima
export const WALL_SHELF_DEPTH_PER_LENGTH = 0.2283

/**
 * Repisa de pared con escuadras (repisalarga.glb) escalada a un largo dado sin deformarla.
 * `position` es el punto de la pared en el centro de la repisa, a la altura de su cara superior;
 * `rotationY` orienta la cara de las escuadras (+Z del modelo) hacia la pared.
 */
function WallShelf({ position, rotationY = 0, length }) {
  const { scene } = useGLTF(modelsManifest.shelf.url)
  const shelf = useMemo(() => {
    const clone = enableShadows(scene.clone())
    return clone
  }, [scene])

  // Escala uniforme para el largo pedido
  const scale = length / ORIGINAL_LENGTH
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Desplazamiento interno: la cara superior queda en Y = 0 y la cara de la pared en Z = 0 del grupo */}
      <primitive object={shelf} scale={scale} position={[0, -ORIGINAL_TOP_Y * scale, -ORIGINAL_BACK_Z * scale]} />
    </group>
  )
}

export default WallShelf
