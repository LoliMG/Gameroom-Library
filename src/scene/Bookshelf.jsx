// Importación del componente Book usando el alias "@"
import Book from '@/scene/Book'
// Importación del listado de libros de prueba usando el alias "@"
import placeholderBooks from '@/data/placeholderBooks'

// Constantes de dimensiones de la estantería en metros (1 unidad = 1 metro)
const BOOKSHELF_WIDTH = 1.2
const BOOKSHELF_HEIGHT = 2.0
const BOOKSHELF_DEPTH = 0.35
const BOARD_THICKNESS = 0.04

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

// Coordenada Y de la primera balda intermedia (suelo del hueco central)
const LOWER_SHELF_Y = BASE_Y + BOARD_THICKNESS + COMPARTMENT_HEIGHT

// Coordenada Y de la segunda balda intermedia (techo del hueco central)
const UPPER_SHELF_Y = LOWER_SHELF_Y + BOARD_THICKNESS + COMPARTMENT_HEIGHT

// Coordenada Y de la tapa (tablón horizontal superior)
const TOP_Y = BOOKSHELF_HEIGHT / 2 - BOARD_THICKNESS / 2

// Coordenada Y de la superficie de apoyo de la balda intermedia donde descansan los libros
const SHELF_TOP_SURFACE_Y = LOWER_SHELF_Y + BOARD_THICKNESS / 2

// Margen desde el borde frontal de la estantería para alinear el lomo de los libros
const SPINE_FRONT_OFFSET = 0.03

// Posición Z donde queda situado el lomo mirando hacia el frente (+Z)
const SPINE_Z = BOOKSHELF_DEPTH / 2 - SPINE_FRONT_OFFSET

function Bookshelf() {
  // Manejador que recibe el libro seleccionado al hacer clic y muestra su título y autor por consola
  const handleSelectBook = (selectedBook) => {
    console.log(`Libro seleccionado: "${selectedBook.title}" - Autor: ${selectedBook.author}`)
  }

  // Calculamos el grosor total de los libros para colocarlos centrados de lado a lado
  const totalBooksWidth = placeholderBooks.reduce((acc, b) => acc + b.width, 0)

  // Posición inicial en el eje X para el primer libro (centrado en la estantería)
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

      {/* Renderizado de los 5 libros apoyados de pie sobre la balda intermedia */}
      {placeholderBooks.map((book, index) => {
        // Cálculo del desplazamiento acumulado sumando el grosor de todos los libros anteriores
        const previousWidth = placeholderBooks
          .slice(0, index)
          .reduce((sum, prev) => sum + prev.width, 0)

        // Cálculo de posición X: posición inicial + grosores anteriores + mitad del grosor actual
        const posX = startX + previousWidth + book.width / 2

        // Cálculo de posición Y: superficie superior de la balda + mitad de la altura del libro para que descanse sobre ella
        const posY = SHELF_TOP_SURFACE_Y + book.height / 2

        // Cálculo de posición Z: lomo mirando al frente y alineado con el borde frontal de la balda
        const posZ = SPINE_Z - book.depth / 2

        return (
          // Instancia del componente Book con sus dimensiones, color, posición calculada y manejador de selección
          <Book
            key={book.id}
            book={book}
            onSelect={handleSelectBook}
            position={[posX, posY, posZ]}
            width={book.width}
            height={book.height}
            depth={book.depth}
            color={book.color}
          />
        )
      })}
    </group>
  )
}

export default Bookshelf
