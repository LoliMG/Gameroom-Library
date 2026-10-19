import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Book, BookPalette } from '@/types'

/** Lo que necesita el lomo: título, autor, editorial y sus colores (un Book de la sala vale, con o sin paleta) */
export type SpineSource = Pick<Book, 'title' | 'author' | 'publisher' | 'spineTitle'> & BookPalette
/** Lo que necesita la contraportada: además, la sinopsis y el ISBN */
export type BackCoverSource = Pick<Book, 'title' | 'author' | 'publisher' | 'synopsis' | 'isbn'> & BookPalette

/**
 * Genera la textura del lomo del libro (Spine) con Canvas 2D
 * Título con tamaño maximizado para lectura clara a distancia, calibrado con la portada oficial:
 * - Autor arriba
 * - Título grande en vertical en el centro (rotado 90º, solo título del libro sin la saga)
 * - Editorial abajo con marco decorativo
 */
export function generateSpineTexture(book: SpineSource): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 1. Fondo: degradado vertical fiel a la portada
  if (book.spineGradient) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    bgGrad.addColorStop(0, book.spineGradient.top)
    bgGrad.addColorStop(0.5, book.spineGradient.mid)
    bgGrad.addColorStop(1, book.spineGradient.bottom)
    ctx.fillStyle = bgGrad
  } else {
    ctx.fillStyle = '#1a1a1a'
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Sombreado cilíndrico realista de volumen 3D
  const isLightSpine = book.spineTitleColor === '#0a0a0a' || book.spineTitleColor === '#080808'
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
  if (isLightSpine) {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.28)')
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)')
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)')
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.05)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.08)')
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)')
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const ribsColor = book.spineRibsColor || '#d4af37'
  const authorColor = book.spineAuthorColor || '#ffffff'
  const titleColor = book.spineTitleColor || '#ffffff'
  const publisherColor = book.spinePublisherColor || '#ffffff'

  // 3. Filetes decorativos / nervios en cabecera y pie
  ctx.strokeStyle = ribsColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(25, 42)
  ctx.lineTo(canvas.width - 25, 42)
  ctx.moveTo(40, 49)
  ctx.lineTo(canvas.width - 40, 49)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(40, canvas.height - 49)
  ctx.lineTo(canvas.width - 40, canvas.height - 49)
  ctx.moveTo(25, canvas.height - 42)
  ctx.lineTo(canvas.width - 25, canvas.height - 42)
  ctx.stroke()

  // 4. Nombre del autor (parte superior del lomo)
  ctx.fillStyle = authorColor
  ctx.font = '600 23px "Times New Roman", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(book.author.toUpperCase(), canvas.width / 2, 88)

  // Separador bajo el autor
  ctx.strokeStyle = ribsColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(55, 115)
  ctx.lineTo(canvas.width - 55, 115)
  ctx.stroke()

  // 5. Título del libro: el del lomo si lo tiene (sin la saga), y si no el título sin lo que va entre paréntesis
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = titleColor

  // Limpieza del título: elimina cualquier texto entre paréntesis como (Empíreo 1)
  const cleanTitle = (book.spineTitle ?? book.title).replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()

  // Cálculo dinámico para hacer el título lo más grande posible dentro del lomo
  const maxTitleLength = 690
  let fontSize = 66
  ctx.font = `900 ${fontSize}px "Times New Roman", Georgia, serif`
  while (ctx.measureText(cleanTitle).width > maxTitleLength && fontSize > 40) {
    fontSize -= 2
    ctx.font = `900 ${fontSize}px "Times New Roman", Georgia, serif`
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (isLightSpine) {
    ctx.shadowColor = 'rgba(255, 255, 255, 0.45)'
    ctx.shadowBlur = 3
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
  }

  ctx.fillText(cleanTitle, 0, 0)
  ctx.restore()

  // 6. Editorial (parte inferior del lomo con marco)
  ctx.save()
  ctx.strokeStyle = ribsColor
  ctx.lineWidth = 1.5
  ctx.strokeRect(35, canvas.height - 110, canvas.width - 70, 48)

  ctx.fillStyle = publisherColor
  ctx.font = 'bold 22px "Times New Roman", Georgia, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((book.publisher || '').toUpperCase(), canvas.width / 2, canvas.height - 86)
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Genera la textura de la contraportada (Back Cover) calibrada con la paleta del libro
 */
export function generateBackCoverTexture(book: BackCoverSource): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  // Se dibuja en coordenadas de 768 × 1152 sobre un lienzo de la mitad: desde la balda se ve igual y la textura ocupa
  // cuatro veces menos memoria gráfica (la sinopsis para leer está en la vista en grande, BookViewer, como texto)
  const W = 768
  const H = 1152
  canvas.width = W / 2
  canvas.height = H / 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(0.5, 0.5)

  // Fondo
  ctx.fillStyle = book.backColor || '#1c1524'
  ctx.fillRect(0, 0, W, H)

  const ribsColor = book.spineRibsColor || '#d4af37'
  const textColor = book.backTextColor || '#f5ecf1'
  const isLight = textColor === '#141414'

  // Marco decorativo
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 2
  ctx.strokeRect(30, 30, W - 60, H - 60)

  // Título (destacado)
  ctx.fillStyle = ribsColor
  ctx.font = 'bold 42px "Times New Roman", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(book.title, W / 2, 95)

  // Autor
  ctx.fillStyle = isLight ? '#2a2a2a' : 'rgba(255, 255, 255, 0.85)'
  ctx.font = 'italic 25px "Times New Roman", Georgia, serif'
  ctx.fillText(book.author, W / 2, 140)

  // Línea divisoria
  ctx.strokeStyle = ribsColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(140, 170)
  ctx.lineTo(W - 140, 170)
  ctx.stroke()

  // Sinopsis
  ctx.fillStyle = textColor
  ctx.font = '22px "Times New Roman", Georgia, serif'
  ctx.textAlign = 'left'
  const maxWidth = W - 160
  const lineHeight = 36
  const x = 80
  let y = 230

  const words = (book.synopsis || '').split(' ')
  let line = ''
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y)
      line = words[n] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)

  // Código de barras al pie
  const barcodeX = W / 2 - 120
  const barcodeY = H - 180
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(barcodeX, barcodeY, 240, 90)

  ctx.fillStyle = '#000000'
  const barPattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 1, 3, 2]
  let currentX = barcodeX + 15
  for (let b = 0; b < barPattern.length; b++) {
    const barWidth = barPattern[b]
    ctx.fillRect(currentX, barcodeY + 10, barWidth * 2, 55)
    currentX += barWidth * 2 + (b % 2 === 0 ? 3 : 5)
    if (currentX > barcodeX + 225) break
  }

  ctx.fillStyle = '#111111'
  ctx.font = '14px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(book.isbn || '978-84-00000-0', W / 2, barcodeY + 80)

  // Editorial al pie
  ctx.fillStyle = ribsColor
  ctx.font = 'bold 22px "Times New Roman", Georgia, serif'
  ctx.fillText((book.publisher || '').toUpperCase(), W / 2, H - 50)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Genera la textura de las hojas / cantos del libro con Canvas 2D
 * Con finas líneas VERTICALES que simulan el corte real de las páginas individuales.
 */
export function generatePagesTexture(): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Fondo papel crema / marfil natural
  ctx.fillStyle = '#f5eee3'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Líneas finas VERTICALES que simulan el filo de cada hoja de papel apilada
  for (let x = 0; x < canvas.width; x += 2.5) {
    const alpha = 0.12 + (Math.sin(x * 13.7) * 0.5 + 0.5) * 0.28
    ctx.fillStyle = `rgba(145, 125, 105, ${alpha})`
    ctx.fillRect(x, 0, 1.2, canvas.height)
  }

  // Sombreado sutil en los extremos
  const edgeGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  edgeGradient.addColorStop(0, 'rgba(80, 60, 40, 0.1)')
  edgeGradient.addColorStop(0.06, 'rgba(0, 0, 0, 0)')
  edgeGradient.addColorStop(0.94, 'rgba(0, 0, 0, 0)')
  edgeGradient.addColorStop(1, 'rgba(80, 60, 40, 0.1)')
  ctx.fillStyle = edgeGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Colores del lomo y de la contraportada sacados de la portada, para los libros sin paleta calibrada a mano.
 * El degradado del lomo sale de la franja izquierda de la portada (la que toca el lomo), por tercios de altura;
 * el adorno, del color más saturado de la portada, y el texto, blanco o negro según lo claro que sea el fondo.
 *
 * @param image - Imagen de la portada ya cargada
 * @returns Campos de color que entienden generateSpineTexture y generateBackCoverTexture
 */
export function paletteFromCover(image: CanvasImageSource): BookPalette {
  // Portada reducida: drawImage promedia los píxeles y basta con pocos para sacar colores
  const width = 24
  const height = 36
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // Lienzo nuevo: getContext('2d') no puede devolver null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  // Color medio de la cuarta parte izquierda de la portada entre dos filas
  const stripAverage = (fromRow: number, toRow: number) => {
    const sum = [0, 0, 0]
    let count = 0
    for (let y = fromRow; y < toRow; y++) {
      for (let x = 0; x < width / 4; x++) {
        const i = (y * width + x) * 4
        sum[0] += data[i]
        sum[1] += data[i + 1]
        sum[2] += data[i + 2]
        count++
      }
    }
    return sum.map((value) => value / count)
  }

  // Adorno: el píxel con más diferencia entre su canal mayor y menor (el más saturado)
  let accent = [212, 175, 55]
  let bestSaturation = 0
  for (let i = 0; i < data.length; i += 4) {
    const saturation = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
    if (saturation > bestSaturation) {
      bestSaturation = saturation
      accent = [data[i], data[i + 1], data[i + 2]]
    }
  }

  const toCss = ([r, g, b]: number[]) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  const top = stripAverage(0, height / 3)
  const mid = stripAverage(height / 3, (2 * height) / 3)
  const bottom = stripAverage((2 * height) / 3, height)
  // Luminancia aproximada del centro del lomo: fondo claro → texto negro (el valor que reconoce generateSpineTexture)
  const lightBackground = 0.2126 * mid[0] + 0.7152 * mid[1] + 0.0722 * mid[2] > 150
  const textColor = lightBackground ? '#0a0a0a' : '#ffffff'

  return {
    spineGradient: { top: toCss(top), mid: toCss(mid), bottom: toCss(bottom) },
    spineTitleColor: textColor,
    spineAuthorColor: textColor,
    spinePublisherColor: textColor,
    spineRibsColor: toCss(accent),
    backColor: toCss(mid),
    backTextColor: textColor,
  }
}
