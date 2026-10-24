// Pantalla de carga encima de la sala hasta que están montados la sala y el jardín (SceneReady) y han llegado los
// archivos que piden después (portadas, figuras): así no se ve la sala a medio montar
import { useEffect, useState } from 'react'
// useProgress de drei: cuántos archivos han pedido los cargadores de three.js y cuántos han llegado
import { useProgress } from '@react-three/drei'
import { useSceneReady } from '@/utils/sceneReady'

// Tiempo sin cargar nada, con la sala y el jardín ya montados, para quitar la pantalla: lo que se monta entonces
// (portadas de los libros, figuras de las repisas) empieza a pedir sus archivos un momento después
const SETTLE_MS = 400

function LoadingScreen() {
  const { active, loaded, total } = useProgress()
  const sceneReady = useSceneReady()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done || !sceneReady || active) return
    const timer = setTimeout(() => setDone(true), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [done, sceneReady, active, loaded])
  if (done) return null

  // Porcentaje de archivos llegados (el de drei se reinicia con cada tanda)
  const percent = total ? Math.round((loaded / total) * 100) : 0
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <p className="loading-screen-title">Preparando tu rincón de lectura…</p>
      <div className="loading-screen-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Carga de la sala">
        <div className="loading-screen-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default LoadingScreen
