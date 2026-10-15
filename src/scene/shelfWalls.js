// Geometría compartida de las dos paredes de estanterías (d y a).
// La usan Experience.jsx (para colocar las paredes) y los decorados de las baldas (velas, objetos),
// de modo que cualquier objeto en una balda se calcula con las mismas constantes que las estanterías.

import { ROOM_WIDTH, ROOM_DEPTH, BACK_WALL_Z, FLOOR_Y } from '@/scene/Room'
import {
  SHELF_HEIGHT,
  BOOKSHELF_DEPTH,
  BASE_SHELF_WIDTH,
  BOARD_THICKNESS,
  COMPARTMENT_HEIGHT,
} from '@/scene/Bookshelf'

// Cota Y para apoyar la base de todas las estanterías (altura 2.7m) sobre el suelo (Y = -1.0)
export const SHELF_WALL_Y = FLOOR_Y + SHELF_HEIGHT / 2 // -1.0 + 1.35 = 0.35

// 1. PARED DEL FONDO (d):
// Longitud útil: desde el frente de la estantería de la pared a (X = -ROOM_WIDTH/2 + BOOKSHELF_DEPTH = -2.25m)
// hasta la pared derecha (X = +ROOM_WIDTH/2 = +2.60m). Total: 5.2 - 0.35 = 4.85m.
export const WALL_D_SHELF_LENGTH = ROOM_WIDTH - BOOKSHELF_DEPTH // 4.85m
// Posición X centrada en el tramo útil de la pared d: (-2.25 + 2.60) / 2 = +0.175m
export const SHELF_WALL_D_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH + WALL_D_SHELF_LENGTH / 2 // 0.175m
// Posición Z: adosada contra la pared del fondo (Z = -2.0m)
export const SHELF_WALL_D_Z = BACK_WALL_Z + BOOKSHELF_DEPTH / 2 // -2.0 + 0.175 = -1.825m
// Sin rotación: los lomos (local +Z) miran al interior (+Z)
export const SHELF_WALL_D_ROTATION_Y = 0

// 2. PARED IZQUIERDA (a):
// Longitud útil: profundidad de la habitación menos el fondo de las estanterías de la pared d (6.0 - 0.35 = 5.65m)
export const WALL_A_SHELF_LENGTH = ROOM_DEPTH - BOOKSHELF_DEPTH // 5.65m
// Posición X: apoyada contra la pared izquierda a (X = -ROOM_WIDTH / 2 = -2.60m)
export const SHELF_WALL_A_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.425m
// Posición Z: centrada en el tramo útil de la pared izquierda (desde Z = -1.65m hasta Z = +4.0m)
export const SHELF_WALL_A_Z = BACK_WALL_Z + BOOKSHELF_DEPTH + WALL_A_SHELF_LENGTH / 2 // 1.175m
// +90 grados sobre Y: la trasera (local -Z) apoya en la pared a (-X) y los lomos (local +Z) miran al interior (+X)
export const SHELF_WALL_A_ROTATION_Y = Math.PI / 2

// Configuración de cada pared indexada por su letra
export const SHELF_WALLS = {
  d: {
    length: WALL_D_SHELF_LENGTH,
    center: [SHELF_WALL_D_X, SHELF_WALL_Y, SHELF_WALL_D_Z],
    rotationY: SHELF_WALL_D_ROTATION_Y,
  },
  a: {
    length: WALL_A_SHELF_LENGTH,
    center: [SHELF_WALL_A_X, SHELF_WALL_Y, SHELF_WALL_A_Z],
    rotationY: SHELF_WALL_A_ROTATION_Y,
  },
}

/**
 * Devuelve la posición en el mundo de un punto apoyado sobre una balda concreta.
 * Usa el mismo reparto de módulos que BookshelfWall (número de módulos = round(longitud / 1.2 m)).
 *
 * @param {'d'|'a'} wall - Pared de estanterías
 * @param {number} moduleIndex - Módulo contando desde el extremo local -X de la pared (0 = primero)
 * @param {number} shelfIndex - Balda (0 = la de abajo, 7 = la de arriba)
 * @param {number} along - Desplazamiento a lo largo de la balda en fracción del ancho útil (-0.5 a 0.5, 0 = centro)
 * @param {number} depth - Desplazamiento hacia el frente desde el centro del fondo de la balda (m)
 * @returns {{ position: number[], rotationY: number }} Punto de apoyo y giro para mirar al interior
 */
export function getShelfSlot(wall, moduleIndex, shelfIndex, along = 0, depth = 0) {
  const { length, center, rotationY } = SHELF_WALLS[wall]
  // Mismo cálculo de módulos que BookshelfWall para cubrir la pared exacta
  const moduleCount = Math.max(1, Math.round(length / BASE_SHELF_WIDTH))
  const moduleWidth = length / moduleCount
  const innerWidth = moduleWidth - 2 * BOARD_THICKNESS
  // X local del punto: centro del módulo + desplazamiento dentro del ancho útil
  const localX = -length / 2 + moduleWidth * (moduleIndex + 0.5) + along * innerWidth
  // Y local de la superficie de la balda (misma fórmula que getShelfSurfaceY de Bookshelf)
  const localY = -SHELF_HEIGHT / 2 + BOARD_THICKNESS + shelfIndex * (COMPARTMENT_HEIGHT + BOARD_THICKNESS)
  const localZ = depth
  // Giro del punto local alrededor de Y según la orientación de la pared y traslado al centro de la pared
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  const position = [
    center[0] + localX * cos + localZ * sin,
    center[1] + localY,
    center[2] - localX * sin + localZ * cos,
  ]
  return { position, rotationY }
}
