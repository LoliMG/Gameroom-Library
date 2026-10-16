import { useEffect, useMemo, useRef, useState } from 'react'
// Contenedor Canvas de React Three Fiber y su gestor de eventos de puntero por defecto
import { Canvas, events as createPointerEvents } from '@react-three/fiber'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/Experience'
// Importación del panel de detalle HTML mediante el alias "@"
import BookDetailPanel from '@/components/BookDetailPanel'
// Botón para capturar el ratón, mirilla y ayuda de controles
import PlayControls from '@/components/PlayControls'

// Campo de visión vertical de la cámara (grados); la posición la fija FirstPersonControls
const CAMERA_FOV = 60

// Color de fondo oscuro y cálido para envolver la habitación y crear atmósfera nocturna/acogedora
const BACKGROUND_COLOR = '#171413'

// Libros volteados (con la portada hacia la sala en vez del lomo), por ISBN, guardados entre visitas
const FLIPPED_STORAGE_KEY = 'fantasy-bookroom:flipped-books'

// Lista guardada de ISBN volteados; si localStorage no responde o el dato no es válido, ninguno
function loadFlippedIsbns() {
  try {
    const saved = JSON.parse(localStorage.getItem(FLIPPED_STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((isbn) => typeof isbn === 'string') : []
  } catch {
    return []
  }
}

// Eventos de puntero de R3F con un cambio: con el ratón capturado, el clic apunta al centro (la mirilla)
// en vez de a la última posición del cursor, que deja de moverse mientras está capturado
function centerPointerWhenLocked(store) {
  return {
    ...createPointerEvents(store),
    compute(event, state) {
      if (document.pointerLockElement) state.pointer.set(0, 0)
      else state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },
  }
}

function App() {
  // useState define el estado selectedBook que guarda el libro pulsado o null si no hay ninguno activo
  const [selectedBook, setSelectedBook] = useState(null)
  // ISBN de los libros puestos de frente (botón de volteo del panel)
  const [flippedIsbns, setFlippedIsbns] = useState(loadFlippedIsbns)
  const flippedSet = useMemo(() => new Set(flippedIsbns), [flippedIsbns])
  useEffect(() => {
    try {
      localStorage.setItem(FLIPPED_STORAGE_KEY, JSON.stringify(flippedIsbns))
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): siguen volteados hasta recargar
    }
  }, [flippedIsbns])
  const toggleFlip = (isbn) =>
    setFlippedIsbns((list) => (list.includes(isbn) ? list.filter((item) => item !== isbn) : [...list, isbn]))

  // Lienzo WebGL, necesario para capturar el ratón desde el botón HTML
  const canvasRef = useRef(null)

  // Al abrir un libro se suelta el ratón para poder usar el panel
  const handleSelectBook = (book) => {
    if (document.pointerLockElement) document.exitPointerLock()
    setSelectedBook(book)
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
        camera={{ fov: CAMERA_FOV }}
        events={centerPointerWhenLocked}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
        }}
        // shadows: habilita el cálculo y renderizado de mapas de sombras en el motor WebGL de Three.js
        shadows
      >
        {/* Color de fondo oscuro y cálido acoplado directamente al fondo de la escena WebGL */}
        <color attach="background" args={[BACKGROUND_COLOR]} />

        {/* Renderizado de la escena principal pasando el manejador de selección de libros */}
        <Experience onSelectBook={handleSelectBook} flippedIsbns={flippedSet} />
      </Canvas>

      {/* Controles de juego: HTML fuera del Canvas, por encima del lienzo */}
      {/* Algunos visores (iframes sin permiso) rechazan la captura: se avisa y se sigue con arrastrar para mirar */}
      <PlayControls
        onLock={() =>
          canvasRef.current
            ?.requestPointerLock()
            ?.catch((error) => console.warn('[PlayControls] No se pudo bloquear la cámara:', error.message))
        }
      />

      {/* BookDetailPanel se coloca fuera del <Canvas> como hermano suyo porque es un componente HTML tradicional; */}
      {/* los elementos HTML (div, img, button) no pueden procesarse dentro del contexto WebGL de Three.js. */}
      {/* Al estar fuera en el árbol DOM, se renderiza por encima del lienzo 3D mediante CSS con position: fixed y z-index. */}
      <BookDetailPanel
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        flipped={selectedBook ? flippedSet.has(selectedBook.isbn) : false}
        onToggleFlip={() => toggleFlip(selectedBook.isbn)}
      />
    </>
  )
}

export default App
