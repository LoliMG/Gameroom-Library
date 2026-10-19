// Clases de Three.js para medir y centrar el modelo
import { Box3, Vector3, Group, PropertyBinding } from 'three'
// Clonado que respeta esqueletos: con clone() normal, un modelo con esqueleto (como bakugo.glb) dibuja todas sus copias
// amontonadas en el sitio del original; así fue como apareció una "flor flotante" dentro de la sala
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
// Recorte por alfa para las hojas con transparencia (evita fallos de orden de dibujo)
import { applyAlphaCutout } from '@/utils/alphaCutout'

/**
 * Clona un modelo (o un nodo concreto) y lo envuelve en un grupo con la base centrada en el origen.
 * Devuelve { wrapper, scale }: la escala da la altura pedida, así no dependemos de las escalas del manifiesto
 * (en algunos modelos dejaban las plantas de milímetros).
 *
 * @param {Object3D} scene - Escena cargada con useGLTF
 * @param {string} [node] - Nombre del nodo a extraer (tal como aparece en el .glb)
 * @param {number} height - Altura objetivo en metros
 * @param {{ alphaCutout?: boolean }} [options] - alphaCutout: pasar la transparencia a recorte (false para cristal)
 */
export function prepareModel(scene, node, height, { alphaCutout = true } = {}) {
  scene.updateMatrixWorld(true)
  // GLTFLoader sanea los nombres de nodo (espacios → _, sin puntos): se busca con el mismo saneado
  const source = node ? scene.getObjectByName(PropertyBinding.sanitizeNodeName(node)) : scene
  if (!source) throw new Error(`[prepareModel] No existe el nodo "${node}" en el modelo`)
  const object = cloneWithSkeleton(source)
  // Un nodo suelto pierde las transformaciones de sus padres: se las aplicamos para medirlo en el espacio del modelo
  if (node) object.applyMatrix4(source.parent.matrixWorld)
  object.updateMatrixWorld(true)
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  // Base apoyada en Y = 0 y centrada en X/Z
  object.position.sub(new Vector3(center.x, box.min.y, center.z))
  if (alphaCutout) applyAlphaCutout(object)
  const wrapper = new Group()
  wrapper.add(object)
  return { wrapper, scale: height / size.y }
}
