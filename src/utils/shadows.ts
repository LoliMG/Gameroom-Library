// Tipos de three.js: Object3D es cualquier cosa de la escena (grupo, malla, luz…); Mesh es una malla con geometría
import type { Mesh, Object3D } from 'three'

/**
 * Activa "proyecta sombra" y "recibe sombra" en todas las mallas de un modelo (por ejemplo, un clon de un .glb).
 *
 * @param object - Raíz del modelo; se recorren todos sus hijos
 * @returns El mismo objeto (para poder encadenarlo, p. ej. enableShadows(prepareModel(...).wrapper))
 */
export function enableShadows<T extends Object3D>(object: T): T {
  object.traverse((node) => {
    // isMesh es la marca que pone three.js en las mallas (los grupos o las luces no la tienen)
    if ((node as Mesh).isMesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return object
}
