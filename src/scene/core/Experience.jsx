// Suspense pausa el render hasta que las texturas estén cargadas; el resto guarda el sitio y el arrastre de los libros
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
import { getWallPlacement, fitOnShelf, separateOnShelf } from '@/utils/shelfLayout'
import { BOOKSHELF_DEPTH, SHELF_COUNT, SHELF_PITCH, BASE_SHELF_WIDTH, BOARD_THICKNESS } from '@/scene/Bookshelf'
// Mueble bajo integrado en las estanterías de la pared a
import StorageCabinet, { CABINET_LENGTH_PER_HEIGHT } from '@/scene/StorageCabinet'
// Rodapiés de madera y medidas del ventanal para saber dónde hay muro
import SkirtingBoards from '@/scene/SkirtingBoards'
import { WINDOW_WIDTH, WINDOW_PIER_WIDTH } from '@/scene/WindowWall'
// Geometría de la pared de estanterías (pared a, la del mueble)
import {
  SHELF_WALL_Y,
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
// Situada entre la pared del fondo d y el sofá (Z = +1.06 m)
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

// Rodapiés: solo donde se ve muro. La pared a está tapada por estanterías hasta el suelo, y el trozo
// izquierdo del muro del ventanal queda detrás de ellas.
// Cada tramo se recorre con la pared a la derecha (ver SkirtingBoards).
const WALL_B_X = ROOM_WIDTH / 2
const SHELF_A_FRONT_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH // -2.25 m
const SKIRTING_SEGMENTS = [
  // Pared b: del ventanal a la puerta y de la puerta a la esquina del fondo
  { start: [WALL_B_X, FRONT_WALL_INNER_Z], end: [WALL_B_X, DOOR_FRAME_MAX_Z] },
  { start: [WALL_B_X, DOOR_FRAME_MIN_Z], end: [WALL_B_X, BACK_WALL_Z] },
  // Pared del fondo d (sin estanterías): de la esquina con la pared b hasta el lateral de las estanterías de la pared a
  { start: [WALL_B_X, BACK_WALL_Z], end: [SHELF_A_FRONT_X, BACK_WALL_Z] },
  // Muro del ventanal: entre los dos arcos y el trozo de la derecha (junto a la pared b)
  { start: [-WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WINDOW_PIER_WIDTH / 2, FRONT_WALL_INNER_Z] },
  { start: [WINDOW_WIDTH / 2, FRONT_WALL_INNER_Z], end: [WALL_B_X, FRONT_WALL_INNER_Z] },
]

// Rotación de la pared de estanterías (constante en shelfWalls.js)
const SHELF_WALL_A_ROTATION = [0, SHELF_WALL_A_ROTATION_Y, 0]

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

// Tramos de estanterías de la pared a (la pared del fondo d no lleva)
const SHELF_WALLS = WALL_A_RUNS.map((run, i) => ({
  key: `a${i}`,
  length: run.endZ - run.startZ,
  position: [SHELF_WALL_A_X, SHELF_WALL_Y, (run.startZ + run.endZ) / 2],
  rotation: SHELF_WALL_A_ROTATION,
  startShelf: run.startShelf,
}))

// Colocación inicial: los libros llenan en orden los tramos de la pared a, del fondo hacia el ventanal
function layoutAllBooks() {
  let remainingBooks = books
  const placements = []
  for (const wall of SHELF_WALLS) {
    const placement = getWallPlacement(remainingBooks, wall.length, { shelfCount: SHELF_COUNT - wall.startShelf })
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

// Clave de localStorage con el sitio de los libros que se han movido, por ISBN (el id cambia si se añaden libros)
const PLACEMENTS_STORAGE_KEY = 'fantasy-bookroom:book-placements'

// Módulos de una pared de estanterías y ancho útil de sus baldas (el mismo reparto que BookshelfWall)
function moduleGeometry(wall) {
  const moduleCount = Math.max(1, Math.round(wall.length / BASE_SHELF_WIDTH))
  return { moduleCount, innerWidth: wall.length / moduleCount - 2 * BOARD_THICKNESS }
}

// Hueco que ocupa un libro a lo largo de la balda: su grosor de lomo o, volteado (portada al frente), su fondo
const bookFootprint = (book, flippedIsbns) => (flippedIsbns.has(book.isbn) ? book.depth : book.width)

// ¿El sitio guardado existe en las estanterías actuales? (lo que llega de localStorage puede estar viejo o roto)
function isValidSlot(slot) {
  const wall = SHELF_WALLS.find((w) => w.key === slot?.wall)
  if (!wall) return false
  const { moduleCount, innerWidth } = moduleGeometry(wall)
  return (
    Number.isInteger(slot.module) && slot.module >= 0 && slot.module < moduleCount &&
    Number.isInteger(slot.shelf) && slot.shelf >= 0 && slot.shelf < SHELF_COUNT - wall.startShelf &&
    Number.isFinite(slot.x) && Math.abs(slot.x) <= innerWidth / 2
  )
}

// Colocación inicial con los sitios guardados encima; si localStorage no responde (modo privado…), la de por defecto
// shortcut: si se añaden libros, uno nuevo puede caer encima de uno movido; recolocarlos con fitOnShelf si pasa a menudo
function loadPlacements() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(PLACEMENTS_STORAGE_KEY)) ?? {}
  } catch {
    // Sin datos válidos: se usa la colocación por defecto
  }
  return layoutAllBooks().map((p) => {
    const slot = saved[p.book.isbn]
    return isValidSlot(slot) ? { ...p, wall: slot.wall, module: slot.module, shelf: slot.shelf, x: slot.x } : p
  })
}

function Experience({ onSelectBook, flippedIsbns }) {
  // Sitio de cada libro: { book, wall, module, shelf, x }; cambia al arrastrarlo y se guarda en localStorage
  const [placements, setPlacements] = useState(loadPlacements)
  // Libro agarrado: el estado lo pinta sacado de la balda; la ref la leen la cámara y las baldas en el mismo evento
  const [draggedId, setDraggedId] = useState(null)
  const draggedRef = useRef(null)
  // Sitio del libro al agarrarlo (vuelve ahí si se suelta fuera de las baldas) y si se ha soltado sobre una balda
  const originRef = useRef(null)
  // Distancia entre el punto agarrado y el centro del libro: el libro se mueve con la mano sin centrarse de golpe
  const grabOffsetRef = useRef(0)
  const droppedRef = useRef(false)

  // Guarda los sitios al terminar cada arrastre (mientras se arrastra cambian en cada movimiento del puntero)
  useEffect(() => {
    if (draggedId !== null) return
    const slots = Object.fromEntries(
      placements.map(({ book, wall, module, shelf, x }) => [book.isbn, { wall, module, shelf, x }])
    )
    try {
      localStorage.setItem(PLACEMENTS_STORAGE_KEY, JSON.stringify(slots))
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): los libros se quedan donde están hasta recargar
    }
  }, [placements, draggedId])

  // Soltar el botón en cualquier sitio termina el arrastre (después del onPointerUp de la balda de destino);
  // si no se soltó sobre una balda, el libro vuelve a donde estaba
  useEffect(() => {
    const release = () => {
      const origin = originRef.current
      if (draggedRef.current !== null && !droppedRef.current && origin) {
        setPlacements((list) => list.map((p) => (p.book.id === origin.book.id ? origin : p)))
      }
      draggedRef.current = null
      originRef.current = null
      setDraggedId(null)
    }
    window.addEventListener('pointerup', release)
    return () => window.removeEventListener('pointerup', release)
  }, [])

  // Lo que se pinta: cada libro con su volteo y, si al voltear alguno se pisan, apartados lo justo en su balda
  const shownPlacements = useMemo(() => {
    const shelves = new Map()
    placements.forEach((p) => {
      const key = `${p.wall}/${p.module}/${p.shelf}`
      if (!shelves.has(key)) shelves.set(key, [])
      shelves.get(key).push(p)
    })
    const shown = []
    shelves.forEach((list) => {
      const { innerWidth } = moduleGeometry(SHELF_WALLS.find((wall) => wall.key === list[0].wall))
      const xs = separateOnShelf(
        list.map((p) => ({ x: p.x, width: bookFootprint(p.book, flippedIsbns) })),
        innerWidth,
        DRAG_BOOK_GAP
      )
      list.forEach((p, i) => shown.push({ ...p, x: xs[i], flipped: flippedIsbns.has(p.book.isbn) }))
    })
    return shown
  }, [placements, flippedIsbns])

  // Lleva el libro agarrado al hueco libre más cercano a x en esa balda (si no cabe, se queda donde estaba)
  const moveDragged = (slot, x, innerWidth) => {
    const bookId = draggedRef.current
    if (bookId === null) return
    setPlacements((list) => {
      const dragged = list.find((p) => p.book.id === bookId)
      const others = list.filter(
        (p) => p !== dragged && p.wall === slot.wall && p.module === slot.module && p.shelf === slot.shelf
      )
      const fitX = fitOnShelf(
        others.map((p) => ({ x: p.x, width: bookFootprint(p.book, flippedIsbns) })),
        bookFootprint(dragged.book, flippedIsbns),
        x - grabOffsetRef.current,
        innerWidth,
        DRAG_BOOK_GAP
      )
      if (fitX === null) return list
      const sameSlot = dragged.wall === slot.wall && dragged.module === slot.module && dragged.shelf === slot.shelf
      // Sin cambio visible: misma lista, así React no vuelve a pintar las estanterías
      if (sameSlot && Math.abs(dragged.x - fitX) < 1e-4) return list
      return list.map((p) => (p === dragged ? { ...p, ...slot, x: fitX } : p))
    })
  }

  const bookDrag = {
    draggedId,
    grab: (book, offsetX = 0) => {
      draggedRef.current = book.id
      grabOffsetRef.current = offsetX
      originRef.current = placements.find((p) => p.book.id === book.id)
      droppedRef.current = false
      setDraggedId(book.id)
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
      <FirstPersonControls heldBookRef={draggedRef} />

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

        {/* Rodapiés de madera en los tramos de pared visibles */}
        <SkirtingBoards segments={SKIRTING_SEGMENTS} />

        {/* Estanterías de la pared izquierda (a) en tres tramos (el del centro, sobre el mueble), lomos hacia +X */}
        {SHELF_WALLS.map((wall) => (
          <BookshelfWall
            key={wall.key}
            wallKey={wall.key}
            placements={shownPlacements.filter((p) => p.wall === wall.key)}
            wallLength={wall.length}
            position={wall.position}
            rotation={wall.rotation}
            onSelectBook={onSelectBook}
            bookDrag={bookDrag}
            startShelf={wall.startShelf}
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
