// Gato de dibujos animados (toon_cat_free.glb) que da vueltas despacio por la sala; su animación es un ciclo de paso.
// Al pulsarlo se para un rato y ronronea
import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3 } from 'three'
import type { AnimationAction, Group, Vector3Tuple } from 'three'
import Clickable from '@/scene/shared/Clickable'
import { purr } from '@/utils/purr'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'

// Alto con la cola levantada
const CAT_HEIGHT = 0.38
// Única animación del modelo: un paso completo en 0.83 s
const CAT_CLIP = 'Scene'
// Velocidad al pasear (m/s) y a la que la animación a velocidad normal no patina (un paso ≈ 0.25 m)
const WALK_SPEED = 0.3
const STRIDE_SPEED = 0.3
// Lo que se queda quieto al pulsarlo (s): lo que dura el ronroneo y un poco más
const PET_PAUSE = 4

/**
 * @param path - Puntos por los que pasa, en el suelo y en orden: el gato los recorre en bucle por una curva suave
 * @param sound - Con los sonidos activados (Ajustes) ronronea al pulsarlo
 */
function Cat({ path, sound }: { path: Vector3Tuple[]; sound: boolean }) {
  const { scene, animations } = useGLTF(modelsManifest.toonCat.url, true, true)
  // prepareModel clona respetando el esqueleto, así la animación mueve esta copia
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, CAT_HEIGHT), [scene])
  const { actions } = useAnimations(animations, wrapper)
  // Curva cerrada que pasa por los puntos (centrípeta: no se pasa de largo en las curvas cerradas)
  const curve = useMemo(() => new CatmullRomCurve3(path.map((point) => new Vector3(...point)), true, 'centripetal'), [path])
  const groupRef = useRef<Group>(null)
  // Metros andados (el paseo no avanza mientras está parado), segundos que le quedan parado y su animación
  const walkRef = useRef({ walked: 0, paused: 0, action: null as AnimationAction | null })

  useEffect(() => {
    const action = actions[CAT_CLIP] ?? null
    action?.setEffectiveTimeScale(WALK_SPEED / STRIDE_SPEED).play()
    walkRef.current.action = action
    return () => {
      action?.stop()
    }
  }, [actions])

  const pet = () => {
    walkRef.current.paused = PET_PAUSE
    if (sound) purr()
  }

  // Cada fotograma: su punto en la curva (a velocidad constante), mirando hacia donde camina (el modelo mira a +Z); parado,
  // con la animación en pausa
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const walk = walkRef.current
    const step = Math.min(delta, 0.1)
    walk.paused = Math.max(0, walk.paused - step)
    if (walk.action) walk.action.paused = walk.paused > 0
    if (walk.paused === 0) walk.walked += WALK_SPEED * step
    const along = (walk.walked / curve.getLength()) % 1
    curve.getPointAt(along, group.position)
    const { x, z } = curve.getTangentAt(along)
    group.rotation.y = Math.atan2(x, z)
  })

  return (
    <Clickable onClick={pet}>
      <group ref={groupRef}>
        <primitive object={wrapper} scale={scale} />
      </group>
    </Clickable>
  )
}

export default Cat
