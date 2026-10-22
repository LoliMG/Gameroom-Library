// Importación de useMemo de React para clonar y configurar los modelos 3D; Suspense para la portada del libro de la mesa
import { Suspense, useMemo } from 'react'
// useGLTF de @react-three/drei para cargar los modelos
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Activa sombras en todas las mallas de un modelo clonado
import { enableShadows } from '@/utils/shadows'
// Importación de las cotas de la habitación para calcular posiciones relativas
import { ROOM_WIDTH, FLOOR_Y, FRONT_WALL_INNER_Z } from '@/scene/room/Room'
// Importación de la maceta con planta de interior (Fase 5)
import PlantPot from '@/scene/decor/PlantPot'
// Importación de la alfombra estampada con borlas (Fase 6)
import Rug, { RUG_TOP_HEIGHT } from '@/scene/room/Rug'
// Recorte por alfa para materiales con transparencia mezclada (el sofá viene entero en modo BLEND)
import { applyAlphaCutout } from '@/utils/alphaCutout'
// Candelabro con llama titilante (Fase 7) y vapor de la taza (Fase 9c)
import Candlestick from '@/scene/decor/Candlestick'
import MugSteam from '@/scene/decor/MugSteam'
// Repisas de pared sobre el sofá
import WallShelf, { WALL_SHELF_DEPTH_PER_LENGTH } from '@/scene/decor/WallShelf'
// Figuras sobre las repisas (hiedra, Ponyta y Bakugo)
import ShelfFigure from '@/scene/decor/ShelfFigure'
// El libro que se está leyendo, tumbado en la mesa (el mismo libro de las baldas)
import Book from '@/scene/books/Book'
import type { Book as BookData } from '@/types'
// Postura relajada para personajes en postura en T
import { relaxArms, spreadLegs } from '@/utils/pose'
import { Vector3 } from 'three'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

// Constantes de dimensiones y separación del conjunto del rincón de lectura
const WALL_B_X = ROOM_WIDTH / 2 // Cota X de la pared derecha b (+2.60 m)
const SOFA_OFFSET_FROM_WALL = 0.45 // Distancia del centro del sofá respecto a la pared b (fondo sofá ~0.70 m)
const SOFA_X = WALL_B_X - SOFA_OFFSET_FROM_WALL // Posición X del sofá (+2.15 m)
// Posición Z del sofá desplazada hacia el ventanal (+2.10 m) para dar paso al hueco de la puerta en la pared b
const SOFA_Z = 2.10
const SOFA_Y = FLOOR_Y + modelsManifest.sofa.groundOffset // Cota Y de apoyo sobre el suelo (-1.0 m)

// Separación de la mesa de café respecto al sofá hacia el interior de la sala (-X)
const TABLE_DISTANCE_FROM_SOFA = 0.95
const TABLE_X = SOFA_X - TABLE_DISTANCE_FROM_SOFA // Posición X de la mesa de café (+1.20 m)
const TABLE_Z = SOFA_Z // Alineada con el centro del sofá en Z (+2.10 m)
// Patas de la mesa apoyadas sobre la cara superior de la alfombra
const TABLE_Y = FLOOR_Y + RUG_TOP_HEIGHT // -1.0 + 0.011 = -0.989 m

// Alfombra estampada: casi toda la sala (3.90 × 2.69 m), girada 90° para que su lado largo vaya a lo ancho.
// X: de delante del mueble de la pared a (-1.5 m) hasta casi la pared b (+2.4 m), pasando bajo el sofá.
// Z: de +0.75 m a +3.45 m; deja libre el pasillo entre la puerta (hasta Z = +0.25 m) y las estanterías del fondo.
const RUG_X = 0.45
const RUG_Z = 2.1
const RUG_ROTATION_Y = Math.PI / 2
// Altura superior del tablero de la mesa (suelo + grosor alfombra + altura de la mesa)
const TABLE_TOP_Y = TABLE_Y + modelsManifest.coffeeTable.targetDimensions.height // -0.541 m

// Posiciones de los objetos sobre el tablero (respecto al centro de la mesa) y holgura para no atravesarlo
const TABLE_ITEM_CLEARANCE = 0.003
const ITEMS_Y = TABLE_TOP_Y + TABLE_ITEM_CLEARANCE
const MUG_POSITION: Vector3Tuple = [TABLE_X - 0.12, ITEMS_Y, TABLE_Z + 0.14] // Taza hacia el frente izquierdo
const CANDLESTICK_POSITION: Vector3Tuple = [TABLE_X - 0.12, ITEMS_Y, TABLE_Z - 0.14] // Candelabro hacia el fondo izquierdo
// La taza de coffee.glb mide ~3.8 cm de alto: el vapor nace justo encima del borde
const MUG_RIM_HEIGHT = 0.038 * (modelsManifest.coffee.scale / 0.001)
const STEAM_POSITION: Vector3Tuple = [MUG_POSITION[0], ITEMS_Y + MUG_RIM_HEIGHT, MUG_POSITION[2]]

// Repisas de pared sobre el sofá (pared b), colocadas según el boceto: la del lado de la puerta más alta,
// la del lado del ventanal más baja y con un candelabro encima. y: cara superior de la tabla; z: centro de la repisa.
const WALL_SHELF_LENGTH = 0.9                         // Largo de cada repisa (m)
const WALL_SHELF_ROTATION_Y = Math.PI / 2             // Las escuadras (+Z del modelo) contra la pared b (+X)
const WALL_SHELVES = [
  { y: FLOOR_Y + 2.05, z: 1.75 }, // Izquierda (hacia la puerta), sobre el lado izquierdo del sofá
  { y: FLOOR_Y + 1.6, z: 2.85 },  // Derecha (hacia el ventanal), sobre el lado derecho del sofá
]
// Candelabro sobre la repisa derecha: centrado en el fondo de la tabla y desplazado hacia su extremo del ventanal
const WALL_SHELF_DEPTH = WALL_SHELF_DEPTH_PER_LENGTH * WALL_SHELF_LENGTH // ≈ 0.21 m
const SHELF_CANDLE_POSITION: Vector3Tuple = [WALL_B_X - WALL_SHELF_DEPTH / 2, WALL_SHELVES[1].y, WALL_SHELVES[1].z + 0.25]
// Línea central de las repisas (mitad de su fondo): ahí se apoyan las figuras
const SHELF_ITEMS_X = WALL_B_X - WALL_SHELF_DEPTH / 2

// Hiedra colgante: la maceta va sobre el extremo izquierdo de la repisa de arriba y las ramas caen por debajo.
// En ivy.glb la base de la maceta está al 64.5 % de la altura total (las ramas cuelgan 41 de sus 63.6 unidades)
const IVY_HEIGHT = 0.83                 // Altura total con ramas (maceta ≈ 0.13 m de ancho)
const IVY_VASE_BASE_FRACTION = 0.645
const IVY_POSITION: Vector3Tuple = [SHELF_ITEMS_X, WALL_SHELVES[0].y - IVY_VASE_BASE_FRACTION * IVY_HEIGHT, WALL_SHELVES[0].z - 0.37]
// Ponyta de perfil sobre la repisa de arriba (la cabeza mira hacia el ventanal, +Z, como en el modelo)
const PONYTA_HEIGHT = 0.22
const PONYTA_POSITION: Vector3Tuple = [SHELF_ITEMS_X, WALL_SHELVES[0].y, WALL_SHELVES[0].z + 0.11]
// Crin y cola (material "Hair") brillando como fuego; intensidad > 1 para que el Bloom las haga resplandecer
// Brillo suave: más fuerte, el halo del Bloom se come el cuerpo blanco y la figura entera parece naranja
const PONYTA_GLOW = { material: 'Hair', color: '#ff7a1f', intensity: 0.5 }
// Figura de Bakugo en la parte izquierda de la repisa de abajo (el candelabro queda a su derecha)
const BAKUGO_HEIGHT = 0.32
const BAKUGO_POSITION: Vector3Tuple = [SHELF_ITEMS_X, WALL_SHELVES[1].y, WALL_SHELVES[1].z - 0.23]
const BAKUGO_ROTATION_Y = -Math.PI / 2 // El modelo mira hacia +Z; girado mira a la sala (-X)
// Postura alerta desde la postura en T: huesos de brazos y piernas de bakugo.glb y hacia dónde mira el modelo
const BAKUGO_ARMS = [
  { arm: 'L_arm_079', elbow: 'L_elbow_080', hand: 'L_hand_081' },
  { arm: 'R_arm_0107', elbow: 'R_elbow_0108', hand: 'R_hand_0109' },
]
const BAKUGO_LEGS = [
  { leg: 'L_leg_0139', knee: 'L_knee_0140' },
  { leg: 'R_leg_0148', knee: 'R_knee_0149' },
]
const BAKUGO_FORWARD = new Vector3(0, 0, 1)
// Ángulos (radianes): brazos separados del cuerpo, codos doblados y piernas abiertas
const BAKUGO_ARM_SPREAD = 0.45
const BAKUGO_ELBOW_BEND = 0.6
const BAKUGO_LEG_SPREAD = 0.14
// ivy.glb trae las hojas con brillo propio (de noche relucen verdes en la oscuridad) y la maceta de metal puro sin mapa
// que lo matice (sale oscura y de un color raro): sin brillo y sin metal. Los materiales son los del modelo cargado, pero
// solo hay una hiedra
const matteIvy = (root: Object3D) =>
  root.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as MeshStandardMaterial
    material.emissive.set('#000000')
    material.emissiveMap = null
    material.metalness = 0
    material.needsUpdate = true
  })
const poseBakugo = (root: Object3D) => {
  relaxArms(root, BAKUGO_ARMS, BAKUGO_FORWARD, { armSpread: BAKUGO_ARM_SPREAD, elbowBend: BAKUGO_ELBOW_BEND })
  spreadLegs(root, BAKUGO_LEGS, BAKUGO_LEG_SPREAD)
}

// Constante para la única maceta decorativa situada en la esquina entre el sofá y el ventanal
// Extremo del sofá hacia el ventanal: el modelo llega a +1.613 unidades en su eje X local (× escala),
// que tras girarlo -90° queda sobre el eje Z del mundo
const SOFA_END_Z = SOFA_Z + 1.613 * modelsManifest.sofa.scale // 2.10 + 1.226 = +3.33 m
// Holgura respecto al sofá y a las paredes
const POT_CLEARANCE = 0.03
// Copa máxima que cabe en el hueco entre el sofá y el muro del ventanal
const POT_FOOTPRINT = FRONT_WALL_INNER_Z - SOFA_END_Z - 2 * POT_CLEARANCE // ≈ 0.55 m
// Lado mayor de la copa del rosal en unidades originales (caja envolvente de rose_in_a_pot.glb: 14.2 x 15.76)
const ROSE_ORIGINAL_SPREAD = 15.76
// Escala para que la copa quepa sin atravesar sofá ni paredes (≈ 0.035 → ~0.72 m de alto)
const POT_SCALE = POT_FOOTPRINT / ROSE_ORIGINAL_SPREAD
const POT_X = WALL_B_X - POT_FOOTPRINT / 2 - POT_CLEARANCE // Pegada a la pared b (+2.30 m)
const POT_Y = FLOOR_Y + modelsManifest.roseInAPot.groundOffset // -1.0 m
const POT_CORNER_Z = (SOFA_END_Z + FRONT_WALL_INNER_Z) / 2 // Centrada entre el sofá y el ventanal (+3.63 m)

/**
 * Componente que agrupa el sofá, la mesa de café con marquetería,
 * libro abierto, candelabro con vela real (candle.glb) y taza de café (coffee.glb).
 */
// El libro que se está leyendo va donde el libro abierto, tumbado con la portada hacia arriba y girado hacia el sofá
const TABLE_BOOK_POSITION: Vector3Tuple = [TABLE_X + 0.1, ITEMS_Y, TABLE_Z + 0.02]
const TABLE_BOOK_ROTATION_Y = -Math.PI / 4

interface SofaCornerProps {
  /** Libro que se está leyendo (el último abierto en el lector, sin acabar): sustituye al libro abierto de la mesa */
  currentBook: BookData | null
  /** Cuánto se lleva de él (para su cinta) */
  currentProgress?: number
  /** Pulsar el libro de la mesa: sigue leyéndolo */
  onOpenCurrent: (book: BookData) => void
}

function SofaCorner({ currentBook, currentProgress, onOpenCurrent }: SofaCornerProps) {
  // 1. Carga del sofá desde modelsManifest
  const sofaGLTF = useGLTF(modelsManifest.sofa.url)
  const sofaScene = useMemo(() => enableShadows(applyAlphaCutout(sofaGLTF.scene.clone())), [sofaGLTF.scene])

  // 2. Carga de la mesa de café de marquetería
  const tableGLTF = useGLTF(modelsManifest.coffeeTable.url)
  const tableScene = useMemo(() => enableShadows(tableGLTF.scene.clone()), [tableGLTF.scene])

  // 3. Carga del libro abierto para la mesa
  const bookTableGLTF = useGLTF(modelsManifest.bookTable.url)
  const bookTableScene = useMemo(() => enableShadows(bookTableGLTF.scene.clone()), [bookTableGLTF.scene])

  // 5. Carga del modelo 3D de taza y plato de café (coffee.glb)
  const coffeeGLTF = useGLTF(modelsManifest.coffee.url)
  const coffeeScene = useMemo(() => enableShadows(coffeeGLTF.scene.clone()), [coffeeGLTF.scene])

  return (
    <group>
      {/* 1. SOFÁ PRINCIPAL: Respaldo contra la pared b (+X) y frontal mirando al centro (-X) */}
      <primitive
        object={sofaScene}
        position={[SOFA_X, SOFA_Y, SOFA_Z]}
        scale={modelsManifest.sofa.scale}
        // collider: FirstPersonControls no deja atravesarlo
        userData={{ collider: true }}
        // Rotación de -90 grados (-PI / 2) sobre Y para que el frontal mire hacia -X (interior)
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* 4. ALFOMBRA ESTAMPADA CON BORLAS (Fase 6): situada bajo la mesa y frente al sofá */}
      <Rug position={[RUG_X, FLOOR_Y, RUG_Z]} rotationY={RUG_ROTATION_Y} />

      {/* 5. MACETA CON ROSAL DE INTERIOR: únicamente en la esquina entre el sofá y el ventanal */}
      <PlantPot position={[POT_X, POT_Y, POT_CORNER_Z]} scale={POT_SCALE} rotationY={-Math.PI / 3} />

      {/* 6. MESA DE CAFÉ REDONDA DE MARQUETERÍA: apoyada sobre la alfombra */}
      <primitive
        object={tableScene}
        position={[TABLE_X, TABLE_Y, TABLE_Z]}
        scale={modelsManifest.coffeeTable.scale}
        // collider: FirstPersonControls no deja atravesarla
        userData={{ collider: true }}
        rotation={[0, Math.PI / 6, 0]}
      />

      {/* 7. ELEMENTOS SOBRE EL TABLERO DE LA MESA DE CAFÉ */}
      {/* 7a. El libro que se está leyendo, tumbado (la portada, su +X, girada hacia arriba): al pulsarlo se sigue leyendo.
          Si no hay ninguno, el libro abierto */}
      {currentBook ? (
        <Suspense fallback={null}>
          <group position={TABLE_BOOK_POSITION} rotation={[0, TABLE_BOOK_ROTATION_Y, 0]}>
            <group position={[0, currentBook.width / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <Book
                book={currentBook}
                position={[0, 0, 0]}
                width={currentBook.width}
                height={currentBook.height}
                depth={currentBook.depth}
                progress={currentProgress}
                onSelect={onOpenCurrent}
                // No se arrastra: no está en ninguna balda
                onGrab={() => {}}
              />
            </group>
          </group>
        </Suspense>
      ) : (
        <primitive
          object={bookTableScene}
          position={TABLE_BOOK_POSITION}
          scale={modelsManifest.bookTable.scale}
          // Rotación para orientarlo estéticamente hacia el lector sentado en el sofá
          rotation={[0, TABLE_BOOK_ROTATION_Y, 0]}
        />
      )}

      {/* 7b. Taza de café con plato real (coffee.glb) hacia el frente izquierdo */}
      <primitive
        object={coffeeScene}
        position={MUG_POSITION}
        scale={modelsManifest.coffee.scale}
        rotation={[0, Math.PI / 3, 0]}
      />

      {/* 7c. Candelabro de cobre con vela (candle.glb) y llama titilante, hacia el fondo izquierdo */}
      <Candlestick position={CANDLESTICK_POSITION} rotationY={0.2} />

      {/* 7e. Vapor sutil que sube de la taza (Fase 9c) */}
      <MugSteam position={STEAM_POSITION} />

      {/* 8. REPISAS SOBRE EL SOFÁ, apoyadas en la pared b */}
      {WALL_SHELVES.map(({ y, z }) => (
        <WallShelf key={z} position={[WALL_B_X, y, z]} rotationY={WALL_SHELF_ROTATION_Y} length={WALL_SHELF_LENGTH} />
      ))}
      {/* Candelabro en la repisa derecha; sin halo de luz porque el plan limita a 4 las luces de vela */}
      <Candlestick position={SHELF_CANDLE_POSITION} rotationY={-0.4} withLight={false} />

      {/* Figuras de las repisas */}
      <ShelfFigure model="ivy" height={IVY_HEIGHT} position={IVY_POSITION} adjust={matteIvy} />
      <ShelfFigure model="ponyta" height={PONYTA_HEIGHT} position={PONYTA_POSITION} glow={PONYTA_GLOW} />
      {/* Bakugo en postura alerta (el modelo viene en postura en T) */}
      <ShelfFigure model="bakugo" height={BAKUGO_HEIGHT} position={BAKUGO_POSITION} rotationY={BAKUGO_ROTATION_Y} adjust={poseBakugo} />
    </group>
  )
}

export default SofaCorner
