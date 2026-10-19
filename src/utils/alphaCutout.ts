// Tipos de three.js: la malla, su material y la textura de color del material
import type { Material, Mesh, Object3D, Texture } from 'three'

// Umbral de alfa por debajo del cual se descarta el píxel
const ALPHA_CUTOFF = 0.5

// Material con textura de color (map): lo tienen los materiales estándar que trae un .glb
type MaterialWithMap = Material & { map?: Texture | null }

/**
 * Cambia los materiales con transparencia mezclada (BLEND) de un modelo a recorte por alfa (alphaTest).
 * Con mezcla, three.js no puede ordenar los triángulos de una misma malla y unas partes tapan a otras
 * (sofá "cortado", hojas que desaparecen); con recorte cada píxel es opaco o invisible y se ordena por profundidad.
 * Los clones de un modelo comparten materiales, así que el cambio afecta a todos; es idempotente.
 *
 * @param object - Raíz del modelo
 * @returns El mismo objeto
 */
export function applyAlphaCutout<T extends Object3D>(object: T): T {
  object.traverse((child) => {
    const mesh = child as Mesh
    // Solo mallas con un único material (las de varios materiales no llevan hojas transparentes en estos modelos)
    if (!mesh.isMesh || Array.isArray(mesh.material)) return
    const material = mesh.material as MaterialWithMap
    if (material.transparent && material.map) {
      material.alphaTest = ALPHA_CUTOFF
      material.transparent = false
      material.depthWrite = true
    }
  })
  return object
}
