// Comprobación rápida de convexHull (silueta de los objetos que tapan la consola): node scripts/checkConvexHull.ts
import assert from 'node:assert/strict'
import { convexHull } from '../src/utils/convexHull.ts'

// Un cuadrado con un punto dentro y otro en mitad de un lado: quedan solo las cuatro esquinas, en orden
const hull = convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1], [1, 0]])
assert.deepEqual(hull, [[0, 0], [2, 0], [2, 2], [0, 2]])
// Pocos puntos: se devuelven tal cual
assert.deepEqual(convexHull([[3, 1]]), [[3, 1]])

console.log('convexHull: OK')
