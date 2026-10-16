// Importación del componente Book usando el alias "@"
import Book from '@/scene/Book'
// Madera recortada de la textura del mueble de la pared a, para que las estanterías tengan su mismo tono
import useShelfWood from '@/hooks/useShelfWood'

// Constantes de dimensiones de la estantería en metros
export const BASE_SHELF_WIDTH = 1.2   // Ancho base de referencia para un módulo de estantería
export const SHELF_HEIGHT = 2.7       // Altura total de la estantería (de suelo a techo)
export const BOOKSHELF_DEPTH = 0.35   // Profundidad de la estantería
export const BOARD_THICKNESS = 0.04   // Grosor de todos los tablones de madera (4 cm)
export const SHELF_COUNT = 8          // Número de niveles de baldas disponibles para libros (8 baldas)

// Separación uniforme entre libros contiguos sobre la misma balda (1.5 cm)
export const BOOK_GAP = 0.015

// Grosor del panel trasero (tapa la pared entre baldas)
const BACK_PANEL_THICKNESS = 0.01
// Tinte del panel trasero: la misma madera, más oscura, para que se distinga de las baldas
const BACK_PANEL_TINT = '#5c5c5c'

// Color madera para el material de todos los tablones
export const WOOD_COLOR = '#4a3320' // Roble oscuro (Fase 11); lo usa la moldura del techo (las estanterías llevan la textura de la repisa)

// Altura interior libre disponible entre la base inferior y la tapa superior
export const INNER_HEIGHT = SHELF_HEIGHT - 2 * BOARD_THICKNESS

// Espacio vertical libre de cada hueco entre baldas para 8 niveles de libros y 7 tablones intermedios
export const COMPARTMENT_HEIGHT =
  (INNER_HEIGHT - (SHELF_COUNT - 1) * BOARD_THICKNESS) / SHELF_COUNT

// Separación vertical entre baldas consecutivas (hueco + tablón, 0.3325 m): sirve para alinear muebles y módulos cortos
export const SHELF_PITCH = COMPARTMENT_HEIGHT + BOARD_THICKNESS

// Coordenada Y del centro del tablón horizontal de la base
const BASE_BOARD_Y = -SHELF_HEIGHT / 2 + BOARD_THICKNESS / 2

// Coordenada Y de la superficie de apoyo de la balda inferior (balda 0)
const SHELF_SURFACE_0_Y = BASE_BOARD_Y + BOARD_THICKNESS / 2

// Coordenada Y del centro del tablón horizontal de la tapa superior
const TOP_BOARD_Y = SHELF_HEIGHT / 2 - BOARD_THICKNESS / 2

// Margen desde el borde delantero de la balda para alinear los lomos hacia el frente
const FRONT_MARGIN = 0.04

// Posición Z frontal donde quedan alineados los lomos mirando hacia el interior (+Z)
const FRONT_SPINE_Z = BOOKSHELF_DEPTH / 2 - FRONT_MARGIN
// Libro volteado: -90° en Y lleva la portada (cara +X del libro) hacia la sala (+Z), con el lomo a la izquierda
const FLIPPED_BOOK_ROTATION_Y = -Math.PI / 2
// Cuánto sale de la balda el libro que se está arrastrando
const HELD_BOOK_PULL = 0.06

/**
 * Calcula la cota Y de la superficie de apoyo de una balda según su índice (0 a SHELF_COUNT - 1)
 */
function getShelfSurfaceY(shelfIndex) {
  return SHELF_SURFACE_0_Y + shelfIndex * (COMPARTMENT_HEIGHT + BOARD_THICKNESS)
}

/**
 * Calcula la cota Y del centro del tablón intermedio correspondiente a una balda (1 a SHELF_COUNT - 1)
 */
function getIntermediateBoardY(shelfIndex) {
  return getShelfSurfaceY(shelfIndex) - BOARD_THICKNESS / 2
}

/**
 * Componente de estantería individual paramétrica en ancho
 *
 * @param {{ wall: string, module: number }} slot - Pared y módulo de esta estantería (parte del sitio de sus libros)
 * @param {Array<Object>} placements - Libros de este módulo con su balda (contada desde startShelf), su centro X y si
 *   están volteados (de frente, con la portada hacia la sala)
 * @param {number} width - Ancho exterior del módulo en metros (por defecto BASE_SHELF_WIDTH = 1.2 m)
 * @param {Function} onSelectBook - Callback al pulsar un libro
 * @param {Object} bookDrag - Arrastre de libros: { draggedId, grab(book), hover(slot, x, innerWidth), drop(slot, x, innerWidth) }
 * @param {number} startShelf - Balda desde la que empieza el módulo (0 = desde el suelo). Los módulos que empiezan
 *   más arriba van encima de un mueble y sus baldas quedan alineadas con las de los módulos completos.
 */
function Bookshelf({ slot, placements = [], width = BASE_SHELF_WIDTH, onSelectBook, bookDrag, startShelf = 0 }) {
  // Texturas de madera compartidas (veta vertical para laterales, a lo largo para tablones), con el tono del mueble
  const wood = useShelfWood('cabinet')
  // Ancho interior útil entre los paneles laterales para este ancho concreto
  const innerWidth = width - 2 * BOARD_THICKNESS

  // Comprobación de seguridad: advertir en español si el libro más alto excede el hueco vertical
  if (placements.length > 0) {
    const maxHeight = Math.max(...placements.map((p) => p.book.height || 0))
    if (maxHeight > COMPARTMENT_HEIGHT) {
      console.warn(
        `[Bookshelf] El libro más alto (${maxHeight} m) no cabe en el hueco entre baldas (${COMPARTMENT_HEIGHT.toFixed(3)} m).`
      )
    }
  }

  // Tablones intermedios: de la balda siguiente a la de arranque hasta la última
  const intermediateBoardIndices = Array.from(
    { length: SHELF_COUNT - 1 - startShelf },
    (_, i) => i + 1 + startShelf
  )

  // Parte baja del módulo: el suelo, o la cara inferior del tablón de la balda de arranque
  const bottomY = startShelf === 0 ? -SHELF_HEIGHT / 2 : getShelfSurfaceY(startShelf) - BOARD_THICKNESS
  // Laterales y panel trasero cubren desde la parte baja hasta arriba
  const sideHeight = SHELF_HEIGHT / 2 - bottomY
  const sideCenterY = (SHELF_HEIGHT / 2 + bottomY) / 2
  // Tablón de abajo: el de la base o el de la balda de arranque
  const baseBoardY = startShelf === 0 ? BASE_BOARD_Y : getIntermediateBoardY(startShelf)

  return (
    // Grupo contenedor 3D que agrupa la estructura de tablones y los libros colocados
    <group>
      {/* 1. Lateral izquierdo vertical */}
      <mesh
        position={[-width / 2 + BOARD_THICKNESS / 2, sideCenterY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOARD_THICKNESS, sideHeight, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial map={wood.grainVertical} />
      </mesh>

      {/* 2. Lateral derecho vertical */}
      <mesh
        position={[width / 2 - BOARD_THICKNESS / 2, sideCenterY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOARD_THICKNESS, sideHeight, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial map={wood.grainVertical} />
      </mesh>

      {/* 3. Tablón horizontal de abajo (base del suelo o balda de arranque) */}
      <mesh position={[0, baseBoardY, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerWidth, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial map={wood.grainAlongLength} />
      </mesh>

      {/* 4. Tablones horizontales intermedios calculados dinámicamente */}
      {intermediateBoardIndices.map((shelfIndex) => (
        <mesh
          key={shelfIndex}
          position={[0, getIntermediateBoardY(shelfIndex), 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[innerWidth, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
          <meshStandardMaterial map={wood.grainAlongLength} />
        </mesh>
      ))}

      {/* 5. Tablón horizontal de la tapa superior */}
      <mesh position={[0, TOP_BOARD_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerWidth, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial map={wood.grainAlongLength} />
      </mesh>

      {/* 6. Panel trasero de madera entre los laterales: tapa la pared entre baldas */}
      <mesh position={[0, sideCenterY, -BOOKSHELF_DEPTH / 2 + BACK_PANEL_THICKNESS / 2]} receiveShadow>
        <boxGeometry args={[innerWidth, sideHeight, BACK_PANEL_THICKNESS]} />
        <meshStandardMaterial map={wood.grainVertical} color={BACK_PANEL_TINT} />
      </mesh>

      {/* 7. Zonas donde soltar un libro arrastrado: una por balda, invisibles y pegadas al panel trasero (detrás de
          los libros, así un libro soltado encima de otro cae en el mismo punto de la balda) */}
      {Array.from({ length: SHELF_COUNT - startShelf }, (_, shelf) => (
        <mesh
          key={shelf}
          position={[0, getShelfSurfaceY(shelf + startShelf) + COMPARTMENT_HEIGHT / 2, -BOOKSHELF_DEPTH / 2 + BACK_PANEL_THICKNESS + 0.001]}
          // El libro agarrado sigue al puntero por las baldas y se queda donde se suelta.
          // Punto en coordenadas de la estantería: la zona está centrada en X, así que su X local vale
          onPointerMove={(event) => {
            // Sin libro agarrado, hover no hace nada (lo comprueba con la ref, al día aunque React no haya pintado)
            bookDrag.hover({ ...slot, shelf }, event.object.worldToLocal(event.point.clone()).x, innerWidth)
          }}
          onPointerUp={(event) => {
            event.stopPropagation()
            bookDrag.drop({ ...slot, shelf }, event.object.worldToLocal(event.point.clone()).x, innerWidth)
          }}
        >
          <planeGeometry args={[innerWidth, COMPARTMENT_HEIGHT]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* 8. Libros en su sitio guardado (balda y centro X) */}
      {placements.map(({ book, shelf, x, flipped }) => {
        // Altura Y: cota de apoyo de la balda + mitad de la altura del libro
        const posY = getShelfSurfaceY(shelf + startShelf) + book.height / 2
        // Profundidad Z: lomo al frente (+Z) y cuerpo proyectado hacia el fondo; el libro agarrado sale un poco
        // Volteado, el libro gira 90° y lo que va hacia el fondo es su grosor en vez de su fondo
        const posZ = FRONT_SPINE_Z - (flipped ? book.width : book.depth) / 2 + (book.id === bookDrag.draggedId ? HELD_BOOK_PULL : 0)

        return (
          <Book
            key={book.id}
            book={book}
            onSelect={onSelectBook}
            onGrab={bookDrag.grab}
            rotationY={flipped ? FLIPPED_BOOK_ROTATION_Y : 0}
            position={[x, posY, posZ]}
            width={book.width}
            height={book.height}
            depth={book.depth}
          />
        )
      })}
    </group>
  )
}

export default Bookshelf
