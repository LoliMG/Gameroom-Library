// Html de drei: una página HTML de verdad (con sus botones y su buscador) colocada en 3D
import { Html } from '@react-three/drei'
// Panel de la biblioteca que se muestra en la pantalla
import BookDashboard from '@/components/BookDashboard'
import type { ComponentProps } from 'react'

// Pantalla: 0.8 × 0.95 m de imagen dentro de un marco de 3 cm
const SCREEN_WIDTH = 0.8
const SCREEN_HEIGHT = 0.95
const FRAME_BORDER = 0.03
const FRAME_DEPTH = 0.04
// La página mide 800 px de ancho; con transform, drei mide 1 px = distanceFactor / 400 m, así que 0.4 da 1 px = 1 mm
const HTML_DISTANCE_FACTOR = (SCREEN_WIDTH / 800) * 400
// Por debajo del panel del libro (z-index 1000) y de los controles (900)
const HTML_Z_INDEX_RANGE: [number, number] = [100, 0]

/**
 * Pantalla colgada en la pared con el panel de la biblioteca (portadas, búsqueda, filtros y estados de lectura).
 * Es HTML encima del lienzo: se usa con el ratón libre (con la cámara bloqueada, C la suelta).
 * El grupo mira hacia su +Z local: se gira para que dé a la sala.
 */
// Las propiedades del panel (books, readingStatus, onSetStatus, onOpenBook) son las mismas que las de BookDashboard:
// ComponentProps<typeof BookDashboard> las toma de allí en vez de repetirlas
type BookConsoleProps = ComponentProps<typeof BookDashboard> & {
  position: [number, number, number]
  rotationY: number
}

function BookConsole({ position, rotationY, books, readingStatus, onSetStatus, onOpenBook }: BookConsoleProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Marco */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[SCREEN_WIDTH + 2 * FRAME_BORDER, SCREEN_HEIGHT + 2 * FRAME_BORDER, FRAME_DEPTH]} />
        <meshStandardMaterial color="#1a1512" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Pantalla: la página va justo delante del marco */}
      <Html
        transform
        distanceFactor={HTML_DISTANCE_FACTOR}
        position={[0, 0, FRAME_DEPTH / 2 + 0.002]}
        zIndexRange={HTML_Z_INDEX_RANGE}
        wrapperClass="book-console-layer"
      >
        <BookDashboard books={books} readingStatus={readingStatus} onSetStatus={onSetStatus} onOpenBook={onOpenBook} />
      </Html>
    </group>
  )
}

export default BookConsole
