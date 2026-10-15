import { useState } from 'react'
// Importación del contenedor Canvas de React Three Fiber que inicializa el contexto WebGL
import { Canvas } from '@react-three/fiber'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/Experience'
// Importación del panel de detalle HTML mediante el alias "@"
import BookDetailPanel from '@/components/BookDetailPanel'

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
        // Configuración de la perspectiva de la cámara para encuadrar la estantería completa al cargar
        camera={{ position: [0, 0, 3.8], fov: 45 }}
      >
        {/* Renderizado de la escena principal pasando la función para actualizar el libro seleccionado */}
        <Experience onSelectBook={setSelectedBook} />
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
