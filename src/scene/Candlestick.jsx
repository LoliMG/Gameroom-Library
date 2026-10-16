// Importación de useMemo de React para clonar el modelo una vez
import { useMemo } from 'react'
// useGLTF de drei para cargar candle.glb
import { useGLTF } from '@react-three/drei'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Activa sombras en todas las mallas de un modelo clonado
import { enableShadows } from '@/utils/shadows'
// Llama titilante (Fase 7)
import CandleLight from '@/scene/CandleLight'

// Escala del candelabro según el manifiesto
const CANDLE_SCALE = modelsManifest.candle.scale
// Punta de la mecha de candle.glb: 0.1766 unidades de altura original (× escala) ≈ 0.159 m
const WICK_HEIGHT = 0.1766 * CANDLE_SCALE
// Llama estática que trae el propio modelo: se oculta porque la sustituye la llama titilante de CandleLight
const MODEL_FLAME_NODE = 'Flame_4'

/**
 * Candelabro de cobre con vela (candle.glb) y llama titilante sobre la mecha.
 * `position` es el punto de apoyo de la base; `withLight` añade el halo de luz tenue
 * (el plan limita a 4 las luces de vela, así que no todas lo llevan).
 */
function Candlestick({ position, rotationY = 0, withLight = true }) {
  const { scene } = useGLTF(modelsManifest.candle.url)
  const candle = useMemo(() => {
    const clone = enableShadows(scene.clone())
    const modelFlame = clone.getObjectByName(MODEL_FLAME_NODE)
    if (modelFlame) modelFlame.visible = false
    return clone
  }, [scene])

  return (
    <>
      <primitive object={candle} position={position} rotation={[0, rotationY, 0]} scale={CANDLE_SCALE} />
      {/* La llama va en coordenadas del mundo para que cada vela parpadee a destiempo (su fase sale de la posición) */}
      <CandleLight position={[position[0], position[1] + WICK_HEIGHT, position[2]]} withWax={false} withLight={withLight} />
    </>
  )
}

export default Candlestick
