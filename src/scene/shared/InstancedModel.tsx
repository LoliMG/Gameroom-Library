// useLayoutEffect coloca las copias antes del primer dibujado; useMemo prepara las piezas del modelo una vez
import { useLayoutEffect, useMemo, useRef } from 'react'
// useGLTF de drei para cargar el modelo
import { useGLTF } from '@react-three/drei'
// Matrices para componer el sitio de cada copia con la posición de cada pieza dentro del modelo
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { BufferGeometry, InstancedMesh, Material, Mesh } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
import type { ModelName } from '@/data/modelsManifest'
// Centra el modelo con la base en el suelo y da su escala
import { prepareModel } from '@/utils/prepareModel'

/** Una copia del modelo: sitio de su base, altura y giro sobre Y */
export interface ModelItem {
  position: Vector3Tuple
  height: number
  rotationY?: number
}

/** Una malla del modelo con su posición dentro de él */
interface Part {
  geometry: BufferGeometry
  material: Material | Material[]
  matrix: Matrix4
  // -1 en la pasada previa de profundidad (depthPrepass)
  renderOrder: number
}

// Una pieza (malla) del modelo repetida en todos los sitios de items
function InstancedPart({ part, items }: { part: Part; items: ModelItem[] }) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
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

  return <instancedMesh ref={meshRef} args={[part.geometry, part.material, items.length]} renderOrder={part.renderOrder} />
}

/**
 * Muchas copias de un modelo del manifiesto (o de uno de sus nodos) con una llamada de dibujo por malla del modelo,
 * en vez de una por malla y copia. Para flores: 40 lirios cuestan lo mismo en llamadas que uno.
 *
 * @param model - Clave del manifiesto
 * @param node - Nodo concreto del modelo (por ejemplo, un solo tallo de un ramo)
 * @param items - Sitio (base), altura y giro de cada copia
 * @param depthPrepass - Pasada previa de profundidad para las hojas (árboles; ver depthPrepass.ts)
 */
function InstancedModel({ model, node, items, depthPrepass = false }: { model: ModelName; node?: string; items: ModelItem[]; depthPrepass?: boolean }) {
  const { scene } = useGLTF(modelsManifest[model].url)
  const parts = useMemo(() => {
    // Modelo centrado, con la base en Y = 0 y escalado a 1 m de alto: cada copia lo escala a su altura
    const { wrapper, scale } = prepareModel(scene, node, 1, { depthPrepass })
    wrapper.scale.setScalar(scale)
    wrapper.updateMatrixWorld(true)
    const meshes: Part[] = []
    wrapper.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) meshes.push({ geometry: mesh.geometry, material: mesh.material, matrix: mesh.matrixWorld.clone(), renderOrder: mesh.renderOrder })
    })
    return meshes
  }, [scene, node, depthPrepass])

  return parts.map((part, i) => <InstancedPart key={i} part={part} items={items} />)
}

export default InstancedModel
