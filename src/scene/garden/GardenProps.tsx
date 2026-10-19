// useMemo prepara modelos, perfiles y tramos de muro una sola vez; ref y efecto para animar el agua de la fuente
import { useLayoutEffect, useMemo, useRef } from 'react'
// Medir las losas del camino y girar la cabeza del guerrero
import { Box3, MathUtils, Vector3 } from 'three'
// useGLTF de drei para los modelos; Sparkles para el rocío de la fuente
import { Sparkles, useGLTF } from '@react-three/drei'
// useFrame mueve el agua de la fuente en cada fotograma
import { useFrame } from '@react-three/fiber'
// Muchas copias de un modelo, o de una geometría, con una llamada de dibujo por malla (muro y losas del camino)
import InstancedModel from '@/scene/shared/InstancedModel'
import InstancedScatter from '@/scene/shared/InstancedScatter'
// Separa las losas sueltas de elder_stones.glb, que vienen todas en una malla
import { splitIslands } from '@/utils/splitIslands'
// Manifiesto de modelos y preparación (base en el suelo, escala a la altura pedida)
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'
import { withSpecularGlossiness } from '@/utils/specularGlossiness'

// Luz cálida que da cada farolillo a su alrededor
const LANTERN_LIGHT_COLOR = '#ffb36b'
// Altura de cada uno de los cuatro farolillos de papel (en el modelo miden 0.69, 0.96, 0.51 y 0.78 m: se reducen
// en proporción para que queden a la altura de las flores)
const PAPER_LANTERN_HEIGHTS = [0.45, 0.6, 0.35, 0.5]

// Banco japonés de madera (jap_bench.glb mira a +Z, con el respaldo en -Z): altura total con respaldo
const BENCH_HEIGHT = 0.95
// Altura del asiento con esa escala (asiento del modelo a 0.469 de 1.101 de alto)
const BENCH_SEAT_Y = BENCH_HEIGHT * (0.469 / 1.101)
// Peluches sobre el asiento, en coordenadas del banco: el cojín pez apoyado en el respaldo y el tiburón mirándolo
// (en plushie_shark.glb la cabeza va hacia +Z: el giro lleva +Z hacia el pez)
const FISH_POSITION = [-0.4, BENCH_SEAT_Y, -0.12]
const SHARK_POSITION = [0.5, BENCH_SEAT_Y, 0.02]
const SHARK_ROTATION_Y = Math.atan2(FISH_POSITION[0] - SHARK_POSITION[0], FISH_POSITION[2] - SHARK_POSITION[2])
const BENCH_PLUSHIES = [
  { model: 'plushieShark', height: 0.28, position: SHARK_POSITION, rotation: [0, SHARK_ROTATION_Y, 0] },
  { model: 'pillowFish', height: 0.27, position: FISH_POSITION, rotation: [-0.25, 0.2, 0] },
]
// Cuello del guerrero (warrior.glb), en fracción de su altura: los hombros llegan a 0.82 y la cabeza empieza en 0.88.
// El giro de la cabeza va de 0 a completo entre estas dos alturas, para que el cuello no se parta
const WARRIOR_NECK = { start: 0.83, end: 0.87 }
// Fuente (fountain.glb, en centímetros): prepareModel la escala a esta altura (unos 2.2 m de ancho)
const FOUNTAIN_HEIGHT = 1.25
// Movimiento del agua: repeticiones de textura por segundo en los chorros, radianes por segundo de la lámina
// de la taza, y vaivén de las salpicaduras (veces por segundo × 2π y desplazamiento en fracción de textura)
const FOUNTAIN_FALL_SPEED = 0.9
const FOUNTAIN_BASIN_SPIN = 0.12
const FOUNTAIN_SPLASH_RATE = 5
const FOUNTAIN_SPLASH_SWAY = 0.025
// Gotas de rocío alrededor de la parte alta de la fuente (Sparkles de drei, en metros)
const FOUNTAIN_SPRAY = { count: 40, scale: [0.9, 0.7, 0.9], y: 0.85, size: 1.6, speed: 0.8, opacity: 0.7, color: '#e6f4ff' }
// Muro (stone_wall.glb): un tramo a lo largo de Z con un pilar en cada extremo; los pilares se hunden 0.755 bajo su base.
// Con esta escala: tramo de 5.9 m, muro de unos 0.83 m de alto y pilares de 1.76 m sobre el suelo
const WALL_MODEL_SCALE = 0.42
const WALL_MODEL_HEIGHT = 4.941 * WALL_MODEL_SCALE // Alto total del modelo (de la base enterrada a lo alto de los pilares)
const WALL_BURIED_DEPTH = 0.755 * WALL_MODEL_SCALE // Lo que queda bajo el suelo
// Distancia entre los centros de los dos pilares: tramos seguidos a esta distancia comparten pilar (también en las esquinas)
export const WALL_SEGMENT_LENGTH = 11.786 * WALL_MODEL_SCALE // ≈ 4.95 m
// Losas del camino: lo que asoman sobre el césped (el resto queda enterrado)
const STONE_VISIBLE_HEIGHT = 0.03

/**
 * Un modelo del manifiesto colocado con su base en position y escalado a height.
 * alphaCutout: false para materiales con transparencia de verdad (el agua de la fuente).
 */
export function ModelProp({ model, node, height, position, rotation = [0, 0, 0], alphaCutout = true }) {
  // Con el plugin de specular-glossiness: el cojín pez y la fuente usan esa extensión y sin él salen blancos, sin texturas
  const { scene } = useGLTF(modelsManifest[model].url, true, true, withSpecularGlossiness)
  const { wrapper, scale } = useMemo(
    () => prepareModel(scene, node, height, { alphaCutout }),
    [scene, node, height, alphaCutout]
  )
  return <primitive object={wrapper} position={position} rotation={rotation} scale={scale} />
}

/**
 * Gira la cabeza de una figura sin esqueleto retorciendo los vértices por encima del cuello alrededor del eje vertical
 * de la cabeza (los normales giran igual). Solo se copian las mallas que llegan al cuello: el resto se comparte.
 *
 * @param {Object3D} root - Figura ya preparada (prepareModel), sin escalar
 * @param {number} angle - Giro de la cabeza en radianes (positivo: hacia la izquierda de la figura)
 * @param {{ start: number, end: number }} neck - Alturas del cuello en fracción de la altura de la figura
 */
function turnHead(root, angle, neck) {
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root)
  const height = box.max.y - box.min.y
  const neckStart = box.min.y + neck.start * height
  const neckEnd = box.min.y + neck.end * height
  const meshes = []
  root.traverse((object) => {
    if (object.isMesh && new Box3().setFromObject(object).max.y > neckStart) meshes.push(object)
  })

  // Eje de giro: centro de la cabeza (media de los vértices por encima del cuello)
  const point = new Vector3()
  const center = new Vector3()
  let count = 0
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
      if (point.y > neckEnd) {
        center.add(point)
        count++
      }
    }
  }
  center.divideScalar(Math.max(1, count))

  const normal = new Vector3()
  for (const mesh of meshes) {
    const toRoot = mesh.matrixWorld
    const fromRoot = toRoot.clone().invert()
    // Copia propia: la geometría original la comparte la caché de useGLTF
    const geometry = mesh.geometry.clone()
    const position = geometry.attributes.position
    const normals = geometry.attributes.normal
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(toRoot)
      if (point.y <= neckStart) continue
      const a = angle * MathUtils.smoothstep(point.y, neckStart, neckEnd)
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      const dx = point.x - center.x
      const dz = point.z - center.z
      point.set(center.x + dx * cos + dz * sin, point.y, center.z - dx * sin + dz * cos).applyMatrix4(fromRoot)
      position.setXYZ(i, point.x, point.y, point.z)
      if (normals) {
        normal.fromBufferAttribute(normals, i).transformDirection(toRoot)
        normal.set(normal.x * cos + normal.z * sin, normal.y, -normal.x * sin + normal.z * cos).transformDirection(fromRoot)
        normals.setXYZ(i, normal.x, normal.y, normal.z)
      }
    }
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    mesh.geometry = geometry
  }
}

/**
 * Guerrero de pie (warrior.glb), con la cabeza girada headTurn radianes respecto al cuerpo.
 */
export function Warrior({ position, height, rotationY, headTurn }) {
  const { scene } = useGLTF(modelsManifest.warrior.url)
  const { wrapper, scale } = useMemo(() => {
    const prepared = prepareModel(scene, undefined, height)
    turnHead(prepared.wrapper, headTurn, WARRIOR_NECK)
    return prepared
  }, [scene, height, headTurn])
  return <primitive object={wrapper} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

/**
 * Fuente de piedra del jardín (fountain.glb) con el agua en movimiento: sus texturas de agua se desplazan cada fotograma.
 * - Material_49: chorros que caen (la textura baja).
 * - Material_3: lámina de agua de la taza (gira despacio, como removida por la caída).
 * - Material_50: salpicaduras al pie de los chorros (se mecen).
 * Encima, unas gotas de rocío flotando alrededor de la parte alta.
 */
export function Fountain({ position }) {
  const { scene } = useGLTF(modelsManifest.fountain.url, true, true, withSpecularGlossiness)
  const { wrapper, scale } = useMemo(
    () => prepareModel(scene, undefined, FOUNTAIN_HEIGHT, { alphaCutout: false }),
    [scene]
  )
  // Texturas del agua por nombre de material (en una ref: se modifican en cada fotograma)
  const waterMapsRef = useRef({})
  useLayoutEffect(() => {
    const maps = {}
    wrapper.traverse((object) => {
      if (object.isMesh && object.material.map) maps[object.material.name] = object.material.map
    })
    // La lámina de la taza gira sobre su centro
    maps.Material_3?.center.set(0.5, 0.5)
    waterMapsRef.current = maps
  }, [wrapper])

  useFrame(({ clock }) => {
    const { Material_3: basin, Material_49: falling, Material_50: splash } = waterMapsRef.current
    const time = clock.elapsedTime
    // En las texturas de glTF la V crece hacia abajo: restar a la V hace bajar el dibujo
    if (falling) falling.offset.y = -((time * FOUNTAIN_FALL_SPEED) % 1)
    if (basin) basin.rotation = time * FOUNTAIN_BASIN_SPIN
    if (splash) splash.offset.x = Math.sin(time * FOUNTAIN_SPLASH_RATE) * FOUNTAIN_SPLASH_SWAY
  })

  return (
    <group position={position}>
      <primitive object={wrapper} scale={scale} />
      <Sparkles
        count={FOUNTAIN_SPRAY.count}
        scale={FOUNTAIN_SPRAY.scale}
        position={[0, FOUNTAIN_SPRAY.y, 0]}
        size={FOUNTAIN_SPRAY.size}
        speed={FOUNTAIN_SPRAY.speed}
        opacity={FOUNTAIN_SPRAY.opacity}
        color={FOUNTAIN_SPRAY.color}
      />
    </group>
  )
}

/**
 * Losas del camino con las piedras de elder_stones.glb (siete losas distintas en una sola malla, de pie en el plano XY):
 * se separan, se tumban y se van alternando, una por losa del camino.
 *
 * @param {{ x: number, z: number, size: number, rotationY: number }[]} stones - Centro, largo y giro de cada losa
 */
export function PathStones({ stones, groundY }) {
  const { scene } = useGLTF(modelsManifest.elderStones.url)
  const { types, material } = useMemo(() => {
    let mesh = null
    scene.traverse((object) => {
      if (object.isMesh) mesh = object
    })
    scene.updateMatrixWorld(true)
    // Tumbadas: el grosor (Z) pasa a ser la altura y la cara que miraba a +Z queda arriba
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).rotateX(-Math.PI / 2)
    const pieces = splitIslands(geometry).map((piece) => {
      piece.computeBoundingBox()
      const box = piece.boundingBox
      const size = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      // Cada losa centrada y con la base en Y = 0
      piece.translate(-center.x, -box.min.y, -center.z)
      return { geometry: piece, length: Math.max(size.x, size.z), height: size.y }
    })
    return { types: pieces, material: mesh.material }
  }, [scene])

  // Losas repartidas por tipo (alternando) y escaladas a su largo; casi enterradas, asoman STONE_VISIBLE_HEIGHT
  const groups = useMemo(
    () =>
      types.map((type, t) =>
        stones
          .filter((_, i) => i % types.length === t)
          .map((stone) => {
            const scale = stone.size / type.length
            return {
              position: [stone.x, groundY - Math.max(0, type.height * scale - STONE_VISIBLE_HEIGHT), stone.z],
              rotation: [0, stone.rotationY, 0],
              scale,
            }
          })
      ),
    [types, stones, groundY]
  )

  return types.map((type, t) => <InstancedScatter key={t} geometry={type.geometry} material={material} items={groups[t]} />)
}

/**
 * Muro de piedra (stone_wall.glb) a lo largo de un recorrido de puntos [x, z], tramo a tramo.
 * Cada lado debe medir un número entero de WALL_SEGMENT_LENGTH para que los pilares coincidan en las esquinas.
 */
export function StoneWall({ path, groundY }) {
  const items = useMemo(
    () =>
      path.slice(1).flatMap((to, i) => {
        const from = path[i]
        const dx = to[0] - from[0]
        const dz = to[1] - from[1]
        const count = Math.max(1, Math.round(Math.hypot(dx, dz) / WALL_SEGMENT_LENGTH))
        // El modelo va a lo largo de Z: se gira para seguir el lado
        return Array.from({ length: count }, (_, k) => {
          const t = (k + 0.5) / count
          return {
            position: [from[0] + dx * t, groundY - WALL_BURIED_DEPTH, from[1] + dz * t],
            height: WALL_MODEL_HEIGHT,
            rotationY: Math.atan2(dx, dz),
          }
        })
      }),
    [path, groundY]
  )
  return <InstancedModel model="stoneWall" items={items} />
}

/**
 * Banco japonés de madera (jap_bench.glb) con un tiburón de peluche y un cojín pez encima.
 */
export function Bench({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <ModelProp model="gardenBench" height={BENCH_HEIGHT} position={[0, 0, 0]} />
      {BENCH_PLUSHIES.map((plushie) => (
        <ModelProp key={plushie.model} {...plushie} />
      ))}
    </group>
  )
}

/**
 * Farolillo japonés de papel encendido (japanese_paper_lanterns.glb trae cuatro distintos, con brillo propio)
 * y una luz pequeña que alumbra a su alrededor.
 *
 * @param {number} variant - Cuál de los cuatro farolillos (0 a 3)
 */
export function Lantern({ position, variant, rotationY = 0 }) {
  const height = PAPER_LANTERN_HEIGHTS[variant]
  return (
    <group position={position}>
      <ModelProp model="paperLanterns" node={`paper lantern${variant + 1}`} height={height} position={[0, 0, 0]} rotation={[0, rotationY, 0]} />
      <pointLight position={[0, height * 0.5, 0]} color={LANTERN_LIGHT_COLOR} intensity={0.8} distance={2.2} decay={2} />
    </group>
  )
}
