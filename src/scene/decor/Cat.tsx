// Gato de dibujos animados (toon_cat_free.glb) que da vueltas despacio por la sala; su animación es un ciclo de paso.
// Al pulsarlo de cerca se sienta un rato mirándote y ronronea; durante el modo concentración termina su vuelta hasta la
// chimenea y se duerme hecho una bola, y al acabar se despereza. Las posturas se hacen girando sus huesos (el modelo
// solo trae la animación de andar)
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, MathUtils, Quaternion, Vector3 } from 'three'
import type { AnimationAction, Camera, Group, Object3D, Vector3Tuple } from 'three'
import { aimBone } from '@/utils/pose'
import Clickable from '@/scene/shared/Clickable'
import { purr } from '@/utils/sfx'
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
// Lo que dura el desperezo al despertarse (s)
const STRETCH_PAUSE = 2
// Rapidez con que entra y sale de una postura (mayor = más rápido)
const POSE_DAMPING = 6

/**
 * Postura: giros (radianes) sobre el eje de lado a lado del gato (negativo levanta lo de delante), cuánto baja la cadera
 * (en unidades del modelo, ~cm), los ojos (1 abiertos, 0 cerrados) y si mira a la cámara. Ajustadas a ojo en
 * toon_cat_free.glb, cuyo reposo es un paso a medio andar: por eso cada pata lleva lo suyo
 */
interface Pose {
  bones: [string, number][]
  drop: number
  eyes?: number
  lookAtCamera?: boolean
}
const POSES = {
  // Sentado mirándote: cuerpo inclinado, muslos hacia delante y recogidos, patas delanteras rectas y cuello estirado
  sit: {
    bones: [
      ['torso_02', -0.55],
      ['thighBL_03', -1.3],
      ['thighBR_026', -1.3],
      ['leglowerBL_05', 1.5],
      ['leglowerBR_028', 1.5],
      ['footBL_06', -0.3],
      ['footBR_029', -0.3],
      ['legupperFL_014', 0.85],
      ['legupperFR_024', -0.1],
      ['footFR_025', 0.8],
      ['neck_017', -0.3],
    ],
    drop: 100,
    lookAtCamera: true,
  },
  // Dormido hecho una bola: tumbado, patas recogidas, cabeza baja, cola en el suelo y ojos cerrados
  sleep: {
    bones: [
      ['thighBL_03', -1.3],
      ['thighBR_026', -1.3],
      ['leglowerBL_05', 1.5],
      ['leglowerBR_028', 1.5],
      ['legupperFL_014', 1.5],
      ['legupperFR_024', 0.6],
      ['leglowerFL_015', -1.5],
      ['leglowerFR_00', -1.5],
      ['neck_017', 0.5],
      ['head_018', 0.35],
      ['tail_07', -1.1],
      ['tail01_08', -0.3],
    ],
    drop: 125,
    eyes: 0.1,
  },
  // Desperezo: delante abajo con las patas delanteras estiradas y la cadera arriba
  stretch: {
    bones: [
      ['torso_02', 0.35],
      ['legupperFL_014', -1.0],
      ['legupperFR_024', -1.9],
      ['neck_017', 0.3],
    ],
    drop: 30,
  },
} satisfies Record<string, Pose>
type PoseName = keyof typeof POSES
const HIP = 'torso_02'
const EYES = ['eyeL_022', 'eyeR_023']
// La cabeza mira hacia la cámara (del hueso de la cabeza al de la boca), girando como mucho esto (radianes): si se le
// habla desde detrás, no se retuerce
const HEAD = 'head_018'
const HEAD_TARGET = 'mouth_021'
const MAX_HEAD_TURN = 1.2
// Todos los huesos que mueve alguna postura (y la cabeza y los ojos): se vuelven a su reposo antes de cada fotograma
const POSED_BONES = [...new Set([...Object.values(POSES).flatMap((pose) => pose.bones.map(([name]) => name)), HIP, HEAD, ...EYES])]

// Hueso y su reposo (la postura del modelo sin animar)
type Rest = { bone: Object3D; quaternion: Quaternion; position: Vector3; scale: Vector3 }

// Aplica una postura en su proporción amount (0 nada, 1 entera) partiendo del reposo. scale: la del modelo (para bajar la
// cadera en metros)
const axis = new Vector3()
const turn = new Quaternion()
const parentTurn = new Quaternion()
const point = new Vector3()
const look = new Vector3()
const headRest = new Quaternion()
function applyPose(wrapper: Object3D, rests: Map<string, Rest>, pose: Pose, amount: number, scale: number, camera: Camera) {
  rests.forEach((rest) => {
    rest.bone.quaternion.copy(rest.quaternion)
    rest.bone.position.copy(rest.position)
    rest.bone.scale.copy(rest.scale)
  })
  wrapper.updateMatrixWorld(true)
  // Eje de lado a lado del gato en la escena (el gato gira al pasear)
  axis.set(1, 0, 0).applyQuaternion(wrapper.getWorldQuaternion(turn))
  for (const [name, angle] of pose.bones) {
    const bone = rests.get(name)!.bone
    bone.parent!.getWorldQuaternion(parentTurn)
    turn.setFromAxisAngle(axis, angle * amount)
    bone.quaternion.premultiply(parentTurn.clone().invert().multiply(turn).multiply(parentTurn))
    bone.updateMatrixWorld(true)
  }
  const hip = rests.get(HIP)!.bone
  hip.getWorldPosition(point)
  point.y -= pose.drop * scale * amount
  hip.position.copy(hip.parent!.worldToLocal(point))
  if (pose.eyes !== undefined) for (const eye of EYES) rests.get(eye)!.bone.scale.y = MathUtils.lerp(1, pose.eyes, amount)

  // Cabeza: la apunta a la cámara y se queda con la parte que toca (según lo metido en la postura y el tope de giro)
  if (!pose.lookAtCamera) return
  const head = rests.get(HEAD)!.bone
  wrapper.updateMatrixWorld(true)
  headRest.copy(head.quaternion)
  look.subVectors(camera.position, head.getWorldPosition(point))
  const angle = wrapper.getObjectByName(HEAD_TARGET)!.getWorldPosition(new Vector3()).sub(point).angleTo(look)
  aimBone(wrapper, HEAD, HEAD_TARGET, look)
  head.quaternion.slerpQuaternions(headRest, head.quaternion.clone(), amount * Math.min(1, MAX_HEAD_TURN / Math.max(angle, 1e-6)))
}

/**
 * @param path - Puntos por los que pasa, en el suelo y en orden: el gato los recorre en bucle por una curva suave. El
 *   primero es donde se duerme (delante de la chimenea)
 * @param sound - Con los sonidos activados (Ajustes) ronronea al pulsarlo
 * @param focus - Modo concentración: al llegar al primer punto se duerme, y al acabar se despereza
 */
function Cat({ path, sound, focus }: { path: Vector3Tuple[]; sound: boolean; focus: boolean }) {
  const { scene, animations } = useGLTF(modelsManifest.toonCat.url, true, true)
  // prepareModel clona respetando el esqueleto, así la animación mueve esta copia
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, CAT_HEIGHT), [scene])
  const { actions } = useAnimations(animations, wrapper)
  // Curva cerrada que pasa por los puntos (centrípeta: no se pasa de largo en las curvas cerradas)
  const curve = useMemo(() => new CatmullRomCurve3(path.map((p) => new Vector3(...p)), true, 'centripetal'), [path])
  const groupRef = useRef<Group>(null)
  // Metros andados (el paseo no avanza mientras está en una postura), postura actual y cuánto está en ella (0 a 1),
  // segundos que le quedan sentado y desperezándose, si duerme, la animación y los huesos con su reposo
  const catRef = useRef({
    walked: 0,
    pose: null as PoseName | null,
    amount: 0,
    petted: 0,
    stretching: 0,
    asleep: false,
    action: null as AnimationAction | null,
    rests: new Map<string, Rest>(),
  })
  const focusRef = useRef(focus)
  useEffect(() => {
    focusRef.current = focus
  }, [focus])

  // El reposo se guarda antes de que empiece la animación (useLayoutEffect va antes que el useEffect que la pone)
  useLayoutEffect(() => {
    catRef.current.rests = new Map(
      POSED_BONES.map((name) => {
        const bone = wrapper.getObjectByName(name)!
        return [name, { bone, quaternion: bone.quaternion.clone(), position: bone.position.clone(), scale: bone.scale.clone() }] as const
      })
    )
  }, [wrapper])

  useEffect(() => {
    const action = actions[CAT_CLIP] ?? null
    action?.setEffectiveTimeScale(WALK_SPEED / STRIDE_SPEED).play()
    catRef.current.action = action
    return () => {
      action?.stop()
    }
  }, [actions])

  // Al acariciarlo se sienta (dormido, solo ronronea)
  const pet = () => {
    if (!catRef.current.asleep) catRef.current.petted = PET_PAUSE
    if (sound) purr()
  }

  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) return
    const cat = catRef.current
    const step = Math.min(delta, 0.1)
    cat.petted = Math.max(0, cat.petted - step)
    cat.stretching = Math.max(0, cat.stretching - step)
    // Al acabar la concentración se despierta desperezándose
    if (!focusRef.current && cat.asleep) {
      cat.asleep = false
      cat.stretching = STRETCH_PAUSE
    }
    const wanted: PoseName | null = cat.asleep ? 'sleep' : cat.petted > 0 ? 'sit' : cat.stretching > 0 ? 'stretch' : null

    // En una postura o yendo a otra: la animación de andar se para (deja los huesos libres) y no se avanza. Para pasar de
    // una postura a otra, primero sale de la que tiene
    if (wanted || cat.pose) {
      if (!cat.pose) {
        cat.pose = wanted
        cat.action?.stop()
      }
      cat.amount = MathUtils.damp(cat.amount, wanted === cat.pose ? 1 : 0, POSE_DAMPING, step)
      if (wanted !== cat.pose && cat.amount < 0.01) {
        applyPose(wrapper, cat.rests, POSES[cat.pose!], 0, scale, camera)
        cat.amount = 0
        cat.pose = wanted
        // Sin postura: a andar otra vez
        if (!wanted) cat.action?.reset().play()
        return
      }
      applyPose(wrapper, cat.rests, POSES[cat.pose!], cat.amount, scale, camera)
      return
    }

    // Paseo: su punto en la curva (a velocidad constante), mirando hacia donde camina (el modelo mira a +Z). Concentrándose,
    // al pasar por el primer punto de la vuelta (delante de la chimenea) se duerme
    const length = curve.getLength()
    const before = cat.walked % length
    cat.walked += WALK_SPEED * step
    if (focusRef.current && cat.walked % length < before) cat.asleep = true
    const along = (cat.walked % length) / length
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
