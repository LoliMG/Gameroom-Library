// Importación de useEffect y useRef de React para los escuchadores de teclado/ratón y el estado del jugador
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
// useFrame mueve la cámara en cada fotograma; useThree da acceso a cámara, lienzo y escena
import { useFrame, useThree } from '@react-three/fiber'
// Box3 para las cajas de colisión de los muebles
import { Box3, MathUtils, Vector3 } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'
// Dimensiones de la habitación para limitar el paseo al interior
import { ROOM_WIDTH, BACK_WALL_Z, FRONT_WALL_INNER_Z, FLOOR_Y, DOOR_Z } from '@/scene/room/Room'
// Fondo de las estanterías de las paredes a y d (el jugador no puede meterse en ellas)
import { BOOKSHELF_DEPTH } from '@/scene/shelves/Bookshelf'

// Altura de los ojos sobre el suelo
const EYE_HEIGHT = 1.25 // Altura de una persona pequeña
// Agacharse: mientras se mantiene pulsada la Z los ojos bajan a esta altura, con una transición suave
const CROUCH_KEY = 'KeyZ'
const CROUCH_EYE_HEIGHT = 0.8
const CROUCH_DAMPING = 10 // Rapidez de la transición (mayor = más rápida)

// Movimiento y vista
const WALK_SPEED = 1.6                  // Metros por segundo
const MAX_FRAME_DELTA = 0.1             // Tope del paso de tiempo para no atravesar nada tras un tirón
const DRAG_SENSITIVITY = 0.005          // Radianes por píxel al arrastrar
const LOCKED_SENSITIVITY = 0.0025       // Radianes por píxel con el ratón capturado
const MAX_PITCH = 1.35                  // Límite para mirar arriba/abajo (~77°)

// Sentarse (al leer) y levantarse: rapidez del paso de la cámara (mayor = más rápida) y distancia a la que se da por llegada
const SEAT_DAMPING = 3
const SEAT_ARRIVED = 0.01

// Colisiones: el jugador es un círculo en planta
const PLAYER_RADIUS = 0.4 // También es la distancia mínima a paredes y estanterías (más cerca parece que se atraviesan)
// Límites del paseo: paredes y frente de las estanterías, menos el radio del jugador
const MIN_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH + PLAYER_RADIUS // Frente de las estanterías de la pared a
const MAX_X = ROOM_WIDTH / 2 - PLAYER_RADIUS                     // Pared b
const MIN_Z = BACK_WALL_Z + PLAYER_RADIUS                        // Pared del fondo d (sin estanterías)
const MAX_Z = FRONT_WALL_INNER_Z - PLAYER_RADIUS                 // Muro del ventanal

// Punto de partida: recién entrado por la puerta (pared b), mirando al interior de la sala. Algo hacia el fondo del
// centro de la puerta para no rozar el sofá, que empieza justo al lado
const START_POSITION: Vector3Tuple = [MAX_X, FLOOR_Y + EYE_HEIGHT, DOOR_Z - 0.15]
const START_YAW = Math.PI / 2 // Giro horizontal: 0 = mirando a la pared d (-Z); π/2 = mirando a la pared a (-X)
const START_PITCH = -0.08     // Ligeramente hacia abajo

// Teclas (código físico, igual en cualquier distribución de teclado): [lateral, adelante/atrás]
// shortcut: sin controles táctiles para caminar; añadir un joystick virtual si se usa en móvil
const KEY_DIRECTIONS: Partial<Record<string, [number, number]>> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
}

// ¿El punto (x, z) cae dentro de alguna caja de colisión (ya ampliada con el radio del jugador)?
function isBlocked(x: number, z: number, colliders: Box3[]) {
  return colliders.some((box) => x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z)
}

/**
 * Cámara en primera persona: WASD/flechas para caminar, arrastrar el ratón para mirar
 * o, con el ratón capturado (pointer lock), mover el ratón sin pulsar.
 * La cámara no sale de la habitación y choca con los objetos marcados con userData.collider.
 */
/** Dónde se sienta la cámara: ojos y hacia dónde mira (giro horizontal e inclinación, en radianes) */
export interface Seat {
  position: Vector3Tuple
  yaw: number
  pitch: number
}

// Pose de la cámara hacia la que se va: la de sentarse o la que había antes de sentarse
type Pose = { position: Vector3; yaw: number; pitch: number }

// heldBookRef: libro pulsado (o null); solo se mira si hay uno, así que su tipo da igual (unknown).
// seat: con él la cámara va a sentarse ahí (sin caminar ni girar); al quitarlo vuelve a donde estaba
function FirstPersonControls({ heldBookRef, seat }: { heldBookRef: RefObject<unknown>; seat: Seat | null }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const scene = useThree((state) => state.scene)
  // Orientación actual y teclas pulsadas
  const look = useRef({ yaw: START_YAW, pitch: START_PITCH })
  const pressedKeys = useRef(new Set<string>())
  // Cajas de colisión de los muebles (se calculan cuando terminan de cargar los modelos)
  const colliders = useRef<Box3[] | null>(null)
  // Sentada (o yendo a sentarse), pose a la que se va y pose de antes de sentarse
  const seatedRef = useRef(false)
  const targetRef = useRef<Pose | null>(null)
  const standingRef = useRef<Pose | null>(null)
  useEffect(() => {
    if (seat) {
      standingRef.current ??= { position: camera.position.clone(), yaw: look.current.yaw, pitch: look.current.pitch }
      targetRef.current = { position: new Vector3(...seat.position), yaw: seat.yaw, pitch: seat.pitch }
    } else if (standingRef.current) {
      targetRef.current = standingRef.current
      standingRef.current = null
    }
    seatedRef.current = seat !== null
  }, [seat, camera])

  // Posición y orientación iniciales; orden YXZ: primero giro horizontal y luego inclinación, como en un juego
  useEffect(() => {
    camera.position.set(...START_POSITION)
    camera.rotation.set(START_PITCH, START_YAW, 0, 'YXZ')
  }, [camera])

  // Teclado: guarda qué teclas de movimiento (y la de agacharse) están pulsadas
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!KEY_DIRECTIONS[event.code] && event.code !== CROUCH_KEY) || (event.target as Element | null)?.closest?.('input, textarea')) return
      pressedKeys.current.add(event.code)
      event.preventDefault() // Evita que las flechas desplacen la página
    }
    const onKeyUp = (event: KeyboardEvent) => pressedKeys.current.delete(event.code)
    // Si la ventana pierde el foco con una tecla pulsada, no seguir caminando (ni agachado) solo
    const onBlur = () => pressedKeys.current.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Ratón: arrastrar para mirar, o mover sin pulsar si el ratón está capturado
  useEffect(() => {
    let dragging = false
    const onPointerDown = (event: PointerEvent) => {
      // Con Ctrl, arrastrar dibuja el recuadro de selección de libros (SelectionBox): la vista no gira
      if (event.button === 0 && !event.ctrlKey) dragging = true
    }
    const onPointerUp = () => {
      dragging = false
    }
    const onPointerMove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === canvas
      // Arrastrando un libro la vista no gira (con el ratón capturado sí: así se apunta al hueco de destino); sentada tampoco
      if (seatedRef.current || (!locked && (!dragging || heldBookRef.current !== null))) return
      const sensitivity = locked ? LOCKED_SENSITIVITY : DRAG_SENSITIVITY
      look.current.yaw -= event.movementX * sensitivity
      look.current.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.current.pitch - event.movementY * sensitivity))
      camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ')
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [camera, canvas, heldBookRef])

  // useFrame: camina según las teclas pulsadas, deslizándose contra paredes y muebles
  useFrame((_, delta) => {
    // Cajas de colisión: se recogen una vez que los muebles (dentro de Suspense) ya están en la escena
    if (!colliders.current) {
      const found: Box3[] = []
      scene.traverse((object) => {
        if (!object.userData.collider) return
        // precise: con los vértices; sin él, un mueble girado (la mesa de café) mide su caja girada y bloquea casi el doble
        const box = new Box3().setFromObject(object, true)
        // Se amplía en planta con el radio del jugador para tratarlo como un punto
        box.min.x -= PLAYER_RADIUS
        box.min.z -= PLAYER_RADIUS
        box.max.x += PLAYER_RADIUS
        box.max.z += PLAYER_RADIUS
        found.push(box)
      })
      if (found.length > 0) colliders.current = found
    }

    // Sentarse o levantarse: la cámara se desliza hasta la pose (el giro, por el camino corto) y mientras tanto no se camina
    const target = targetRef.current
    if (target) {
      const step = Math.min(delta, MAX_FRAME_DELTA)
      const turn = Math.atan2(Math.sin(target.yaw - look.current.yaw), Math.cos(target.yaw - look.current.yaw))
      look.current.yaw = MathUtils.damp(look.current.yaw, look.current.yaw + turn, SEAT_DAMPING, step)
      look.current.pitch = MathUtils.damp(look.current.pitch, target.pitch, SEAT_DAMPING, step)
      camera.position.set(
        MathUtils.damp(camera.position.x, target.position.x, SEAT_DAMPING, step),
        MathUtils.damp(camera.position.y, target.position.y, SEAT_DAMPING, step),
        MathUtils.damp(camera.position.z, target.position.z, SEAT_DAMPING, step)
      )
      camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ')
      // Ya de pie donde estaba: se vuelve a caminar
      if (!seatedRef.current && camera.position.distanceTo(target.position) < SEAT_ARRIVED && Math.abs(turn) < SEAT_ARRIVED) targetRef.current = null
      return
    }

    // Altura de los ojos: baja al agacharse y vuelve al soltar la tecla
    const eyeHeight = pressedKeys.current.has(CROUCH_KEY) ? CROUCH_EYE_HEIGHT : EYE_HEIGHT
    camera.position.setY(MathUtils.damp(camera.position.y, FLOOR_Y + eyeHeight, CROUCH_DAMPING, Math.min(delta, MAX_FRAME_DELTA)))

    // Dirección de entrada sumando las teclas de movimiento pulsadas
    let inputX = 0
    let inputZ = 0
    pressedKeys.current.forEach((code) => {
      const direction = KEY_DIRECTIONS[code]
      if (!direction) return
      inputX += direction[0]
      inputZ += direction[1]
    })
    const length = Math.hypot(inputX, inputZ)
    if (length === 0) return

    // Se pasa la entrada al plano del suelo según hacia dónde mira el jugador (solo el giro horizontal)
    const step = (WALK_SPEED * Math.min(delta, MAX_FRAME_DELTA)) / length
    const sin = Math.sin(look.current.yaw)
    const cos = Math.cos(look.current.yaw)
    const moveX = (inputX * cos + inputZ * sin) * step
    const moveZ = (-inputX * sin + inputZ * cos) * step

    // Cada eje por separado: si uno choca, el otro sigue y el jugador se desliza
    const boxes = colliders.current ?? []
    const nextX = Math.max(MIN_X, Math.min(MAX_X, camera.position.x + moveX))
    if (!isBlocked(nextX, camera.position.z, boxes)) camera.position.setX(nextX)
    const nextZ = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z + moveZ))
    if (!isBlocked(camera.position.x, nextZ, boxes)) camera.position.setZ(nextZ)
  })

  return null
}

export default FirstPersonControls
