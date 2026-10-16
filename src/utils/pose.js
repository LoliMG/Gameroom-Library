// Vectores y cuaterniones de three.js para orientar huesos
import { Quaternion, Vector3 } from 'three'

/**
 * Gira un hueso para que el tramo hasta otro hueso (normalmente su hijo) apunte en una dirección.
 * Funciona sin conocer los ejes internos del hueso, porque trabaja con posiciones en el espacio del modelo.
 * El modelo no debe estar todavía escalado ni girado en la escena (se llama sobre el clon recién preparado).
 *
 * @param {Object3D} root - Raíz del modelo
 * @param {string} boneName - Hueso que se gira (por ejemplo el brazo)
 * @param {string} targetName - Hueso hacia el que apunta (por ejemplo el codo)
 * @param {Vector3} direction - Dirección deseada en el espacio del modelo
 */
export function aimBone(root, boneName, targetName, direction) {
  const bone = root.getObjectByName(boneName)
  const target = root.getObjectByName(targetName)
  if (!bone || !target) throw new Error(`[aimBone] Falta el hueso "${bone ? targetName : boneName}"`)
  root.updateMatrixWorld(true)
  const from = target.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize()
  // Giro que lleva la dirección actual a la deseada
  const delta = new Quaternion().setFromUnitVectors(from, direction.clone().normalize())
  // Nueva orientación del hueso en el mundo y paso a su espacio local (relativo a su padre)
  const worldRotation = delta.multiply(bone.getWorldQuaternion(new Quaternion()))
  const parentRotation = bone.parent.getWorldQuaternion(new Quaternion())
  bone.quaternion.copy(parentRotation.invert().multiply(worldRotation))
  bone.updateMatrixWorld(true)
}

/**
 * Pasa un personaje de postura en T a una postura relajada: brazos caídos junto al cuerpo
 * y antebrazos algo doblados hacia delante.
 *
 * @param {Object3D} root - Raíz del modelo (clon con su propio esqueleto)
 * @param {{ arm: string, elbow: string, hand: string }[]} arms - Huesos de cada brazo
 * @param {Vector3} forward - Hacia dónde mira el personaje en el espacio del modelo
 * @param {{ armSpread?: number, elbowBend?: number }} [angles] - Separación del brazo y flexión del codo (radianes)
 */
export function relaxArms(root, arms, forward, { armSpread = 0.2, elbowBend = 0.35 } = {}) {
  root.updateMatrixWorld(true)
  const front = forward.clone().setY(0).normalize()
  arms.forEach(({ arm, elbow, hand }) => {
    // Lado del brazo: hacia dónde apunta ahora (en postura en T, hacia fuera)
    const outward = root.getObjectByName(elbow).getWorldPosition(new Vector3())
      .sub(root.getObjectByName(arm).getWorldPosition(new Vector3()))
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

/**
 * Abre las piernas hacia los lados, rectas, un ángulo dado desde la vertical (postura alerta).
 * Con ángulos pequeños los pies apenas se levantan (largo de la pierna × (1 - cos)).
 *
 * @param {Object3D} root - Raíz del modelo (clon con su propio esqueleto)
 * @param {{ leg: string, knee: string }[]} legs - Huesos de cada pierna (cadera → rodilla)
 * @param {number} angle - Apertura de cada pierna (radianes)
 */
export function spreadLegs(root, legs, angle) {
  root.updateMatrixWorld(true)
  const positions = legs.map(({ leg }) => root.getObjectByName(leg).getWorldPosition(new Vector3()))
  // Centro entre las caderas: cada pierna se abre alejándose de él
  const center = positions.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(positions.length)
  legs.forEach(({ leg, knee }, i) => {
    const outward = positions[i].clone().sub(center).setY(0).normalize()
    const direction = new Vector3(0, -Math.cos(angle), 0).addScaledVector(outward, Math.sin(angle))
    aimBone(root, leg, knee, direction)
  })
}
