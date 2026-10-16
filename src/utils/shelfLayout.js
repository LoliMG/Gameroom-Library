/**
 * Función pura que distribuye libros en las baldas de una estantería.
 * Llena cada balda de izquierda a derecha, empezando por la balda inferior (shelfIndex = 0),
 * y pasa a la siguiente balda superior cuando el siguiente libro no cabe en el ancho útil restante.
 *
 * @param {Array<Object>} books - Array de libros a colocar
 * @param {Object} config - Configuración geométrica de la estantería:
 *   - innerWidth (o usableWidth): ancho útil disponible en cada balda en metros
 *   - shelfCount (o shelvesCount): número total de baldas disponibles
 *   - bookGap (o gap): separación horizontal entre libros contiguos en metros
 * @returns {{ placed: Array<{ book: Object, shelfIndex: number, x: number }>, usedCount: number }}
 */
export function layoutBooksOnShelves(books = [], config = {}) {
  // Ancho libre disponible dentro de la estantería entre los paneles laterales
  const innerWidth = config.innerWidth ?? config.usableWidth ?? 1.12
  // Número de baldas donde se pueden apoyar libros
  const shelfCount = config.shelfCount ?? config.shelvesCount ?? 6
  // Espacio de separación entre libros adyacentes
  const bookGap = config.bookGap ?? config.gap ?? 0.015

  const placed = []
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
      const centerX = currentLeft + bookWidth / 2

      placed.push({
        book,
        shelfIndex: currentShelfIndex,
        x: centerX,
      })

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
          const centerX = currentLeft + bookWidth / 2

          placed.push({
            book,
            shelfIndex: currentShelfIndex,
            x: centerX,
          })

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
 * Calcula la colocación y reparto de libros para una pared completa de estanterías.
 *
 * @param {Array<Object>} books - Libros disponibles para colocar
 * @param {number} wallLength - Longitud total de la pared a cubrir en metros
 * @param {Object} [options] - Parámetros de geometría de los módulos
 * @returns {{ placements: Array<{ book: Object, module: number, shelf: number, x: number }>, remainingBooks: Array<Object> }}
 *   placements: módulo, balda y centro X de cada libro colocado; remainingBooks: los que no caben en esta pared
 */
export function getWallPlacement(books = [], wallLength = 4.0, options = {}) {
  const baseShelfWidth = options.baseShelfWidth ?? 1.2
  const shelfCount = options.shelfCount ?? 8
  const boardThickness = options.boardThickness ?? 0.04
  const bookGap = options.bookGap ?? 0.015

  const moduleCount = Math.max(1, Math.round(wallLength / baseShelfWidth))
  const moduleWidth = wallLength / moduleCount
  const moduleInnerWidth = moduleWidth - 2 * boardThickness

  let remaining = [...books]
  const placements = []

  for (let i = 0; i < moduleCount; i++) {
    const { placed, usedCount } = layoutBooksOnShelves(remaining, {
      innerWidth: moduleInnerWidth,
      shelfCount,
      bookGap,
    })
    placed.forEach(({ book, shelfIndex, x }) => placements.push({ book, module: i, shelf: shelfIndex, x }))
    remaining = remaining.slice(usedCount)
  }

  return {
    placements,
    remainingBooks: remaining,
  }
}

export default layoutBooksOnShelves

/**
 * Centro X más cercano a `x` donde cabe un libro de ancho `width` en una balda sin pisar a los demás.
 * Así se puede soltar un libro en cualquier punto: si cae encima de otro, se arrima al hueco libre más próximo.
 *
 * @param {Array<{ x: number, width: number }>} others - Libros que ya están en esa balda (centro y hueco que ocupan)
 * @param {number} width - Hueco que ocupa el libro que se coloca (su grosor, o su fondo si está de frente)
 * @param {number} x - Centro donde se ha soltado (coordenadas de la estantería, 0 = centro)
 * @param {number} innerWidth - Ancho útil de la balda
 * @param {number} [gap] - Separación mínima con los libros vecinos
 * @returns {number|null} Centro donde queda el libro, o null si no cabe en ningún hueco de la balda
 */
export function fitOnShelf(others, width, x, innerWidth, gap = 0) {
  const half = width / 2
  // Tramos ocupados (con su separación), de izquierda a derecha; el último marca el panel derecho
  const occupied = others
    .map((other) => [other.x - other.width / 2 - gap, other.x + other.width / 2 + gap])
    .sort((a, b) => a[0] - b[0])
  occupied.push([innerWidth / 2, innerWidth / 2])

  let best = null
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
 * @param {Array<{ x: number, width: number }>} items - Centro y hueco de cada libro de la balda
 * @param {number} innerWidth - Ancho útil de la balda
 * @param {number} [gap] - Separación mínima entre libros
 * @returns {number[]} Centro de cada libro, en el mismo orden que items
 */
export function separateOnShelf(items, innerWidth, gap = 0) {
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
