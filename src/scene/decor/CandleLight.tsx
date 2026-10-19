// Importación de useRef de React para acceder a las mallas animadas
import { useRef } from 'react'
// Hook useFrame de React Three Fiber para animar la llama en cada fotograma
import { useFrame } from '@react-three/fiber'
import type { Group, PointLight } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

// Constantes de la vela de cera (solo se dibuja si la vela no viene ya en un modelo, p. ej. candle.glb)
const WAX_RADIUS = 0.022     // Radio del cilindro de cera (m)
const WAX_HEIGHT = 0.09      // Altura de la vela (m)
const WAX_COLOR = '#efe4cc'  // Cera marfil
const WICK_HEIGHT = 0.008    // Mecha que asoma sobre la cera
const WICK_COLOR = '#2a2018'

// Constantes de la llama (material básico sin iluminación; colores > 1 para que el Bloom de la Fase 8 la haga brillar)
const FLAME_HEIGHT = 0.035                 // Alto de la llama exterior (m)
const FLAME_RADIUS = 0.009                 // Radio de la llama exterior (m)
// Colores [r, g, b] (de 0 a 1, aquí por encima de 1 a propósito)
const FLAME_OUTER_COLOR: [number, number, number] = [2.4, 1.1, 0.35] // Naranja cálido sobreexpuesto
const FLAME_INNER_COLOR: [number, number, number] = [3.0, 2.4, 1.3]  // Núcleo amarillo casi blanco
const FLAME_OUTER_OPACITY = 0.75
const FLAME_INNER_SCALE = 0.55             // Tamaño del núcleo respecto a la llama exterior

// Constantes del parpadeo: suma de senos de distinta frecuencia para que no se note el ciclo
const FLICKER_SPEED_A = 7.3   // Frecuencia principal (rad/s)
const FLICKER_SPEED_B = 12.9  // Frecuencia secundaria
const FLICKER_AMOUNT = 0.08   // Variación de altura de la llama (±8 %)
const SWAY_AMOUNT = 0.06      // Inclinación lateral máxima de la llama (rad)

// Luz puntual muy tenue y sin sombras para dar un halo cálido local (no desvirtúa la luz del ventanal)
const CANDLE_LIGHT_COLOR = '#ffb36b'
const CANDLE_LIGHT_INTENSITY = 0.12   // Intensidad base, muy baja a propósito
const CANDLE_LIGHT_DISTANCE = 1.1     // Alcance en metros
const CANDLE_LIGHT_DECAY = 2
const CANDLE_LIGHT_HEIGHT = 0.05      // Altura de la luz sobre la base de la llama

/**
 * Vela decorativa con llama titilante.
 * `position` es el punto de apoyo: la base de la cera o, con `withWax = false`, la base de la llama
 * (útil cuando la vela ya forma parte de un modelo, como candle.glb).
 */
function CandleLight({ position = [0, 0, 0], withWax = true, withLight = true }: { position?: Vector3Tuple; withWax?: boolean; withLight?: boolean }) {
  // Referencia al grupo de la llama para escalarla e inclinarla en cada fotograma
  const flameRef = useRef<Group>(null)
  // Referencia a la luz puntual para que su intensidad acompañe al parpadeo
  const lightRef = useRef<PointLight>(null)
  // Fase fija derivada de la posición para que cada vela parpadee a destiempo (determinista, sin Math.random)
  const phase = position[0] * 13.7 + position[2] * 7.3

  // Altura de la base de la llama: encima de la mecha si dibujamos la cera, o en el punto indicado si no
  const flameBaseY = withWax ? WAX_HEIGHT + WICK_HEIGHT * 0.5 : 0

  // useFrame: se ejecuta en cada fotograma; anima altura, anchura e inclinación de la llama
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    const flicker = Math.sin(t * FLICKER_SPEED_A) * 0.6 + Math.sin(t * FLICKER_SPEED_B) * 0.4
    if (flameRef.current) {
      // La llama crece/encoge en altura y compensa un poco en anchura
      flameRef.current.scale.set(1 - flicker * FLICKER_AMOUNT * 0.5, 1 + flicker * FLICKER_AMOUNT, 1)
      // Balanceo lateral suave
      flameRef.current.rotation.z = Math.sin(t * FLICKER_SPEED_A * 0.37) * SWAY_AMOUNT
    }
    if (lightRef.current) {
      lightRef.current.intensity = CANDLE_LIGHT_INTENSITY * (1 + flicker * FLICKER_AMOUNT)
    }
  })

  return (
    <group position={position}>
      {withWax && (
        <>
          {/* Cilindro de cera apoyado en el punto indicado (centro a media altura) */}
          <mesh position={[0, WAX_HEIGHT / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[WAX_RADIUS, WAX_RADIUS, WAX_HEIGHT, 16]} />
            <meshStandardMaterial color={WAX_COLOR} roughness={0.6} />
          </mesh>
          {/* Mecha */}
          <mesh position={[0, WAX_HEIGHT + WICK_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.0012, 0.0012, WICK_HEIGHT, 6]} />
            <meshBasicMaterial color={WICK_COLOR} />
          </mesh>
        </>
      )}

      {/* Llama: el grupo tiene el origen en la base para que escale y se incline desde la mecha */}
      <group ref={flameRef} position={[0, flameBaseY, 0]}>
        {/* Llama exterior: esfera estirada en vertical; toneMapped=false conserva el color > 1 para el Bloom */}
        <mesh position={[0, FLAME_HEIGHT / 2, 0]} scale={[FLAME_RADIUS, FLAME_HEIGHT / 2, FLAME_RADIUS]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            color={FLAME_OUTER_COLOR}
            transparent
            opacity={FLAME_OUTER_OPACITY}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* Núcleo brillante de la llama, más pequeño y bajo */}
        <mesh
          position={[0, (FLAME_HEIGHT * FLAME_INNER_SCALE) / 2, 0]}
          scale={[
            FLAME_RADIUS * FLAME_INNER_SCALE,
            (FLAME_HEIGHT * FLAME_INNER_SCALE) / 2,
            FLAME_RADIUS * FLAME_INNER_SCALE,
          ]}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color={FLAME_INNER_COLOR} toneMapped={false} />
        </mesh>
      </group>

      {/* Halo de luz cálida muy tenue; las velas NO proyectan sombras */}
      {withLight && (
        <pointLight
          ref={lightRef}
          position={[0, flameBaseY + CANDLE_LIGHT_HEIGHT, 0]}
          color={CANDLE_LIGHT_COLOR}
          intensity={CANDLE_LIGHT_INTENSITY}
          distance={CANDLE_LIGHT_DISTANCE}
          decay={CANDLE_LIGHT_DECAY}
          castShadow={false}
        />
      )}
    </group>
  )
}

export default CandleLight
