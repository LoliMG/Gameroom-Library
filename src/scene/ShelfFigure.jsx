// Importación de useMemo, useRef y useEffect de React para preparar el modelo una vez y animar el brillo
import { useMemo, useRef, useEffect } from 'react'
// useFrame para el parpadeo del brillo; useGLTF para cargar el modelo
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Mide, centra y escala el modelo a su altura objetivo
import { prepareModel } from '@/utils/prepareModel'
// Soporte de la extensión antigua de materiales (si no, bakugo.glb sale sin colores)
import { withSpecularGlossiness } from '@/utils/specularGlossiness'
// Activa sombras en todas las mallas
import { enableShadows } from '@/utils/shadows'

// Parpadeo del brillo: suma de dos senos para que no se note el ciclo (como las velas)
const GLOW_SPEED_A = 5.1
const GLOW_SPEED_B = 8.7
const GLOW_FLICKER = 0.25 // ±25 % de intensidad


/**
 * Figura u objeto decorativo apoyado sobre una repisa, escalado a una altura sin deformarlo.
 * `position` es el punto de apoyo (centro de la base); `glow` = { material, color, intensity } hace brillar
 * un material del modelo con su propia textura y un parpadeo suave (el Bloom de Effects le da el halo).
 * `alphaCutout = false` conserva la transparencia mezclada (para cristal).
 * `pose` es una función que recibe el clon (con su propio esqueleto) para colocarlo en una postura, p. ej. relaxArms.
 */
function ShelfFigure({ model, height, position, rotationY = 0, glow, alphaCutout = true, pose }) {
  // Draco y Meshopt como en el resto de cargas (valores por defecto de drei) más el plugin de materiales antiguos
  const { scene } = useGLTF(modelsManifest[model].url, true, true, withSpecularGlossiness)
  const { wrapper, scale, glowMaterial } = useMemo(() => {
    const prepared = prepareModel(scene, undefined, height, { alphaCutout })
    // Postura: se aplica al clon antes de colocarlo en la escena (sin escala ni giro todavía)
    if (pose) pose(prepared.wrapper)
    enableShadows(prepared.wrapper)
    // Material que brilla: usa su propia textura como mapa de emisión para que el brillo siga el dibujo
    let material = null
    if (glow) {
      prepared.wrapper.traverse((node) => {
        if (node.isMesh && node.material.name === glow.material) material = node.material
      })
      if (!material) throw new Error(`[ShelfFigure] El modelo "${model}" no tiene el material "${glow.material}"`)
      material.emissive.set(glow.color)
      material.emissiveMap = material.map
      material.needsUpdate = true
    }
    return { ...prepared, glowMaterial: material }
  }, [scene, height, alphaCutout, glow, model, pose])

  // Referencia al material que brilla para animarlo en cada fotograma
  const glowRef = useRef(null)
  useEffect(() => {
    glowRef.current = glowMaterial
  }, [glowMaterial])

  // useFrame: parpadeo del brillo como una llama
  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.elapsedTime
    const flicker = Math.sin(t * GLOW_SPEED_A) * 0.6 + Math.sin(t * GLOW_SPEED_B) * 0.4
    glowRef.current.emissiveIntensity = glow.intensity * (1 + flicker * GLOW_FLICKER)
  })

  return <primitive object={wrapper} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

export default ShelfFigure
