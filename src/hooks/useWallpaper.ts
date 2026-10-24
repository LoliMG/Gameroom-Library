// Importación de useMemo de React para configurar cada copia una sola vez
import { useMemo } from 'react'
// useTexture de drei: carga la imagen (suspende hasta que está lista)
import { useTexture } from '@react-three/drei'
// Repetición en espejo y espacio de color de la textura
import { MirroredRepeatWrapping, SRGBColorSpace } from 'three'
// Papel pintado "Jasmine" de William Morris (1872), recortado de la foto del Met (dominio público, CC0): 1024 × 1024 px
// (Vite convierte el import de una imagen en su dirección: un string, tipo declarado en vite/client)
import wallpaperUrl from '@/assets/textures/wall/wallpaper.jpg'
// Tipo de three.js: textura
import type { Texture } from 'three'

// Metros de pared que cubre una repetición del dibujo
export const WALLPAPER_TILE_SIZE = 0.75
// Tinte del material del papel: lo oscurece un poco sin cambiar su dibujo ni sus colores
export const WALLPAPER_TINT = '#b4b4b4'

/**
 * Papel pintado de las paredes. Devuelve una copia de la textura con la repetición indicada:
 * - Geometrías con coordenadas de textura en metros (ShapeGeometry, ExtrudeGeometry): repeatX = repeatY = 1 / WALLPAPER_TILE_SIZE.
 * - Planos con coordenadas de 0 a 1: ancho / WALLPAPER_TILE_SIZE y alto / WALLPAPER_TILE_SIZE.
 * Cada pared tiene su copia (la repetición es propia de cada textura); la imagen se comparte.
 */
export default function useWallpaper(repeatX: number, repeatY: number): Texture {
  const loaded = useTexture(wallpaperUrl)
  return useMemo(() => {
    const texture = loaded.clone()
    // En espejo: el recorte no está hecho para repetirse borde con borde, y así no se ven las juntas
    texture.wrapS = MirroredRepeatWrapping
    texture.wrapT = MirroredRepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [loaded, repeatX, repeatY])
}
