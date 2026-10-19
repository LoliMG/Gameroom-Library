// Colocación de libros en las estanterías: funciones puras (sin React ni three.js), por eso las prueba
// scripts/checkShelfFit.ts directamente con Node. Las usa la sala (src/scene/core/Experience.tsx).
// Tipos compartidos: sitio de un libro, libro colocado y tramo de estanterías (src/types.ts)
import type { Placement, ShelfWall, Slot } from '@/types'

/** Lo mínimo que necesitan estas funciones de un libro: su ISBN, su hueco a lo largo de la balda y su título */
interface ShelfBook {
  isbn: string
  width: number
  title?: string
}

/** Un libro (o un hueco) en una balda: centro X y ancho que ocupa */
interface ShelfItem {
  x: number
  width: number
}

/**
 * Distribuye libros en las baldas de un módulo de estantería. Llena cada balda de izquierda a derecha, empezando por
 * la de abajo (shelfIndex = 0), y pasa a la siguiente cuando el siguiente libro no cabe en el ancho útil restante.
 *
 * @param books - Libros a colocar, en orden
 * @param config - innerWidth: ancho útil de cada balda (m); shelfCount: número de baldas; bookGap: separación (m)
 * @returns placed: balda y centro X de cada libro colocado; usedCount: cuántos han cabido
 */
export function layoutBooksOnShelves<B extends { width: number }>(
  books: B[] = [],
  { innerWidth = 1.12, shelfCount = 6, bookGap = 0.015 }: { innerWidth?: number; shelfCount?: number; bookGap?: number } = {}
): { placed: { book: B; shelfIndex: number; x: number }[]; usedCount: number } {
  const placed: { book: B; shelfIndex: number; x: number }[] = []
  let usedCount = 0

  // Índice de la balda actual (0 = balda inferior)
  let currentShelfIndex = 0
  // Coordenada X del borde izquierdo disponible para colocar el siguiente libro
  let currentLeft = -innerWidth / 2

  // Recorremos los libros en el orden recibido
  for (let i = 0; i < books.length; i++) {
    // Si ya hemos llenado todas las baldas disponibles, no caben más libros
    if (currentShelfIndex >= shelfCount) {
      break
    }

    const book = books[i]
    const bookWidth = book.width || 0.04

    // Comprobamos si el libro cabe en el espacio restante de la balda actual
    if (currentLeft + bookWidth <= innerWidth / 2) {
      // Posición X centrada del libro para Three.js
      placed.push({ book, shelfIndex: currentShelfIndex, x: currentLeft + bookWidth / 2 })
      usedCount++
      // Desplazamos el punto de inicio para el siguiente libro incluyendo el hueco entre ellos
      currentLeft += bookWidth + bookGap
    } else {
      // El libro no cabe en la balda actual: pasamos a la siguiente balda superior
      currentShelfIndex++

      // Si la nueva balda existe, reiniciamos la posición X al extremo izquierdo
      if (currentShelfIndex < shelfCount) {
        currentLeft = -innerWidth / 2

        if (currentLeft + bookWidth <= innerWidth / 2) {
          placed.push({ book, shelfIndex: currentShelfIndex, x: currentLeft + bookWidth / 2 })
          usedCount++
          currentLeft += bookWidth + bookGap
        } else {
          // El libro es individualmente más ancho que toda la balda disponible
          break
        }
      }
    }
  }

  return { placed, usedCount }
}

/**
 * Reparto de libros en una pared completa de estanterías (varios módulos seguidos).
 *
 * @param books - Libros disponibles para colocar
 * @param wallLength - Longitud total de la pared a cubrir en metros
 * @param options - Medidas de los módulos (por defecto, las de src/scene/shelves/Bookshelf.tsx)
 * @returns placements: módulo, balda y centro X de cada libro colocado; remainingBooks: los que no caben en esta pared
 */
export function getWallPlacement<B extends { width: number }>(
  books: B[] = [],
  wallLength = 4.0,
  {
    baseShelfWidth = 1.2,
    shelfCount = 8,
    boardThickness = 0.04,
    bookGap = 0.015,
  }: { baseShelfWidth?: number; shelfCount?: number; boardThickness?: number; bookGap?: number } = {}
): { placements: { book: B; module: number; shelf: number; x: number }[]; remainingBooks: B[] } {
  const moduleCount = Math.max(1, Math.round(wallLength / baseShelfWidth))
  const moduleWidth = wallLength / moduleCount
  const moduleInnerWidth = moduleWidth - 2 * boardThickness

  let remaining = [...books]
  const placements: { book: B; module: number; shelf: number; x: number }[] = []

  for (let i = 0; i < moduleCount; i++) {
    const { placed, usedCount } = layoutBooksOnShelves(remaining, { innerWidth: moduleInnerWidth, shelfCount, bookGap })
    placed.forEach(({ book, shelfIndex, x }) => placements.push({ book, module: i, shelf: shelfIndex, x }))
    remaining = remaining.slice(usedCount)
  }

  return { placements, remainingBooks: remaining }
}

/**
 * Centro X más cercano a `x` donde cabe un libro de ancho `width` en una balda sin pisar a los demás.
 * Así se puede soltar un libro en cualquier punto: si cae encima de otro, se arrima al hueco libre más próximo.
 *
 * @param others - Libros que ya están en esa balda (centro y hueco que ocupan)
 * @param width - Hueco que ocupa el libro que se coloca (su grosor, o su fondo si está de frente)
 * @param x - Centro donde se ha soltado (coordenadas de la estantería, 0 = centro)
 * @param innerWidth - Ancho útil de la balda
 * @param gap - Separación mínima con los libros vecinos
 * @returns Centro donde queda el libro, o null si no cabe en ningún hueco de la balda
 */
export function fitOnShelf(others: ShelfItem[], width: number, x: number, innerWidth: number, gap = 0): number | null {
  const half = width / 2
  // Tramos ocupados (con su separación), de izquierda a derecha; el último marca el panel derecho
  const occupied = others
    .map((other): [number, number] => [other.x - other.width / 2 - gap, other.x + other.width / 2 + gap])
    .sort((a, b) => a[0] - b[0])
  occupied.push([innerWidth / 2, innerWidth / 2])

  let best: number | null = null
  let freeStart = -innerWidth / 2
  for (const [start, end] of occupied) {
    // Hueco libre [freeStart, start]: si el libro cabe, el centro más próximo a x dentro del hueco
    if (start - freeStart >= width) {
      const candidate = Math.min(Math.max(x, freeStart + half), start - half)
      if (best === null || Math.abs(candidate - x) < Math.abs(best - x)) best = candidate
    }
    freeStart = Math.max(freeStart, end)
  }
  return best
}

/**
 * Separa los libros de una balda que se pisan (por ejemplo al voltear uno, que pasa a ocupar su fondo en vez de su
 * grosor): de izquierda a derecha cada libro se aparta lo justo del anterior y, si el último se sale por la derecha,
 * se recorre al revés empujándolos hacia la izquierda. Los que no se pisan no se mueven.
 *
 * @param items - Centro y hueco de cada libro de la balda
 * @param innerWidth - Ancho útil de la balda
 * @param gap - Separación mínima entre libros
 * @returns Centro de cada libro, en el mismo orden que items
 */
export function separateOnShelf(items: ShelfItem[], innerWidth: number, gap = 0): number[] {
  const xs = items.map((item) => item.x)
  const order = items.map((_, i) => i).sort((a, b) => xs[a] - xs[b])
  // Hacia la derecha: cada borde izquierdo, como mínimo tras el anterior (el primero, tras el panel izquierdo)
  let edge = -innerWidth / 2 - gap
  for (const i of order) {
    xs[i] = Math.max(xs[i], edge + gap + items[i].width / 2)
    edge = xs[i] + items[i].width / 2
  }
  // Hacia la izquierda: ninguno pasa del panel derecho ni pisa al siguiente
  edge = innerWidth / 2 + gap
  for (const i of [...order].reverse()) {
    xs[i] = Math.min(xs[i], edge - gap - items[i].width / 2)
    edge = xs[i] - items[i].width / 2
  }
  return xs
}

/**
 * Coloca juntos varios libros (una selección que se arrastra) en una balda: van seguidos en su orden, con el libro
 * agarrado bajo el puntero, y el bloque entero se arrima al hueco libre más próximo como haría un solo libro.
 *
 * @param others - Libros de la balda que no se mueven
 * @param widths - Hueco de cada libro del bloque, en orden de izquierda a derecha
 * @param grabbedIndex - Posición en el bloque del libro agarrado
 * @param x - Centro donde debería quedar el libro agarrado
 * @param innerWidth - Ancho útil de la balda
 * @param gap - Separación entre libros
 * @returns Centro de cada libro del bloque, o null si el bloque no cabe en la balda
 */
export function fitGroupOnShelf(
  others: ShelfItem[],
  widths: number[],
  grabbedIndex: number,
  x: number,
  innerWidth: number,
  gap = 0
): number[] | null {
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
  // Del borde izquierdo del bloque al centro del libro agarrado
  const lead = widths.slice(0, grabbedIndex).reduce((sum, width) => sum + width + gap, 0) + widths[grabbedIndex] / 2
  const center = fitOnShelf(others, total, x - lead + total / 2, innerWidth, gap)
  if (center === null) return null
  let cursor = center - total / 2
  return widths.map((width) => {
    const xi = cursor + width / 2
    cursor += width + gap
    return xi
  })
}

/**
 * ¿El sitio guardado existe en las estanterías actuales? (puede ser de antes de cambiar las estanterías)
 *
 * @param walls - Tramos de estanterías
 * @param slot - Sitio guardado de un libro (puede faltar o venir con datos viejos de la base de datos)
 */
export function isValidSlot(walls: ShelfWall[], slot: Slot | undefined): slot is Slot {
  const wall = walls.find((w) => w.key === slot?.wall)
  if (!wall || !slot) return false
  return (
    Number.isInteger(slot.module) && slot.module >= 0 && slot.module < wall.moduleCount &&
    Number.isInteger(slot.shelf) && slot.shelf >= 0 && slot.shelf < wall.shelfCount &&
    Number.isFinite(slot.x) && Math.abs(slot.x) <= wall.innerWidth / 2
  )
}

/**
 * Primer hueco libre para un libro de ancho width: tramo a tramo, módulo a módulo y de la balda de abajo hacia
 * arriba, lo más a la izquierda posible. null si no cabe en ninguna balda.
 *
 * @param walls - Tramos de estanterías
 * @param placed - Libros ya colocados
 * @param width - Hueco que ocupa el libro
 * @param gap - Separación con los vecinos
 */
export function firstFreeSlot(walls: ShelfWall[], placed: Placement<ShelfBook>[], width: number, gap = 0): Slot | null {
  for (const wall of walls) {
    for (let module = 0; module < wall.moduleCount; module++) {
      for (let shelf = 0; shelf < wall.shelfCount; shelf++) {
        const others = placed.filter((p) => p.wall === wall.key && p.module === module && p.shelf === shelf)
        const x = fitOnShelf(others.map((p) => ({ x: p.x, width: p.book.width })), width, -wall.innerWidth / 2, wall.innerWidth, gap)
        if (x !== null) return { wall: wall.key, module, shelf, x }
      }
    }
  }
  return null
}

/**
 * Pone encima del reparto inicial los sitios guardados ({ isbn: sitio }). Si hay sitios guardados, los libros sin
 * sitio (recién añadidos) van al primer hueco libre en vez de a su sitio del reparto inicial, que puede estar ocupado
 * por libros movidos; si no hay ninguno guardado, se usa el reparto inicial tal cual.
 *
 * @param initial - Reparto inicial de todos los libros
 * @param saved - Sitios guardados por ISBN (de la base de datos)
 * @param walls - Tramos de estanterías
 * @param gap - Separación entre libros
 */
export function placeSavedBooks<B extends ShelfBook>(
  initial: Placement<B>[],
  saved: Record<string, Slot>,
  walls: ShelfWall[],
  gap = 0
): Placement<B>[] {
  const isSaved = (p: Placement<B>) => isValidSlot(walls, saved[p.book.isbn])
  if (!initial.some(isSaved)) return initial
  const placed: Placement<B>[] = initial.filter(isSaved).map((p) => ({ ...p, ...saved[p.book.isbn] }))
  return initial.map((p) => {
    if (isSaved(p)) {
      const { wall, module, shelf, x } = saved[p.book.isbn]
      return { ...p, wall, module, shelf, x }
    }
    // Si no hay hueco en ninguna balda se queda en su sitio del reparto inicial
    const free = firstFreeSlot(walls, placed, p.book.width, gap) ?? p
    const placement = { ...p, wall: free.wall, module: free.module, shelf: free.shelf, x: free.x }
    placed.push(placement)
    return placement
  })
}

/**
 * Añade al primer hueco libre los libros de la lista que aún no están en las estanterías (los recién añadidos desde la
 * consola). Si no falta ninguno devuelve la misma lista, así quien la usa como estado de React no vuelve a pintar.
 *
 * @param placements - Libros ya colocados
 * @param books - Todos los libros de la colección
 * @param walls - Tramos de estanterías
 * @param gap - Separación entre libros
 */
export function placeNewBooks<B extends ShelfBook>(placements: Placement<B>[], books: B[], walls: ShelfWall[], gap = 0): Placement<B>[] {
  const placedIsbns = new Set(placements.map((p) => p.book.isbn))
  const added = books.filter((book) => !placedIsbns.has(book.isbn))
  if (added.length === 0) return placements
  const next = [...placements]
  for (const book of added) {
    const free = firstFreeSlot(walls, next, book.width, gap)
    if (free) next.push({ book, ...free })
    else console.warn(`[shelfLayout] No queda hueco en las estanterías para «${book.title}»`)
  }
  return next
}
