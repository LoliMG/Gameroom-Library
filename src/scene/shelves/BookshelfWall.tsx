// Importación del componente de estantería individual y sus constantes de geometría
import Bookshelf from '@/scene/shelves/Bookshelf'
import type { BookDrag, ShownPlacement } from '@/scene/shelves/Bookshelf'
import type { Book } from '@/types'
import type { ThreeEvent } from '@react-three/fiber'

/**
 * Componente que cubre una pared con múltiples estanterías contiguas
 * dimensionadas para encajar de esquina a esquina sin huecos ni solapes.
 *
 */
interface BookshelfWallProps {
  /** Identificador de la pared ('a0', 'a1'…), parte del sitio de cada libro */
  wallKey: string
  /** Libros de esta pared con su sitio: { book, module, shelf, x, flipped } */
  placements?: ShownPlacement[]
  /** Longitud de la pared en metros (por defecto 4.0 m) */
  wallLength?: number
  /** Módulos en que se reparte (los calcula Experience: SHELF_WALLS) */
  moduleCount: number
  /** Posición [x, y, z] del conjunto en la escena */
  position?: [number, number, number]
  /** Rotación [x, y, z] del conjunto */
  rotation?: [number, number, number]
  /** Clic en un libro */
  onSelectBook: (book: Book, event: ThreeEvent<MouseEvent>) => void
  /** Arrastre y selección de libros (ver Bookshelf) */
  bookDrag: BookDrag
  /** Balda desde la que empiezan los módulos (0 = desde el suelo; más arriba, sobre un mueble) */
  startShelf?: number
}

function BookshelfWall({
  wallKey,
  placements = [],
  wallLength = 4.0,
  moduleCount,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onSelectBook,
  bookDrag,
  startShelf = 0,
}: BookshelfWallProps) {
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
