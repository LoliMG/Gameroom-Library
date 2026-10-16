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
import Room, { ROOM_WIDTH, BACK_WALL_Z, FLOOR_Y, FRONT_WALL_INNER_Z } from '@/scene/Room'
// Importación del componente de pared de estanterías
import BookshelfWall from '@/scene/BookshelfWall'
// Importación del rincón de lectura con sofá, cojines, manta, mesa de café y accesorios
import SofaCorner from '@/scene/SofaCorner'
// Importación de la puerta de entrada de madera antigua (door.glb)
import Door from '@/scene/Door'
// Importación de la función pura de colocación en pared desde utils
import { getWallPlacement } from '@/utils/shelfLayout'
import { BOOKSHELF_DEPTH, SHELF_COUNT, SHELF_PITCH } from '@/scene/Bookshelf'
// Mueble bajo integrado en las estanterías de la pared a
import StorageCabinet, { CABINET_LENGTH_PER_HEIGHT } from '@/scene/StorageCabinet'
// Bloque de madera que une las estanterías en la esquina
import ShelfCorner from '@/scene/ShelfCorner'
// Rodapiés de madera y medidas del ventanal para saber dónde hay muro
import SkirtingBoards from '@/scene/SkirtingBoards'
import { WINDOW_WIDTH, WINDOW_PIER_WIDTH } from '@/scene/WindowWall'
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
// Fase 8: postprocesado y niebla
import Effects from '@/scene/Effects'
// Fase 9: techo y moldura, enredaderas y polvo flotante
import Ceiling from '@/scene/Ceiling'
import Vines from '@/scene/Vines'
import DustParticles from '@/scene/DustParticles'
// Cámara en primera persona: WASD para caminar dentro de la sala, ratón para mirar
import FirstPersonControls from '@/scene/FirstPersonControls'

// Posición y orientación de la puerta de entrada (door.glb) en la pared b (+X):
// Situada en el vano entre las estanterías del fondo d (Z = -1.65 m) y el sofá (Z = +1.06 m)
// Caja de door.glb × 0.009: el marco tiene 0.147 m de fondo a cada lado de su centro y la hoja ±0.055 m.
// Se empotra en el hueco de la pared hasta que el marco solo asoma 1 cm: así no se ve su canto ni el marco trasero.
const DOOR_FRAME_HALF_DEPTH = 0.147
const DOOR_CASING_PROTRUSION = 0.01
const DOOR_X = ROOM_WIDTH / 2 + DOOR_FRAME_HALF_DEPTH - DOOR_CASING_PROTRUSION // +2.737 m
const DOOR_Y = FLOOR_Y // -1.0 m (apoyada a ras de suelo)
const DOOR_Z = -0.30 // Centrada en el hueco de la pared
const DOOR_ROTATION = [0, -Math.PI / 2, 0] // Su hoja mira hacia el interior (-X)
// Hueco que ocupa la puerta con su marco a lo largo de la pared b (caja de door.glb × 0.009: de -0.592 a +0.548 m)
const DOOR_FRAME_MIN_Z = DOOR_Z - 0.592 // -0.89 m
const DOOR_FRAME_MAX_Z = DOOR_Z + 0.548 // +0.25 m
// Hueco en la pared b: entre la hoja (de -0.477 a +0.423 m, hasta 2.10 m) y el borde exterior del marco,
// para que el marco tape los bordes del corte
const DOOR_OPENING = { minZ: DOOR_Z - 0.53, maxZ: DOOR_Z + 0.48, height: 2.15 }

// Rodapiés: solo donde se ve muro. Las paredes a y d están tapadas por estanterías hasta el suelo, y el trozo
// izquierdo del muro del ventanal queda detrás de las estanterías de la pared a.
// Cada tramo se recorre con la pared a la derecha (ver SkirtingBoards).
const WALL_B_X = ROOM_WIDTH / 2
const SHELF_D_FRONT_Z = BACK_WALL_Z + BOOKSHELF_DEPTH // -1.65 m
const SKIRTING_SEGMENTS = [
  // Pared b: del ventanal a la puerta y de la puerta a las estanterías del fondo
  { start: [WALL_B_X, FRONT_WALL_INNER_Z], end: [WALL_B_X, DOOR_FRAME_MAX_Z] },
  { start: [WALL_B_X, DOOR_FRAME_MIN_Z], end: [WALL_B_X, SHELF_D_FRONT_Z] },
  // Muro del ventanal: entre los dos arcos y el trozo de la derecha (junto a la pared b)
  { start: [-WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z] },
  { start: [WINDOW_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WALL_B_X, FRONT_WALL_INNER_Z] },
]

// Rotaciones de las dos paredes de estanterías (constantes en shelfWalls.js)
const SHELF_WALL_D_ROTATION = [0, SHELF_WALL_D_ROTATION_Y, 0]
const SHELF_WALL_A_ROTATION = [0, SHELF_WALL_A_ROTATION_Y, 0]

// MUEBLE EN LA PARED A: en el centro de la pared, con estanterías cortas encima y módulos completos a los lados.
// Su alto es un número entero de baldas, así la tapa queda justo bajo la balda donde arrancan los módulos de encima.
const CABINET_START_SHELF = 3                                        // Los módulos de encima empiezan en la balda 3
const CABINET_HEIGHT = CABINET_START_SHELF * SHELF_PITCH             // 0.9975 m
const CABINET_LENGTH = CABINET_HEIGHT * CABINET_LENGTH_PER_HEIGHT    // ≈ 3.0 m (escala uniforme)
const CABINET_CENTER_Z = SHELF_WALL_A_Z                              // Centrado en la pared a (+1.145 m)
const WALL_A_START_Z = SHELF_WALL_A_Z - WALL_A_SHELF_LENGTH / 2      // Frente de las estanterías de la pared d (-1.65 m)
const WALL_A_END_Z = SHELF_WALL_A_Z + WALL_A_SHELF_LENGTH / 2        // Cara interior del muro del ventanal (+3.94 m)
// Tramos de la pared a: módulos completos, módulos cortos sobre el mueble y módulos completos
const WALL_A_RUNS = [
  { startZ: WALL_A_START_Z, endZ: CABINET_CENTER_Z - CABINET_LENGTH / 2, startShelf: 0 },
  { startZ: CABINET_CENTER_Z - CABINET_LENGTH / 2, endZ: CABINET_CENTER_Z + CABINET_LENGTH / 2, startShelf: CABINET_START_SHELF },
  { startZ: CABINET_CENTER_Z + CABINET_LENGTH / 2, endZ: WALL_A_END_Z, startShelf: 0 },
]

function Experience({ onSelectBook }) {
  // Reparto secuencial de libros: primero se llena la pared del fondo (d)
  const wallDPlacement = getWallPlacement(books, WALL_D_SHELF_LENGTH)

  // Los libros que no cupieron en la pared d continúan por los tramos de la pared a (del fondo hacia el ventanal)
  let remainingBooks = wallDPlacement.remainingBooks
  const wallARuns = []
  for (const run of WALL_A_RUNS) {
    const length = run.endZ - run.startZ
    const placement = getWallPlacement(remainingBooks, length, { shelfCount: SHELF_COUNT - run.startShelf })
    remainingBooks = placement.remainingBooks
    wallARuns.push({ ...run, length, books: placement.placedBooks })
  }

  // Advertencia de capacidad en consola en caso de libros sin colocar tras ambas paredes
  if (remainingBooks.length > 0) {
    console.warn(
      `[Experience] Quedan ${remainingBooks.length} libros sin colocar tras llenar todas las estanterías de las paredes d y a.`
    )
  }

  return (
    <>
      {/* Cámara en primera persona limitada al interior de la sala */}
      <FirstPersonControls />

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
        <Room doorOpening={DOOR_OPENING} />

        {/* Bloque rinconero recto que une las dos paredes de estanterías en un ángulo recto limpio de 90° sin picos */}
        <ShelfCorner />

        {/* Rodapiés de madera en los tramos de pared visibles */}
        <SkirtingBoards segments={SKIRTING_SEGMENTS} />

        {/* Estanterías de la pared del fondo (d): cubren desde la esquina recta hasta la pared derecha con lomos hacia +Z */}
        <BookshelfWall
          books={wallDPlacement.placedBooks}
          wallLength={WALL_D_SHELF_LENGTH}
          position={[SHELF_WALL_D_X, SHELF_WALL_Y, SHELF_WALL_D_Z]}
          rotation={SHELF_WALL_D_ROTATION}
          onSelectBook={onSelectBook}
        />

        {/* Estanterías de la pared izquierda (a) en tres tramos, con los lomos mirando al interior (+X) */}
        {wallARuns.map(({ startZ, endZ, length, books: runBooks, startShelf }) => (
          <BookshelfWall
            key={startZ}
            books={runBooks}
            wallLength={length}
            position={[SHELF_WALL_A_X, SHELF_WALL_Y, (startZ + endZ) / 2]}
            rotation={SHELF_WALL_A_ROTATION}
            onSelectBook={onSelectBook}
            startShelf={startShelf}
          />
        ))}

        {/* Mueble bajo empotrado bajo los módulos cortos: trasera contra la pared a y frente a ras de las estanterías */}
        <StorageCabinet position={[-ROOM_WIDTH / 2, FLOOR_Y, CABINET_CENTER_Z]} height={CABINET_HEIGHT} depth={BOOKSHELF_DEPTH} />

        {/* Rincón de lectura (Fase 4): sofá verde oliva, cojines, manta, mesa de café, libro abierto y accesorios */}
        <SofaCorner />

        {/* Puerta de entrada de madera antigua (door.glb) en la pared b */}
        <Door position={[DOOR_X, DOOR_Y, DOOR_Z]} rotation={DOOR_ROTATION} />

        {/* Techo plano oscuro con moldura perimetral (solo visible desde dentro) */}
        <Ceiling />

        {/* Enredaderas colgando junto al ventanal */}
        <Vines />

        {/* Polvo flotando en la luz del ventanal */}
        <DustParticles />
      </Suspense>
    </>
  )
}

export default Experience
