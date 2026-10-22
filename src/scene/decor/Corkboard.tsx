// Corcho de la pared: un tablero con marco de madera y, en su frente, un lienzo donde se dibujan el corcho y lo pegado
// (pósits, pegatinas y frases, cada uno en su sitio y con su giro). Al pulsarlo se abre el editor en grande (BoardEditor)
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Vector3Tuple } from 'three'
import type { Book, BoardItem } from '@/types'
import Clickable from '@/scene/shared/Clickable'
import { createRandom } from '@/utils/random'
import { BOARD_ASPECT, ITEM_WIDTH, NOTE_FILL, stickerImage } from '@/utils/board'

// Lienzo (px) y marco (m)
const CANVAS_WIDTH = 1500
const CANVAS_HEIGHT = CANVAS_WIDTH / BOARD_ASPECT
const FRAME = 0.035
const FRAME_DEPTH = 0.03
const FRAME_COLOR = '#4a3220'
// Letra de los pósits (a mano) y de las frases
const NOTE_FONT = '"Segoe Print", "Comic Sans MS", cursive'
const QUOTE_FONT = 'Georgia, "Times New Roman", serif'
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

// Corcho: marrón claro con motas más oscuras y más claras (siempre las mismas: aleatorio con semilla)
function drawCork(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#b98a5a'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  const random = createRandom(17)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(90, 55, 25, 0.35)' : 'rgba(235, 200, 150, 0.35)'
    ctx.fillRect(random() * CANVAS_WIDTH, random() * CANVAS_HEIGHT, 1 + random() * 4, 1 + random() * 4)
  }
}

// Parte un texto en líneas que quepan en width px con la letra que tenga ctx
function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (line && ctx.measureText(next).width > width) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

// Chincheta roja en (x, y)
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#c0392b'
  ctx.beginPath()
  ctx.arc(x, y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.beginPath()
  ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2)
  ctx.fill()
}

// Dibuja una cosa del corcho centrada en el origen (ya trasladada y girada)
function drawItem(ctx: CanvasRenderingContext2D, item: BoardItem, books: Map<string, Book>, images: Map<string, HTMLImageElement>) {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 4
  if (item.kind === 'note') {
    const size = ITEM_WIDTH.note * CANVAS_WIDTH
    ctx.fillStyle = NOTE_FILL[item.color]
    ctx.fillRect(-size / 2, -size / 2, size, size)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#3a2c20'
    ctx.font = `${size * 0.12}px ${NOTE_FONT}`
    ctx.textAlign = 'center'
    wrapText(ctx, item.text, size * 0.84)
      .slice(0, 7)
      .forEach((line, i) => ctx.fillText(line, 0, -size / 2 + size * 0.24 + i * size * 0.13))
    drawPin(ctx, 0, -size / 2 + 12)
  } else if (item.kind === 'sticker') {
    const size = ITEM_WIDTH.sticker * CANVAS_WIDTH
    const image = images.get(item.sticker)
    if (image) {
      const scale = size / Math.max(image.width, image.height)
      ctx.drawImage(image, (-image.width * scale) / 2, (-image.height * scale) / 2, image.width * scale, image.height * scale)
    } else if (!item.sticker.startsWith('img:')) {
      ctx.font = `${size * 0.85}px ${EMOJI_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.sticker, 0, 0)
      ctx.textBaseline = 'alphabetic'
    }
  } else {
    const width = ITEM_WIDTH.quote * CANVAS_WIDTH
    const fontSize = width * 0.065
    ctx.font = `italic ${fontSize}px ${QUOTE_FONT}`
    const lines = wrapText(ctx, `«${item.text}»`, width * 0.86).slice(0, 9)
    const title = item.isbn ? books.get(item.isbn)?.title : undefined
    const height = fontSize * 1.35 * lines.length + fontSize * (title ? 2.6 : 1.6)
    ctx.fillStyle = '#f6eedd'
    ctx.fillRect(-width / 2, -height / 2, width, height)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#2b2118'
    ctx.textAlign = 'center'
    lines.forEach((line, i) => ctx.fillText(line, 0, -height / 2 + fontSize * 1.5 + i * fontSize * 1.35))
    if (title) {
      ctx.font = `${fontSize * 0.75}px ${QUOTE_FONT}`
      ctx.fillStyle = '#7a6550'
      ctx.fillText(`— ${title}`, 0, height / 2 - fontSize * 0.8)
    }
    // Celo arriba
    ctx.fillStyle = 'rgba(255, 255, 240, 0.55)'
    ctx.fillRect(-width * 0.12, -height / 2 - 12, width * 0.24, 26)
  }
}

interface CorkboardProps {
  items: BoardItem[]
  books: Book[]
  /** Centro del corcho en la pared, su giro (mira hacia su +Z local) y su ancho (m) */
  position: Vector3Tuple
  rotationY: number
  width: number
  /** Pulsarlo: abrir el editor */
  onOpen: () => void
}

function Corkboard({ items, books, position, rotationY, width, onOpen }: CorkboardProps) {
  const height = width / BOARD_ASPECT
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }), [])
  const texture = useMemo(() => {
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    map.anisotropy = 4
    return map
  }, [canvas])
  useEffect(() => () => texture.dispose(), [texture])
  // La textura, en una ref: se marca para subirla de nuevo cada vez que se redibuja
  const textureRef = useRef(texture)
  useEffect(() => {
    textureRef.current = texture
  }, [texture])
  const booksByIsbn = useMemo(() => new Map(books.map((book) => [book.isbn, book])), [books])

  // Imágenes de las pegatinas de imagen que se usan (se cargan una vez; al llegar, se vuelve a dibujar)
  const [images, setImages] = useState(new Map<string, HTMLImageElement>())
  useEffect(() => {
    for (const { sticker } of items.filter((item) => item.kind === 'sticker')) {
      const url = stickerImage(sticker)
      if (!url || images.has(sticker)) continue
      const image = new Image()
      image.onload = () => setImages((loaded) => new Map(loaded).set(sticker, image))
      image.src = url
    }
  }, [items, images])

  // Se vuelve a dibujar todo al cambiar lo pegado (pocas cosas: es inmediato)
  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawCork(ctx)
    for (const item of items) {
      ctx.save()
      ctx.translate(item.x * CANVAS_WIDTH, item.y * CANVAS_HEIGHT)
      ctx.rotate((item.rotation * Math.PI) / 180)
      drawItem(ctx, item, booksByIsbn, images)
      ctx.restore()
    }
    textureRef.current.needsUpdate = true
  }, [canvas, texture, items, booksByIsbn, images])

  return (
    <Clickable onClick={onOpen}>
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width + 2 * FRAME, height + 2 * FRAME, FRAME_DEPTH]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial map={texture} roughness={0.95} />
        </mesh>
      </group>
    </Clickable>
  )
}

export default Corkboard
