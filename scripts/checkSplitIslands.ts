// Comprobación rápida de splitIslands (separar piezas sueltas de una malla): node scripts/checkSplitIslands.ts
import assert from 'node:assert/strict'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { splitIslands } from '../src/utils/splitIslands.ts'

// Dos cuadrados: el primero con sus dos triángulos unidos solo por posición (vértices duplicados, como en una costura
// de textura) y el segundo lejos. Deben salir dos piezas de 2 triángulos cada una
const quad = (x: number) => [x, 0, 0, x + 1, 0, 0, x + 1, 1, 0, x, 0, 0, x + 1, 1, 0, x, 1, 0]
const geometry = new BufferGeometry()
geometry.setAttribute('position', new Float32BufferAttribute([...quad(0), ...quad(5)], 3))

const pieces = splitIslands(geometry)
assert.equal(pieces.length, 2)
pieces.forEach((piece) => assert.equal(piece.attributes.position.count, 6))
// Cada pieza conserva solo sus vértices: la caja de la segunda empieza en X = 5
pieces[1].computeBoundingBox()
assert.equal(pieces[1].boundingBox!.min.x, 5)

console.log('splitIslands: OK')
