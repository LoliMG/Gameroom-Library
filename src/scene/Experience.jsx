// Importación de Suspense de React para pausar el render hasta que las texturas estén cargadas
import { Suspense } from 'react'
// Environment de drei para reflejos sutiles
import { Environment } from '@react-three/drei'
// Importación de la paleta ambiental activa
import { PALETTE } from '@/scene/ambiencePalette'
// Importación del entorno exterior (jardín, árboles, flores y cielo)
import Outside from '@/scene/Outside'
// Importación del listado de libros disponibles
import books from '@/data/books'
// Importación del componente de iluminación personalizada
import Lights from '@/scene/Lights'
// Importación de la estructura de la habitación y sus dimensiones clave
import Room, { ROOM_WIDTH, BACK_WALL_Z, FLOOR_Y } from '@/scene/Room'
// Importación del componente de pared de estanterías
import BookshelfWall from '@/scene/BookshelfWall'
// Importación del rincón de lectura con sofá, cojines, manta, mesa de café y accesorios
import SofaCorner from '@/scene/SofaCorner'
// Importación de la puerta de entrada de madera antigua (door.glb)
import Door from '@/scene/Door'
// Importación de la función pura de colocación en pared desde utils
import { getWallPlacement } from '@/utils/shelfLayout'
import { SHELF_HEIGHT, BOOKSHELF_DEPTH, WOOD_COLOR } from '@/scene/Bookshelf'
// Geometría compartida de las paredes de estanterías (también la usan velas y objetos de las baldas)
import {
  SHELF_WALL_Y,
  WALL_D_SHELF_LENGTH,
  SHELF_WALL_D_X,
  SHELF_WALL_D_Z,
  SHELF_WALL_D_ROTATION_Y,
  WALL_A_SHELF_LENGTH,
  SHELF_WALL_A_X,
  SHELF_WALL_A_Z,
  SHELF_WALL_A_ROTATION_Y,
} from '@/scene/shelfWalls'
// Fase 7: velas en las baldas
import ShelfCandles from '@/scene/ShelfCandles'
// Fase 8: postprocesado y niebla
import Effects from '@/scene/Effects'
// Fase 9: techo y moldura, enredaderas, objetos decorativos y polvo flotante
import Ceiling from '@/scene/Ceiling'
import Vines from '@/scene/Vines'
import ShelfDecor from '@/scene/ShelfDecor'
import DustParticles from '@/scene/DustParticles'
// Fase 10: cámara con puntos de vista fijos y OrbitControls con límites
import CameraRig from '@/scene/CameraRig'

// Posición y orientación de la puerta de entrada (door.glb) en la pared b (+X):
// Situada en el vano entre las estanterías del fondo d (Z = -1.65 m) y el sofá (Z = +1.06 m)
const DOOR_X = ROOM_WIDTH / 2 - 0.08 // +2.52 m (empotrada en la pared b, con marco visible)
const DOOR_Y = FLOOR_Y // -1.0 m (apoyada a ras de suelo)
const DOOR_Z = -0.30 // Centrada en el hueco de la pared
const DOOR_ROTATION = [0, -Math.PI / 2, 0] // Su hoja mira hacia el interior (-X)

// Rotaciones de las dos paredes de estanterías (constantes en shelfWalls.js)
const SHELF_WALL_D_ROTATION = [0, SHELF_WALL_D_ROTATION_Y, 0]
const SHELF_WALL_A_ROTATION = [0, SHELF_WALL_A_ROTATION_Y, 0]

// BLOQUE DE ESQUINA RECTA (evita esquinas en pico o solapes):
// Rellena exactamente el espacio de 35x35 cm entre la pared a y la pared d en la esquina trasera izquierda
const CORNER_BLOCK_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.425m
const CORNER_BLOCK_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2     // -1.825m

function Experience({ onSelectBook, viewId, viewRequest }) {
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
      {/* Cámara: puntos de vista fijos con transición suave y OrbitControls con límites */}
      <CameraRig viewId={viewId} viewRequest={viewRequest} />

      {/* Postprocesado (Bloom, viñeta, color) y niebla ligera; ENABLE_EFFECTS los apaga todos */}
      <Effects />

      {/* Reflejos sutiles de entorno ambiental para dar matices al cristal y superficies */}
      <Environment preset={PALETTE.envPreset} environmentIntensity={PALETTE.envIntensity} />

      {/* Iluminación de la escena: luz ambiental y luz exterior fría del ventanal */}
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
          rotation={SHELF_WALL_D_ROTATION}
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

        {/* Techo plano oscuro con moldura perimetral (solo visible desde dentro) */}
        <Ceiling />

        {/* Velas con llama titilante en huecos de las estanterías */}
        <ShelfCandles />

        {/* Marcos de cuadro, esfera de cristal y globo terráqueo en las baldas */}
        <ShelfDecor />

        {/* Enredaderas colgando junto al ventanal */}
        <Vines />

        {/* Polvo flotando en la luz del ventanal */}
        <DustParticles />
      </Suspense>
    </>
  )
}

export default Experience
