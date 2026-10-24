// Vectores y cuaterniones de three.js para orientar huesos; Object3D es el tipo de cualquier nodo de la escena
import { Quaternion, Vector3 } from 'three'
import type { Object3D } from 'three'

/** Busca un hueso por nombre y falla con un mensaje claro si el modelo no lo tiene */
function bone(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name)
  if (!found) throw new Error(`[pose] Falta el hueso "${name}"`)
  return found
}

/**
 * Gira un hueso para que el tramo hasta otro hueso (normalmente su hijo) apunte en una dirección.
 * Funciona sin conocer los ejes internos del hueso, porque trabaja con posiciones en el espacio del modelo.
 * El modelo no debe estar todavía escalado ni girado en la escena (se llama sobre el clon recién preparado).
 *
 * @param root - Raíz del modelo
 * @param boneName - Hueso que se gira (por ejemplo el brazo)
 * @param targetName - Hueso hacia el que apunta (por ejemplo el codo)
 * @param direction - Dirección deseada en el espacio del modelo
 */
export function aimBone(root: Object3D, boneName: string, targetName: string, direction: Vector3): void {
  const moving = bone(root, boneName)
  const target = bone(root, targetName)
  root.updateMatrixWorld(true)
  const from = target.getWorldPosition(new Vector3()).sub(moving.getWorldPosition(new Vector3())).normalize()
  // Giro que lleva la dirección actual a la deseada
  const delta = new Quaternion().setFromUnitVectors(from, direction.clone().normalize())
  // Nueva orientación del hueso en el mundo y paso a su espacio local (relativo a su padre; un hueso siempre tiene padre)
  const worldRotation = delta.multiply(moving.getWorldQuaternion(new Quaternion()))
  const parentRotation = moving.parent!.getWorldQuaternion(new Quaternion())
  moving.quaternion.copy(parentRotation.invert().multiply(worldRotation))
  moving.updateMatrixWorld(true)
}
