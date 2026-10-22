import { useEffect, useMemo } from 'react'
// Tipo de los eventos de puntero de React Three Fiber (llevan además el punto 3D tocado, el objeto, etc.)
import type { ThreeEvent } from '@react-three/fiber'
import type { Book as BookData } from '@/types'
// Hook useTexture de drei para la carga reactiva de la textura de portada; Sparkles para el humillo del libro localizado
import { Sparkles, useTexture } from '@react-three/drei'
// Espacio de color de la portada, caja del libro y su material
import { BoxGeometry, BufferAttribute, MeshStandardMaterial, SRGBColorSpace } from 'three'
// Importación de los generadores de texturas de lomo, contraportada y cantos de hojas
import {
  generateSpineTexture,
  generateBackCoverTexture,
  generatePagesTexture,
  paletteFromCover,
} from '@/scene/books/bookTextureGenerator'

// Libro seleccionado (selección múltiple): portada, contraportada y lomo brillan en dorado (se nota igual en libros
// claros y oscuros; un tinte translúcido por encima apenas se veía en los claros) y, desde Bookshelf, sale un poco de la balda
const SELECTED_GLOW = '#ffb52e'
const SELECTED_GLOW_INTENSITY = 0.35
// Libro localizado desde la consola: brillo azul intenso (el Bloom de Effects le da halo) y chispas que flotan alrededor
const LOCATED_GLOW = '#3d9bff'
const LOCATED_GLOW_INTENSITY = 1.1
const LOCATED_SPARKLES = { count: 45, size: 5, speed: 0.6, opacity: 1, noise: 1.5, color: '#8fd3ff' }
// Cuánto más grande que el libro es la nube de chispas (metros por cada lado) y cuánto sube por encima
const LOCATED_SPARKLES_MARGIN = 0.05
const LOCATED_SPARKLES_RISE = 0.06

// Cinta de marcapáginas de los libros empezados: asoma por arriba y cuelga por el lomo, más larga cuanto más se lleva
// (en fracción del alto del libro), estrecha y pegada al borde de la portada para no tapar el título
const RIBBON_MIN_LENGTH = 0.1
const RIBBON_MAX_LENGTH = 0.6
const RIBBON_WIDTH = 0.007
const RIBBON_THICKNESS = 0.0012
const RIBBON_TOP_LENGTH = 0.02 // Lo que se ve sobre el canto de arriba, desde el lomo hacia dentro
const ribbonMaterial = new MeshStandardMaterial({ color: '#9e1b2c', roughness: 0.55 })

// Cantos de las hojas (arriba, abajo y detrás): la misma textura y el mismo material para todos los libros
let pagesMaterial: MeshStandardMaterial | null = null
const getPagesMaterial = () => (pagesMaterial ??= new MeshStandardMaterial({ map: generatePagesTexture() }))

// Caras de BoxGeometry, en su orden: +X portada, -X contraportada, +Y canto de arriba, -Y canto de abajo, +Z lomo,
// -Z canto de detrás. Se reordenan para que los tres cantos vayan seguidos y se pinten de una vez: así cada libro son 4
// pasadas a la tarjeta gráfica (portada, contraportada, lomo y cantos) en vez de 6
const FACE_ORDER = [0, 1, 4, 2, 3, 5]
const INDICES_PER_FACE = 6 // Dos triángulos por cara

function bookGeometry(width: number, height: number, depth: number) {
  const geometry = new BoxGeometry(width, height, depth)
  // BoxGeometry siempre tiene índice. slice() da una copia del mismo tipo (Uint16Array…) que se rellena reordenada
  const source = geometry.index!.array
  const reordered = source.slice()
  FACE_ORDER.forEach((face, i) => reordered.set(source.subarray(face * INDICES_PER_FACE, (face + 1) * INDICES_PER_FACE), i * INDICES_PER_FACE))
  geometry.setIndex(new BufferAttribute(reordered, 1))
  geometry.clearGroups()
  geometry.addGroup(0, INDICES_PER_FACE, 0) // Portada
  geometry.addGroup(INDICES_PER_FACE, INDICES_PER_FACE, 1) // Contraportada
  geometry.addGroup(2 * INDICES_PER_FACE, INDICES_PER_FACE, 2) // Lomo
  geometry.addGroup(3 * INDICES_PER_FACE, 3 * INDICES_PER_FACE, 3) // Los tres cantos
  return geometry
}

interface BookProps {
  /** Centro del libro en la balda [x, y, z] */
  position: [number, number, number]
  /** Giro sobre Y: 0 de canto (lomo a la vista), -90° de frente (portada a la vista) */
  rotationY?: number
  width: number
  height: number
  depth: number
  /** Clic en el libro (con el evento: Ctrl lo suma a la selección) */
  onSelect: (book: BookData, event: ThreeEvent<MouseEvent>) => void
  /** Botón pulsado sobre el libro: offsetX es el punto agarrado respecto a su centro, a lo largo de la balda */
  onGrab: (book: BookData, offsetX: number, event: ThreeEvent<PointerEvent>) => void
  book: BookData
  selected?: boolean
  /** Localizado desde la consola: brilla en azul con chispas hasta que se pulsa */
  located?: boolean
  /** Cuánto se lleva leído (0 a 1): con un valor entre los dos, asoma la cinta de marcapáginas */
  progress?: number
}

// En este archivo, "Book" es el componente; el tipo del libro se importa como BookData
function Book({ position, rotationY = 0, width, height, depth, onSelect, onGrab, book, selected = false, located = false, progress }: BookProps) {
  // Carga reactiva de la textura de la portada con useTexture y espacio de color sRGB
  const coverTexture = useTexture(book.cover, (loadedTexture) => {
    loadedTexture.colorSpace = SRGBColorSpace
  })

  // Libros sin paleta calibrada a mano: los colores del lomo y la contraportada salen de su portada
  const styledBook = useMemo(
    // (la imagen de una textura cargada con useTexture es un <img>)
    () => (book.spineGradient ? book : { ...book, ...paletteFromCover(coverTexture.image as HTMLImageElement) }),
    [book, coverTexture]
  )

  // Generación procedimental en Canvas 2D del lomo (con autor, título grande y editorial)
  const spineTexture = useMemo(() => generateSpineTexture(styledBook), [styledBook])

  // Generación procedimental en Canvas 2D de la contraportada (con sinopsis y código de barras)
  const backTexture = useMemo(() => generateBackCoverTexture(styledBook), [styledBook])

  // Caja con los cantos agrupados y sus 4 materiales (el de los cantos es compartido y no se libera)
  const geometry = useMemo(() => bookGeometry(width, height, depth), [width, height, depth])
  const materials = useMemo(
    () => [
      new MeshStandardMaterial({ map: coverTexture }),
      new MeshStandardMaterial({ map: backTexture }),
      new MeshStandardMaterial({ map: spineTexture }),
      getPagesMaterial(),
    ],
    [coverTexture, backTexture, spineTexture]
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => materials.slice(0, 3).forEach((material) => material.dispose()), [materials])
  // Brillo de libro seleccionado en sus materiales propios (el de los cantos es compartido y no se toca)
  useEffect(() => {
    materials.slice(0, 3).forEach((material) => {
      material.emissive.set(located ? LOCATED_GLOW : selected ? SELECTED_GLOW : '#000000')
      material.emissiveIntensity = located ? LOCATED_GLOW_INTENSITY : selected ? SELECTED_GLOW_INTENSITY : 1
    })
  }, [materials, selected, located])

  // Cinta de marcapáginas: solo en libros empezados y sin acabar
  const ribbonLength = progress !== undefined && progress > 0 && progress < 1 ? height * (RIBBON_MIN_LENGTH + progress * (RIBBON_MAX_LENGTH - RIBBON_MIN_LENGTH)) : 0
  const ribbonX = width / 2 - RIBBON_WIDTH / 2 - 0.002

  // Manejador del evento de clic sobre el libro
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // event.stopPropagation() detiene la propagación del raycasting de React Three Fiber;
    // evita que el clic atraviese hacia otros objetos 3D que se encuentren detrás
    event.stopPropagation()

    // Notificación al componente padre con el libro pulsado (y el evento: con Ctrl se suma a la selección)
    if (onSelect) {
      onSelect(book, event)
    }
  }

  return (
    // Malla 3D del libro de canto. No proyecta sombra: dentro de las baldas no se nota (ya las dan los laterales y las
    // tablas) y dibujar las sombras de todos los libros era más de la mitad del trabajo de cada fotograma
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      geometry={geometry}
      material={materials}
      // La selección con recuadro (SelectionBox) busca los libros de la escena por este id
      userData={{ bookId: book.id }}
      onClick={handleClick}
      // Arrastre: se agarra con el botón izquierdo; lo suelta la zona de la balda que hay detrás (Bookshelf)
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.stopPropagation()
        // Punto agarrado respecto al centro del libro, a lo largo de la balda (contando el giro si está volteado):
        // así no salta a centrarse en el puntero
        const local = event.object.worldToLocal(event.point.clone())
        onGrab(book, local.x * Math.cos(rotationY) + local.z * Math.sin(rotationY), event)
      }}
      // receiveShadow: la superficie del libro recibe las sombras de las baldas y del resto de la sala
      receiveShadow
    >
      {/* Cinta de marcapáginas: sobre el canto de arriba y colgando por el lomo (+Z) */}
      {ribbonLength > 0 && (
        <>
          <mesh position={[ribbonX, height / 2 - ribbonLength / 2 + RIBBON_THICKNESS, depth / 2 + RIBBON_THICKNESS / 2]} material={ribbonMaterial}>
            <boxGeometry args={[RIBBON_WIDTH, ribbonLength, RIBBON_THICKNESS]} />
          </mesh>
          <mesh position={[ribbonX, height / 2 + RIBBON_THICKNESS / 2, depth / 2 - RIBBON_TOP_LENGTH / 2]} material={ribbonMaterial}>
            <boxGeometry args={[RIBBON_WIDTH, RIBBON_THICKNESS, RIBBON_TOP_LENGTH]} />
          </mesh>
        </>
      )}
      {/* Humillo de chispas azules alrededor del libro localizado. No recibe clics (raycast vacío): así los clics y el
          arrastre siguen siendo del libro */}
      {located && (
        <Sparkles
          {...LOCATED_SPARKLES}
          position={[0, LOCATED_SPARKLES_RISE, 0]}
          scale={[width + 2 * LOCATED_SPARKLES_MARGIN, height + 2 * LOCATED_SPARKLES_MARGIN, depth + 2 * LOCATED_SPARKLES_MARGIN]}
          raycast={() => null}
        />
      )}
    </mesh>
  )
}

export default Book
