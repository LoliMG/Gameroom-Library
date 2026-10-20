/**
 * Envolvente convexa de unos puntos en el plano (algoritmo de la cadena monótona de Andrew): el polígono más pequeño que
 * los contiene a todos, en orden y sin repetir el primero. Con menos de 3 puntos distintos devuelve los que haya.
 */
export function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  // Giro de o→a→b: positivo a la izquierda, negativo a la derecha, 0 en línea
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: [number, number][]) => {
    const chain: [number, number][] = []
    for (const point of list) {
      while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) chain.pop()
      chain.push(point)
    }
    chain.pop() // El último es el primero de la otra mitad
    return chain
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}
