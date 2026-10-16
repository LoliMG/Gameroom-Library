// Geometría compartida de las dos paredes de estanterías (d y a) y del bloque de la esquina.

import { ROOM_WIDTH, BACK_WALL_Z, FRONT_WALL_INNER_Z, FLOOR_Y } from '@/scene/Room'
import { SHELF_HEIGHT, BOOKSHELF_DEPTH } from '@/scene/Bookshelf'

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
// Longitud útil: del frente de las estanterías de la pared d (-1.65 m) a la cara interior del muro del ventanal (+3.94 m).
// Si llegaran hasta Z = +4.0, el último lateral quedaría dentro del muro y al fondo de los huecos se vería la pared verde
export const WALL_A_SHELF_LENGTH = FRONT_WALL_INNER_Z - BACK_WALL_Z - BOOKSHELF_DEPTH // 5.59m
// Posición X: apoyada contra la pared izquierda a (X = -ROOM_WIDTH / 2 = -2.60m)
export const SHELF_WALL_A_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.425m
// Posición Z: centrada en el tramo útil de la pared izquierda (desde Z = -1.65m hasta Z = +3.94m)
export const SHELF_WALL_A_Z = BACK_WALL_Z + BOOKSHELF_DEPTH + WALL_A_SHELF_LENGTH / 2 // 1.145m
// +90 grados sobre Y: la trasera (local -Z) apoya en la pared a (-X) y los lomos (local +Z) miran al interior (+X)
export const SHELF_WALL_A_ROTATION_Y = Math.PI / 2
