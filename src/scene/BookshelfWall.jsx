// Importación del componente de estantería individual
import Bookshelf, {
  BOOKSHELF_WIDTH,
  SHELF_COUNT,
  INNER_WIDTH,
  BOOK_GAP,
} from '@/scene/Bookshelf'
// Importación de la función pura de reparto por baldas
import { layoutBooksOnShelves } from '@/utils/shelfLayout'

/**
 * Componente que cubre una pared con múltiples estanterías contiguas
 * y distribuye un conjunto de libros secuencialmente entre ellas.
 *
 * @param {Array<Object>} books - Colección completa de libros
 * @param {number} wallLength - Longitud de la pared en metros (por defecto 4.0 m)
 * @param {Array<number>} position - Posición [x, y, z] del conjunto en la escena
 * @param {Array<number>} rotation - Rotación [x, y, z] del conjunto
 * @param {Function} onSelectBook - Callback disparado al hacer clic en un libro
 */
function BookshelfWall({
  books = [],
  wallLength = 4.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onSelectBook,
}) {
  // Cálculo automático del número de estanterías que caben en la pared sin números fijos
  const shelfCount = Math.floor(wallLength / BOOKSHELF_WIDTH)

  // Ancho total que ocupan las estanterías colocadas una al lado de la otra
  const totalShelvesWidth = shelfCount * BOOKSHELF_WIDTH

  // Coordenada X inicial para centrar el bloque de estanterías a lo largo de la pared
  const startX = -totalShelvesWidth / 2 + BOOKSHELF_WIDTH / 2

  // Reparto secuencial de libros: llenamos la primera estantería, los sobrantes pasan a la siguiente, etc.
  let unassignedBooks = [...books]
  const shelvesData = []

  for (let i = 0; i < shelfCount; i++) {
    // Averiguamos cuántos libros caben en las baldas de esta estantería mediante layoutBooksOnShelves
    const { usedCount } = layoutBooksOnShelves(unassignedBooks, {
      innerWidth: INNER_WIDTH,
      shelfCount: SHELF_COUNT,
      bookGap: BOOK_GAP,
    })

    // Extraemos la porción de libros asignados a esta estantería
    const shelfBooks = unassignedBooks.slice(0, usedCount)

    // Posición X individual de la estantería actual dentro del conjunto
    const shelfX = startX + i * BOOKSHELF_WIDTH

    shelvesData.push({
      id: i,
      x: shelfX,
      books: shelfBooks,
    })

    // Los libros que no cupieron continúan hacia la siguiente estantería
    unassignedBooks = unassignedBooks.slice(usedCount)
  }

  return (
    // Grupo contenedor de la pared completa de estanterías con posición y orientación
    <group position={position} rotation={rotation}>
      {shelvesData.map(({ id, x, books: shelfBooks }) => (
        // Cada estantería individual se ubica contigua a la anterior a lo largo del eje X
        <group key={id} position={[x, 0, 0]}>
          <Bookshelf books={shelfBooks} onSelectBook={onSelectBook} />
        </group>
      ))}
    </group>
  )
}

export default BookshelfWall
