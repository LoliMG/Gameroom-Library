// useLayoutEffect coloca las copias antes del primer dibujado; useMemo prepara las piezas del modelo una vez
import { useLayoutEffect, useMemo, useRef } from 'react'
// useGLTF de drei para cargar el modelo
import { useGLTF } from '@react-three/drei'
// Matrices para componer el sitio de cada copia con la posición de cada pieza dentro del modelo
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Centra el modelo con la base en el suelo y da su escala
import { prepareModel } from '@/utils/prepareModel'

// Una pieza (malla) del modelo repetida en todos los sitios de items
function InstancedPart({ part, items }) {
  const meshRef = useRef(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    const placement = new Matrix4()
    const rotation = new Quaternion()
    items.forEach((item, i) => {
      rotation.setFromEuler(new Euler(0, item.rotationY ?? 0, 0))
      placement.compose(new Vector3(...item.position), rotation, new Vector3().setScalar(item.height))
      // Sitio de la copia × posición de la pieza dentro del modelo (ya centrado y de 1 m de alto)
      mesh.setMatrixAt(i, placement.multiply(part.matrix))
    })
    mesh.instanceMatrix.needsUpdate = true
    // Sin esto la caja envolvente es la de una sola copia y three.js descarta las demás al salir de cámara
    mesh.computeBoundingSphere()
  }, [part, items])

  return <instancedMesh ref={meshRef} args={[part.geometry, part.material, items.length]} />
}

/**
 * Muchas copias de un modelo del manifiesto (o de uno de sus nodos) con una llamada de dibujo por malla del modelo,
 * en vez de una por malla y copia. Para flores: 40 lirios cuestan lo mismo en llamadas que uno.
 *
 * @param {string} model - Clave del manifiesto
 * @param {string} [node] - Nodo concreto del modelo (por ejemplo, un solo tallo de un ramo)
 * @param {{ position: number[], height: number, rotationY?: number }[]} items - Sitio (base), altura y giro de cada copia
 */
function InstancedModel({ model, node, items }) {
  const { scene } = useGLTF(modelsManifest[model].url)
  const parts = useMemo(() => {
    // Modelo centrado, con la base en Y = 0 y escalado a 1 m de alto: cada copia lo escala a su altura
    const { wrapper, scale } = prepareModel(scene, node, 1)
    wrapper.scale.setScalar(scale)
    wrapper.updateMatrixWorld(true)
    const meshes = []
    wrapper.traverse((object) => {
      if (object.isMesh) meshes.push({ geometry: object.geometry, material: object.material, matrix: object.matrixWorld.clone() })
    })
    return meshes
  }, [scene, node])

  return parts.map((part, i) => <InstancedPart key={i} part={part} items={items} />)
}

export default InstancedModel
