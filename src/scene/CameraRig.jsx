// Importación de useRef y useEffect de React para guardar el estado de la transición
import { useRef, useEffect } from 'react'
// useFrame para interpolar en cada fotograma y useThree para acceder a la cámara
import { useFrame, useThree } from '@react-three/fiber'
// OrbitControls de drei para rotar, acercar y desplazar con el ratón
import { OrbitControls } from '@react-three/drei'
// Vector3 para los destinos de la interpolación
import { Vector3 } from 'three'
// Puntos de vista fijos
import { CAMERA_VIEWS, DEFAULT_VIEW_ID } from '@/data/cameraViews'

// Velocidad de la transición: cuanto mayor, más rápida (suavizado exponencial independiente de los fps)
const TRANSITION_SPEED = 3.2
// Distancia (m) por debajo de la cual se da por terminada la transición
const ARRIVAL_THRESHOLD = 0.01

// Límites de OrbitControls
const MIN_DISTANCE = 0.4                   // No acercarse tanto como para atravesar objetos
const MAX_DISTANCE = 11                    // No alejarse más allá del jardín
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.04 // No bajar por debajo del horizonte (atravesar el suelo)
const MIN_POLAR_ANGLE = 0.15               // No llegar a la vertical exacta (evita giros bruscos)

// Busca un punto de vista por su id (o el de por defecto si no existe)
function getView(viewId) {
  return CAMERA_VIEWS.find((view) => view.id === viewId) ?? CAMERA_VIEWS.find((v) => v.id === DEFAULT_VIEW_ID)
}

/**
 * Cámara con puntos de vista fijos y transición suave entre ellos.
 * `viewId` es el punto de vista activo; `viewRequest` cambia cada vez que se pulsa un botón
 * (permite volver a la misma vista tras haber orbitado).
 */
function CameraRig({ viewId = DEFAULT_VIEW_ID, viewRequest = 0 }) {
  // Cámara activa del lienzo
  const camera = useThree((state) => state.camera)
  // Referencia a OrbitControls para mover su objetivo
  const controlsRef = useRef()
  // Destinos de la transición y si está en curso
  const transition = useRef({ active: false, position: new Vector3(), target: new Vector3() })

  // Al montar, la cámara empieza directamente en la vista inicial (sin transición)
  useEffect(() => {
    const view = getView(DEFAULT_VIEW_ID)
    camera.position.set(...view.position)
    controlsRef.current?.target.set(...view.target)
    controlsRef.current?.update()
  }, [camera])

  // Cada petición de vista arranca una transición hacia su posición y objetivo
  useEffect(() => {
    if (viewRequest === 0) return // La vista inicial ya se colocó al montar
    const view = getView(viewId)
    transition.current.position.set(...view.position)
    transition.current.target.set(...view.target)
    transition.current.active = true
  }, [viewId, viewRequest])

  // useFrame: interpola posición de cámara y objetivo hacia el destino mientras dure la transición
  useFrame((_, delta) => {
    const controls = controlsRef.current
    const state = transition.current
    if (!state.active || !controls) return
    // Factor de suavizado exponencial: misma velocidad aparente con cualquier tasa de fotogramas
    const alpha = 1 - Math.exp(-TRANSITION_SPEED * delta)
    camera.position.lerp(state.position, alpha)
    controls.target.lerp(state.target, alpha)
    controls.update()
    // Al llegar se suelta el control para que el usuario pueda orbitar libremente
    if (
      camera.position.distanceTo(state.position) < ARRIVAL_THRESHOLD &&
      controls.target.distanceTo(state.target) < ARRIVAL_THRESHOLD
    ) {
      state.active = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={MIN_POLAR_ANGLE}
      maxPolarAngle={MAX_POLAR_ANGLE}
      // Si el usuario empieza a arrastrar durante una transición, se cancela y manda el usuario
      onStart={() => {
        transition.current.active = false
      }}
    />
  )
}

export default CameraRig
