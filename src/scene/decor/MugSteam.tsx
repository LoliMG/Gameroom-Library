// Importación de useRef y useMemo de React para las mallas animadas y la textura generada
import { useRef, useMemo } from 'react'
// Hook useFrame de React Three Fiber para animar el vapor en cada fotograma
import { useFrame } from '@react-three/fiber'
// CanvasTexture para generar la textura difusa del vapor sin archivos externos
import { CanvasTexture } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

// Constantes del vapor
const PUFF_COUNT = 4            // Número de planos semitransparentes
const PUFF_SIZE = 0.05          // Tamaño inicial de cada plano (m)
const PUFF_GROWTH = 1.8         // Factor de crecimiento al llegar arriba
const RISE_HEIGHT = 0.16        // Altura que sube cada bocanada antes de desvanecerse (m)
const CYCLE_SECONDS = 3.2       // Duración del ciclo completo de una bocanada
const MAX_OPACITY = 0.22        // Opacidad máxima (vapor muy sutil)
const DRIFT_AMOUNT = 0.012      // Ondulación lateral (m)
const STEAM_COLOR = '#f2ece4'   // Blanco cálido
const TEXTURE_SIZE = 64         // Resolución de la textura radial generada (px)

/**
 * Vapor sutil que sube de una taza: varios planos que miran a la cámara, suben, crecen y se desvanecen.
 * `position` es el borde superior de la taza.
 */
function MugSteam({ position = [0, 0, 0] }: { position?: Vector3Tuple }) {
  // Referencias a cada plano del vapor
  const puffRefs = useRef<(Mesh | null)[]>([])

  // Textura radial difusa (blanco en el centro, transparente en el borde) generada una sola vez
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEXTURE_SIZE
    canvas.height = TEXTURE_SIZE
    // Lienzo nuevo: getContext('2d') no puede devolver null
    const ctx = canvas.getContext('2d')!
    const half = TEXTURE_SIZE / 2
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
    return new CanvasTexture(canvas)
  }, [])

  // useFrame: actualiza altura, tamaño, opacidad y orientación de cada bocanada
  useFrame(({ clock, camera }) => {
    puffRefs.current.forEach((puff, i) => {
      if (!puff) return
      // Progreso 0 → 1 de esta bocanada, desfasada respecto a las demás
      const progress = ((clock.elapsedTime / CYCLE_SECONDS) + i / PUFF_COUNT) % 1
      // Sube con el progreso y ondula a los lados
      puff.position.set(
        Math.sin(progress * Math.PI * 2 + i) * DRIFT_AMOUNT,
        progress * RISE_HEIGHT,
        Math.cos(progress * Math.PI * 1.5 + i) * DRIFT_AMOUNT * 0.5
      )
      // Crece mientras sube
      const scale = PUFF_SIZE * (1 + progress * (PUFF_GROWTH - 1))
      puff.scale.set(scale, scale, scale)
      // Aparece y se desvanece (curva seno: 0 al principio y al final)
      ;(puff.material as MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * MAX_OPACITY
      // Siempre de cara a la cámara (billboard)
      puff.quaternion.copy(camera.quaternion)
    })
  })

  return (
    <group position={position}>
      {Array.from({ length: PUFF_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            puffRefs.current[i] = el
          }}
          renderOrder={2}
        >
          <planeGeometry args={[1, 1]} />
          {/* Material sin iluminación, transparente y sin escribir profundidad para no tapar lo que hay detrás */}
          <meshBasicMaterial
            map={texture}
            color={STEAM_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export default MugSteam
