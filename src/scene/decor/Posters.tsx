// Pósters de los libros favoritos colgados sobre la chimenea: la portada en un marco fino de madera. Al pulsarlos, la
// ficha del libro
import { Suspense } from 'react'
import { useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'
import type { Vector3Tuple } from 'three'
import type { Book } from '@/types'
import Clickable from '@/scene/shared/Clickable'

// Alto de cada póster (el ancho sale de la forma de la portada), marco y separación entre los dos (m)
const POSTER_HEIGHT = 0.5
const FRAME = 0.025
const FRAME_DEPTH = 0.02
const FRAME_COLOR = '#3b2a1e'
const GAP = 0.18

function Poster({ book, position, onSelect }: { book: Book; position: Vector3Tuple; onSelect: (book: Book) => void }) {
  const cover = useTexture(book.cover, (texture) => {
    texture.colorSpace = SRGBColorSpace
  })
  // La portada es la cara del libro de fondo × alto (en los libros, depth es el ancho de la portada)
  const width = POSTER_HEIGHT * (book.depth / book.height)
  return (
    <Clickable onClick={() => onSelect(book)}>
      <group position={position}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width + 2 * FRAME, POSTER_HEIGHT + 2 * FRAME, FRAME_DEPTH]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
          <planeGeometry args={[width, POSTER_HEIGHT]} />
          <meshStandardMaterial map={cover} roughness={0.85} />
        </mesh>
      </group>
    </Clickable>
  )
}

/**
 * @param books - Los favoritos colgados (uno o dos)
 * @param center - Centro de la pared donde se cuelgan (con uno, ahí; con dos, uno a cada lado)
 */
function Posters({ books, center, onSelect }: { books: Book[]; center: Vector3Tuple; onSelect: (book: Book) => void }) {
  // Separación entre centros: el ancho del póster más ancho y el hueco
  const spread = books.length > 1 ? Math.max(...books.map((book) => POSTER_HEIGHT * (book.depth / book.height))) + 2 * FRAME + GAP : 0
  return (
    <>
      {books.map((book, i) => (
        // Cada póster espera a su portada por su cuenta
        <Suspense key={book.isbn} fallback={null}>
          <Poster book={book} position={[center[0] + (i - (books.length - 1) / 2) * spread, center[1], center[2]]} onSelect={onSelect} />
        </Suspense>
      ))}
    </>
  )
}

export default Posters
