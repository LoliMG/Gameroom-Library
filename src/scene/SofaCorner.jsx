// Importación de useMemo de React para clonar y configurar los modelos 3D
import { useMemo } from 'react'
// Hooks y primitivas auxiliares de @react-three/drei
import { useGLTF, RoundedBox } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Importación de las cotas de la habitación para calcular posiciones relativas
import { ROOM_WIDTH, ROOM_CENTER_Z, FLOOR_Y } from '@/scene/Room'
// Importación de la maceta con planta de interior (Fase 5)
import PlantPot from '@/scene/PlantPot'
// Importación de la alfombra estampada con borlas (Fase 6)
import Rug from '@/scene/Rug'

// Constantes de dimensiones y separación del conjunto del rincón de lectura
const WALL_B_X = ROOM_WIDTH / 2 // Cota X de la pared derecha b (+2.25 m)
const SOFA_OFFSET_FROM_WALL = 0.45 // Distancia del centro del sofá respecto a la pared b (fondo sofá ~0.70 m)
const SOFA_X = WALL_B_X - SOFA_OFFSET_FROM_WALL // Posición X del sofá (+1.80 m)
// Posición Z del sofá desplazada hacia el ventanal (+2.10 m) para dar paso al hueco de la puerta en la pared b
const SOFA_Z = 2.10
const SOFA_Y = FLOOR_Y + modelsManifest.sofa.groundOffset // Cota Y de apoyo sobre el suelo (-1.0 m)

// Constantes de la alfombra estampada bajo el conjunto de lectura (Fase 6)
const RUG_X = 1.15 // Centrada entre el sofá (+1.80 m) y la mesa (+0.85 m) para enmarcar ambos
const RUG_Z = SOFA_Z // Centrada longitudinalmente con el sofá (+2.10 m)
const RUG_Y = FLOOR_Y + modelsManifest.rug.groundOffset // -1.0 + 0.002 = -0.998 m (sin z-fighting)
const RUG_THICKNESS = 0.009 // Grosor del tejido de la alfombra

// Separación de la mesa de café respecto al sofá hacia el interior de la sala (-X)
const TABLE_DISTANCE_FROM_SOFA = 0.95
const TABLE_X = SOFA_X - TABLE_DISTANCE_FROM_SOFA // Posición X de la mesa de café (+0.85 m)
const TABLE_Z = SOFA_Z // Alineada con el centro del sofá en Z (+2.10 m)
// Patas de la mesa apoyadas limpiamente sobre la alfombra
const TABLE_Y = FLOOR_Y + RUG_THICKNESS // -1.0 + 0.009 = -0.991 m
// Altura superior del tablero de la mesa (suelo + grosor alfombra + altura de la mesa)
const TABLE_TOP_Y = TABLE_Y + modelsManifest.coffeeTable.targetDimensions.height // -0.541 m

// Constante para la única maceta decorativa situada en la esquina entre el sofá y el ventanal
const POT_X = WALL_B_X - 0.40 // Alineada con el fondo del sofá contra la pared b (+1.85 m)
const POT_Y = FLOOR_Y + modelsManifest.roseInAPot.groundOffset // -1.0 m
const POT_CORNER_Z = 3.45 // Esquina entre el sofá y el ventanal (a 55 cm de la pared c en Z=+4.0 m)

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
  const sofaScene = useMemo(() => enableShadows(sofaGLTF.scene.clone()), [sofaGLTF.scene])

  // 2. Carga de la mesa de café de marquetería
  const tableGLTF = useGLTF(modelsManifest.coffeeTable.url)
  const tableScene = useMemo(() => enableShadows(tableGLTF.scene.clone()), [tableGLTF.scene])

  // 3. Carga del libro abierto para la mesa
  const bookTableGLTF = useGLTF(modelsManifest.bookTable.url)
  const bookTableScene = useMemo(() => enableShadows(bookTableGLTF.scene.clone()), [bookTableGLTF.scene])

  // 4. Carga del modelo 3D de candelabro con vela (candle.glb)
  const candleGLTF = useGLTF(modelsManifest.candle.url)
  const candleScene = useMemo(() => enableShadows(candleGLTF.scene.clone()), [candleGLTF.scene])

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
      <mesh
        position={[SOFA_X + 0.12, FLOOR_Y + 0.42, SOFA_Z - 0.50]}
        rotation={[0.15, -0.3, 0.1]}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[0.14, 0.28, 0.28]} radius={0.035} smoothness={4}>
          <meshStandardMaterial color={CUSHION_COLOR_OLIVE} roughness={0.85} />
        </RoundedBox>
      </mesh>

      {/* Cojín central beige */}
      <mesh
        position={[SOFA_X + 0.14, FLOOR_Y + 0.40, SOFA_Z]}
        rotation={[0.1, -0.05, 0.12]}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[0.12, 0.26, 0.28]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color={CUSHION_COLOR_BEIGE} roughness={0.8} />
        </RoundedBox>
      </mesh>

      {/* Cojín derecho burdeos */}
      <mesh
        position={[SOFA_X + 0.12, FLOOR_Y + 0.42, SOFA_Z + 0.50]}
        rotation={[0.12, 0.25, 0.08]}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[0.14, 0.28, 0.28]} radius={0.035} smoothness={4}>
          <meshStandardMaterial color={CUSHION_COLOR_BURGUNDY} roughness={0.85} />
        </RoundedBox>
      </mesh>

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
      <Rug position={[RUG_X, RUG_Y, RUG_Z]} />

      {/* 5. MACETA CON ROSAL DE INTERIOR: únicamente en la esquina entre el sofá y el ventanal */}
      <PlantPot position={[POT_X, POT_Y, POT_CORNER_Z]} rotationY={-Math.PI / 3} />

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
        position={[TABLE_X + 0.10, TABLE_TOP_Y + 0.003, TABLE_Z + 0.02]}
        scale={modelsManifest.bookTable.scale}
        // Rotación para orientarlo estéticamente hacia el lector sentado en el sofá
        rotation={[0, -Math.PI / 4, 0]}
      />

      {/* 7b. Taza de café con plato real (coffee.glb) hacia el frente izquierdo */}
      <primitive
        object={coffeeScene}
        position={[TABLE_X - 0.12, TABLE_TOP_Y + 0.003, TABLE_Z + 0.14]}
        scale={modelsManifest.coffee.scale}
        rotation={[0, Math.PI / 3, 0]}
      />

      {/* 7c. Candelabro con vela real de cobre (candle.glb) hacia el fondo izquierdo */}
      <primitive
        object={candleScene}
        position={[TABLE_X - 0.12, TABLE_TOP_Y + 0.003, TABLE_Z - 0.14]}
        scale={modelsManifest.candle.scale}
        rotation={[0, 0.2, 0]}
      />
    </group>
  )
}

export default SofaCorner
