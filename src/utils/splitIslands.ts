// Tipo de three.js: geometría de una malla (posiciones de vértices, índices…)
import type { BufferGeometry } from 'three'

/**
 * Separa una geometría en sus piezas sueltas (grupos de triángulos que no se tocan entre sí).
 * Sirve para modelos que traen varios objetos en una sola malla, como las losas de elder_stones.glb.
 * Los vértices en la misma posición cuentan como uno (las costuras de las texturas los duplican).
 * Lo prueba scripts/checkSplitIslands.ts.
 *
 * @param geometry - Geometría (con o sin índice)
 * @returns Una geometría sin índice por pieza, solo con sus propios vértices
 */
export function splitIslands(geometry: BufferGeometry): BufferGeometry[] {
  const position = geometry.attributes.position
  // Sin índice, cada tres vértices seguidos forman un triángulo
  const index: ArrayLike<number> = geometry.index ? geometry.index.array : Array.from({ length: position.count }, (_, i) => i)

  // Unión-búsqueda: cada vértice apunta a un representante de su pieza
  const parent = Int32Array.from({ length: position.count }, (_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }

  // Vértices repetidos en la misma posición (costuras): se unen en la misma pieza
  const byPosition = new Map<string, number>()
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`
    const twin = byPosition.get(key)
    if (twin !== undefined) union(i, twin)
    else byPosition.set(key, i)
  }
  // Los tres vértices de cada triángulo son de la misma pieza
  for (let t = 0; t < index.length; t += 3) {
    union(index[t], index[t + 1])
    union(index[t + 1], index[t + 2])
  }

  // Triángulos agrupados por pieza
  const islands = new Map<number, number[]>()
  for (let t = 0; t < index.length; t += 3) {
    const root = find(index[t])
    if (!islands.has(root)) islands.set(root, [])
    islands.get(root)!.push(index[t], index[t + 1], index[t + 2])
  }

  // toNonIndexed copia solo los vértices de los triángulos de cada pieza
  return [...islands.values()].map((indices) => {
    const piece = geometry.clone()
    piece.setIndex(indices)
    return piece.toNonIndexed()
  })
}
