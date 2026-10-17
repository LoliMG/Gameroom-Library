// Importación de useMemo de React para preparar la geometría una vez
import { useMemo } from 'react'
// useGLTF de drei para cargar el perfil del rodapié
import { useGLTF } from '@react-three/drei'
// BufferAttribute para añadir las coordenadas de textura que el modelo no trae
import { BufferAttribute } from 'three'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Madera de la repisa (mismo tono que repisas y estanterías)
import useShelfWood from '@/hooks/useShelfWood'
// Cota del suelo
import { FLOOR_Y } from '@/scene/Room'

// Alto del rodapié en la escena (el grueso y el largo de cada pieza salen proporcionales: ≈ 1.5 cm y ≈ 31 cm)
const SKIRTING_HEIGHT = 0.1625

// Caja original del perfil (unidades del modelo): largo en X, alto en Y, grueso en Z
const ORIGINAL_LENGTH = 2939.76
const ORIGINAL_MIN_Y = -98.69
const ORIGINAL_HEIGHT = 1548.54
const ORIGINAL_BACK_Z = 55.9 // Cara plana que apoya en la pared

// Escala uniforme de la pieza: conserva su dibujo de cuadraditos
const PROFILE_SCALE = SKIRTING_HEIGHT / ORIGINAL_HEIGHT
// Largo de una pieza en la escena (≈ 0.31 m); los tramos se cubren repitiendo piezas
const PIECE_LENGTH = ORIGINAL_LENGTH * PROFILE_SCALE

// Geometría del perfil en el espacio del modelo con UV planas (u a lo largo, v en altura) para poder texturizarla
function createProfileGeometry(scene) {
  scene.updateMatrixWorld(true)
  const mesh = scene.getObjectByProperty('isMesh', true)
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
  const positions = geometry.attributes.position
  const uvs = new Float32Array(positions.count * 2)
  for (let i = 0; i < positions.count; i++) {
    uvs[i * 2] = positions.getX(i) / ORIGINAL_LENGTH
    uvs[i * 2 + 1] = (positions.getY(i) - ORIGINAL_MIN_Y) / ORIGINAL_HEIGHT
  }
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  return geometry
}

/**
 * Rodapiés de madera a lo largo de tramos de pared, hechos repitiendo la pieza del modelo sin deformarla.
 * Cada tramo es { start: [x, z], end: [x, z] } sobre la cara interior de la pared, recorrido con la pared a la derecha
 * (así la cara plana del perfil queda contra la pared y la moldura mira a la sala).
 */
function SkirtingBoards({ segments }) {
  const { scene } = useGLTF(modelsManifest.skirting.url)
  const geometry = useMemo(() => createProfileGeometry(scene), [scene])
  const wood = useShelfWood('shelf')

  return (
    <group>
      {segments.map(({ start, end }) => {
        const dx = end[0] - start[0]
        const dz = end[1] - start[1]
        const length = Math.hypot(dx, dz)
        // Giro para que el eje X del perfil siga el tramo (el eje Z del perfil queda hacia la pared)
        const rotationY = Math.atan2(-dz, dx)
        // Número entero de piezas; cada una se ajusta un poco en largo para que el tramo cuadre sin cortes
        const pieceCount = Math.max(1, Math.round(length / PIECE_LENGTH))
        const pieceLength = length / pieceCount
        return (
          <group key={`${start}-${end}`} position={[start[0], FLOOR_Y, start[1]]} rotation={[0, rotationY, 0]}>
            {Array.from({ length: pieceCount }, (_, i) => (
              <mesh
                key={i}
                geometry={geometry}
                // Escala uniforme (salvo el pequeño ajuste de largo para cuadrar el tramo)
                scale={[pieceLength / ORIGINAL_LENGTH, PROFILE_SCALE, PROFILE_SCALE]}
                // Pieza i a lo largo del tramo, con la base en el suelo y la cara plana sobre la pared
                position={[i * pieceLength, -ORIGINAL_MIN_Y * PROFILE_SCALE, -ORIGINAL_BACK_Z * PROFILE_SCALE]}
                castShadow
                receiveShadow
              >
                {/* Mismo dibujo que el modelo; solo cambia el color a la madera de la repisa */}
                <meshStandardMaterial map={wood.grainAlongLength} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

export default SkirtingBoards
