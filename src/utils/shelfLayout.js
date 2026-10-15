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
 * @returns {{ placedBooks: Array<Object>, remainingBooks: Array<Object>, usedCount: number }}
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
  let totalUsed = 0

  for (let i = 0; i < moduleCount; i++) {
    const { usedCount } = layoutBooksOnShelves(remaining, {
      innerWidth: moduleInnerWidth,
      shelfCount,
      bookGap,
    })
    totalUsed += usedCount
    remaining = remaining.slice(usedCount)
  }

  return {
    placedBooks: books.slice(0, totalUsed),
    remainingBooks: books.slice(totalUsed),
    usedCount: totalUsed,
  }
}

export default layoutBooksOnShelves
