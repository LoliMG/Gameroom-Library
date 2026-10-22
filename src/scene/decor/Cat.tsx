// Gato de dibujos animados (toon_cat_free.glb) que da vueltas despacio por la sala; su animación es un ciclo de paso.
// Al pulsarlo de cerca se sienta un rato mirándote y ronronea (la postura se hace girando sus huesos: el
// modelo solo trae la animación de andar)
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, MathUtils, Quaternion, Vector3 } from 'three'
import type { AnimationAction, Camera, Group, Object3D, Vector3Tuple } from 'three'
import { aimBone } from '@/utils/pose'
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
// Lo que se queda sentado al pulsarlo (s): lo que dura el ronroneo y un poco más; distancia máxima para acariciarlo (m)
const PET_PAUSE = 4
const PET_DISTANCE = 1.6
// Rapidez con que se sienta y se levanta (mayor = más rápido)
const SIT_DAMPING = 6

// Postura de sentado: giros (radianes) sobre el eje de lado a lado del gato y cuánto baja la cadera (en unidades del
// modelo, ~cm). Negativo levanta lo de delante. Ajustada a ojo en toon_cat_free.glb, cuyo reposo es un paso a medio
// andar: por eso cada pata lleva lo suyo (la delantera derecha va más atrás)
const SIT_BONES: [string, number][] = [
  ['torso_02', -0.55], // Cuerpo inclinado: delante arriba, cadera abajo
  ['thighBL_03', -1.3], // Muslos hacia delante
  ['thighBR_026', -1.3],
  ['leglowerBL_05', 1.5], // Y la parte de abajo de la pata, recogida
  ['leglowerBR_028', 1.5],
  ['footBL_06', -0.3],
  ['footBR_029', -0.3],
  ['legupperFL_014', 0.85], // Patas delanteras rectas, apoyadas en el suelo
  ['legupperFR_024', -0.1],
  ['footFR_025', 0.8],
  ['neck_017', -0.3], // Cuello estirado (la cabeza mira a la cámara, ver sit)
]
// La cabeza mira hacia la cámara (del hueso de la cabeza al de la boca), girando como mucho esto (radianes): si se le
// habla desde detrás, no se retuerce
const HEAD = 'head_018'
const HEAD_TARGET = 'mouth_021'
const MAX_HEAD_TURN = 1.2
const SIT_DROP = 100
const SIT_HIP = 'torso_02'

// Huesos de la postura (y la cabeza) y su posición de reposo (la del modelo sin animar), para volver a ella antes de cada fotograma
type Rest = { bone: Object3D; quaternion: Quaternion; position: Vector3 }

// Aplica la postura de sentado en su proporción amount (0 de pie, 1 sentado) partiendo del reposo, con la cabeza hacia la
// cámara. scale: la del modelo (para bajar la cadera en metros)
const axis = new Vector3()
const turn = new Quaternion()
const parentTurn = new Quaternion()
const hip = new Vector3()
const look = new Vector3()
const headFrom = new Vector3()
const headRest = new Quaternion()
function sit(wrapper: Object3D, rests: Map<string, Rest>, amount: number, scale: number, camera: Camera) {
  rests.forEach(({ bone, quaternion, position }) => {
    bone.quaternion.copy(quaternion)
    bone.position.copy(position)
  })
  wrapper.updateMatrixWorld(true)
  // Eje de lado a lado del gato en la escena (el gato gira al pasear)
  axis.set(1, 0, 0).applyQuaternion(wrapper.getWorldQuaternion(turn))
  for (const [name, angle] of SIT_BONES) {
    const bone = rests.get(name)!.bone
    bone.parent!.getWorldQuaternion(parentTurn)
    turn.setFromAxisAngle(axis, angle * amount)
    bone.quaternion.premultiply(parentTurn.clone().invert().multiply(turn).multiply(parentTurn))
    bone.updateMatrixWorld(true)
  }
  const hipBone = rests.get(SIT_HIP)!.bone
  hipBone.getWorldPosition(hip)
  hip.y -= SIT_DROP * scale * amount
  hipBone.position.copy(hipBone.parent!.worldToLocal(hip))

  // Cabeza: la apunta a la cámara y se queda con la parte que toca (según lo sentado que esté y el tope de giro)
  const head = rests.get(HEAD)!.bone
  wrapper.updateMatrixWorld(true)
  headRest.copy(head.quaternion)
  head.getWorldPosition(look)
  look.subVectors(camera.position, look)
  headFrom.subVectors(wrapper.getObjectByName(HEAD_TARGET)!.getWorldPosition(headFrom), head.getWorldPosition(hip))
  const angle = headFrom.angleTo(look)
  aimBone(wrapper, HEAD, HEAD_TARGET, look)
  head.quaternion.slerpQuaternions(headRest, head.quaternion.clone(), amount * Math.min(1, MAX_HEAD_TURN / Math.max(angle, 1e-6)))
}

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
  // Metros andados (el paseo no avanza mientras está parado), segundos que le quedan sentado, cuánto está sentado (0 a 1),
  // su animación y los huesos de la postura con su reposo
  const walkRef = useRef({ walked: 0, paused: 0, sitting: 0, action: null as AnimationAction | null, rests: new Map<string, Rest>() })
  // El reposo se guarda antes de que empiece la animación (useLayoutEffect va antes que el useEffect que la pone)
  useLayoutEffect(() => {
    walkRef.current.rests = new Map(
      [...SIT_BONES.map(([name]) => name), HEAD].map((name) => {
        const bone = wrapper.getObjectByName(name)!
        return [name, { bone, quaternion: bone.quaternion.clone(), position: bone.position.clone() }] as const
      })
    )
  }, [wrapper])

  useEffect(() => {
    const action = actions[CAT_CLIP] ?? null
    action?.setEffectiveTimeScale(WALK_SPEED / STRIDE_SPEED).play()
    walkRef.current.action = action
    return () => {
      action?.stop()
    }
  }, [actions])

  // Al acariciarlo: deja de andar (la animación se para y los huesos quedan libres para la postura) y se sienta
  const pet = () => {
    walkRef.current.paused = PET_PAUSE
    walkRef.current.action?.stop()
    if (sound) purr()
  }

  // Cada fotograma: su punto en la curva (a velocidad constante), mirando hacia donde camina (el modelo mira a +Z); parado,
  // con la animación en pausa
  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) return
    const walk = walkRef.current
    const step = Math.min(delta, 0.1)
    walk.paused = Math.max(0, walk.paused - step)
    // Sentándose, sentado o levantándose: la postura en su proporción; ya de pie, vuelve a andar
    if (walk.paused > 0 || walk.sitting > 0) {
      walk.sitting = MathUtils.damp(walk.sitting, walk.paused > 0 ? 1 : 0, SIT_DAMPING, step)
      if (walk.paused === 0 && walk.sitting < 0.01) {
        walk.sitting = 0
        sit(wrapper, walk.rests, 0, scale, camera)
        walk.action?.reset().play()
      } else {
        sit(wrapper, walk.rests, walk.sitting, scale, camera)
      }
      return
    }
    walk.walked += WALK_SPEED * step
    const along = (walk.walked / curve.getLength()) % 1
    curve.getPointAt(along, group.position)
    const { x, z } = curve.getTangentAt(along)
    group.rotation.y = Math.atan2(x, z)
  })

  return (
    <Clickable onClick={pet} maxDistance={PET_DISTANCE}>
      <group ref={groupRef}>
        <primitive object={wrapper} scale={scale} />
      </group>
    </Clickable>
  )
}

export default Cat
