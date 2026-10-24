// Suspense, useMemo y memo de React
import { memo, Suspense, useMemo } from 'react'
// Hook useGLTF de drei para la carga de modelos 3D GLB
import { Preload, useGLTF } from '@react-three/drei'
// Repetición de las texturas del césped
import { RepeatWrapping } from 'three'
import type { MeshStandardMaterial } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
import type { ModelName } from '@/data/modelsManifest'
// Generador pseudoaleatorio con semilla: el jardín sale siempre igual
import { createRandom } from '@/utils/random'
// Cota del suelo de la habitación (el jardín está al mismo nivel)
import { FLOOR_Y } from '@/scene/room/Room'
// Fuente, muro, banco, losas y faroles
import { Bench, Fountain, Lantern, ModelProp, PathStones, StoneWall, Warrior, WALL_SEGMENT_LENGTH } from '@/scene/garden/GardenProps'
import type { PathStone } from '@/scene/garden/GardenProps'
// Muchas copias de un modelo en una sola llamada de dibujo (por malla)
import InstancedModel from '@/scene/shared/InstancedModel'
import type { ModelItem } from '@/scene/shared/InstancedModel'
// Avisa a la pantalla de carga de que el jardín ya está montado
import SceneReady from '@/scene/shared/SceneReady'

// Generador de números al azar entre 0 y 1 (createRandom, con semilla)
type Random = () => number
// Rango [mínimo, máximo]
type Range = [number, number]

// --- Suelo ---
const GROUND_Y = FLOOR_Y - 0.02 // Un poco por debajo del suelo interior para no parpadear con él
// Césped alrededor de toda la casa y más allá del muro, para que por los lados no se acabe el suelo
const GROUND_POSITION: Vector3Tuple = [0, GROUND_Y, 4.0]
const GROUND_SIZE: [number, number] = [40, 30]
// El césped de grass_texture.glb es un plano de 4 × 4 m: sus mapas se repiten cada 4 m sobre todo el suelo del jardín
const GRASS_TILE_SIZE = 4
// Mapas del material que hay que repetir
// (as const: la lista es de esos nombres exactos, que son propiedades de MeshStandardMaterial)
const GRASS_MAP_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const

// --- Composición (como la foto de referencia): ventanal en Z = 4 m mirando a +Z ---
// Ojo: mirando desde la sala hacia +Z, la X positiva queda a la IZQUIERDA de la pantalla
// Camino de losas desde la ventana hasta la fuente, que queda frente a la ventana derecha
const FOUNTAIN_POSITION: Vector3Tuple = [-1.5, GROUND_Y, 8.8]
const FOUNTAIN_PATH_RING = 1.42 // Radio del anillo de losas alrededor de la fuente
// Muro de piedra que rodea la casa y el jardín (rectángulo de 4 × 3 tramos: los pilares coinciden en las esquinas);
// fuera, arboleda y, al fondo, las colinas
const WALL_HALF_WIDTH = 2 * WALL_SEGMENT_LENGTH // ≈ 9.9 m a cada lado
const WALL_BACK_Z = 11.3                         // Fondo del jardín, tras el macizo de flores
const WALL_HOUSE_Z = WALL_BACK_Z - 3 * WALL_SEGMENT_LENGTH // ≈ -3.55 m, detrás de la casa
const WALL_PATH: [number, number][] = [
  [-WALL_HALF_WIDTH, WALL_HOUSE_Z],
  [-WALL_HALF_WIDTH, WALL_BACK_Z],
  [WALL_HALF_WIDTH, WALL_BACK_Z],
  [WALL_HALF_WIDTH, WALL_HOUSE_Z],
  [-WALL_HALF_WIDTH, WALL_HOUSE_Z],
]
// Rincón de la izquierda: banco con peluches, guerrero y macetero con flores
const BENCH_POSITION: Vector3Tuple = [1.9, GROUND_Y, 7.7] // El banco japonés mide 1.8 m: separado del macetero y del farol
const BENCH_ROTATION_Y = -2.7 // Mirando hacia la casa y el camino
const FLOWER_POT_POSITION: Vector3Tuple = [3.1, GROUND_Y, 6.6]
// Guerrero de pie entre el macetero y el banco. El modelo mira a +Z; de frente a la ventana izquierda (desde donde se ve)
// sería WARRIOR_FACING_WINDOW, y se gira 40° hacia el camino para que se vea a tres cuartos de perfil
const WARRIOR_POSITION: Vector3Tuple = [3.0, GROUND_Y, 8.1]
const WARRIOR_HEIGHT = 1.8
const WARRIOR_FACING_WINDOW = Math.atan2(1.2 - WARRIOR_POSITION[0], 3.5 - WARRIOR_POSITION[2])
const WARRIOR_ROTATION_Y = WARRIOR_FACING_WINDOW + 0.7
// La cabeza, girada hacia la ventana respecto al cuerpo (queda a unos 17° de mirarla de frente)
const WARRIOR_HEAD_TURN = -0.4
// Macetero (flower_pot.glb)
const FLOWER_POT_HEIGHT = 1.0
const FLOWER_POT_TOP_Y = GROUND_Y + 0.98 // Boca del macetero, donde asoman los lirios
// Farolillos de papel a lo largo del camino y junto a la fuente: cada uno es uno de los cuatro modelos distintos
const LANTERNS: [number, number][] = [[0.45, 5.2], [-1.0, 6.4], [0.6, 7.7], [-2.9, 8.0]]

// Arbusto de trees.glb (ligero, ~16 000 triángulos): matas verdes entre las flores. position: [x, z]
const BUSH: { model: ModelName; node: string } = { model: 'treesGarden', node: 'Tree EZTree1.Bush006' }
const SHRUBS: { position: [number, number]; height: number }[] = [
  { position: [3.0, 5.0], height: 1.0 },
  { position: [1.2, 5.5], height: 0.8 },
  { position: [-2.4, 5.0], height: 1.1 },
  { position: [-3.4, 6.3], height: 1.3 },
  { position: [-3.0, 7.7], height: 1.0 },
  { position: [-5.8, 10.3], height: 1.3 },
  { position: [-4.0, 10.4], height: 1.2 },
  { position: [-1.6, 10.3], height: 1.4 },
  { position: [0.6, 10.4], height: 1.1 },
  { position: [3.8, 10.3], height: 1.3 },
  { position: [5.6, 10.4], height: 1.2 },
]

// Flores de los modelos, instanciadas. Triángulos por planta: lirio blanco (lilies1) ~9 000, lirio araña rojo ~39 000
// y cada tallo del ramo de lirios morados (purple_lilies.glb tiene 7 tallos sueltos) ~33 000.
// El rosal en maceta (~100 000 por rosa) y la azucena asiática (1,3 millones) son demasiado pesados para repetirlos.
const PURPLE_LILY_STEMS = ['Object_8', 'Object_10', 'Object_12', 'Object_14', 'Object_16', 'Object_18', 'Object_20']
type FlowerKind = 'white' | 'red' | 'purple'
const FLOWER_HEIGHTS: Record<FlowerKind, Range> = { white: [0.45, 0.7], red: [0.4, 0.55], purple: [0.6, 0.85] }
// Macizos (x, z: rangos) con cuántas flores de cada tipo. Dejan libre el camino del centro
const FLOWER_BEDS: ({ x: Range; z: Range } & Record<FlowerKind, number>)[] = [
  { x: [0.5, 3.4], z: [4.4, 6.6], purple: 10, white: 10, red: 0 },
  { x: [-3.6, -1.4], z: [4.4, 7.0], purple: 8, white: 6, red: 3 },
  { x: [-6, 6], z: [9.9, 10.6], purple: 0, white: 18, red: 7 },
]
const FLOWER_POT_LILIES = 5 // Lirios blancos asomando del macetero

// Árboles de trees.glb (sus seis árboles, alternados): dos grandes a los lados de la casa (su copa enmarca las ventanas
// sin que el tronco tape el centro) y una arboleda tras el muro. Los del centro y los del lado del sol (X negativa)
// son bajos para que se vea el cielo del atardecer por encima; los altos quedan en los extremos
const GARDEN_TREES: { node: string; position: [number, number]; height: number; rotationY: number }[] = [
  { node: 'Tree EZTree0.Large', position: [5.4, 6.4], height: 7.5, rotationY: 0.3 },
  { node: 'Tree EZTree0.Medium010', position: [-5.6, 6.0], height: 6.0, rotationY: 1.3 },
  { node: 'Tree EZTree1.Large009', position: [-1.8, 16.0], height: 3.8, rotationY: 0.2 },
  { node: 'Tree EZTree1.Large001', position: [3.6, 18.0], height: 5.0, rotationY: 0.9 },
  { node: 'Tree EZTree1.Medium002', position: [-5.5, 15.5], height: 4.0, rotationY: -1.7 },
  { node: 'Tree EZTree0.Medium011', position: [-8.5, 18], height: 6.5, rotationY: 2.1 },
  { node: 'Tree EZTree1.Large001', position: [-7.2, 14], height: 5.5, rotationY: -0.4 },
  { node: 'Tree EZTree1.Medium002', position: [-3.4, 13.5], height: 3.2, rotationY: 2.8 },
  { node: 'Tree EZTree0.Medium010', position: [0.9, 15], height: 4.0, rotationY: 0.6 },
  { node: 'Tree EZTree0.Medium011', position: [2.6, 13], height: 3.5, rotationY: -2.3 },
  { node: 'Tree EZTree0.Large', position: [5.5, 16], height: 6.5, rotationY: 1.9 },
  { node: 'Tree EZTree1.Large009', position: [7.4, 14.5], height: 6.0, rotationY: -0.8 },
  { node: 'Tree EZTree1.Medium002', position: [9.2, 19], height: 7.0, rotationY: 0.4 },
]

// Arboledas de los laterales (a ambos lados, X positiva y negativa): una fila dentro del muro y muchas fuera,
// para que al mirar de lado por las ventanas el paisaje siga. x: distancia al centro; z: rango de profundidad
const SIDE_TREE_NODES = [
  'Tree EZTree0.Large', 'Tree EZTree0.Medium010', 'Tree EZTree0.Medium011',
  'Tree EZTree1.Large001', 'Tree EZTree1.Large009', 'Tree EZTree1.Medium002',
]
const SIDE_GROVES: { x: Range; z: Range; height: Range; countPerSide: number }[] = [
  { x: [6.4, 8.8], z: [4.6, 10.4], height: [4.5, 6.5], countPerSide: 6 },
  { x: [11, 19], z: [-6, 24], height: [5, 9], countPerSide: 16 },
]


const between = (random: Random, [min, max]: Range) => min + random() * (max - min)
// <T>: devuelve un elemento del mismo tipo que los de la lista
const pick = <T,>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)]

// Losas del camino (dos por fila a lo largo de una curva suave) y anillo alrededor de la fuente
function buildPathStones(random: Random) {
  const stones: PathStone[] = []
  // Largo de cada losa (m) y giro al azar; el modelo de cada una lo elige PathStones alternando
  const addStone = (x: number, z: number) => {
    stones.push({ x, z, size: between(random, [0.38, 0.55]), rotationY: random() * Math.PI * 2 })
  }
  for (let t = 0; t <= 1; t += 0.075) {
    const x = -(0.1 + 1.1 * t * t)
    const z = 4.35 + 3.35 * t
    addStone(x - 0.22 + (random() - 0.5) * 0.08, z + (random() - 0.5) * 0.08)
    addStone(x + 0.22 + (random() - 0.5) * 0.08, z + (random() - 0.5) * 0.08)
  }
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2
    addStone(FOUNTAIN_POSITION[0] + Math.cos(angle) * FOUNTAIN_PATH_RING, FOUNTAIN_POSITION[2] + Math.sin(angle) * FOUNTAIN_PATH_RING)
  }
  return stones
}

// Flores de los macizos y del macetero, agrupadas por modelo (y por tallo, en los lirios morados)
function buildFlowers(random: Random) {
  const flowers: { white: ModelItem[]; red: ModelItem[]; purple: Record<string, ModelItem[]> } = {
    white: [],
    red: [],
    purple: Object.fromEntries(PURPLE_LILY_STEMS.map((stem) => [stem, []])),
  }
  FLOWER_BEDS.forEach((bed) => {
    for (const kind of ['white', 'red', 'purple'] as const) {
      for (let i = 0; i < bed[kind]; i++) {
        const list = kind === 'purple' ? flowers.purple[pick(random, PURPLE_LILY_STEMS)] : flowers[kind]
        list.push({
          position: [between(random, bed.x), GROUND_Y, between(random, bed.z)],
          height: between(random, FLOWER_HEIGHTS[kind]),
          rotationY: random() * Math.PI * 2,
        })
      }
    }
  })
  for (let i = 0; i < FLOWER_POT_LILIES; i++) {
    const angle = (i / FLOWER_POT_LILIES) * Math.PI * 2
    flowers.white.push({
      position: [FLOWER_POT_POSITION[0] + Math.cos(angle) * 0.1, FLOWER_POT_TOP_Y, FLOWER_POT_POSITION[2] + Math.sin(angle) * 0.1],
      height: between(random, [0.3, 0.4]),
      rotationY: random() * Math.PI * 2,
    })
  }
  return flowers
}

// Árboles de las arboledas laterales, agrupados por tipo de árbol (una InstancedModel por tipo)
function buildSideTrees(random: Random) {
  const trees: Record<string, ModelItem[]> = Object.fromEntries(SIDE_TREE_NODES.map((node) => [node, []]))
  SIDE_GROVES.forEach((grove) => {
    for (const side of [-1, 1]) {
      for (let i = 0; i < grove.countPerSide; i++) {
        trees[pick(random, SIDE_TREE_NODES)].push({
          position: [side * between(random, grove.x), GROUND_Y, between(random, grove.z)],
          height: between(random, grove.height),
          rotationY: random() * Math.PI * 2,
        })
      }
    }
  })
  return trees
}

// Suelo del jardín con el material de grass_texture.glb, con sus mapas repetidos para cubrir todo el suelo
function GardenGround() {
  const { materials } = useGLTF(modelsManifest.grassGround.url)
  const material = useMemo(() => {
    // El modelo trae un solo material: el del césped
    const ground = (Object.values(materials)[0] as MeshStandardMaterial).clone()
    GRASS_MAP_KEYS.forEach((key) => {
      if (!ground[key]) return
      const texture = ground[key].clone()
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      // Repeticiones calculadas a partir del tamaño del suelo
      texture.repeat.set(GROUND_SIZE[0] / GRASS_TILE_SIZE, GROUND_SIZE[1] / GRASS_TILE_SIZE)
      texture.needsUpdate = true
      ground[key] = texture
    })
    return ground
  }, [materials])
  return (
    <mesh position={GROUND_POSITION} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={GROUND_SIZE} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// Una planta del jardín: carga el modelo del manifiesto, lo escala a su medida y lo apoya en el suelo
// (position: [x, z]). Los elementos del jardín no proyectan sombras (presupuesto de rendimiento del plan)
function GardenPlant({ model, node, height, position, rotationY = 0 }: { model: ModelName; node?: string; height: number; position: [number, number]; rotationY?: number }) {
  return <ModelProp model={model} node={node} height={height} position={[position[0], GROUND_Y, position[1]]} rotation={[0, rotationY, 0]} />
}

/**
 * Jardín al atardecer visible por el ventanal: camino de losas hasta una fuente, macizos de lirios, banco, guerrero y macetero,
 * faroles encendidos, muro de piedra, árboles y colinas bajo el sol poniente.
 */
// Manto de nieve sobre el césped: blanco mate, más opaco cuanto más nieva (deja asomar algo de hierba)
const SNOW_COVER_OPACITY = 0.75

function Outside({ night, snow }: { night: boolean; snow: number }) {
  // Reparto determinista de todas las piezas instanciadas (una semilla por grupo: tocar uno no mueve los demás)
  const scatter = useMemo(
    () => ({
      stones: buildPathStones(createRandom(11)),
      flowers: buildFlowers(createRandom(21)),
      sideTrees: buildSideTrees(createRandom(63)),
    }),
    []
  )

  return (
    <group>
      {/* Muro, fuente, banco, macetero, guerrero y farolillos */}
      <StoneWall path={WALL_PATH} groundY={GROUND_Y} />
      <Fountain position={FOUNTAIN_POSITION} />
      <Bench position={BENCH_POSITION} rotationY={BENCH_ROTATION_Y} />
      <ModelProp model="flowerPot" height={FLOWER_POT_HEIGHT} position={FLOWER_POT_POSITION} />
      {/* El guerrero solo está de noche: se oculta en vez de quitarlo, para no cargar su modelo con la escena en marcha */}
      <group visible={night}>
        <Warrior height={WARRIOR_HEIGHT} position={WARRIOR_POSITION} rotationY={WARRIOR_ROTATION_Y} headTurn={WARRIOR_HEAD_TURN} />
      </group>
      {LANTERNS.map(([x, z], i) => (
        <Lantern key={`${x},${z}`} position={[x, GROUND_Y, z]} variant={i % 4} rotationY={i * 1.3} />
      ))}

      {/* Losas del camino: las piedras de elder_stones.glb, alternadas */}
      <PathStones stones={scatter.stones} groundY={GROUND_Y} />

      {/* Modelos: césped, flores (instanciadas), matas y árboles */}
      <Suspense fallback={null}>
        <GardenGround />
        {snow > 0 && (
          <mesh position={[GROUND_POSITION[0], GROUND_Y + 0.01, GROUND_POSITION[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={GROUND_SIZE} />
            <meshStandardMaterial color="#f2f5f8" roughness={1} transparent opacity={snow * SNOW_COVER_OPACITY} depthWrite={false} />
          </mesh>
        )}
        <InstancedModel model="lilies1" items={scatter.flowers.white} />
        <InstancedModel model="spiderLily" items={scatter.flowers.red} />
        {PURPLE_LILY_STEMS.map((stem) => (
          <InstancedModel key={stem} model="purpleLilies" node={stem} items={scatter.flowers.purple[stem]} />
        ))}
        {SHRUBS.map(({ position, height }) => (
          <GardenPlant key={`shrub-${position}`} {...BUSH} position={position} height={height} rotationY={position[0]} />
        ))}
        {SIDE_TREE_NODES.map((node) => (
          <InstancedModel key={node} model="treesGarden" node={node} items={scatter.sideTrees[node]} />
        ))}
        {GARDEN_TREES.map((tree) => (
          <GardenPlant key={`tree-${tree.position}`} model="treesGarden" {...tree} />
        ))}
        {/* Sube texturas y compila materiales al cargar, para que no lo haga al entrar cada cosa en la vista (ver Experience) */}
        <Preload all />
        <SceneReady part="garden" />
      </Suspense>
    </group>
  )
}

// memo: va dentro de DayCycle, que se repinta cada minuto; así solo se repinta al cambiar de día a noche o la nieve
export default memo(Outside)
