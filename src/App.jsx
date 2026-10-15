// Importación del contenedor principal Canvas de React Three Fiber que inicializa la escena WebGL
import { Canvas } from '@react-three/fiber'
// Importación de la escena principal utilizando el alias "@" hacia src/
import Experience from '@/scene/Experience'

function App() {
  return (
    // Contenedor Canvas a pantalla completa (100vw x 100vh) sin márgenes ni scroll
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
      camera={{ position: [0, 0, 4], fov: 50 }}
    >
      {/* Renderizado de la escena 3D dentro del contexto WebGL de Three.js */}
      <Experience />
    </Canvas>
  )
}

export default App
