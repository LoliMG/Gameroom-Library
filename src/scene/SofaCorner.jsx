// Importación de useMemo de React para clonar y configurar los modelos 3D
import { useMemo } from 'react'
// Hooks y primitivas auxiliares de @react-three/drei
import { useGLTF, RoundedBox } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Importación de las cotas de la habitación para calcular posiciones relativas
import { ROOM_WIDTH, FLOOR_Y, FRONT_WALL_INNER_Z } from '@/scene/Room'
// Importación de la maceta con planta de interior (Fase 5)
import PlantPot from '@/scene/PlantPot'
// Importación de la alfombra estampada con borlas (Fase 6)
import Rug, { RUG_TOP_HEIGHT } from '@/scene/Rug'
// Recorte por alfa para materiales con transparencia mezclada (el sofá viene entero en modo BLEND)
import { applyAlphaCutout } from '@/utils/alphaCutout'
// Vela con llama titilante (Fase 7) y vapor de la taza (Fase 9c)
import CandleLight from '@/scene/CandleLight'
import MugSteam from '@/scene/MugSteam'

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

// Alfombra estampada (Fase 6): centrada bajo la mesa de café, apoyada en el suelo
const RUG_X = TABLE_X // +1.20 m; con 1.58 m de fondo llega de X = +0.41 m a +1.99 m (entra bajo el frente del sofá)
const RUG_Z = TABLE_Z // +2.10 m; con 2.30 m de largo llega de Z = +0.95 m a +3.25 m
// Altura superior del tablero de la mesa (suelo + grosor alfombra + altura de la mesa)
const TABLE_TOP_Y = TABLE_Y + modelsManifest.coffeeTable.targetDimensions.height // -0.541 m

// Posiciones de los objetos sobre el tablero (respecto al centro de la mesa) y holgura para no atravesarlo
const TABLE_ITEM_CLEARANCE = 0.003
const ITEMS_Y = TABLE_TOP_Y + TABLE_ITEM_CLEARANCE
const MUG_POSITION = [TABLE_X - 0.12, ITEMS_Y, TABLE_Z + 0.14] // Taza hacia el frente izquierdo
const CANDLESTICK_POSITION = [TABLE_X - 0.12, ITEMS_Y, TABLE_Z - 0.14] // Candelabro hacia el fondo izquierdo
// Punta de la mecha de candle.glb: 0.1766 unidades de altura original (× escala del manifiesto)
const CANDLESTICK_WICK_HEIGHT = 0.1766 * modelsManifest.candle.scale // ≈ 0.159 m
// Llama estática que trae el propio modelo: se oculta porque la sustituye la llama titilante de CandleLight
const CANDLESTICK_MODEL_FLAME_NODE = 'Flame_4'
const CANDLE_FLAME_POSITION = [CANDLESTICK_POSITION[0], ITEMS_Y + CANDLESTICK_WICK_HEIGHT, CANDLESTICK_POSITION[2]]
// La taza de coffee.glb mide ~3.8 cm de alto: el vapor nace justo encima del borde
const MUG_RIM_HEIGHT = 0.038 * (modelsManifest.coffee.scale / 0.001)
const STEAM_POSITION = [MUG_POSITION[0], ITEMS_Y + MUG_RIM_HEIGHT, MUG_POSITION[2]]

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

// Constantes de materiales y colores para cojines y manta
const CUSHION_COLOR_OLIVE = '#3e4d3a'    // Verde bosque profundo
const CUSHION_COLOR_BURGUNDY = '#6b242a' // Burdeos / vino oscuro
const CUSHION_COLOR_BEIGE = '#c7bca9'    // Beige estampado suave
const BLANKET_COLOR = '#5c1e24'          // Manta de lana granate cálida

// Helper para habilitar sombras recursivamente en una escena clonada de Three.js
function enableShadows(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return scene
}

/**
 * Componente que agrupa el sofá, cojines, manta, mesa de café con marquetería,
 * libro abierto, candelabro con vela real (candle.glb) y taza de café (coffee.glb).
 */
function SofaCorner() {
  // 1. Carga del sofá desde modelsManifest
  const sofaGLTF = useGLTF(modelsManifest.sofa.url)
  const sofaScene = useMemo(() => enableShadows(applyAlphaCutout(sofaGLTF.scene.clone())), [sofaGLTF.scene])

  // 2. Carga de la mesa de café de marquetería
  const tableGLTF = useGLTF(modelsManifest.coffeeTable.url)
  const tableScene = useMemo(() => enableShadows(tableGLTF.scene.clone()), [tableGLTF.scene])

  // 3. Carga del libro abierto para la mesa
  const bookTableGLTF = useGLTF(modelsManifest.bookTable.url)
  const bookTableScene = useMemo(() => enableShadows(bookTableGLTF.scene.clone()), [bookTableGLTF.scene])

  // 4. Carga del modelo 3D de candelabro con vela (candle.glb)
  const candleGLTF = useGLTF(modelsManifest.candle.url)
  const candleScene = useMemo(() => {
    const scene = enableShadows(candleGLTF.scene.clone())
    const modelFlame = scene.getObjectByName(CANDLESTICK_MODEL_FLAME_NODE)
    if (modelFlame) modelFlame.visible = false
    return scene
  }, [candleGLTF.scene])

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
        // Rotación de -90 grados (-PI / 2) sobre Y para que el frontal mire hacia -X (interior)
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* 2. COJINES (3 unidades decorativas apoyadas sobre el asiento del sofá) */}
      {/* Cojín izquierdo verde oliva */}
      {/* RoundedBox ya es una malla: recibe directamente posición, giro y sombras */}
      <RoundedBox
        args={[0.14, 0.28, 0.28]} radius={0.035} smoothness={4}
        position={[SOFA_X + 0.12, FLOOR_Y + 0.42, SOFA_Z - 0.50]}
        rotation={[0.15, -0.3, 0.1]}
        castShadow
        receiveShadow
      >
          <meshStandardMaterial color={CUSHION_COLOR_OLIVE} roughness={0.85} />
      </RoundedBox>

      {/* Cojín central beige */}
      {/* RoundedBox ya es una malla: recibe directamente posición, giro y sombras */}
      <RoundedBox
        args={[0.12, 0.26, 0.28]} radius={0.03} smoothness={4}
        position={[SOFA_X + 0.14, FLOOR_Y + 0.40, SOFA_Z]}
        rotation={[0.1, -0.05, 0.12]}
        castShadow
        receiveShadow
      >
          <meshStandardMaterial color={CUSHION_COLOR_BEIGE} roughness={0.8} />
      </RoundedBox>

      {/* Cojín derecho burdeos */}
      {/* RoundedBox ya es una malla: recibe directamente posición, giro y sombras */}
      <RoundedBox
        args={[0.14, 0.28, 0.28]} radius={0.035} smoothness={4}
        position={[SOFA_X + 0.12, FLOOR_Y + 0.42, SOFA_Z + 0.50]}
        rotation={[0.12, 0.25, 0.08]}
        castShadow
        receiveShadow
      >
          <meshStandardMaterial color={CUSHION_COLOR_BURGUNDY} roughness={0.85} />
      </RoundedBox>

      {/* 3. MANTA DRAPEADA sobre el brazo del sofá (extremo hacia el ventanal) */}
      <mesh
        position={[SOFA_X, FLOOR_Y + 0.58, SOFA_Z + 0.82]}
        rotation={[0, 0, 0.05]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.38, 0.18, 0.16]} />
        <meshStandardMaterial color={BLANKET_COLOR} roughness={0.9} />
      </mesh>

      {/* 4. ALFOMBRA ESTAMPADA CON BORLAS (Fase 6): situada bajo la mesa y frente al sofá */}
      <Rug position={[RUG_X, FLOOR_Y, RUG_Z]} />

      {/* 5. MACETA CON ROSAL DE INTERIOR: únicamente en la esquina entre el sofá y el ventanal */}
      <PlantPot position={[POT_X, POT_Y, POT_CORNER_Z]} scale={POT_SCALE} rotationY={-Math.PI / 3} />

      {/* 6. MESA DE CAFÉ REDONDA DE MARQUETERÍA: apoyada sobre la alfombra */}
      <primitive
        object={tableScene}
        position={[TABLE_X, TABLE_Y, TABLE_Z]}
        scale={modelsManifest.coffeeTable.scale}
        rotation={[0, Math.PI / 6, 0]}
      />

      {/* 7. ELEMENTOS SOBRE EL TABLERO DE LA MESA DE CAFÉ */}
      {/* 7a. Libro abierto apoyado sobre el tablero hacia la derecha (+X) */}
      <primitive
        object={bookTableScene}
        position={[TABLE_X + 0.10, ITEMS_Y, TABLE_Z + 0.02]}
        scale={modelsManifest.bookTable.scale}
        // Rotación para orientarlo estéticamente hacia el lector sentado en el sofá
        rotation={[0, -Math.PI / 4, 0]}
      />

      {/* 7b. Taza de café con plato real (coffee.glb) hacia el frente izquierdo */}
      <primitive
        object={coffeeScene}
        position={MUG_POSITION}
        scale={modelsManifest.coffee.scale}
        rotation={[0, Math.PI / 3, 0]}
      />

      {/* 7c. Candelabro con vela real de cobre (candle.glb) hacia el fondo izquierdo */}
      <primitive
        object={candleScene}
        position={CANDLESTICK_POSITION}
        scale={modelsManifest.candle.scale}
        rotation={[0, 0.2, 0]}
      />

      {/* 7d. Llama titilante sobre la mecha del candelabro (Fase 7); la cera ya viene en el modelo */}
      <CandleLight position={CANDLE_FLAME_POSITION} withWax={false} />

      {/* 7e. Vapor sutil que sube de la taza (Fase 9c) */}
      <MugSteam position={STEAM_POSITION} />
    </group>
  )
}

export default SofaCorner
