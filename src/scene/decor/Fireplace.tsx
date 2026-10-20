// Chimenea de mármol (fireplace.glb): el fuego (las llamas del modelo, el brillo de las brasas y una luz cálida que
// titila) solo se enciende cuando hace frío en la ciudad de los ajustes
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial, PointLight, Vector3Tuple } from 'three'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'
import { withSpecularGlossiness } from '@/utils/specularGlossiness'

// Alto total (repisa incluida)
const FIREPLACE_HEIGHT = 1.15
/** Ancho y fondo en metros con esa altura (el modelo mide 2 × 0.746 × 1.303): para colocarla y su caja de colisión */
export const FIREPLACE_WIDTH = 1.77
export const FIREPLACE_DEPTH = 0.66
/** Por debajo de esta temperatura (°C) se enciende el fuego: de día, y de noche (que refresca y apetece más) */
export const COLD_TEMPERATURE = 16
export const COLD_NIGHT_TEMPERATURE = 22

// Materiales del modelo: las tarjetas de las llamas y el hogar con las brasas (lleva su brillo en un mapa emisivo)
const FLAME_MATERIAL = 'fire'
const EMBER_MATERIAL = 'material_1'
// Luz del fuego: delante de la boca del hogar (a 0.3 m del suelo), naranja y sin sombras
const FIRE_LIGHT_POSITION: Vector3Tuple = [0, 0.3, 0.25]
const FIRE_LIGHT_COLOR = '#ff8a3d'
const FIRE_LIGHT_INTENSITY = 1.6
const FIRE_LIGHT_DISTANCE = 4.5
// Parpadeo: suma de senos de distinta frecuencia (rad/s) para que no se note el ciclo, y cuánto varía (±)
const FLICKER_SPEEDS = [5.1, 8.7, 13.3]
const LIGHT_FLICKER = 0.25
const EMBER_FLICKER = 0.35

interface FireplaceProps {
  position: Vector3Tuple
  /** Fuego encendido */
  lit: boolean
}

function Fireplace({ position, lit }: FireplaceProps) {
  const { scene } = useGLTF(modelsManifest.fireplace.url, true, true, withSpecularGlossiness)
  // Las llamas se dejan con transparencia de verdad (con recorte salen con el borde duro)
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, FIREPLACE_HEIGHT, { alphaCutout: false }), [scene])
  const lightRef = useRef<PointLight>(null)
  // Material de las brasas, en una ref: su brillo cambia en cada fotograma
  const embersRef = useRef<MeshStandardMaterial | null>(null)
  useLayoutEffect(() => {
    let embers: MeshStandardMaterial | null = null
    wrapper.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as MeshStandardMaterial
      if (material.name === EMBER_MATERIAL) {
        // Copia propia: el brillo cambia con el fuego y el material del modelo cargado se comparte
        embers ??= material.clone()
        mesh.material = embers
      }
    })
    embersRef.current = embers
  }, [wrapper])

  // Las llamas del modelo solo se ven con el fuego encendido
  useLayoutEffect(() => {
    wrapper.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh && (mesh.material as MeshStandardMaterial).name === FLAME_MATERIAL) mesh.visible = lit
    })
  }, [wrapper, lit])

  // Cada fotograma: brasas y luz titilando con el fuego (a cero si está apagado)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const flicker = FLICKER_SPEEDS.reduce((sum, speed) => sum + Math.sin(t * speed), 0) / FLICKER_SPEEDS.length
    if (embersRef.current) embersRef.current.emissiveIntensity = lit ? 1 + flicker * EMBER_FLICKER : 0
    if (lightRef.current) lightRef.current.intensity = lit ? FIRE_LIGHT_INTENSITY * (1 + flicker * LIGHT_FLICKER) : 0
  })

  return (
    <group position={position}>
      <primitive object={wrapper} scale={scale} />
      <pointLight ref={lightRef} position={FIRE_LIGHT_POSITION} color={FIRE_LIGHT_COLOR} intensity={0} distance={FIRE_LIGHT_DISTANCE} decay={2} />
    </group>
  )
}

export default Fireplace
