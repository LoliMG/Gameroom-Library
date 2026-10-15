import { useState } from 'react'
// Importación del contenedor Canvas de React Three Fiber que inicializa el contexto WebGL
import { Canvas } from '@react-three/fiber'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/Experience'
// Importación del panel de detalle HTML mediante el alias "@"
import BookDetailPanel from '@/components/BookDetailPanel'

// Coordenadas iniciales de la cámara para encuadrar la estantería de frente con la habitación alrededor
const CAMERA_POSITION = [0, 0.45, 2.7]

// Punto de mira inicial de OrbitControls centrado en la estantería apoyada contra la pared del fondo
const ORBIT_TARGET = [0, 0.15, -1.825]

// Color de fondo oscuro y cálido para envolver la habitación y crear atmósfera nocturna/acogedora
const BACKGROUND_COLOR = '#171413'

function App() {
  // useState define el estado selectedBook que guarda el libro pulsado o null si no hay ninguno activo
  const [selectedBook, setSelectedBook] = useState(null)

  return (
    <>
      {/* Lienzo WebGL a pantalla completa (100vw x 100vh) sin márgenes ni scroll */}
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
        // Perspectiva de cámara ajustada para visualizar la estantería con el suelo y las paredes circundantes
        camera={{ position: CAMERA_POSITION, fov: 52 }}
        // shadows: habilita el cálculo y renderizado de mapas de sombras en el motor WebGL de Three.js
        shadows
      >
        {/* Color de fondo oscuro y cálido acoplado directamente al fondo de la escena WebGL */}
        <color attach="background" args={[BACKGROUND_COLOR]} />

        {/* Renderizado de la escena principal pasando el manejador de selección y el objetivo de la cámara */}
        <Experience onSelectBook={setSelectedBook} orbitTarget={ORBIT_TARGET} />
      </Canvas>

      {/* BookDetailPanel se coloca fuera del <Canvas> como hermano suyo porque es un componente HTML tradicional; */}
      {/* los elementos HTML (div, img, button) no pueden procesarse dentro del contexto WebGL de Three.js. */}
      {/* Al estar fuera en el árbol DOM, se renderiza por encima del lienzo 3D mediante CSS con position: fixed y z-index. */}
      <BookDetailPanel
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </>
  )
}

export default App
