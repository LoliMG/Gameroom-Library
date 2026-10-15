// Importación de Suspense de React para pausar el render hasta que las texturas estén cargadas
import { Suspense } from 'react'
// Control orbital interactivo de drei para rotar y revisar la escena
import { OrbitControls } from '@react-three/drei'
// Importación del listado de libros disponibles
import books from '@/data/books'
// Importación del componente de iluminación personalizada
import Lights from '@/scene/Lights'
// Importación de la estructura de la habitación (suelo y paredes)
import Room, { ROOM_WIDTH, BACK_WALL_Z, FLOOR_Y } from '@/scene/Room'
// Importación de la pared de estanterías y constantes de estantería
import BookshelfWall from '@/scene/BookshelfWall'
import {
  BOOKSHELF_WIDTH,
  SHELF_HEIGHT,
  BOOKSHELF_DEPTH,
  INNER_WIDTH,
  SHELF_COUNT,
  BOOK_GAP,
} from '@/scene/Bookshelf'
// Importación de la función pura de reparto de libros para verificación
import { layoutBooksOnShelves } from '@/utils/shelfLayout'

// Cota Y para apoyar la base de las estanterías (altura 2.7m) directamente sobre el suelo (Y = -1.0)
const SHELF_WALL_Y = FLOOR_Y + SHELF_HEIGHT / 2 // -1.0 + 1.35 = 0.35

// Posición Z para adosar la trasera de las estanterías (fondo 0.35m) contra la pared del fondo (Z = -2.0m)
const SHELF_WALL_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2 // -2.0 + 0.175 = -1.825

function Experience({ onSelectBook, orbitTarget = [0, 0.35, -2.0] }) {
  // Comprobación de capacidad: avisar con console.warn en español si algún libro no cupo tras llenar todas las estanterías
  const shelfCount = Math.floor(ROOM_WIDTH / BOOKSHELF_WIDTH)
  let remainingBooks = [...books]

  for (let i = 0; i < shelfCount; i++) {
    const { usedCount } = layoutBooksOnShelves(remainingBooks, {
      innerWidth: INNER_WIDTH,
      shelfCount: SHELF_COUNT,
      bookGap: BOOK_GAP,
    })
    remainingBooks = remainingBooks.slice(usedCount)
  }

  if (remainingBooks.length > 0) {
    console.warn(
      `[Experience] Quedan ${remainingBooks.length} libros sin colocar tras llenar todas las estanterías de la pared.`
    )
  }

  return (
    <>
      {/* Control orbital de cámara con el objetivo (target) enfocado al centro de la pared del fondo */}
      <OrbitControls makeDefault target={orbitTarget} />

      {/* Iluminación cálida de rincón de lectura (luz ambiental, direccional suave y punto de luz puntual ámbar) */}
      <Lights />

      {/* Renderizado de la carcasa de la habitación alargada (suelo y 3 paredes) */}
      <Room />

      {/* Suspense gestiona la carga asíncrona de las texturas de los libros */}
      <Suspense fallback={null}>
        {/* Renderizado de la pared de estanterías de suelo a techo adosada a la pared del fondo (d) */}
        <BookshelfWall
          books={books}
          wallLength={ROOM_WIDTH}
          position={[0, SHELF_WALL_Y, SHELF_WALL_Z]}
          rotation={[0, 0, 0]}
          onSelectBook={onSelectBook}
        />
      </Suspense>
    </>
  )
}

export default Experience
