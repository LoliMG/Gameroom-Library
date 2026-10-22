// Pila "por leer" en el suelo junto al sofá: los libros que se mandan a ella desde su ficha, tumbados uno encima de otro
// (el primero abajo), cada uno algo girado y desplazado para que parezca un montón de verdad. Al pulsar uno, su ficha
import { Suspense } from 'react'
import type { Vector3Tuple } from 'three'
import type { Book as BookData } from '@/types'
import Book from '@/scene/books/Book'

// Libros por montón (con más, se empieza otro al lado, hacia el centro de la sala) y separación entre montones (m)
const PER_STACK = 10
const STACK_GAP = 0.34
// Desorden de cada libro: giro sobre la vertical (radianes) y desplazamiento en el suelo (m), de -máximo a +máximo;
// holgura entre libros
const MAX_TWIST = 0.5
const MAX_SHIFT = 0.03
const BOOK_GAP = 0.001

// Número "al azar" entre -1 y 1, siempre el mismo para cada libro y cada uso: hash FNV-1a de su ISBN empezando en salt
// (mezcla bien ISBN casi iguales, como los de una saga, para que no queden alineados)
function jitter(isbn: string, salt: number) {
  let hash = 2166136261 ^ salt
  for (const char of isbn) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return ((hash >>> 0) % 2001) / 1000 - 1
}

/**
 * @param books - Libros de la pila, de abajo arriba
 * @param position - Punto del suelo donde empieza el primer montón; los siguientes van hacia -X (hacia la sala)
 */
function BookPile({ books, position, onSelect }: { books: BookData[]; position: Vector3Tuple; onSelect: (book: BookData) => void }) {
  // Altura de la base de cada libro: lo que suman los de debajo en su montón (tumbado, su grosor es lo que sube)
  const placed = books.map((book, i) => {
    const stack = Math.floor(i / PER_STACK)
    const below = books.slice(stack * PER_STACK, i).reduce((sum, item) => sum + item.width + BOOK_GAP, 0)
    return { book, stack, y: below }
  })
  return (
    <group position={position}>
      {placed.map(({ book, stack, y }) => (
        // Cada libro espera a su portada por su cuenta
        <Suspense key={book.isbn} fallback={null}>
          <group
            position={[-stack * STACK_GAP + jitter(book.isbn, 1) * MAX_SHIFT, y + book.width / 2, jitter(book.isbn, 2) * MAX_SHIFT]}
            rotation={[0, jitter(book.isbn, 3) * MAX_TWIST, 0]}
          >
            {/* Tumbado con la portada (su +X) hacia arriba */}
            <group rotation={[0, 0, Math.PI / 2]}>
              <Book
                book={book}
                position={[0, 0, 0]}
                width={book.width}
                height={book.height}
                depth={book.depth}
                onSelect={onSelect}
                // No se arrastra: no está en ninguna balda (se devuelve desde su ficha)
                onGrab={() => {}}
              />
            </group>
          </group>
        </Suspense>
      ))}
    </group>
  )
}

export default BookPile
