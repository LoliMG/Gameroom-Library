import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Obtención del directorio actual para resolver rutas relativas al proyecto
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Rutas de entrada y salida
const isbnsPath = path.join(projectRoot, 'src', 'data', 'isbns.json')
const coversDir = path.join(projectRoot, 'src', 'assets', 'covers')
const booksMetaPath = path.join(projectRoot, 'src', 'data', 'booksMeta.json')

/**
 * Función auxiliar para leer dimensiones de imágenes JPEG sin dependencias externas
 */
function getJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }
  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (offset + 4 > buffer.length) break
    const length = buffer.readUInt16BE(offset + 2)
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 <= buffer.length) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        return { width, height }
      }
    }
    offset += 2 + length
  }
  return null
}

/**
 * Verifica si el buffer corresponde a una imagen válida (JPEG o PNG) y obtiene sus dimensiones
 */
function getImageDimensions(buffer) {
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
  return getJpegDimensions(buffer)
}

/**
 * Paso 1: Consulta los metadatos del libro en Open Library
 */
async function fetchOpenLibraryData(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const bookData = json[`ISBN:${isbn}`]
    if (!bookData) return null

    return {
      title: bookData.title || null,
      author: bookData.authors && bookData.authors.length > 0 ? bookData.authors[0].name : null,
      pages: bookData.number_of_pages || null,
    }
  } catch {
    return null
  }
}

/**
 * Paso 2: Consulta los metadatos del libro en Google Books como alternativa
 */
async function fetchGoogleBooksData(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    if (!json.items || json.items.length === 0) return null

    const vol = json.items[0].volumeInfo
    if (!vol) return null

    return {
      title: vol.title || null,
      author: vol.authors && vol.authors.length > 0 ? vol.authors.join(', ') : null,
      pages: vol.pageCount || null,
      imageLinks: vol.imageLinks || null,
    }
  } catch {
    return null
  }
}

/**
 * Paso 3: Descarga y valida la portada desde Open Library o Google Books
 */
async function fetchCoverImage(isbn, googleImageLinks) {
  // Intentar primero con Open Library
  const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
  try {
    const res = await fetch(olUrl)
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      const dims = getImageDimensions(buffer)
      if (dims && dims.width >= 300) {
        return { buffer, source: 'Open Library', dims }
      }
    }
  } catch {
    // Si falla, se continúa con Google Books
  }

  // Intentar con Google Books si Open Library falló o no dio imagen válida
  if (googleImageLinks) {
    const candidates = []
    if (googleImageLinks.extraLarge) candidates.push(googleImageLinks.extraLarge)
    if (googleImageLinks.large) candidates.push(googleImageLinks.large)
    if (googleImageLinks.medium) candidates.push(googleImageLinks.medium)
    if (googleImageLinks.small) candidates.push(googleImageLinks.small)
    if (googleImageLinks.thumbnail) {
      candidates.push(googleImageLinks.thumbnail.replace('zoom=1', 'zoom=2'))
      candidates.push(googleImageLinks.thumbnail)
    }

    for (let rawUrl of candidates) {
      let imgUrl = rawUrl.startsWith('http://') ? rawUrl.replace('http://', 'https://') : rawUrl
      try {
        const res = await fetch(imgUrl)
        if (!res.ok) continue
        const buffer = Buffer.from(await res.arrayBuffer())
        const dims = getImageDimensions(buffer)
        if (dims && dims.width >= 300) {
          return { buffer, source: 'Google Books', dims }
        }
      } catch {
        // Continuar con siguiente candidato
      }
    }
  }

  return null
}

async function main() {
  console.log('--- INICIANDO PROCESO DE OBTENCIÓN DE LIBROS POR ISBN ---')

  // Lectura de la fuente de verdad de ISBNs
  if (!fs.existsSync(isbnsPath)) {
    console.error(`Error: No se encontró el archivo ${isbnsPath}`)
    process.exit(1)
  }

  const isbns = JSON.parse(fs.readFileSync(isbnsPath, 'utf8'))
  if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true })
  }

  const booksMeta = []
  const tableData = []
  let allComplete = true

  for (const isbn of isbns) {
    console.log(`\nConsultando ISBN: ${isbn}...`)

    let title = null
    let author = null
    let pages = null
    const sources = {}

    // 1. Consulta Open Library
    const olData = await fetchOpenLibraryData(isbn)
    if (olData) {
      if (olData.title) {
        title = olData.title
        sources.title = 'Open Library'
      }
      if (olData.author) {
        author = olData.author
        sources.author = 'Open Library'
      }
      if (olData.pages) {
        pages = olData.pages
        sources.pages = 'Open Library'
      }
    }

    // 2. Si falta algún dato, completar con Google Books
    let gbData = null
    if (!title || !author || !pages) {
      gbData = await fetchGoogleBooksData(isbn)
      if (gbData) {
        if (!title && gbData.title) {
          title = gbData.title
          sources.title = 'Google Books'
        }
        if (!author && gbData.author) {
          author = gbData.author
          sources.author = 'Google Books'
        }
        if (!pages && gbData.pages) {
          pages = gbData.pages
          sources.pages = 'Google Books'
        }
      }
    }

    // 3. Descarga de la portada (Open Library primero, luego Google Books)
    const coverResult = await fetchCoverImage(isbn, gbData?.imageLinks)
    let coverSize = 'No válida (<300px o 404)'
    if (coverResult) {
      sources.cover = coverResult.source
      coverSize = `${coverResult.dims.width}x${coverResult.dims.height}`

      // 4. Guardar portada con nombre ISBN.jpg
      const coverFilePath = path.join(coversDir, `${isbn}.jpg`)
      fs.writeFileSync(coverFilePath, coverResult.buffer)
    }

    // Comprobar si faltó algún dato
    const isComplete = Boolean(title && author && pages && coverResult)
    if (!isComplete) {
      allComplete = false
    }

    // Construcción del objeto meta para el libro
    booksMeta.push({
      isbn,
      title: title || null,
      author: author || null,
      pages: pages || null,
      source: sources,
      complete: isComplete,
    })

    // Fila para la tabla de reporte final
    const sourceSummary = Object.entries(sources)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') || 'Ninguna'

    tableData.push({
      ISBN: isbn,
      'Título': title || '[FALTA]',
      'Autor': author || '[FALTA]',
      'Páginas': pages || '[FALTA]',
      'Fuente': sourceSummary,
      'Portada': coverSize,
      'Estado': isComplete ? 'Completo' : 'Incompleto',
    })
  }

  // 5. Escribir archivo de metadatos booksMeta.json
  fs.writeFileSync(booksMetaPath, JSON.stringify(booksMeta, null, 2), 'utf8')
  console.log(`\nArchivo generado: src/data/booksMeta.json`)

  // Impresión de la tabla resumen
  console.log('\n--- TABLA DE RESULTADOS ---')
  console.table(tableData)

  if (!allComplete) {
    console.log('\n⚠️ AVISO: Al menos un libro ha quedado incompleto. Activando PARADA DE CONTROL.')
    process.exit(2)
  } else {
    console.log('\n✅ Todos los libros están completos con portada >= 300px.')
  }
}

main()
