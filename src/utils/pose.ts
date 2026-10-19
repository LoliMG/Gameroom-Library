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

/** Huesos de un brazo, de hombro a mano (nombres tal como vienen en el .glb) */
export interface ArmBones {
  arm: string
  elbow: string
  hand: string
}

/**
 * Pasa un personaje de postura en T a una postura relajada: brazos caídos junto al cuerpo
 * y antebrazos algo doblados hacia delante.
 *
 * @param root - Raíz del modelo (clon con su propio esqueleto)
 * @param arms - Huesos de cada brazo
 * @param forward - Hacia dónde mira el personaje en el espacio del modelo
 * @param angles - Separación del brazo y flexión del codo (radianes)
 */
export function relaxArms(
  root: Object3D,
  arms: ArmBones[],
  forward: Vector3,
  { armSpread = 0.2, elbowBend = 0.35 }: { armSpread?: number; elbowBend?: number } = {}
): void {
  root.updateMatrixWorld(true)
  const front = forward.clone().setY(0).normalize()
  arms.forEach(({ arm, elbow, hand }) => {
    // Lado del brazo: hacia dónde apunta ahora (en postura en T, hacia fuera)
    const outward = bone(root, elbow).getWorldPosition(new Vector3())
      .sub(bone(root, arm).getWorldPosition(new Vector3()))
      .setY(0)
      .projectOnPlane(front)
      .normalize()
    // Brazo hacia abajo, ligeramente separado del cuerpo
    const armDirection = new Vector3(0, -Math.cos(armSpread), 0).addScaledVector(outward, Math.sin(armSpread))
    aimBone(root, arm, elbow, armDirection)
    // Antebrazo hacia abajo con el codo un poco doblado hacia delante
    const forearmDirection = new Vector3(0, -Math.cos(elbowBend), 0).addScaledVector(front, Math.sin(elbowBend))
    aimBone(root, elbow, hand, forearmDirection)
  })
}

/** Huesos de una pierna: cadera → rodilla */
export interface LegBones {
  leg: string
  knee: string
}

/**
 * Abre las piernas hacia los lados, rectas, un ángulo dado desde la vertical (postura alerta).
 * Con ángulos pequeños los pies apenas se levantan (largo de la pierna × (1 - cos)).
 *
 * @param root - Raíz del modelo (clon con su propio esqueleto)
 * @param legs - Huesos de cada pierna
 * @param angle - Apertura de cada pierna (radianes)
 */
export function spreadLegs(root: Object3D, legs: LegBones[], angle: number): void {
  root.updateMatrixWorld(true)
  const positions = legs.map(({ leg }) => bone(root, leg).getWorldPosition(new Vector3()))
  // Centro entre las caderas: cada pierna se abre alejándose de él
  const center = positions.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(positions.length)
  legs.forEach(({ leg, knee }, i) => {
    const outward = positions[i].clone().sub(center).setY(0).normalize()
    const direction = new Vector3(0, -Math.cos(angle), 0).addScaledVector(outward, Math.sin(angle))
    aimBone(root, leg, knee, direction)
  })
}
