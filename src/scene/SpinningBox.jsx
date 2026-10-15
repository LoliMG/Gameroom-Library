import { useRef } from 'react'
// Hook de React Three Fiber para ejecutar código en cada fotograma del ciclo de renderizado
import { useFrame } from '@react-three/fiber'

function SpinningBox() {
  // Referencia al objeto 3D (Mesh) para manipularlo directamente sin forzar re-renderizados de React
  const meshRef = useRef(null)

  // useFrame se ejecuta en cada fotograma de la escena 3D proporcionando el estado y el tiempo delta
  useFrame((state, delta) => {
    // Rotación continua del cubo sobre el eje Y ajustada por el tiempo transcurrido (delta)
    if (meshRef.current) {
      meshRef.current.rotation.y += delta
    }
  })

  return (
    // Elemento mesh nativo de Three.js administrado por React Three Fiber
    <mesh ref={meshRef}>
      {/* Geometría cúbica de Three.js con dimensiones especificadas */}
      <boxGeometry args={[1, 1, 1]} />
      {/* Material estándar de Three.js que reacciona físicamente a la luz */}
      <meshStandardMaterial color="mediumpurple" />
    </mesh>
  )
}

export default SpinningBox
