// Gato de dibujos animados (toon_cat_free.glb) que da vueltas despacio por la sala; su animación es un ciclo de paso
import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3 } from 'three'
import type { Group, Vector3Tuple } from 'three'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'

// Alto con la cola levantada
const CAT_HEIGHT = 0.38
// Única animación del modelo: un paso completo en 0.83 s
const CAT_CLIP = 'Scene'
// Velocidad al pasear (m/s) y a la que la animación a velocidad normal no patina (un paso ≈ 0.25 m)
const WALK_SPEED = 0.3
const STRIDE_SPEED = 0.3

/**
 * @param path - Puntos por los que pasa, en el suelo y en orden: el gato los recorre en bucle por una curva suave
 */
function Cat({ path }: { path: Vector3Tuple[] }) {
  const { scene, animations } = useGLTF(modelsManifest.toonCat.url, true, true)
  // prepareModel clona respetando el esqueleto, así la animación mueve esta copia
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, CAT_HEIGHT), [scene])
  const { actions } = useAnimations(animations, wrapper)
  // Curva cerrada que pasa por los puntos (centrípeta: no se pasa de largo en las curvas cerradas)
  const curve = useMemo(() => new CatmullRomCurve3(path.map((point) => new Vector3(...point)), true, 'centripetal'), [path])
  const groupRef = useRef<Group>(null)

  useEffect(() => {
    const action = actions[CAT_CLIP]
    action?.setEffectiveTimeScale(WALK_SPEED / STRIDE_SPEED).play()
    return () => {
      action?.stop()
    }
  }, [actions])

  // Cada fotograma: su punto en la curva (a velocidad constante), mirando hacia donde camina (el modelo mira a +Z)
  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const along = ((clock.elapsedTime * WALK_SPEED) / curve.getLength()) % 1
    curve.getPointAt(along, group.position)
    const { x, z } = curve.getTangentAt(along)
    group.rotation.y = Math.atan2(x, z)
  })

  return (
    <group ref={groupRef}>
      <primitive object={wrapper} scale={scale} />
    </group>
  )
}

export default Cat
