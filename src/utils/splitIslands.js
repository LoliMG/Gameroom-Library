/**
 * Separa una geometría en sus piezas sueltas (grupos de triángulos que no se tocan entre sí).
 * Sirve para modelos que traen varios objetos en una sola malla, como las losas de elder_stones.glb.
 * Los vértices en la misma posición cuentan como uno (las costuras de las texturas los duplican).
 *
 * @param {BufferGeometry} geometry - Geometría (con o sin índice)
 * @returns {BufferGeometry[]} Una geometría sin índice por pieza, solo con sus propios vértices
 */
export function splitIslands(geometry) {
  const position = geometry.attributes.position
  const index = geometry.index ? geometry.index.array : Array.from({ length: position.count }, (_, i) => i)

  // Unión-búsqueda: cada vértice apunta a un representante de su pieza
  const parent = Int32Array.from({ length: position.count }, (_, i) => i)
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a, b) => {
    parent[find(a)] = find(b)
  }

  const byPosition = new Map()
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`
    if (byPosition.has(key)) union(i, byPosition.get(key))
    else byPosition.set(key, i)
  }
  for (let t = 0; t < index.length; t += 3) {
    union(index[t], index[t + 1])
    union(index[t + 1], index[t + 2])
  }

  // Triángulos agrupados por pieza
  const islands = new Map()
  for (let t = 0; t < index.length; t += 3) {
    const root = find(index[t])
    if (!islands.has(root)) islands.set(root, [])
    islands.get(root).push(index[t], index[t + 1], index[t + 2])
  }

  // toNonIndexed copia solo los vértices de los triángulos de cada pieza
  return [...islands.values()].map((indices) => {
    const piece = geometry.clone()
    piece.setIndex(indices)
    return piece.toNonIndexed()
  })
}
