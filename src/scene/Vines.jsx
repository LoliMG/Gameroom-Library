// Importación de useMemo y useLayoutEffect de React para calcular y aplicar las matrices de las hojas una sola vez
import { useMemo, useLayoutEffect, useRef } from 'react'
// Clases de Three.js para construir las matrices de cada hoja instanciada
import { Object3D } from 'three'
// Importación de las dimensiones de la habitación
import { ROOM_HEIGHT, FRONT_WALL_INNER_Z, FLOOR_Y } from '@/scene/Room'

// Cara interior del muro del ventanal (WindowWall tiene 0.12 m de grosor, centrado en FRONT_WALL_Z)
// Separación de las enredaderas respecto a la cara interior del muro
const WALL_GAP = 0.04
// Plano Z donde cuelgan las enredaderas
const VINE_Z = FRONT_WALL_INNER_Z - WALL_GAP
// Arranque de las enredaderas: justo bajo la moldura del techo (alto de moldura 0.08 m)
const VINE_TOP_Y = FLOOR_Y + ROOM_HEIGHT - 0.08

// Lista determinista de tallos colgantes junto al ventanal: x (m) y longitud (m)
const VINE_STRANDS = [
  { x: -2.08, length: 1.35 },
  { x: -1.86, length: 0.8 },
  { x: -1.55, length: 0.45 },
  { x: -0.28, length: 0.6 },
  { x: -0.05, length: 1.1 },
  { x: 0.2, length: 0.75 },
  { x: 1.5, length: 0.5 },
  { x: 1.84, length: 0.95 },
  { x: 2.08, length: 1.5 },
]

// Hojas
const LEAVES_PER_METER = 34           // Densidad de hojas a lo largo del tallo
const LEAF_WIDTH = 0.045              // Ancho de una hoja (m)
const LEAF_LENGTH = 0.06              // Largo de una hoja (m)
const LEAF_THICKNESS = 0.004          // Grosor (hoja casi plana)
const LEAF_SPREAD = 0.035             // Separación lateral máxima respecto al tallo
const LEAF_COLORS = ['#2f4a2a', '#3d5c32', '#264022'] // Verdes variados
const STEM_RADIUS = 0.004
const STEM_COLOR = '#3a3222'
const RANDOM_SEED = 7                 // Semilla fija: las hojas salen siempre igual

// Generador pseudoaleatorio determinista (mulberry32) para colocar las hojas de forma reproducible
function createRandom(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Calcula posición, giro y tamaño de todas las hojas, agrupadas por color
function buildLeaves() {
  const random = createRandom(RANDOM_SEED)
  const groups = LEAF_COLORS.map(() => [])
  VINE_STRANDS.forEach(({ x, length }) => {
    const count = Math.round(length * LEAVES_PER_METER)
    for (let i = 0; i < count; i++) {
      // Reparto a lo largo del tallo, con más hojas arriba y algo de variación
      const t = (i + random() * 0.6) / count
      const y = VINE_TOP_Y - t * length
      // Las hojas se abren a ambos lados del tallo y ligeramente hacia la sala (-Z)
      const side = i % 2 === 0 ? 1 : -1
      const position = [
        x + side * random() * LEAF_SPREAD,
        y,
        VINE_Z - random() * LEAF_SPREAD * 0.6,
      ]
      // Giro: inclinadas hacia abajo y orientadas al azar alrededor del tallo
      const rotation = [0.6 + random() * 0.6, random() * Math.PI * 2, side * (0.3 + random() * 0.5)]
      // Las hojas del extremo inferior son más pequeñas
      const scale = 0.6 + (1 - t) * 0.4 + random() * 0.2
      groups[Math.floor(random() * LEAF_COLORS.length)].push({ position, rotation, scale })
    }
  })
  return groups
}

// Malla instanciada con todas las hojas de un mismo color (una sola llamada de dibujo por color)
function LeafInstances({ leaves, color }) {
  const meshRef = useRef()

  // useLayoutEffect: escribe la matriz de cada instancia antes del primer render
  useLayoutEffect(() => {
    const helper = new Object3D()
    leaves.forEach(({ position, rotation, scale }, i) => {
      helper.position.set(...position)
      helper.rotation.set(...rotation)
      helper.scale.set(LEAF_WIDTH * scale, LEAF_LENGTH * scale, LEAF_THICKNESS)
      helper.updateMatrix()
      meshRef.current.setMatrixAt(i, helper.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [leaves])

  return (
    // args: [geometría, material, número de instancias]; la geometría y el material se pasan como hijos
    <instancedMesh ref={meshRef} args={[null, null, leaves.length]} castShadow receiveShadow>
      {/* Esfera unitaria: escalada queda como una hoja ovalada y plana */}
      <sphereGeometry args={[0.5, 8, 6]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </instancedMesh>
  )
}

/**
 * Enredaderas que cuelgan junto al ventanal (pared c), hechas con hileras de hojas de geometría sencilla.
 */
function Vines() {
  // Las hojas se calculan una vez (son deterministas)
  const leafGroups = useMemo(() => buildLeaves(), [])

  return (
    <group>
      {/* Tallos: cilindros finos colgando desde el techo */}
      {VINE_STRANDS.map(({ x, length }) => (
        <mesh key={x} position={[x, VINE_TOP_Y - length / 2, VINE_Z]}>
          <cylinderGeometry args={[STEM_RADIUS, STEM_RADIUS * 0.6, length, 5]} />
          <meshStandardMaterial color={STEM_COLOR} roughness={0.9} />
        </mesh>
      ))}

      {/* Hojas agrupadas por color */}
      {leafGroups.map((leaves, i) => (
        <LeafInstances key={i} leaves={leaves} color={LEAF_COLORS[i]} />
      ))}
    </group>
  )
}

export default Vines
