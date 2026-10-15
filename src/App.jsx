import { useState } from 'react'
// Importación del contenedor Canvas de React Three Fiber que inicializa el contexto WebGL
import { Canvas } from '@react-three/fiber'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/Experience'
// Importación del panel de detalle HTML mediante el alias "@"
import BookDetailPanel from '@/components/BookDetailPanel'
// Botones HTML para cambiar de punto de vista de la cámara (Fase 10)
import CameraButtons from '@/components/CameraButtons'
// Puntos de vista de la cámara: la cámara arranca en la vista por defecto
import { CAMERA_VIEWS, DEFAULT_VIEW_ID } from '@/data/cameraViews'

// Posición inicial de la cámara: la de la vista por defecto (CameraRig la vuelve a fijar al montar)
const CAMERA_POSITION = CAMERA_VIEWS.find((view) => view.id === DEFAULT_VIEW_ID).position

// Campo de visión vertical de la cámara (grados)
const CAMERA_FOV = 52

// Color de fondo oscuro y cálido para envolver la habitación y crear atmósfera nocturna/acogedora
const BACKGROUND_COLOR = '#171413'

function App() {
  // useState define el estado selectedBook que guarda el libro pulsado o null si no hay ninguno activo
  const [selectedBook, setSelectedBook] = useState(null)
  // Punto de vista activo de la cámara y contador de peticiones (permite repetir la misma vista tras orbitar)
  const [camera, setCamera] = useState({ viewId: DEFAULT_VIEW_ID, request: 0 })

  // Al pulsar un botón se pide una transición hacia esa vista
  const handleSelectView = (viewId) => {
    setCamera((current) => ({ viewId, request: current.request + 1 }))
  }

  return (
    <>
      {/* Lienzo WebGL a pantalla completa (100vw x 100vh) sin márgenes ni scroll */}
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
        // Perspectiva de cámara inicial; CameraRig se encarga después de las transiciones entre vistas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        // shadows: habilita el cálculo y renderizado de mapas de sombras en el motor WebGL de Three.js
        shadows
      >
        {/* Color de fondo oscuro y cálido acoplado directamente al fondo de la escena WebGL */}
        <color attach="background" args={[BACKGROUND_COLOR]} />

        {/* Renderizado de la escena principal pasando el manejador de selección y el punto de vista activo */}
        <Experience
          onSelectBook={setSelectedBook}
          viewId={camera.viewId}
          viewRequest={camera.request}
        />
      </Canvas>

      {/* Botones de puntos de vista: HTML fuera del Canvas, siguen funcionando con el panel abierto */}
      <CameraButtons activeViewId={camera.viewId} onSelectView={handleSelectView} />

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
