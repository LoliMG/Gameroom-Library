// Importación de Suspense y useMemo de React
import { Suspense, useMemo } from 'react'
// Hook useGLTF de drei para la carga de modelos 3D GLB
import { useGLTF } from '@react-three/drei'
// Importación de la paleta ambiental activa (CLOUDY, DUSK o SUNSET)
import { PALETTE } from '@/scene/ambiencePalette'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Generador pseudoaleatorio con semilla: el jardín sale siempre igual
import { createRandom } from '@/utils/random'
// Recorte por alfa para las hojas con transparencia (evita fallos de orden de dibujo)
import { applyAlphaCutout } from '@/utils/alphaCutout'
// Clases de Three.js para el cielo y para medir y centrar los modelos
import { CanvasTexture, SRGBColorSpace, RepeatWrapping, Box3, Vector3, Group, PropertyBinding } from 'three'
// Clonado que respeta esqueletos: con clone() normal, un modelo con esqueleto (como azalea.glb) dibuja todas sus copias
// amontonadas en el sitio del original; así fue como apareció una "flor flotante" dentro de la sala
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
// Cota del suelo de la habitación (el jardín está al mismo nivel)
import { FLOOR_Y } from '@/scene/Room'

// --- Cielo y suelo ---
const SKY_POSITION = [0, 3.5, 10.0]  // Plano del cielo detrás del jardín
const SKY_SIZE = [20, 12]
const GROUND_Y = FLOOR_Y - 0.02      // Un poco por debajo del suelo interior para no parpadear con él
const GROUND_POSITION = [0, GROUND_Y, 10.0]
const GROUND_SIZE = [20, 12]
// Verde musgo muy oscuro: fondo de la textura de hierba (el suelo que asoma se lee como sombra del sotobosque)
const GROUND_COLOR = '#141c0d'

// --- Textura de hierba generada por código (sin archivos externos) ---
const GRASS_SEED = 23
const GRASS_TEXTURE_SIZE = 256          // Resolución de una baldosa (px, potencia de 2 para los mipmaps)
const GRASS_TILE_SIZE = 1.0             // Metros de suelo que cubre una baldosa
const GRASS_BLADES = 3500               // Briznas por baldosa
const GRASS_BLADE_LENGTH = [5, 14]      // Largo de una brizna (px)
const GRASS_BLADE_WIDTH = 1.5           // Grosor de una brizna (px)
// Verdes oscuros: el suelo no tiene iluminación, así que estos son los colores finales en pantalla
const GRASS_COLORS = ['#1b2a10', '#22351a', '#2c4220', '#16220c', '#33491f']

// --- Patrón del jardín ---
const GARDEN_SEED = 11          // Semilla fija del reparto
const GARDEN_HALF_WIDTH = 6     // El jardín va de X = -6 m a X = +6 m (más ancho que la casa para llenar la vista)

// Arbusto de trees.glb (ligero, ~18 000 triángulos): forma todos los setos.
// La azalea no se usa: es un rododendro de hojas enormes y poco detalle que con la luz dorada se ve azul grisáceo.
const BUSH = { model: 'treesGarden', node: 'Tree EZTree1.Bush006' }

// Franjas repetidas a lo largo de X, de cerca a lejos del cristal (pared c en Z = +4.0 m).
// models: modelos del manifiesto (o { model, node }) que se alternan; z: rango de profundidad;
// spacing: separación media en X (m), menor que el ancho de la planta para que se solapen y no se vea el suelo;
// height: rango de alturas objetivo (m). Cada planta recibe un pequeño desplazamiento, giro y altura al azar.
const GARDEN_ROWS = [
  // Parterre junto a la ventana: lirios blancos y lirios araña muy juntos
  { models: ['lilies1', 'spiderLily'], z: [4.3, 4.6], spacing: 0.45, height: [0.55, 0.85] },
  // Segunda fila mezclada con el parterre: arbustos bajos y densos que nacen justo detrás de los lirios y tapan el suelo
  { models: [BUSH], z: [4.5, 5.0], spacing: 0.5, height: [0.6, 0.95] },
  // Tercera fila: arbustos medianos solapados
  { models: [BUSH], z: [5.4, 6.3], spacing: 0.8, height: [1.1, 1.5] },
  // Seto del fondo: arbustos grandes, tapa el suelo hasta la arboleda
  { models: [BUSH], z: [6.4, 7.4], spacing: 1.0, height: [1.3, 1.8] },
]

// Plantas sueltas: modelos pesados que no conviene repetir mucho
const GARDEN_ACCENTS = [
  // Lirios azul violeta (241 000 triángulos cada uno): repartidos delante, donde se ven desde las ventanas
  { model: 'purpleLilies', position: [-1.6, 5.2], height: 1.1, rotationY: 0.4 },
  { model: 'purpleLilies', position: [2.9, 5.3], height: 1.0, rotationY: -1.2 },
  { model: 'purpleLilies', position: [-3.0, 4.9], height: 0.95, rotationY: 2.2 },
  { model: 'purpleLilies', position: [-0.6, 4.85], height: 0.9, rotationY: -0.3 },
  { model: 'purpleLilies', position: [1.9, 4.9], height: 0.85, rotationY: 1.4 },
  { model: 'purpleLilies', position: [3.4, 5.0], height: 1.0, rotationY: -2.4 },
  // Rosales en maceta (603 000 triángulos cada uno: solo dos), uno frente a cada ventana
  { model: 'roseInAPot', position: [-2.0, 4.95], height: 0.9, rotationY: 0.8 },
  { model: 'roseInAPot', position: [1.0, 4.95], height: 0.85, rotationY: -0.5 },
]

// Arboleda del fondo: cada árbol de trees.glb una sola vez (el arbusto va en el seto), a distintas distancias y alturas
const GARDEN_TREES = [
  { node: 'Tree EZTree1.Large009', position: [-5.2, 9.0], height: 6.0, rotationY: 0.2 },
  { node: 'Tree EZTree0.Medium010', position: [-3.0, 7.6], height: 4.0, rotationY: 1.3 },
  { node: 'Tree EZTree0.Large', position: [-0.8, 9.2], height: 5.5, rotationY: -0.6 },
  { node: 'Tree EZTree1.Large001', position: [2.6, 8.8], height: 5.0, rotationY: 0.9 },
  { node: 'Tree EZTree1.Medium002', position: [4.4, 7.6], height: 3.6, rotationY: -1.7 },
  { node: 'Tree EZTree0.Medium011', position: [5.8, 9.1], height: 3.4, rotationY: 0.5 },
]

// Dibuja una baldosa de hierba: briznas cortas en varios verdes con orientación al azar.
// Cada brizna se dibuja también desplazada una baldosa en cada dirección para que la textura se repita sin costuras.
function createGrassTexture() {
  const random = createRandom(GRASS_SEED)
  const size = GRASS_TEXTURE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = GROUND_COLOR
  ctx.fillRect(0, 0, size, size)
  ctx.lineWidth = GRASS_BLADE_WIDTH
  ctx.lineCap = 'round'
  for (let i = 0; i < GRASS_BLADES; i++) {
    const x = random() * size
    const y = random() * size
    const length = GRASS_BLADE_LENGTH[0] + random() * (GRASS_BLADE_LENGTH[1] - GRASS_BLADE_LENGTH[0])
    const angle = random() * Math.PI * 2
    const dx = Math.cos(angle) * length
    const dy = Math.sin(angle) * length
    ctx.strokeStyle = GRASS_COLORS[Math.floor(random() * GRASS_COLORS.length)]
    ctx.beginPath()
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.moveTo(x + ox, y + oy)
        ctx.lineTo(x + ox + dx, y + oy + dy)
      }
    }
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  // Repeticiones calculadas a partir del tamaño del suelo: una baldosa por metro
  texture.repeat.set(GROUND_SIZE[0] / GRASS_TILE_SIZE, GROUND_SIZE[1] / GRASS_TILE_SIZE)
  return texture
}

// Reparte las plantas de cada franja a lo largo de X con variación determinista
function buildRowPlants() {
  const random = createRandom(GARDEN_SEED)
  return GARDEN_ROWS.flatMap(({ models, z, spacing, height }) => {
    const count = Math.floor((2 * GARDEN_HALF_WIDTH) / spacing) + 1
    return Array.from({ length: count }, (_, i) => {
      const pick = models[i % models.length]
      return {
        ...(typeof pick === 'string' ? { model: pick } : pick),
        // Posición base en la rejilla más un desplazamiento de hasta ±30 % de la separación
        position: [-GARDEN_HALF_WIDTH + i * spacing + (random() - 0.5) * spacing * 0.6, z[0] + random() * (z[1] - z[0])],
        height: height[0] + random() * (height[1] - height[0]),
        rotationY: random() * Math.PI * 2,
      }
    })
  })
}

// Clona un modelo (o un nodo concreto) y lo envuelve en un grupo con la base centrada en el origen.
// Devuelve el grupo y la escala que da la medida objetivo; así no dependemos de las escalas del manifiesto,
// que en algunos modelos del jardín (árboles, lirio araña) dejaban las plantas de milímetros.
function prepareModel(scene, node, height) {
  scene.updateMatrixWorld(true)
  // GLTFLoader sanea los nombres de nodo (espacios → _, sin puntos): se busca con el mismo saneado
  const source = node ? scene.getObjectByName(PropertyBinding.sanitizeNodeName(node)) : scene
  if (!source) throw new Error(`[Outside] No existe el nodo "${node}" en el modelo del jardín`)
  const object = cloneWithSkeleton(source)
  // Un nodo suelto pierde las transformaciones de sus padres: se las aplicamos para medirlo en el espacio del modelo
  if (node) object.applyMatrix4(source.parent.matrixWorld)
  object.updateMatrixWorld(true)
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  // Base apoyada en Y = 0 y centrada en X/Z
  object.position.sub(new Vector3(center.x, box.min.y, center.z))
  applyAlphaCutout(object)
  const wrapper = new Group()
  wrapper.add(object)
  return { wrapper, scale: height / size.y }
}

// Una planta del jardín: carga el modelo del manifiesto, lo escala a su medida y lo apoya en el suelo
function GardenPlant({ model, node, height, position, rotationY = 0 }) {
  const { scene } = useGLTF(modelsManifest[model].url)
  const { wrapper, scale } = useMemo(
    () => prepareModel(scene, node, height),
    [scene, node, height]
  )
  // Los elementos del jardín no proyectan sombras (presupuesto de rendimiento del plan)
  return <primitive object={wrapper} position={[position[0], GROUND_Y, position[1]]} rotation={[0, rotationY, 0]} scale={scale} />
}

/**
 * Jardín y cielo exterior visibles a través del gran ventanal
 */
function Outside() {
  // Generación procedimental de la textura de degradado del cielo según la paleta activa
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, PALETTE.skyTop)
    gradient.addColorStop(1, PALETTE.skyBottom)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 16, 256)

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])

  // Textura de hierba del suelo, generada una sola vez
  const grassTexture = useMemo(() => createGrassTexture(), [])

  // Plantas de las franjas, calculadas una vez (son deterministas)
  const rowPlants = useMemo(() => buildRowPlants(), [])

  return (
    // Grupo contenedor del entorno exterior posicionado detrás del ventanal (Z > 4.0 m)
    <group>
      {/* 1. Fondo de cielo con degradado atmosférico */}
      {/* Girado 180° en Y: su cara visible mira hacia la habitación (-Z); sin giro solo se veía por detrás y no se dibujaba */}
      <mesh position={SKY_POSITION} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={SKY_SIZE} />
        <meshBasicMaterial map={skyTexture} depthWrite={false} />
      </mesh>

      {/* 2. Suelo de hierba en sombra bajo las plantas: sin iluminación, porque la luz dorada fuerte lo aclaraba y se veía como tierra */}
      <mesh position={GROUND_POSITION} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={GROUND_SIZE} />
        <meshBasicMaterial map={grassTexture} />
      </mesh>

      {/* 3. Plantas: franjas de flores y arbustos, acentos y arboleda */}
      <Suspense fallback={null}>
        {rowPlants.map((plant, i) => (
          <GardenPlant key={`row-${i}`} {...plant} />
        ))}
        {GARDEN_ACCENTS.map((plant, i) => (
          <GardenPlant key={`accent-${i}`} {...plant} />
        ))}
        {GARDEN_TREES.map((tree) => (
          <GardenPlant key={tree.node} model="treesGarden" {...tree} />
        ))}
      </Suspense>
    </group>
  )
}

export default Outside
