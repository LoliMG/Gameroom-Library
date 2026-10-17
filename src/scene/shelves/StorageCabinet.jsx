// Importación de useMemo de React para clonar el modelo una vez
import { useMemo } from 'react'
// useGLTF de drei para cargar old_storage_cabinet.glb
import { useGLTF } from '@react-three/drei'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Activa sombras en todas las mallas de un modelo clonado
import { enableShadows } from '@/utils/shadows'

// Caja original de old_storage_cabinet.glb (unidades del modelo): fondo en X, alto en Y, largo en Z
const ORIGINAL_HEIGHT = 5.329
const ORIGINAL_MIN_Y = 0.061
const ORIGINAL_BACK_X = -1 // Cara trasera (va contra la pared); el frente mira hacia +X
const ORIGINAL_DEPTH = 5.16 // Fondo (eje X)

// Largo del mueble por cada metro de alto (16 / 5.329): para reservarle hueco en la pared con escala uniforme
export const CABINET_LENGTH_PER_HEIGHT = 3.0024

/**
 * Mueble bajo de almacenaje (old_storage_cabinet.glb) empotrado en las estanterías: alto y largo con escala uniforme
 * (el frente se ve igual que en el modelo) y el fondo ajustado al de las estanterías para que su frente quede a ras.
 * `position` es el punto del suelo junto a la pared, en el centro del mueble; el frente mira hacia +X
 * (hacia el interior desde la pared a). Lleva userData.collider para que la cámara no lo atraviese.
 */
function StorageCabinet({ position, height, depth }) {
  const { scene } = useGLTF(modelsManifest.cabinet.url)
  const cabinet = useMemo(() => enableShadows(scene.clone()), [scene])
  // Escala del frente (alto y largo) y escala del fondo, que solo encoge la profundidad
  const scale = height / ORIGINAL_HEIGHT
  const depthScale = depth / ORIGINAL_DEPTH
  return (
    <primitive
      object={cabinet}
      // Cara trasera sobre la pared y base en el suelo
      position={[position[0] - ORIGINAL_BACK_X * depthScale, position[1] - ORIGINAL_MIN_Y * scale, position[2]]}
      scale={[depthScale, scale, scale]}
      userData={{ collider: true }}
    />
  )
}

export default StorageCabinet
