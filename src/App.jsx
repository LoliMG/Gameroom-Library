// Importación del contenedor Canvas de React Three Fiber que inicializa el contexto WebGL
import { Canvas } from '@react-three/fiber'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/Experience'

function App() {
  return (
    // Lienzo WebGL a pantalla completa (100vw x 100vh) sin márgenes ni scroll
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
      // Configuración de la perspectiva de la cámara para encuadrar la estantería completa al cargar
      camera={{ position: [0, 0, 3.8], fov: 45 }}
    >
      {/* Renderizado de la escena principal con la estantería, libros, luces y controles */}
      <Experience />
    </Canvas>
  )
}

export default App
