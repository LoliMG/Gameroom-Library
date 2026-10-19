// useLayoutEffect coloca las copias antes del primer dibujado; useRef guarda la malla instanciada
import { useLayoutEffect, useRef } from 'react'
// Object3D auxiliar para componer la matriz de cada copia y Color para su tinte
import { Color, Object3D } from 'three'
import type { BufferGeometry, InstancedMesh, Material } from 'three'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

/** Una copia: sitio, giro, tamaño (un número o [x, y, z]) y tinte opcional */
export interface ScatterItem {
  position: Vector3Tuple
  rotation?: Vector3Tuple
  scale?: number | Vector3Tuple
  color?: string
}

/**
 * Muchas copias de la misma geometría y material en una sola llamada de dibujo (InstancedMesh).
 * Para flores, piedras del camino, racimos de glicinia o cipreses: cientos de piezas sin coste por pieza.
 *
 * @param geometry - Geometría compartida
 * @param material - Material compartido (el color de cada copia lo multiplica)
 * @param items - Copias
 */
function InstancedScatter({ geometry, material, items }: { geometry: BufferGeometry; material: Material | Material[]; items: ScatterItem[] }) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new Object3D()
    const color = new Color()
    items.forEach((item, i) => {
      dummy.position.set(...item.position)
      dummy.rotation.set(...(item.rotation ?? [0, 0, 0]))
      const scale = item.scale ?? 1
      if (Array.isArray(scale)) dummy.scale.set(...scale)
      else dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (item.color) mesh.setColorAt(i, color.set(item.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // Sin esto la caja envolvente es la de una sola copia y three.js descarta las demás al salir de cámara
    mesh.computeBoundingSphere()
  }, [items])

  return <instancedMesh ref={meshRef} args={[geometry, material, items.length]} />
}

export default InstancedScatter
