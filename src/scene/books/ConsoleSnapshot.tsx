// Imagen de la consola en la propia pantalla 3D, detrás de su HTML: la pantalla de verdad es HTML encima del lienzo y no
// sale en las fotos del rincón (que copian el lienzo), así que en ellas se ve esta imagen: la portada de inicio de la
// consola (título, buscador, filtros y las primeras portadas con sus títulos). Sin fotos, el HTML la tapa entera.
// shortcut: no refleja lo que se tenga abierto (búsqueda, diario, desplazamiento); si hiciera falta, copiar el HTML a
// imagen al hacer la foto (librería tipo html-to-image)
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Book } from '@/types'

// Medidas de la página de la consola (px, las de .dashboard) y de su cuadrícula de portadas (5 columnas)
const PAGE_WIDTH = 800
const PAGE_HEIGHT = 1250
const PADDING = 28
const COLUMNS = 5
const GAP = 16
const CARD_WIDTH = (PAGE_WIDTH - 2 * PADDING - (COLUMNS - 1) * GAP) / COLUMNS
const COVER_HEIGHT = CARD_WIDTH * 1.5
const ROW_HEIGHT = COVER_HEIGHT + 64
const GRID_TOP = 260
const VISIBLE_BOOKS = COLUMNS * Math.ceil((PAGE_HEIGHT - GRID_TOP) / ROW_HEIGHT)
// Colores de la consola (los de bookDashboard.css)
const BG = '#14110f'
const SURFACE = '#1f1a16'
const BORDER = 'rgba(226, 192, 112, 0.18)'
const ACCENT = '#e2c070'
const TEXT = '#f3ece0'
const MUTED = '#a99d8c'
const FONT = 'Georgia, "Times New Roman", serif'

// Rectángulo con las esquinas redondeadas, relleno y con borde opcional
function box(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function draw(ctx: CanvasRenderingContext2D, books: Book[], covers: Map<string, HTMLImageElement>) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  // Primera línea: título y botones
  ctx.fillStyle = ACCENT
  ctx.font = `bold 30px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('Mi biblioteca', PADDING, 53)
  box(ctx, 360, 30, 150, 46, 10, SURFACE, BORDER)
  box(ctx, 520, 30, 120, 46, 10, ACCENT)
  for (let i = 0; i < 3; i++) box(ctx, 650 + i * 40, 30, 34, 46, 10, SURFACE, BORDER)
  // Buscador y filtros
  box(ctx, PADDING, 94, PAGE_WIDTH - 2 * PADDING, 52, 10, SURFACE, BORDER)
  ctx.fillStyle = MUTED
  ctx.font = `20px ${FONT}`
  ctx.fillText('Buscar por título, autor, editorial o saga…', PADDING + 18, 120)
  box(ctx, PADDING, 162, 607, 40, 20, SURFACE, BORDER)
  box(ctx, PADDING + 3, 165, 130, 34, 17, ACCENT)
  box(ctx, PADDING + 615, 162, 81, 40, 20, SURFACE, BORDER)
  // Portadas con su título debajo
  ctx.font = `14px ${FONT}`
  ctx.textBaseline = 'top'
  books.slice(0, VISIBLE_BOOKS).forEach((book, i) => {
    const x = PADDING + (i % COLUMNS) * (CARD_WIDTH + GAP)
    const y = GRID_TOP + Math.floor(i / COLUMNS) * ROW_HEIGHT
    const cover = covers.get(book.isbn)
    if (cover) ctx.drawImage(cover, x, y, CARD_WIDTH, COVER_HEIGHT)
    else box(ctx, x, y, CARD_WIDTH, COVER_HEIGHT, 4, SURFACE)
    ctx.fillStyle = TEXT
    ctx.fillText(book.title.length > 22 ? `${book.title.slice(0, 21)}…` : book.title, x, y + COVER_HEIGHT + 8, CARD_WIDTH)
  })
}

/**
 * @param books - Libros de la colección, en el orden de la consola
 * @param width - Ancho de la pantalla (m); el alto sale de la proporción de la página
 * @param z - Distancia al centro del marco (justo por detrás de donde va el HTML)
 */
function ConsoleSnapshot({ books, width, z }: { books: Book[]; width: number; z: number }) {
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: PAGE_WIDTH, height: PAGE_HEIGHT }), [])
  const texture = useMemo(() => {
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [canvas])
  useEffect(() => () => texture.dispose(), [texture])
  // La textura, en una ref: se marca para subirla de nuevo cada vez que se redibuja
  const textureRef = useRef(texture)
  useEffect(() => {
    textureRef.current = texture
  }, [texture])

  // Portadas de los libros que caben (se cargan una vez; al llegar cada una, se vuelve a dibujar)
  const [covers, setCovers] = useState(new Map<string, HTMLImageElement>())
  useEffect(() => {
    for (const book of books.slice(0, VISIBLE_BOOKS)) {
      if (covers.has(book.isbn)) continue
      const image = new Image()
      image.onload = () => setCovers((loaded) => new Map(loaded).set(book.isbn, image))
      image.src = book.cover
    }
  }, [books, covers])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    draw(ctx, books, covers)
    textureRef.current.needsUpdate = true
  }, [canvas, books, covers])

  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[width, (width * PAGE_HEIGHT) / PAGE_WIDTH]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export default ConsoleSnapshot
