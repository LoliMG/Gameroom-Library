// Gato de dibujos animados (toon_cat_free.glb) que pasea despacio en un óvalo; su animación es un ciclo de paso
import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { AnimationAction, Group } from 'three'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'

// Alto con la cola levantada
const CAT_HEIGHT = 0.38
// Única animación del modelo: un paso completo en 0.83 s
const CAT_CLIP = 'Scene'
// Metros por segundo a los que la animación a velocidad normal no patina (un paso ≈ 0.25 m)
const STRIDE_SPEED = 0.3
// Segundos en dar una vuelta al óvalo (más despacio en las curvas de los extremos, como al girar)
const LOOP_SECONDS = 18

interface CatProps {
  /** Centro del óvalo, en el suelo */
  center: [number, number, number]
  /** Semiejes del óvalo en X y en Z (m) */
  radii: [number, number]
}

function Cat({ center, radii }: CatProps) {
  const { scene, animations } = useGLTF(modelsManifest.toonCat.url, true, true)
  // prepareModel clona respetando el esqueleto, así la animación mueve esta copia
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, CAT_HEIGHT), [scene])
  const { actions } = useAnimations(animations, wrapper)
  const groupRef = useRef<Group>(null)
  // La animación, en una ref: su velocidad cambia en cada fotograma
  const actionRef = useRef<AnimationAction | null>(null)

  useEffect(() => {
    const action = actions[CAT_CLIP] ?? null
    action?.play()
    actionRef.current = action
    return () => {
      action?.stop()
    }
  }, [actions])

  // Cada fotograma: punto del óvalo, mirando hacia donde camina (el modelo mira a +Z), y las patas al paso de la velocidad
  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const omega = (2 * Math.PI) / LOOP_SECONDS
    const angle = clock.elapsedTime * omega
    const [rx, rz] = radii
    const dx = -rx * Math.sin(angle)
    const dz = rz * Math.cos(angle)
    group.position.set(center[0] + rx * Math.cos(angle), center[1], center[2] + rz * Math.sin(angle))
    group.rotation.y = Math.atan2(dx, dz)
    if (actionRef.current) actionRef.current.timeScale = (Math.hypot(dx, dz) * omega) / STRIDE_SPEED
  })

  return (
    <group ref={groupRef}>
      <primitive object={wrapper} scale={scale} />
    </group>
  )
}

export default Cat
