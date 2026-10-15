// Importación del componente Book usando el alias "@"
import Book from '@/scene/Book'
// Importación de la función pura de reparto de libros por baldas
import { layoutBooksOnShelves } from '@/utils/shelfLayout'

// Constantes de dimensiones de la estantería en metros
export const BASE_SHELF_WIDTH = 1.2   // Ancho base de referencia para un módulo de estantería
export const SHELF_HEIGHT = 2.7       // Altura total de la estantería (de suelo a techo)
export const BOOKSHELF_DEPTH = 0.35   // Profundidad de la estantería
export const BOARD_THICKNESS = 0.04   // Grosor de todos los tablones de madera (4 cm)
export const SHELF_COUNT = 8          // Número de niveles de baldas disponibles para libros (8 baldas)

// Separación uniforme entre libros contiguos sobre la misma balda (1.5 cm)
export const BOOK_GAP = 0.015

// Color madera para el material de todos los tablones
export const WOOD_COLOR = '#4a3320' // Roble oscuro (Fase 11); también lo usan el bloque de esquina y la moldura

// Altura interior libre disponible entre la base inferior y la tapa superior
export const INNER_HEIGHT = SHELF_HEIGHT - 2 * BOARD_THICKNESS

// Espacio vertical libre de cada hueco entre baldas para 8 niveles de libros y 7 tablones intermedios
export const COMPARTMENT_HEIGHT =
  (INNER_HEIGHT - (SHELF_COUNT - 1) * BOARD_THICKNESS) / SHELF_COUNT

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
 * @param {Array<Object>} books - Libros a colocar en este módulo
 * @param {number} width - Ancho exterior del módulo en metros (por defecto BASE_SHELF_WIDTH = 1.2 m)
 * @param {Function} onSelectBook - Callback al pulsar un libro
 */
function Bookshelf({ books = [], width = BASE_SHELF_WIDTH, onSelectBook }) {
  // Ancho interior útil entre los paneles laterales para este ancho concreto
  const innerWidth = width - 2 * BOARD_THICKNESS

  // Comprobación de seguridad: advertir en español si el libro más alto excede el hueco vertical
  if (books && books.length > 0) {
    const maxHeight = Math.max(...books.map((b) => b.height || 0))
    if (maxHeight > COMPARTMENT_HEIGHT) {
      console.warn(
        `[Bookshelf] El libro más alto (${maxHeight} m) no cabe en el hueco entre baldas (${COMPARTMENT_HEIGHT.toFixed(3)} m).`
      )
    }
  }

  // Reparto algorítmico de los libros recibidos a lo largo de las 8 baldas
  const { placed } = layoutBooksOnShelves(books, {
    innerWidth,
    shelfCount: SHELF_COUNT,
    bookGap: BOOK_GAP,
  })

  // Array de índices para generar los 7 tablones intermedios (de balda 1 a SHELF_COUNT - 1)
  const intermediateBoardIndices = Array.from(
    { length: SHELF_COUNT - 1 },
    (_, i) => i + 1
  )

  return (
    // Grupo contenedor 3D que agrupa la estructura de tablones y los libros colocados
    <group>
      {/* 1. Lateral izquierdo vertical */}
      <mesh
        position={[-width / 2 + BOARD_THICKNESS / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOARD_THICKNESS, SHELF_HEIGHT, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* 2. Lateral derecho vertical */}
      <mesh
        position={[width / 2 - BOARD_THICKNESS / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[BOARD_THICKNESS, SHELF_HEIGHT, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* 3. Tablón horizontal de la base */}
      <mesh position={[0, BASE_BOARD_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerWidth, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} />
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
          <meshStandardMaterial color={WOOD_COLOR} />
        </mesh>
      ))}

      {/* 5. Tablón horizontal de la tapa superior */}
      <mesh position={[0, TOP_BOARD_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerWidth, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* 6. Renderizado de los libros distribuidos mediante layoutBooksOnShelves */}
      {placed.map(({ book, shelfIndex, x }) => {
        // Altura Y: cota de apoyo de la balda + mitad de la altura del libro
        const posY = getShelfSurfaceY(shelfIndex) + book.height / 2
        // Profundidad Z: lomo al frente (+Z) y cuerpo proyectado hacia el fondo
        const posZ = FRONT_SPINE_Z - book.depth / 2

        return (
          <Book
            key={book.id}
            book={book}
            onSelect={onSelectBook}
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
