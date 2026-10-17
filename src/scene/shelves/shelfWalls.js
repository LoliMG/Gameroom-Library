// Geometría de la pared de estanterías (pared a, la del mueble). La pared del fondo (d) no lleva estanterías:
// solo papel pintado y rodapié.

import { ROOM_WIDTH, BACK_WALL_Z, FRONT_WALL_INNER_Z, FLOOR_Y } from '@/scene/Room'
import { SHELF_HEIGHT, BOOKSHELF_DEPTH } from '@/scene/Bookshelf'

// Cota Y para apoyar la base de todas las estanterías (altura 2.7m) sobre el suelo (Y = -1.0)
export const SHELF_WALL_Y = FLOOR_Y + SHELF_HEIGHT / 2 // -1.0 + 1.35 = 0.35

// PARED IZQUIERDA (a):
// Longitud útil: de la pared del fondo (-2.0 m) a la cara interior del muro del ventanal (+3.94 m).
// Si llegaran hasta Z = +4.0, el último lateral quedaría dentro del muro y al fondo de los huecos se vería la pared verde
export const WALL_A_SHELF_LENGTH = FRONT_WALL_INNER_Z - BACK_WALL_Z // 5.94m
// Posición X: apoyada contra la pared izquierda a (X = -ROOM_WIDTH / 2 = -2.60m)
export const SHELF_WALL_A_X = -ROOM_WIDTH / 2 + BOOKSHELF_DEPTH / 2 // -2.425m
// Posición Z: centrada en el tramo útil de la pared izquierda (desde Z = -2.0m hasta Z = +3.94m)
export const SHELF_WALL_A_Z = BACK_WALL_Z + WALL_A_SHELF_LENGTH / 2 // 0.97m
// +90 grados sobre Y: la trasera (local -Z) apoya en la pared a (-X) y los lomos (local +Z) miran al interior (+X)
export const SHELF_WALL_A_ROTATION_Y = Math.PI / 2
