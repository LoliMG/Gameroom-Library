// Suspense pausa el render hasta que las texturas estén cargadas; el resto guarda el sitio y el arrastre de los libros
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Tipos: evento de puntero de React Three Fiber, [x, y, z] y los datos compartidos de la biblioteca
import type { ThreeEvent } from '@react-three/fiber'
import type { Vector3Tuple } from 'three'
import type { Book, Placement, ReadingStatus, ShelfWall, Slot } from '@/types'
// Environment de drei para reflejos sutiles, generado en la escena con paneles de luz (Lightformer)
import { Environment, Lightformer, Preload } from '@react-three/drei'
// Importación de la paleta ambiental activa
import useAmbience from '@/hooks/useAmbience'
import useWeather from '@/hooks/useWeather'
// Cielo, colinas, prado y estrellas del momento del día
import SunsetSky from '@/scene/garden/SunsetSky'
// Grillos, viento y lluvia de fondo; gotas de lluvia tras el ventanal
import AmbientSounds from '@/scene/core/AmbientSounds'
import RainFall from '@/scene/garden/RainFall'
import SnowFall from '@/scene/garden/SnowFall'
import type { AppSettings, SoundVolumes } from '@/types'
import { paletteForElevation } from '@/scene/core/ambiencePalette'
// Importación del entorno exterior (jardín, árboles, flores y cielo)
import Outside from '@/scene/garden/Outside'
// Importación del listado de libros disponibles
import books from '@/data/books'
// Importación del componente de iluminación personalizada
import Lights from '@/scene/core/Lights'
// Importación de la estructura de la habitación y sus dimensiones clave
import Room, { ROOM_WIDTH, BACK_WALL_Z, FLOOR_Y, FRONT_WALL_INNER_Z } from '@/scene/room/Room'
// Importación del componente de pared de estanterías
import BookshelfWall from '@/scene/shelves/BookshelfWall'
import type { BookDrag, ShelfSlot, ShownPlacement } from '@/scene/shelves/Bookshelf'
// Importación del rincón de lectura con sofá, mesa de café y accesorios
import SofaCorner from '@/scene/decor/SofaCorner'
import Fireplace, { COLD_NIGHT_TEMPERATURE, COLD_TEMPERATURE, FIREPLACE_DEPTH, FIREPLACE_WIDTH } from '@/scene/decor/Fireplace'
import Cat from '@/scene/decor/Cat'
import FloorLamp from '@/scene/decor/FloorLamp'
// Importación de la puerta de entrada de madera antigua (door.glb)
import Door from '@/scene/room/Door'
// Pantalla con el panel de la biblioteca (portadas, búsqueda y estados de lectura)
import BookConsole from '@/scene/books/BookConsole'
// Recuadro para seleccionar varios libros (Ctrl + arrastrar)
import SelectionBox, { MIN_BOX_SIZE } from '@/scene/books/SelectionBox'
// Modelo del manifiesto colocado y escalado (la katana de encima de las estanterías)
import { Lantern, ModelProp } from '@/scene/garden/GardenProps'
// Importación de la función pura de colocación en pared desde utils
import { getWallPlacement, fitGroupOnShelf, separateOnShelf, placeSavedBooks, syncShelfBooks } from '@/utils/shelfLayout'
import type { CollectionTools } from '@/components/BookDashboard'
import { BOOKSHELF_DEPTH, SHELF_COUNT, SHELF_PITCH, BASE_SHELF_WIDTH, BOARD_THICKNESS, SHELF_HEIGHT } from '@/scene/shelves/Bookshelf'
// Mueble bajo integrado en las estanterías de la pared a
import StorageCabinet, { CABINET_LENGTH_PER_HEIGHT } from '@/scene/shelves/StorageCabinet'
// Rodapiés de madera y medidas del ventanal para saber dónde hay muro
import SkirtingBoards from '@/scene/room/SkirtingBoards'
import type { SkirtingSegment } from '@/scene/room/SkirtingBoards'
import { WINDOW_WIDTH, WINDOW_PIER_WIDTH } from '@/scene/room/WindowWall'
// Geometría de la pared de estanterías (pared a, la del mueble)
import {
  SHELF_WALL_Y,
  WALL_A_SHELF_LENGTH,
  SHELF_WALL_A_X,
  SHELF_WALL_A_Z,
  SHELF_WALL_A_ROTATION_Y,
} from '@/scene/shelves/shelfWalls'
// Fase 8: postprocesado y niebla
import Effects from '@/scene/core/Effects'
// Fase 9: techo y moldura, enredaderas y polvo flotante
import Ceiling from '@/scene/room/Ceiling'
import Vines from '@/scene/room/Vines'
import DustParticles from '@/scene/room/DustParticles'
// Cámara en primera persona: WASD para caminar dentro de la sala, ratón para mirar
import FirstPersonControls from '@/scene/core/FirstPersonControls'

// Posición y orientación de la puerta de entrada (door.glb) en la pared b (+X):
// Situada entre la pared del fondo d y el sofá (Z = +1.06 m)
// Caja de door.glb × 0.009: el marco tiene 0.147 m de fondo a cada lado de su centro y la hoja ±0.055 m.
// Se empotra en el hueco de la pared hasta que el marco solo asoma 1 cm: así no se ve su canto ni el marco trasero.
const DOOR_FRAME_HALF_DEPTH = 0.147
const DOOR_CASING_PROTRUSION = 0.01
const DOOR_X = ROOM_WIDTH / 2 + DOOR_FRAME_HALF_DEPTH - DOOR_CASING_PROTRUSION // +2.737 m
const DOOR_Y = FLOOR_Y // -1.0 m (apoyada a ras de suelo)
const DOOR_Z = -0.30 // Centrada en el hueco de la pared
const DOOR_ROTATION: Vector3Tuple = [0, -Math.PI / 2, 0] // Su hoja mira hacia el interior (-X)
// Hueco que ocupa la puerta con su marco a lo largo de la pared b (caja de door.glb × 0.009: de -0.592 a +0.548 m)
const DOOR_FRAME_MIN_Z = DOOR_Z - 0.592 // -0.89 m
const DOOR_FRAME_MAX_Z = DOOR_Z + 0.548 // +0.25 m
// Hueco en la pared b: entre la hoja (de -0.477 a +0.423 m, hasta 2.10 m) y el borde exterior del marco,
// para que el marco tape los bordes del corte
const DOOR_OPENING = { minZ: DOOR_Z - 0.53, maxZ: DOOR_Z + 0.48, height: 2.15 }

// Katana con su soporte sobre las estanterías de la pared a, centrada y a lo largo de la pared. katana.glb va a lo
// largo de X y mide 5.932 × 1.534 (largo × alto): se escala a 1 m de largo; girada 90° queda a lo largo de Z
const KATANA_LENGTH = 1.0
const KATANA_HEIGHT = KATANA_LENGTH * (1.534 / 5.932)
const KATANA_POSITION: Vector3Tuple = [SHELF_WALL_A_X, FLOOR_Y + SHELF_HEIGHT, SHELF_WALL_A_Z]
const KATANA_ROTATION: Vector3Tuple = [0, Math.PI / 2, 0]

// Lámpara de pie en el machón entre los dos arcos del ventanal (x = 0), separada del muro lo que mide su pantalla
const FLOOR_LAMP_HEIGHT = 1.6
const FLOOR_LAMP_POSITION: Vector3Tuple = [0, FLOOR_Y, FRONT_WALL_INNER_Z - 0.3]


// Rodapiés: solo donde se ve muro. La pared a está tapada por estanterías hasta el suelo, y el trozo
// izquierdo del muro del ventanal queda detrás de ellas.
// Cada tramo se recorre con la pared a la derecha (ver SkirtingBoards).
const WALL_B_X = ROOM_WIDTH / 2
const SHELF_A_FRONT_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH // -2.25 m
const SKIRTING_SEGMENTS: SkirtingSegment[] = [
  // Pared b: del ventanal a la puerta y de la puerta a la esquina del fondo
  { start: [WALL_B_X, FRONT_WALL_INNER_Z], end: [WALL_B_X, DOOR_FRAME_MAX_Z] },
  { start: [WALL_B_X, DOOR_FRAME_MIN_Z], end: [WALL_B_X, BACK_WALL_Z] },
  // Pared del fondo d (sin estanterías): de la esquina con la pared b hasta el lateral de las estanterías de la pared a
  { start: [WALL_B_X, BACK_WALL_Z], end: [SHELF_A_FRONT_X, BACK_WALL_Z] },
  // Muro del ventanal: entre los dos arcos y el trozo de la derecha (junto a la pared b)
  { start: [-WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z] },
  { start: [WINDOW_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WALL_B_X, FRONT_WALL_INNER_Z] },
]

// Rotación de la pared de estanterías (constante en shelfWalls.ts)
const SHELF_WALL_A_ROTATION: Vector3Tuple = [0, SHELF_WALL_A_ROTATION_Y, 0]

// MUEBLE EN LA PARED A: en el centro de la pared, con estanterías cortas encima y módulos completos a los lados.
// Su alto es un número entero de baldas, así la tapa queda justo bajo la balda donde arrancan los módulos de encima.
const CABINET_START_SHELF = 3                                        // Los módulos de encima empiezan en la balda 3
const CABINET_HEIGHT = CABINET_START_SHELF * SHELF_PITCH             // 0.9975 m
const CABINET_LENGTH = CABINET_HEIGHT * CABINET_LENGTH_PER_HEIGHT    // ≈ 3.0 m (escala uniforme)
const CABINET_CENTER_Z = SHELF_WALL_A_Z                              // Centrado en la pared a (+1.145 m)
const WALL_A_START_Z = SHELF_WALL_A_Z - WALL_A_SHELF_LENGTH / 2      // Pared del fondo d (-2.0 m)
const WALL_A_END_Z = SHELF_WALL_A_Z + WALL_A_SHELF_LENGTH / 2        // Cara interior del muro del ventanal (+3.94 m)
// Tramos de la pared a: módulos completos, módulos cortos sobre el mueble y módulos completos
const WALL_A_RUNS = [
  { startZ: WALL_A_START_Z, endZ: CABINET_CENTER_Z - CABINET_LENGTH / 2, startShelf: 0 },
  { startZ: CABINET_CENTER_Z - CABINET_LENGTH / 2, endZ: CABINET_CENTER_Z + CABINET_LENGTH / 2, startShelf: CABINET_START_SHELF },
  { startZ: CABINET_CENTER_Z + CABINET_LENGTH / 2, endZ: WALL_A_END_Z, startShelf: 0 },
]

/** Tramo de estanterías: lo que necesita shelfLayout (ShelfWall) más dónde está en la sala */
interface ShelfWallRun extends ShelfWall {
  length: number
  position: Vector3Tuple
  rotation: Vector3Tuple
  startShelf: number
}

// Tramos de estanterías de la pared a (la pared del fondo d no lleva), con sus módulos, el ancho útil de sus baldas
// (el mismo reparto que BookshelfWall) y cuántas baldas tienen
const SHELF_WALLS = WALL_A_RUNS.map((run, i): ShelfWallRun => {
  const length = run.endZ - run.startZ
  const moduleCount = Math.max(1, Math.round(length / BASE_SHELF_WIDTH))
  return {
    key: `a${i}`,
    length,
    position: [SHELF_WALL_A_X, SHELF_WALL_Y, (run.startZ + run.endZ) / 2],
    rotation: SHELF_WALL_A_ROTATION,
    startShelf: run.startShelf,
    moduleCount,
    innerWidth: length / moduleCount - 2 * BOARD_THICKNESS,
    shelfCount: SHELF_COUNT - run.startShelf,
  }
})

// Farolillo japonés (el del jardín, con su luz) sobre las estanterías: en el tramo del fondo (a0, a la derecha
// mirando a la pared a), en la mitad de ese tramo
const TOP_LANTERN_POSITION: Vector3Tuple = [SHELF_WALL_A_X, FLOOR_Y + SHELF_HEIGHT, SHELF_WALLS[0].position[2]]

// Farolillos de papel pequeños del jardín en las baldas, con una luz cálida tenue. Miden 0.35 m en el jardín; aquí se
// bajan a 0.24 m para que quepan en el hueco de la balda (0.29 m). x: a lo largo del tramo (0 = su centro, + hacia el
// fondo de la sala); shelf: balda contando desde el suelo (las del tramo de encima del mueble empiezan en la 3)
// - En la balda de abajo del módulo del ventanal (tramo a2), hacia el ventanal
// - En la balda de abajo del tramo de encima del mueble (a1), en su módulo del lado del fondo
// shortcut: los libros arrastrados no los esquivan; si se quiere, apartarlos en separateOnShelf como un libro más
const SHELF_LANTERN_HEIGHT = 0.24
const SHELF_LANTERN_LIGHT = '#ffb36b'
const SHELF_LANTERNS = [
  { wall: SHELF_WALLS[2], x: -0.45, shelf: 0 },
  { wall: SHELF_WALLS[1], x: 0.72, shelf: CABINET_START_SHELF },
]

// Colocación inicial: los libros llenan en orden los tramos de la pared a, del fondo hacia el ventanal
function layoutAllBooks() {
  let remainingBooks = books
  const placements: Placement[] = []
  for (const wall of SHELF_WALLS) {
    const placement = getWallPlacement(remainingBooks, wall.length, { shelfCount: wall.shelfCount })
    placement.placements.forEach((p) => placements.push({ ...p, wall: wall.key }))
    remainingBooks = placement.remainingBooks
  }
  // Advertencia de capacidad en consola en caso de libros sin colocar tras ambas paredes
  if (remainingBooks.length > 0) {
    console.warn(
      `[Experience] Quedan ${remainingBooks.length} libros sin colocar tras llenar todas las estanterías de las paredes d y a.`
    )
  }
  return placements
}

// Separación mínima al soltar un libro junto a otros: casi pegados (el reparto inicial usa BOOK_GAP de Bookshelf, más holgado)
const DRAG_BOOK_GAP = 0.002
// Píxeles que hay que mover el ratón con el botón pulsado sobre un libro para que empiece a arrastrarse;
// por debajo es un clic (abre el panel del libro)
const DRAG_START_DISTANCE = 6

// Conjunto vacío compartido (selección y arrastre sin libros)
const NO_BOOKS = new Set<number>()

// Orden de una selección al moverla: por tramo y módulo, de la balda de arriba a la de abajo y de izquierda a derecha
const compareShelfOrder = (a: Placement, b: Placement) => a.wall.localeCompare(b.wall) || a.module - b.module || b.shelf - a.shelf || a.x - b.x

// Hueco que ocupa un libro a lo largo de la balda: su grosor de lomo o, volteado (portada al frente), su fondo
const bookFootprint = (book: Book, flippedIsbns: Set<string>) => (flippedIsbns.has(book.isbn) ? book.depth : book.width)

// Colocación inicial con los sitios guardados ({ isbn: sitio }, por ISBN: el id cambia si se añaden libros) encima;
// los libros sin sitio (recién añadidos desde la consola) van al primer hueco libre (ver placeSavedBooks)
const loadPlacements = (saved: Record<string, Slot>) => placeSavedBooks(layoutAllBooks(), saved, SHELF_WALLS, DRAG_BOOK_GAP)

// Chimenea en la pared del fondo, entre las estanterías y la consola, con la trasera contra la pared
const FIREPLACE_POSITION: Vector3Tuple = [0.15, FLOOR_Y, BACK_WALL_Z + 0.02 + FIREPLACE_DEPTH / 2]
// Pantalla de la biblioteca en la pared del fondo, entre la chimenea y la esquina de la pared b, mirando a la sala (+Z)
const CONSOLE_POSITION: Vector3Tuple = [(FIREPLACE_POSITION[0] + FIREPLACE_WIDTH / 2 + ROOM_WIDTH / 2) / 2, FLOOR_Y + 1.35, BACK_WALL_Z + 0.02]
const CONSOLE_ROTATION_Y = 0
// Vuelta del gato por la sala (en sentido contrario a las agujas del reloj, visto desde arriba): delante de la chimenea,
// junto a la puerta, entre la mesa de café (x 1.2, z 2.1) y la alfombra, ante el ventanal esquivando la lámpara (x 0),
// a lo largo de las estanterías (cara en x -2.25) y de vuelta a la chimenea (frente en z -1.32)
const CAT_PATH: Vector3Tuple[] = [
  [0.2, FLOOR_Y, -1.0],
  [1.7, FLOOR_Y, -0.8],
  [1.4, FLOOR_Y, 0.5],
  [0.55, FLOOR_Y, 1.5],
  [0.5, FLOOR_Y, 2.9],
  [-0.6, FLOOR_Y, 3.2],
  [-1.6, FLOOR_Y, 2.2],
  [-1.7, FLOOR_Y, 0.3],
  [-1.0, FLOOR_Y, -0.9],
]

// Altura del sol (grados) por debajo de la cual empieza a oscurecer (acaba la hora dorada): se enciende la lámpara y
// aparece el guerrero del jardín; el polvo que flota en la luz del ventanal solo se ve antes
const DUSK_ELEVATION = 2

// Volúmenes con los sonidos silenciados en Ajustes
const SILENT: SoundVolumes = { wind: 0, rain: 0, thunder: 0, crickets: 0 }

/**
 * Lo que cambia con la hora y con el tiempo de la ciudad: niebla, reflejos del entorno, luces, cielo, lluvia y sonidos.
 * Va en su propio componente para que los relojes (la hora cambia cada minuto, el tiempo cada 15) solo vuelvan a pintar
 * esto y no toda la sala con sus libros
 */
function DayCycle({ settings }: { settings: AppSettings }) {
  const weather = useWeather(settings)
  const ambience = useAmbience(settings, weather)
  const { palette } = ambience
  const dusk = ambience.sunElevation < DUSK_ELEVATION
  // Noche sin contar las nubes (las nubes tapan las estrellas, no la noche): para los grillos y el color de la nieve
  const night = paletteForElevation(ambience.sunElevation).stars
  return (
    <>
      {/* Jardín con arboleda y flores visible tras el cristal del ventanal (el guerrero solo de noche; nevado si nieva) */}
      <Outside night={dusk} snow={weather.snow} />

      {/* Lámpara de pie entre los arcos del ventanal, encendida al oscurecer (25 MB: con su propio Suspense, la sala no
          la espera) */}
      <Suspense fallback={null}>
        <FloorLamp position={FLOOR_LAMP_POSITION} height={FLOOR_LAMP_HEIGHT} lit={dusk} />
        <Preload all />
      </Suspense>

      {/* Postprocesado (Bloom, viñeta, color) y niebla ligera; ENABLE_EFFECTS los apaga todos */}
      <Effects fogColor={palette.fogColor} fog={weather.fog} rain={weather.rain} />

      {/* Reflejos sutiles (cristal, metal, agua): entorno hecho en la propia escena con dos paneles de luz, el cálido del
          ventanal y el del cielo. Los presets de drei descargan un HDR de internet y, si la conexión falla, la sala no carga.
          El entorno se pinta una vez: con key se vuelve a pintar cuando cambian sus colores (de un momento del día a otro) */}
      <Environment key={`${palette.lightColor}${palette.skyTop}`} resolution={64} environmentIntensity={palette.envIntensity}>
        <Lightformer form="rect" color={palette.lightColor} intensity={2} position={[0, 1, 6]} scale={[6, 3, 1]} />
        <Lightformer form="rect" color={palette.skyTop} intensity={0.6} position={[0, 6, 0]} scale={[10, 10, 1]} />
      </Environment>

      {/* Iluminación de la escena: luz ambiental y luz del ventanal */}
      <Lights palette={palette} />

      {/* Cielo con el sol donde está, colinas, prado y estrellas de noche */}
      <SunsetSky ambience={ambience} />

      {/* Lluvia tras el ventanal, cuando llueve en la ciudad */}
      <RainFall intensity={weather.rain} windSpeed={weather.windSpeed} />
      {/* Polvo flotando en la luz del ventanal, solo de día */}
      {!dusk && <DustParticles />}

      {/* Nieve tras el ventanal (sin sonido: la nieve cae en silencio) */}
      <SnowFall intensity={weather.snow} windSpeed={weather.windSpeed} night={night} />

      {/* Chimenea, con el fuego encendido cuando hace frío; de noche basta con que refresque (su caja de colisión va con
          los muebles) */}
      <Suspense fallback={null}>
        <Fireplace position={FIREPLACE_POSITION} lit={weather.temperature < (dusk ? COLD_NIGHT_TEMPERATURE : COLD_TEMPERATURE)} />
      </Suspense>

      {/* Grillos y viento muy suaves de noche (empiezan al anochecer, con las estrellas), lluvia cuando llueve y truenos con
          tormenta; en Ajustes se ajusta el volumen de cada uno o se silencian todos. La noche se mide sin las nubes (las
          nubes tapan las estrellas, no la noche) */}
      <AmbientSounds
        level={night}
        rain={weather.rain}
        thunder={weather.thunder}
        volumes={settings.sound ? settings.volumes : SILENT}
      />
    </>
  )
}

/** Libro pulsado que aún no se arrastra: el libro, el punto agarrado, los que se moverían con él y cuánto se ha movido */
interface Press {
  book: Book
  offsetX: number
  origin: Placement[]
  moved: number
}

interface ExperienceProps {
  /** Abre el panel del libro */
  onSelectBook: (book: Book) => void
  /** ISBN de los libros puestos de frente */
  flippedIsbns: Set<string>
  readingStatus: Record<string, ReadingStatus>
  onSetStatus: (isbns: string[], status: ReadingStatus) => void
  /** Sitios guardados por ISBN (de la base de datos) */
  savedPlacements: Record<string, Slot>
  onSavePlacements: (slots: Record<string, Slot>) => void
  /** Etiquetas, lista de deseos y ajustes, para la consola */
  collection: CollectionTools
}

function Experience({ onSelectBook, flippedIsbns, readingStatus, onSetStatus, savedPlacements, onSavePlacements, collection }: ExperienceProps) {
  // Sitio de cada libro: { book, wall, module, shelf, x }; cambia al arrastrarlo y se guarda en la base de datos
  const [placements, setPlacements] = useState<Placement[]>(() => loadPlacements(savedPlacements))
  // Libros arrastrados (el agarrado y, si era parte de una selección, el resto): el estado los pinta sacados de la
  // balda; las refs las leen la cámara y las baldas en el mismo evento
  const [draggedIds, setDraggedIds] = useState(NO_BOOKS)
  const draggedRef = useRef<number | null>(null) // id del libro agarrado
  const groupRef = useRef<number[]>([]) // ids de los libros que se mueven juntos, en su orden
  // Selección múltiple (Ctrl + arrastrar o Ctrl + clic): ids de los libros elegidos
  const [selectedIds, setSelectedIds] = useState(NO_BOOKS)
  // Libro añadido, editado o quitado desde la consola: Vite actualiza la lista de libros sin recargar la página y vuelve a
  // pintar la sala; los nuevos van al primer hueco libre (y se guardan como cualquier cambio de sitio). Al quitar uno, los
  // id (el orden en la lista) cambian: la selección se suelta para no quedarse con libros que no son
  // Libro localizado desde la consola (brilla en azul hasta que se pulsa)
  const [locatedId, setLocatedId] = useState<number | null>(null)
  const syncedPlacements = syncShelfBooks(placements, books, SHELF_WALLS, DRAG_BOOK_GAP)
  if (syncedPlacements !== placements) {
    if (syncedPlacements.length < placements.length) {
      setSelectedIds(NO_BOOKS)
      setLocatedId(null)
    }
    setPlacements(syncedPlacements)
  }
  // Sitio de los libros al agarrarlos (vuelven ahí si se sueltan fuera de las baldas) y si se han soltado sobre una balda
  const originRef = useRef<Placement[] | null>(null)
  // Distancia entre el punto agarrado y el centro del libro: el libro se mueve con la mano sin centrarse de golpe
  const grabOffsetRef = useRef(0)
  const droppedRef = useRef(false)
  // Libro pulsado que aún no se arrastra ({ book, offsetX, origin, moved }): la cámara no gira mientras se pulsa
  const pressRef = useRef<Press | null>(null)
  // ¿El último clic terminó un arrastre? Entonces no abre el panel
  const justDraggedRef = useRef(false)

  // Con el botón pulsado sobre un libro, el arrastre empieza al pasar de DRAG_START_DISTANCE píxeles de movimiento
  // (movementX/Y valen también con el ratón capturado, cuando el cursor no se mueve)
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const press = pressRef.current
      if (!press || draggedRef.current !== null) return
      press.moved += Math.abs(event.movementX) + Math.abs(event.movementY)
      if (press.moved < DRAG_START_DISTANCE) return
      draggedRef.current = press.book.id
      groupRef.current = press.origin.map((p) => p.book.id)
      grabOffsetRef.current = press.offsetX
      originRef.current = press.origin
      droppedRef.current = false
      setDraggedIds(new Set(groupRef.current))
    }
    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  // Esc suelta la selección (salvo escribiendo en un campo, como el buscador de la consola)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as Element | null)?.closest?.('input, textarea')) setSelectedIds(NO_BOOKS)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Recuadro de selección: los libros que quedan dentro se suman a la selección
  const addToSelection = useCallback((ids: number[]) => setSelectedIds((current) => new Set([...current, ...ids])), [])

  // Guarda los sitios al terminar cada arrastre (mientras se arrastra cambian en cada movimiento del puntero)
  useEffect(() => {
    if (draggedIds.size > 0) return
    const slots = Object.fromEntries(
      placements.map(({ book, wall, module, shelf, x }) => [book.isbn, { wall, module, shelf, x }])
    )
    onSavePlacements(slots)
    // onSavePlacements es una función nueva en cada render de App: guardar solo cuando cambian los sitios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, draggedIds])

  // Soltar el botón en cualquier sitio termina el arrastre (después del onPointerUp de la balda de destino);
  // si no se soltó sobre una balda, los libros vuelven a donde estaban
  useEffect(() => {
    const release = () => {
      const origin = originRef.current
      if (draggedRef.current !== null && !droppedRef.current && origin) {
        const originById = new Map(origin.map((p) => [p.book.id, p]))
        setPlacements((list) => list.map((p) => originById.get(p.book.id) ?? p))
      }
      justDraggedRef.current = draggedRef.current !== null
      draggedRef.current = null
      originRef.current = null
      pressRef.current = null
      setDraggedIds(NO_BOOKS)
    }
    window.addEventListener('pointerup', release)
    return () => window.removeEventListener('pointerup', release)
  }, [])

  // Lo que se pinta: cada libro con su volteo y, si al voltear alguno se pisan, apartados lo justo en su balda
  const shownPlacements = useMemo(() => {
    const shelves = new Map<string, Placement[]>()
    placements.forEach((p) => {
      const key = `${p.wall}/${p.module}/${p.shelf}`
      if (!shelves.has(key)) shelves.set(key, [])
      shelves.get(key)!.push(p)
    })
    const shown: ShownPlacement[] = []
    shelves.forEach((list) => {
      // Los sitios ya están validados contra SHELF_WALLS (placeSavedBooks): su tramo existe
      const { innerWidth } = SHELF_WALLS.find((wall) => wall.key === list[0].wall)!
      const xs = separateOnShelf(
        list.map((p) => ({ x: p.x, width: bookFootprint(p.book, flippedIsbns) })),
        innerWidth,
        DRAG_BOOK_GAP
      )
      list.forEach((p, i) => shown.push({ ...p, x: xs[i], flipped: flippedIsbns.has(p.book.isbn) }))
    })
    return shown
  }, [placements, flippedIsbns])

  // Lleva los libros agarrados (uno o una selección, seguidos y en su orden) al hueco libre más cercano a x en esa
  // balda; si no caben, se quedan donde estaban
  const moveDragged = (slot: ShelfSlot, x: number, innerWidth: number) => {
    const bookId = draggedRef.current
    if (bookId === null) return
    const ids = groupRef.current
    setPlacements((list) => {
      // Los libros del grupo salen de la propia lista al agarrarlos: siempre están
      const group = ids.map((id) => list.find((p) => p.book.id === id)!)
      const others = list.filter(
        (p) => !ids.includes(p.book.id) && p.wall === slot.wall && p.module === slot.module && p.shelf === slot.shelf
      )
      const xs = fitGroupOnShelf(
        others.map((p) => ({ x: p.x, width: bookFootprint(p.book, flippedIsbns) })),
        group.map((p) => bookFootprint(p.book, flippedIsbns)),
        ids.indexOf(bookId),
        x - grabOffsetRef.current,
        innerWidth,
        DRAG_BOOK_GAP
      )
      if (xs === null) return list
      const unchanged = group.every(
        (p, i) => p.wall === slot.wall && p.module === slot.module && p.shelf === slot.shelf && Math.abs(p.x - xs[i]) < 1e-4
      )
      // Sin cambio visible: misma lista, así React no vuelve a pintar las estanterías
      if (unchanged) return list
      const newX = new Map(ids.map((id, i) => [id, xs[i]]))
      return list.map((p) => (newX.has(p.book.id) ? { ...p, ...slot, x: newX.get(p.book.id)! } : p))
    })
  }

  // Clic en un libro: con Ctrl lo añade o lo quita de la selección; sin Ctrl suelta la selección y abre su panel.
  // Un clic que termina un arrastre no hace nada, ni un Ctrl + arrastrar que acaba sobre el libro (es un recuadro)
  // event: el clic en el libro de la sala (desde la consola se abre sin evento)
  const selectBook = (book: Book, event?: ThreeEvent<MouseEvent>) => {
    if (justDraggedRef.current) return
    // Pulsar el libro localizado le quita el brillo azul
    if (book.id === locatedId) setLocatedId(null)
    if (event?.ctrlKey) {
      if (event.delta > MIN_BOX_SIZE) return
      setSelectedIds((current) => {
        const next = new Set(current)
        if (!next.delete(book.id)) next.add(book.id)
        return next
      })
      return
    }
    setSelectedIds(NO_BOOKS)
    onSelectBook(book)
  }

  // "Localizar" en la consola: el libro brilla en azul en su estantería, con un humillo de chispas, hasta que se pulsa
  const locateBook = (book: Book) => setLocatedId(book.id)

  const bookDrag: BookDrag = {
    draggedIds,
    selectedIds,
    locatedId,
    // Pulsar un libro solo lo prepara para arrastrar: el arrastre empieza si el ratón se mueve (ver arriba).
    // Si es de la selección, se mueven todos los seleccionados (de la balda de arriba a la de abajo y de izquierda a derecha)
    grab: (book, offsetX = 0, event) => {
      if (event?.ctrlKey) return // Con Ctrl se dibuja el recuadro de selección
      const group = selectedIds.has(book.id)
        ? placements.filter((p) => selectedIds.has(p.book.id)).sort(compareShelfOrder)
        : placements.filter((p) => p.book.id === book.id)
      pressRef.current = { book, offsetX, origin: group, moved: 0 }
      justDraggedRef.current = false
    },
    // slot: { wall, module, shelf } de la balda bajo el puntero; x: punto de la balda en coordenadas de la estantería
    hover: moveDragged,
    drop: (slot, x, innerWidth) => {
      if (draggedRef.current === null) return
      moveDragged(slot, x, innerWidth)
      droppedRef.current = true
    },
  }

  return (
    <>
      {/* Cámara en primera persona limitada al interior de la sala */}
      <FirstPersonControls heldBookRef={pressRef} />

      {/* Selección de varios libros con Ctrl + arrastrar */}
      <SelectionBox onSelect={addToSelection} />

      {/* Lo que cambia con la hora de la ciudad de los ajustes: niebla, entorno, luces y cielo */}
      <DayCycle settings={collection.settings} />


      {/* Suspense gestiona la carga asíncrona de las texturas del suelo, libros y modelos 3D */}
      <Suspense fallback={null}>
        {/* Renderizado de la estructura de la habitación (suelo con textura de madera, paredes y ventanal frontal c) */}
        <Room doorOpening={DOOR_OPENING} />

        {/* Rodapiés de madera en los tramos de pared visibles */}
        <SkirtingBoards segments={SKIRTING_SEGMENTS} />

        {/* Estanterías de la pared izquierda (a) en tres tramos (el del centro, sobre el mueble), lomos hacia +X */}
        {SHELF_WALLS.map((wall) => (
          <BookshelfWall
            key={wall.key}
            wallKey={wall.key}
            placements={shownPlacements.filter((p) => p.wall === wall.key)}
            wallLength={wall.length}
            moduleCount={wall.moduleCount}
            position={wall.position}
            rotation={wall.rotation}
            onSelectBook={selectBook}
            bookDrag={bookDrag}
            startShelf={wall.startShelf}
          />
        ))}

        {/* Mueble bajo empotrado bajo los módulos cortos: trasera contra la pared a y frente a ras de las estanterías */}
        <StorageCabinet position={[-ROOM_WIDTH / 2, FLOOR_Y, CABINET_CENTER_Z]} height={CABINET_HEIGHT} depth={BOOKSHELF_DEPTH} />

        {/* Rincón de lectura (Fase 4): sofá, mesa de café, libro abierto y accesorios */}
        <SofaCorner />

        {/* Puerta de entrada de madera antigua (door.glb) en la pared b */}
        <Door position={[DOOR_X, DOOR_Y, DOOR_Z]} rotation={DOOR_ROTATION} />

        {/* Katana sobre las estanterías y farolillo japonés en el tramo del fondo */}
        <ModelProp model="katana" height={KATANA_HEIGHT} position={KATANA_POSITION} rotation={KATANA_ROTATION} />
        <Lantern position={TOP_LANTERN_POSITION} variant={0} />

        {/* Caja de colisión de la chimenea: la chimenea va en DayCycle (su fuego depende del tiempo) y carga aparte, y las
            colisiones se recogen una sola vez, cuando los muebles de este Suspense ya están en la escena */}
        <mesh position={[FIREPLACE_POSITION[0], FLOOR_Y + 0.5, FIREPLACE_POSITION[2]]} visible={false} raycast={() => null} userData={{ collider: true }}>
          <boxGeometry args={[FIREPLACE_WIDTH, 1, FIREPLACE_DEPTH]} />
        </mesh>

        {/* Gato paseando por la sala */}
        <Cat path={CAT_PATH} />

        {/* Farolillos en las baldas, con una luz cálida tenue */}
        {SHELF_LANTERNS.map(({ wall, x, shelf }) => (
          <group key={`${wall.key}/${x}`} position={wall.position} rotation={wall.rotation}>
            <group position={[x, -SHELF_HEIGHT / 2 + BOARD_THICKNESS + shelf * SHELF_PITCH, 0]}>
              <ModelProp model="paperLanterns" node="paper lantern3" height={SHELF_LANTERN_HEIGHT} position={[0, 0, 0]} />
              <pointLight position={[0, SHELF_LANTERN_HEIGHT * 0.5, 0]} color={SHELF_LANTERN_LIGHT} intensity={0.25} distance={0.9} decay={2} />
            </group>
          </group>
        ))}

        {/* Pantalla de la biblioteca junto a la puerta */}
        <BookConsole
          position={CONSOLE_POSITION}
          rotationY={CONSOLE_ROTATION_Y}
          books={books}
          readingStatus={readingStatus}
          onSetStatus={onSetStatus}
          onOpenBook={selectBook}
          onLocateBook={locateBook}
          collection={collection}
        />

        {/* Techo plano oscuro con moldura perimetral (solo visible desde dentro) */}
        <Ceiling />

        {/* Enredaderas colgando junto al ventanal */}
        <Vines />

        {/* Al terminar de cargar, sube a la tarjeta gráfica todas las texturas y compila todos los materiales: si no, se
            hace la primera vez que cada cosa entra en la vista y la cámara da tirones al moverse */}
        <Preload all />
      </Suspense>
    </>
  )
}

export default Experience
