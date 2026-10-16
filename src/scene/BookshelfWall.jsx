// Importación del componente de estantería individual y sus constantes de geometría
import Bookshelf, { BASE_SHELF_WIDTH } from '@/scene/Bookshelf'

/**
 * Componente que cubre una pared con múltiples estanterías contiguas
 * dimensionadas para encajar de esquina a esquina sin huecos ni solapes.
 *
 * @param {string} wallKey - Identificador de la pared ('d', 'a0'…), parte del sitio de cada libro
 * @param {Array<Object>} placements - Libros de esta pared con su sitio: { book, module, shelf, x }
 * @param {number} wallLength - Longitud de la pared en metros (por defecto 4.0 m)
 * @param {Array<number>} position - Posición [x, y, z] del conjunto en la escena
 * @param {Array<number>} rotation - Rotación [x, y, z] del conjunto
 * @param {Function} onSelectBook - Callback disparado al hacer clic en un libro
 * @param {Object} bookDrag - Arrastre de libros: { draggedId, grab(book), hover(slot, x, innerWidth), drop(slot, x, innerWidth) }
 * @param {number} startShelf - Balda desde la que empiezan los módulos (0 = desde el suelo; más arriba, sobre un mueble)
 */
function BookshelfWall({
  wallKey,
  placements = [],
  wallLength = 4.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onSelectBook,
  bookDrag,
  startShelf = 0,
}) {
  // Número de módulos calculados para una distribución uniforme (el mismo reparto que getWallPlacement)
  const moduleCount = Math.max(1, Math.round(wallLength / BASE_SHELF_WIDTH))
  // Ancho de cada módulo para cubrir con total precisión la pared
  const moduleWidth = wallLength / moduleCount
  // Coordenada X inicial del primer módulo para centrar el bloque en la pared
  const startX = -wallLength / 2 + moduleWidth / 2

  return (
    // Grupo contenedor de la pared completa de estanterías con posición y orientación
    <group position={position} rotation={rotation}>
      {Array.from({ length: moduleCount }, (_, i) => (
        // Cada estantería individual se ubica contigua a la anterior a lo largo del eje X
        <group key={i} position={[startX + i * moduleWidth, 0, 0]}>
          <Bookshelf
            slot={{ wall: wallKey, module: i }}
            placements={placements.filter((p) => p.module === i)}
            width={moduleWidth}
            onSelectBook={onSelectBook}
            bookDrag={bookDrag}
            startShelf={startShelf}
          />
        </group>
      ))}
    </group>
  )
}

export default BookshelfWall
