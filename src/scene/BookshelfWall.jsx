// Importación del componente de estantería individual y sus constantes de geometría
import Bookshelf, {
  BASE_SHELF_WIDTH,
  SHELF_COUNT,
  BOARD_THICKNESS,
  BOOK_GAP,
} from '@/scene/Bookshelf'
// Importación de la función pura de reparto por baldas
import { layoutBooksOnShelves } from '@/utils/shelfLayout'

/**
 * Componente que cubre una pared con múltiples estanterías contiguas
 * dimensionadas para encajar de esquina a esquina sin huecos ni solapes.
 *
 * @param {Array<Object>} books - Colección de libros a distribuir en esta pared
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
  // Número de módulos calculados para una distribución uniforme
  const moduleCount = Math.max(1, Math.round(wallLength / BASE_SHELF_WIDTH))
  // Ancho de cada módulo para cubrir con total precisión la pared
  const moduleWidth = wallLength / moduleCount
  // Ancho útil interior de cada estantería
  const moduleInnerWidth = moduleWidth - 2 * BOARD_THICKNESS

  // Coordenada X inicial del primer módulo para centrar el bloque en la pared
  const startX = -wallLength / 2 + moduleWidth / 2

  // Reparto secuencial de libros módulo a módulo
  let unassignedBooks = [...books]
  const shelvesData = []

  for (let i = 0; i < moduleCount; i++) {
    // Calculamos cuántos libros caben en las baldas de este módulo
    const { usedCount } = layoutBooksOnShelves(unassignedBooks, {
      innerWidth: moduleInnerWidth,
      shelfCount: SHELF_COUNT,
      bookGap: BOOK_GAP,
    })

    const shelfBooks = unassignedBooks.slice(0, usedCount)
    const moduleX = startX + i * moduleWidth

    shelvesData.push({
      id: i,
      x: moduleX,
      books: shelfBooks,
    })

    unassignedBooks = unassignedBooks.slice(usedCount)
  }

  return (
    // Grupo contenedor de la pared completa de estanterías con posición y orientación
    <group position={position} rotation={rotation}>
      {shelvesData.map(({ id, x, books: shelfBooks }) => (
        // Cada estantería individual se ubica contigua a la anterior a lo largo del eje X
        <group key={id} position={[x, 0, 0]}>
          <Bookshelf
            books={shelfBooks}
            width={moduleWidth}
            onSelectBook={onSelectBook}
          />
        </group>
      ))}
    </group>
  )
}

export default BookshelfWall
