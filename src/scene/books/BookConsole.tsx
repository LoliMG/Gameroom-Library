// Html de drei: una página HTML de verdad (con sus botones y su buscador) colocada en 3D
import { Html } from '@react-three/drei'
// useFrame: cada fotograma se recorta lo que tapan los objetos de delante
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import type { Camera, Group } from 'three'
// Panel de la biblioteca que se muestra en la pantalla
import BookDashboard from '@/components/BookDashboard'
import type { ComponentProps } from 'react'
import { convexHull } from '@/utils/convexHull'
import ConsoleSnapshot from '@/scene/books/ConsoleSnapshot'

// Pantalla: 0.8 × 1.25 m de imagen dentro de un marco de 3 cm (el alto, igual que el de .dashboard en px)
const SCREEN_WIDTH = 0.8
const SCREEN_HEIGHT = 1.25
const FRAME_BORDER = 0.03
const FRAME_DEPTH = 0.04
// La página mide 800 px de ancho; con transform, drei mide 1 px = distanceFactor / 400 m, así que 0.4 da 1 px = 1 mm
const HTML_DISTANCE_FACTOR = (SCREEN_WIDTH / 800) * 400
// Por debajo del panel del libro (z-index 1000) y de los controles (900)
const HTML_Z_INDEX_RANGE: [number, number] = [100, 0]
const LAYERS_Z_INDEX = '100'
// Rectángulo que abarca toda la pantalla y más: el recorte deja ver todo menos los agujeros
const EVERYTHING = 'M-99999 -99999 H99999 V99999 H-99999 Z'

/**
 * Pantalla colgada en la pared con el panel de la biblioteca (portadas, búsqueda, filtros y estados de lectura).
 * Es HTML encima del lienzo: se usa con el ratón libre (con la cámara bloqueada, C la suelta).
 * El grupo mira hacia su +Z local: se gira para que dé a la sala.
 */
// Las propiedades del panel (books, readingStatus, onSetStatus, onOpenBook…) son las mismas que las de BookDashboard:
// ComponentProps<typeof BookDashboard> las toma de allí en vez de repetirlas
type BookConsoleProps = ComponentProps<typeof BookDashboard> & {
  position: [number, number, number]
  rotationY: number
  /** Cajas que pueden quedar delante de la pantalla (en la escena, alineadas con los ejes): tapan lo que haya detrás */
  occluders: OccluderBox[]
}

/** Caja alineada con los ejes, en metros: esquina mínima y máxima */
export interface OccluderBox {
  min: [number, number, number]
  max: [number, number, number]
}

// Silueta en pantalla (px) de una caja: la envolvente de sus 8 esquinas proyectadas. Sin las esquinas que quedan detrás
// de la cámara (proyectadas saldrían del revés). shortcut: con alguna esquina detrás de la cámara la silueta sale más
// pequeña; si se nota de muy cerca, recortar la caja contra el plano de la cámara
function silhouette({ min, max }: OccluderBox, camera: Camera, width: number, height: number, corner: Vector3) {
  const points: [number, number][] = []
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        corner.set(x, y, z).project(camera)
        if (corner.z < 1) points.push([((corner.x + 1) / 2) * width, ((1 - corner.y) / 2) * height])
      }
  return convexHull(points)
}

// Rectángulo [izquierda, arriba, derecha, abajo] en pantalla (px) que abarca unos puntos
type Rect = [number, number, number, number]
const boundsOf = (points: [number, number][]): Rect => [
  Math.min(...points.map(([x]) => x)),
  Math.min(...points.map(([, y]) => y)),
  Math.max(...points.map(([x]) => x)),
  Math.max(...points.map(([, y]) => y)),
]
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
// Esquinas de la pantalla en el espacio del grupo de la consola
const SCREEN_CORNERS = [-1, 1].flatMap((x) => [-1, 1].map((y) => new Vector3((x * SCREEN_WIDTH) / 2, (y * SCREEN_HEIGHT) / 2, FRAME_DEPTH / 2)))

function BookConsole({ position, rotationY, occluders, ...dashboard }: BookConsoleProps) {
  const cornerRef = useRef(new Vector3())
  const groupRef = useRef<Group>(null)
  // Capas a pantalla completa, una dentro de otra (una por caja), y en la última pone drei la página (portal). La página
  // es HTML encima del lienzo, así que nada la tapa por sí solo (occlude="blending" de drei sí, pero le quita los clics al
  // lienzo): cada caja abre en su capa un agujero con su silueta (clip-path). Una capa por caja porque un solo recorte no
  // suma dos agujeros que se pisan (el gramófono sobre la chimenea). En capas propias, sin 3D: con clip-path en las de
  // drei, que llevan la perspectiva, la página desaparece. Las cajas que lleguen después de montar no cuentan
  const [layers] = useState(() => {
    const list = occluders.map(() => document.createElement('div'))
    list.forEach((layer, i) => {
      layer.style.cssText = i === 0 ? `position:fixed;inset:0;pointer-events:none;z-index:${LAYERS_Z_INDEX}` : 'position:absolute;inset:0;pointer-events:none'
      list[i - 1]?.appendChild(layer)
    })
    return { list, portal: { current: list[list.length - 1] } }
  })
  useEffect(() => {
    document.body.appendChild(layers.list[0])
    return () => layers.list[0].remove()
  }, [layers])

  // Cada fotograma, los agujeros. Los objetos siempre quedan por delante de la pantalla, que está en la pared: no hace falta
  // comparar distancias. Solo se recorta si la silueta pisa la pantalla: con un recorte puesto, la rueda del ratón deja de
  // desplazar la lista de libros, y así funciona siempre que no haya nada delante (al usarla de frente).
  // shortcut: tapada en parte desde un lado, la rueda no desplaza la lista; arrastrar su barra sí
  useFrame(({ camera, size }) => {
    const group = groupRef.current
    if (!group) return
    const corner = cornerRef.current
    const screen = boundsOf(
      SCREEN_CORNERS.map((point) => {
        corner.copy(point).applyMatrix4(group.matrixWorld).project(camera)
        return [((corner.x + 1) / 2) * size.width, ((1 - corner.y) / 2) * size.height]
      })
    )
    layers.list.forEach((layer, i) => {
      const hull = silhouette(occluders[i], camera, size.width, size.height, corner)
      layer.style.clipPath =
        hull.length < 3 || !overlaps(boundsOf(hull), screen)
          ? ''
          : `path(evenodd, "${EVERYTHING} M${hull.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z")`
    })
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Marco */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[SCREEN_WIDTH + 2 * FRAME_BORDER, SCREEN_HEIGHT + 2 * FRAME_BORDER, FRAME_DEPTH]} />
        <meshStandardMaterial color="#1a1512" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Imagen de la consola detrás del HTML: es lo que sale en las fotos del rincón (el HTML no sale en ellas) */}
      <ConsoleSnapshot books={dashboard.books} readingStatus={dashboard.readingStatus} width={SCREEN_WIDTH} z={FRAME_DEPTH / 2 + 0.001} />
      {/* Pantalla: la página va justo delante del marco */}
      <Html
        portal={layers.portal}
        transform
        distanceFactor={HTML_DISTANCE_FACTOR}
        position={[0, 0, FRAME_DEPTH / 2 + 0.002]}
        zIndexRange={HTML_Z_INDEX_RANGE}
        wrapperClass="book-console-layer"
      >
        <BookDashboard {...dashboard} />
      </Html>
    </group>
  )
}

export default BookConsole
