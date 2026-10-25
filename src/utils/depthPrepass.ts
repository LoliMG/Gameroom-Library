// Material barato que solo escribe profundidad y comparación "igual" para la pasada de color
import { EqualDepth, Mesh, MeshBasicMaterial } from 'three'
import type { Material, Object3D } from 'three'

// Por material original: su copia para la pasada de color y el de la pasada de profundidad (compartidos entre modelos)
const cache = new WeakMap<Material, { color: Material; depth: Material }>()

/**
 * Pasada previa de profundidad para las mallas con recorte por alfa (hojas de los árboles): cada hoja se dibuja primero
 * solo en profundidad con un material sin luces, y luego en color solo donde quedó delante (EqualDepth). Con recorte por
 * alfa la tarjeta no descarta lo tapado antes de iluminarlo y todas las luces puntuales se calculaban en cada capa de hojas;
 * así se iluminan una vez por píxel. Se ve igual. Los materiales originales no se tocan (se usan copias).
 *
 * @param object - Raíz del modelo ya preparado (prepareModel)
 * @returns El mismo objeto
 */
export function addDepthPrepass<T extends Object3D>(object: T): T {
  const meshes: Mesh[] = []
  object.traverse((child) => {
    const mesh = child as Mesh
    // Solo con el alfa en map (el de las hojas de trees.glb): la pasada previa recorta con map y nada más
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.alphaTest > 0 && (mesh.material as MeshBasicMaterial).map) meshes.push(mesh)
  })
  for (const mesh of meshes) {
    const original = mesh.material as Material & { map?: MeshBasicMaterial['map'] }
    let pair = cache.get(original)
    if (!pair) {
      const color = original.clone()
      // Sin recorte: lo transparente ya no pasa la comparación de profundidad (la pasada previa no lo escribió)
      color.alphaTest = 0
      color.depthFunc = EqualDepth
      color.depthWrite = false
      const depth = new MeshBasicMaterial({ map: original.map, alphaTest: original.alphaTest, side: original.side, colorWrite: false })
      pair = { color, depth }
      cache.set(original, pair)
    }
    mesh.material = pair.color
    const prepass = new Mesh(mesh.geometry, pair.depth)
    // Antes que cualquier malla opaca
    prepass.renderOrder = -1
    mesh.add(prepass)
  }
  return object
}
