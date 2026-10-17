// useLayoutEffect coloca las copias antes del primer dibujado; useRef guarda la malla instanciada
import { useLayoutEffect, useRef } from 'react'
// Object3D auxiliar para componer la matriz de cada copia y Color para su tinte
import { Color, Object3D } from 'three'

/**
 * Muchas copias de la misma geometría y material en una sola llamada de dibujo (InstancedMesh).
 * Para flores, piedras del camino, racimos de glicinia o cipreses: cientos de piezas sin coste por pieza.
 *
 * @param {BufferGeometry} geometry - Geometría compartida
 * @param {Material} material - Material compartido (el color de cada copia lo multiplica)
 * @param {{ position: number[], rotation?: number[], scale?: number|number[], color?: string }[]} items - Copias
 */
function InstancedScatter({ geometry, material, items }) {
  const meshRef = useRef(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
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
