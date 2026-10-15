// Importación del componente Book usando el alias "@"
import Book from '@/scene/Book'
// Importación del listado de libros reales usando el alias "@"
import books from '@/data/books'

// Constantes de dimensiones de la estantería en metros (1 unidad = 1 metro)
const BOOKSHELF_WIDTH = 1.2
const BOOKSHELF_HEIGHT = 2.0
const BOOKSHELF_DEPTH = 0.35
const BOARD_THICKNESS = 0.04

// Separación horizontal uniforme entre libros contiguos sobre la balda (1.5 cm)
const BOOK_GAP = 0.015

// Color marrón para el material de madera de todos los tablones
const WOOD_COLOR = '#5c3a21'

// Ancho interior libre para las baldas horizontales entre ambos laterales
const INNER_WIDTH = BOOKSHELF_WIDTH - 2 * BOARD_THICKNESS

// Altura interior libre disponible entre la base inferior y la tapa superior
const INNER_HEIGHT = BOOKSHELF_HEIGHT - 2 * BOARD_THICKNESS

// Espacio vertical libre de cada uno de los 3 huecos creados por las 2 baldas intermedias
const COMPARTMENT_HEIGHT = (INNER_HEIGHT - 2 * BOARD_THICKNESS) / 3

// Coordenada Y de la base (tablón horizontal inferior)
const BASE_Y = -BOOKSHELF_HEIGHT / 2 + BOARD_THICKNESS / 2

// Coordenada Y de la primera balda intermedia (suelo del hueco central donde descansan los libros)
const LOWER_SHELF_Y = BASE_Y + BOARD_THICKNESS + COMPARTMENT_HEIGHT

// Coordenada Y de la segunda balda intermedia (techo del hueco central)
const UPPER_SHELF_Y = LOWER_SHELF_Y + BOARD_THICKNESS + COMPARTMENT_HEIGHT

// Coordenada Y de la tapa (tablón horizontal superior)
const TOP_Y = BOOKSHELF_HEIGHT / 2 - BOARD_THICKNESS / 2

// Coordenada Y de la superficie de apoyo de la balda intermedia donde descansan los libros
const SHELF_TOP_SURFACE_Y = LOWER_SHELF_Y + BOARD_THICKNESS / 2

// Margen desde el borde delantero de la balda para alinear los lomos hacia el frente
const FRONT_MARGIN = 0.04

// Posición Z frontal donde quedan alineados los lomos mirando hacia la cámara (+Z)
const FRONT_SPINE_Z = BOOKSHELF_DEPTH / 2 - FRONT_MARGIN

function Bookshelf() {
  // Manejador que recibe el libro seleccionado al hacer clic y muestra su información por consola
  const handleSelectBook = (selectedBook) => {
    console.log(
      `Libro seleccionado: "${selectedBook.title}" - Autor: ${selectedBook.author} - Editorial: ${selectedBook.publisher} - Páginas: ${selectedBook.pages}`
    )
  }

  // Ancho total ocupado por los libros de canto sumando sus grosores y los pequeños espacios entre ellos
  const totalBooksWidth =
    books.reduce((acc, b) => acc + b.width, 0) +
    (books.length - 1) * BOOK_GAP

  // Posición inicial en el eje X para colocar el conjunto de libros centrado en la estantería
  const startX = -totalBooksWidth / 2

  return (
    // Grupo contenedor 3D que agrupa todos los elementos que forman la estantería y los libros
    <group>
      {/* Lateral izquierdo de la estantería */}
      <mesh position={[-BOOKSHELF_WIDTH / 2 + BOARD_THICKNESS / 2, 0, 0]}>
        {/* Geometría que define las dimensiones del tablón vertical izquierdo */}
        <boxGeometry args={[BOARD_THICKNESS, BOOKSHELF_HEIGHT, BOOKSHELF_DEPTH]} />
        {/* Material de madera para el lateral izquierdo */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Lateral derecho de la estantería */}
      <mesh position={[BOOKSHELF_WIDTH / 2 - BOARD_THICKNESS / 2, 0, 0]}>
        {/* Geometría que define las dimensiones del tablón vertical derecho */}
        <boxGeometry args={[BOARD_THICKNESS, BOOKSHELF_HEIGHT, BOOKSHELF_DEPTH]} />
        {/* Material de madera para el lateral derecho */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Tablón horizontal de la base */}
      <mesh position={[0, BASE_Y, 0]}>
        {/* Geometría para el tablón horizontal de la base */}
        <boxGeometry args={[INNER_WIDTH, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        {/* Material de madera para la base */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Balda intermedia inferior (soporte del hueco central donde van los libros) */}
      <mesh position={[0, LOWER_SHELF_Y, 0]}>
        {/* Geometría para el tablón de la balda intermedia inferior */}
        <boxGeometry args={[INNER_WIDTH, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        {/* Material de madera para la balda intermedia inferior */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Balda intermedia superior (separador entre el hueco central y el superior) */}
      <mesh position={[0, UPPER_SHELF_Y, 0]}>
        {/* Geometría para el tablón de la balda intermedia superior */}
        <boxGeometry args={[INNER_WIDTH, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        {/* Material de madera para la balda intermedia superior */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Tablón horizontal de la tapa superior */}
      <mesh position={[0, TOP_Y, 0]}>
        {/* Geometría para el tablón horizontal de la tapa */}
        <boxGeometry args={[INNER_WIDTH, BOARD_THICKNESS, BOOKSHELF_DEPTH]} />
        {/* Material de madera para la tapa superior */}
        <meshStandardMaterial color={WOOD_COLOR} />
      </mesh>

      {/* Renderizado de los 4 libros colocados de canto con lomo visible hacia la cámara */}
      {books.map((book, index) => {
        // Cálculo del grosor acumulado de los libros anteriores
        const previousWidth = books
          .slice(0, index)
          .reduce((sum, prev) => sum + prev.width, 0)

        // Espacio acumulado por las pequeñas separaciones entre libros
        const previousGaps = index * BOOK_GAP

        // Posición X: inicio + grosores previos + separaciones previas + mitad del grosor propio
        const posX = startX + previousWidth + previousGaps + book.width / 2

        // Posición Y: superficie superior de la balda + mitad de la altura para descansar sobre ella
        const posY = SHELF_TOP_SURFACE_Y + book.height / 2

        // Posición Z: lomo alineado al frente (+Z) y profundidad del libro extendiéndose hacia el fondo de la balda
        const posZ = FRONT_SPINE_Z - book.depth / 2

        return (
          // Instancia del componente Book con dimensiones de lomo, texturas y posición calculada
          <Book
            key={book.id}
            book={book}
            onSelect={handleSelectBook}
            position={[posX, posY, posZ]}
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
