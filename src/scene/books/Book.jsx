import { useMemo } from 'react'
// Hook useTexture de drei para la carga reactiva de la textura de portada
import { useTexture } from '@react-three/drei'
// Importación del espacio de color SRGB desde Three.js para la corrección de color
import { SRGBColorSpace } from 'three'
// Importación de los generadores de texturas de lomo, contraportada y cantos de hojas
import {
  generateSpineTexture,
  generateBackCoverTexture,
  generatePagesTexture,
  paletteFromCover,
} from '@/scene/books/bookTextureGenerator'

function Book({ position, rotationY = 0, width, height, depth, onSelect, onGrab, book }) {
  // Carga reactiva de la textura de la portada con useTexture y espacio de color sRGB
  const coverTexture = useTexture(book.cover, (loadedTexture) => {
    loadedTexture.colorSpace = SRGBColorSpace
  })

  // Libros sin paleta calibrada a mano: los colores del lomo y la contraportada salen de su portada
  const styledBook = useMemo(
    () => (book.spineGradient ? book : { ...book, ...paletteFromCover(coverTexture.image) }),
    [book, coverTexture]
  )

  // Generación procedimental en Canvas 2D del lomo (con autor, título grande y editorial)
  const spineTexture = useMemo(() => generateSpineTexture(styledBook), [styledBook])

  // Generación procedimental en Canvas 2D de la contraportada (con sinopsis y código de barras)
  const backTexture = useMemo(() => generateBackCoverTexture(styledBook), [styledBook])

  // Generación procedimental de la textura de hojas de papel con líneas verticales
  const pagesTexture = useMemo(() => generatePagesTexture(), [])

  // Manejador del evento de clic sobre el libro
  const handleClick = (event) => {
    // event.stopPropagation() detiene la propagación del raycasting de React Three Fiber;
    // evita que el clic atraviese hacia otros objetos 3D que se encuentren detrás
    event.stopPropagation()

    // Notificación al componente padre enviando los datos del libro pulsado
    if (onSelect) {
      onSelect(book)
    }
  }

  return (
    // Malla 3D del libro de canto con posición calculada, detector de clics y cálculo de sombras
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={handleClick}
      // Arrastre: se agarra con el botón izquierdo; lo suelta la zona de la balda que hay detrás (Bookshelf)
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.stopPropagation()
        // Punto agarrado respecto al centro del libro, a lo largo de la balda (contando el giro si está volteado):
        // así no salta a centrarse en el puntero
        const local = event.object.worldToLocal(event.point.clone())
        onGrab(book, local.x * Math.cos(rotationY) + local.z * Math.sin(rotationY))
      }}
      // castShadow: permite que el libro proyecte sombras sobre la balda y los libros contiguos
      castShadow
      // receiveShadow: permite que la superficie del libro reciba sombras proyectadas por otros elementos
      receiveShadow
    >
      {/* Geometría de caja que define ancho (grosor lomo), alto y fondo del libro */}
      <boxGeometry args={[width, height, depth]} />

      {/* Índice 0: Cara lateral derecha (+X) - Portada oficial del libro */}
      <meshStandardMaterial attach="material-0" map={coverTexture} />

      {/* Índice 1: Cara lateral izquierda (-X) - Contraportada con sinopsis y código de barras */}
      <meshStandardMaterial attach="material-1" map={backTexture} />

      {/* Índice 2: Cara superior (+Y) - Canto superior con textura de hojas verticales */}
      <meshStandardMaterial attach="material-2" map={pagesTexture} />

      {/* Índice 3: Cara inferior (-Y) - Canto inferior apoyado en la balda */}
      <meshStandardMaterial attach="material-3" map={pagesTexture} />

      {/* Índice 4: Cara frontal (+Z) - LOMO mirando hacia la cámara con autor, título y editorial */}
      <meshStandardMaterial attach="material-4" map={spineTexture} />

      {/* Índice 5: Cara posterior (-Z) - Canto de corte de las páginas hacia el fondo de la balda */}
      <meshStandardMaterial attach="material-5" map={pagesTexture} />
    </mesh>
  )
}

export default Book
