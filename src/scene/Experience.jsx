// Importación de Suspense de React para pausar el render hasta que las texturas estén cargadas
import { Suspense } from 'react'
// Control orbital interactivo de drei y Environment para reflejos sutiles
import { OrbitControls, Environment } from '@react-three/drei'
// Importación de la paleta ambiental activa
import { PALETTE } from '@/scene/ambiencePalette'
// Importación del entorno exterior (jardín, árboles, flores y cielo)
import Outside from '@/scene/Outside'
// Importación del listado de libros disponibles
import books from '@/data/books'
// Importación del componente de iluminación personalizada
import Lights from '@/scene/Lights'
// Importación de la estructura de la habitación y sus dimensiones clave
import Room, {
  ROOM_WIDTH,
  ROOM_DEPTH,
  BACK_WALL_Z,
  FLOOR_Y,
} from '@/scene/Room'
// Importación del componente de pared de estanterías
import BookshelfWall from '@/scene/BookshelfWall'
// Importación del rincón de lectura con sofá, cojines, manta, mesa de café y accesorios
import SofaCorner from '@/scene/SofaCorner'
// Importación de la puerta de entrada de madera antigua (door.glb)
import Door from '@/scene/Door'
// Importación de la función pura de colocación en pared desde utils
import { getWallPlacement } from '@/utils/shelfLayout'
import { SHELF_HEIGHT, BOOKSHELF_DEPTH } from '@/scene/Bookshelf'

// Cota Y para apoyar la base de todas las estanterías (altura 2.7m) sobre el suelo (Y = -1.0)
const SHELF_WALL_Y = FLOOR_Y + SHELF_HEIGHT / 2 // -1.0 + 1.35 = 0.35

// Posición y orientación de la puerta de entrada (door.glb) en la pared b (+X):
// Situada en el vano entre las estanterías del fondo d (Z = -1.65 m) y el sofá (Z = +1.06 m)
const DOOR_X = ROOM_WIDTH / 2 - 0.08 // +2.17 m (empotrada en la pared b, con marco visible)
const DOOR_Y = FLOOR_Y // -1.0 m (apoyada a ras de suelo)
const DOOR_Z = -0.30 // Centrada en el hueco de la pared
const DOOR_ROTATION = [0, -Math.PI / 2, 0] // Su hoja mira hacia el interior (-X)

// Color de madera a juego con las estanterías para el bloque de unión en esquina recta
const WOOD_COLOR = '#5c3a21'

// 1. CONFIGURACIÓN DE LA PARED DEL FONDO (d):
// Longitud útil: desde el frente de la estantería de la pared a (X = -ROOM_WIDTH/2 + BOOKSHELF_DEPTH = -1.90m)
// hasta la pared derecha (X = +ROOM_WIDTH/2 = +2.25m). Total: 4.5 - 0.35 = 4.15m.
const WALL_D_SHELF_LENGTH = ROOM_WIDTH - BOOKSHELF_DEPTH // 4.15m

// Posición X centrada en el tramo útil de la pared d: (-1.90 + 2.25) / 2 = +0.175m
const SHELF_WALL_D_X =
  -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH + WALL_D_SHELF_LENGTH / 2 // 0.175m

// Posición Z: adosada contra la pared del fondo (Z = -2.0m)
const SHELF_WALL_D_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2 // -2.0 + 0.175 = -1.825m

// 2. CONFIGURACIÓN DE LA PARED IZQUIERDA (a) - Pared larga de estanterías opuesta:
// Longitud útil: profundidad de la habitación menos el fondo de las estanterías de la pared d (6.0 - 0.35 = 5.65m)
// Inicia en el frente de la pared d (Z = -1.65m) y va hasta el frente de la estancia (Z = +4.0m)
const WALL_A_SHELF_LENGTH = ROOM_DEPTH - BOOKSHELF_DEPTH // 5.65m

// Posición X: apoyada contra la pared izquierda a (X = -ROOM_WIDTH / 2 = -2.25m)
const SHELF_WALL_A_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.25 + 0.175 = -2.075m

// Posición Z: centrada en el tramo útil de la pared izquierda (desde Z = -1.65m hasta Z = +4.0m)
const SHELF_WALL_A_Z =
  BACK_WALL_Z + BOOKSHELF_DEPTH + WALL_A_SHELF_LENGTH / 2 // -1.65 + 2.825 = 1.175m

// Rotación para la pared izquierda: +90 grados (+PI / 2) sobre el eje Y
// De este modo, la trasera (local -Z) apoya en la pared a (-X) y los lomos (local +Z) miran al interior (+X)
const SHELF_WALL_A_ROTATION = [0, Math.PI / 2, 0]

// 3. BLOQUE DE ESQUINA RECTA (evita esquinas en pico o solapes):
// Rellena exactamente el espacio de 35x35 cm entre la pared a y la pared d en la esquina trasera izquierda
const CORNER_BLOCK_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.075m
const CORNER_BLOCK_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2     // -1.825m

function Experience({ onSelectBook, orbitTarget = [0, 0.35, -1.0] }) {
  // Reparto secuencial de libros: primero se llena la pared del fondo (d)
  const wallDPlacement = getWallPlacement(books, WALL_D_SHELF_LENGTH)

  // Los libros que no cupieron en la pared d continúan hacia la pared izquierda larga (a)
  const wallAPlacement = getWallPlacement(
    wallDPlacement.remainingBooks,
    WALL_A_SHELF_LENGTH
  )

  // Advertencia de capacidad en consola en caso de libros sin colocar tras ambas paredes
  if (wallAPlacement.remainingBooks.length > 0) {
    console.warn(
      `[Experience] Quedan ${wallAPlacement.remainingBooks.length} libros sin colocar tras llenar todas las estanterías de las paredes d y a.`
    )
  }

  return (
    <>
      {/* Control orbital de cámara enfocado hacia la zona central de estanterías */}
      <OrbitControls makeDefault target={orbitTarget} />

      {/* Reflejos sutiles de entorno ambiental para dar matices al cristal y superficies */}
      <Environment preset={PALETTE.envPreset} environmentIntensity={PALETTE.envIntensity} />

      {/* Iluminación de la escena: luz ambiental, luz exterior fría del ventanal y lámpara cálida */}
      <Lights />

      {/* Entorno exterior: cielo y jardín con arboleda y flores visible tras el cristal del ventanal */}
      <Outside />

      {/* Suspense gestiona la carga asíncrona de las texturas del suelo, libros y modelos 3D */}
      <Suspense fallback={null}>
        {/* Renderizado de la estructura de la habitación (suelo con textura de madera, paredes y ventanal frontal c) */}
        <Room />

        {/* Bloque rinconero recto que une las dos paredes de estanterías en un ángulo recto limpio de 90° sin picos */}
        <mesh
          position={[CORNER_BLOCK_X, SHELF_WALL_Y, CORNER_BLOCK_Z]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[BOOKSHELF_DEPTH, SHELF_HEIGHT, BOOKSHELF_DEPTH]}
          />
          <meshStandardMaterial color={WOOD_COLOR} />
        </mesh>

        {/* Estanterías de la pared del fondo (d): cubren desde la esquina recta hasta la pared derecha con lomos hacia +Z */}
        <BookshelfWall
          books={wallDPlacement.placedBooks}
          wallLength={WALL_D_SHELF_LENGTH}
          position={[SHELF_WALL_D_X, SHELF_WALL_Y, SHELF_WALL_D_Z]}
          rotation={[0, 0, 0]}
          onSelectBook={onSelectBook}
        />

        {/* Estanterías de la pared izquierda (a): pared larga de 5.65 m útiles con lomos mirando al interior (+X) */}
        <BookshelfWall
          books={wallAPlacement.placedBooks}
          wallLength={WALL_A_SHELF_LENGTH}
          position={[SHELF_WALL_A_X, SHELF_WALL_Y, SHELF_WALL_A_Z]}
          rotation={SHELF_WALL_A_ROTATION}
          onSelectBook={onSelectBook}
        />

        {/* Rincón de lectura (Fase 4): sofá verde oliva, cojines, manta, mesa de café, libro abierto y accesorios */}
        <SofaCorner />

        {/* Puerta de entrada de madera antigua (door.glb) en la pared b */}
        <Door position={[DOOR_X, DOOR_Y, DOOR_Z]} rotation={DOOR_ROTATION} />
      </Suspense>
    </>
  )
}

export default Experience
