// Importación de useMemo de React para crear las texturas una sola vez
import { useMemo } from 'react'
// useGLTF de drei: la madera sale de la textura de un modelo ya cargado
import { useGLTF } from '@react-three/drei'
// CanvasTexture para las texturas recortadas
import { CanvasTexture, SRGBColorSpace } from 'three'
// Tipo de three.js: material con textura de color (map)
import type { MeshStandardMaterial } from 'three'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
import type { ModelName } from '@/data/modelsManifest'

/** Tono de madera: 'cabinet' (el del mueble: estanterías) o 'shelf' (el de las repisas: rodapiés) */
export type WoodSource = 'shelf' | 'cabinet'

/** Zona de tabla limpia dentro del atlas de textura de un modelo */
interface WoodCrop {
  model: ModelName
  /** Inicio y fin en horizontal, en fracciones del ancho de la imagen (0 a 1) */
  cropX: [number, number]
  /** Inicio y fin en vertical, en fracciones del alto de la imagen (0 a 1) */
  cropY: [number, number]
  /** Dirección de la veta en esa zona */
  grain: 'vertical' | 'horizontal'
}

/** Las dos texturas de madera que devuelve el hook */
export interface WoodTextures {
  /** Veta en vertical: piezas de pie (laterales de las estanterías) */
  grainVertical: CanvasTexture
  /** Veta a lo largo: piezas tumbadas (baldas, rodapiés) */
  grainAlongLength: CanvasTexture
}

// La imagen de una textura de un .glb cargado: un ImageBitmap o un <img>, según el cargador
type TextureImage = ImageBitmap | HTMLImageElement

// Zonas de tabla limpia dentro del atlas de textura de cada modelo (fracciones de la imagen, medidas sobre ella)
// y dirección de la veta en esa zona.
const WOOD_SOURCES: Record<WoodSource, WoodCrop> = {
  // Repisa: la tabla ocupa la franja izquierda, con la veta en vertical
  shelf: { model: 'shelf', cropX: [0.02, 0.52], cropY: [0, 1], grain: 'vertical' },
  // Mueble: tabla larga arriba a la izquierda, con la veta en horizontal
  cabinet: { model: 'cabinet', cropX: [0.005, 0.497], cropY: [0.005, 0.166], grain: 'horizontal' },
}

// Texturas ya creadas por imagen y origen: todas las piezas comparten las mismas, así que se generan una única vez
const texturesByImage = new WeakMap<TextureImage, WoodTextures>()

// Dibuja la zona recortada en un lienzo, girada 90° si hace falta
function drawCrop(image: TextureImage, source: WoodCrop, rotate: boolean): CanvasTexture {
  const sx = source.cropX[0] * image.width
  const sy = source.cropY[0] * image.height
  const sw = (source.cropX[1] - source.cropX[0]) * image.width
  const sh = (source.cropY[1] - source.cropY[0]) * image.height
  const canvas = document.createElement('canvas')
  canvas.width = rotate ? sh : sw
  canvas.height = rotate ? sw : sh
  // getContext('2d') solo devuelve null si el lienzo ya tiene otro contexto: este es nuevo
  const ctx = canvas.getContext('2d')!
  if (rotate) {
    // Giro de 90°: el lienzo intercambia ancho y alto
    ctx.translate(sh, 0)
    ctx.rotate(Math.PI / 2)
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Recorta la tabla del atlas en dos texturas: veta vertical (piezas de pie) y veta a lo largo (piezas tumbadas)
function createWoodTextures(image: TextureImage, source: WoodCrop): WoodTextures {
  const vertical = source.grain === 'vertical'
  return {
    grainVertical: drawCrop(image, source, !vertical),
    grainAlongLength: drawCrop(image, source, vertical),
  }
}

/**
 * Madera recortada de la textura de un modelo para el resto del mobiliario.
 * `source`: 'cabinet' (tono del mueble: estanterías) o 'shelf' (tono de las repisas: rodapiés).
 * Devuelve { grainVertical, grainAlongLength }: veta en vertical para piezas de pie y a lo largo para piezas tumbadas.
 */
export default function useShelfWood(source: WoodSource = 'shelf'): WoodTextures {
  const config = WOOD_SOURCES[source]
  const { materials } = useGLTF(modelsManifest[config.model].url)
  return useMemo(() => {
    // Los dos modelos traen un único material con toda la textura (atlas)
    const image = (Object.values(materials)[0] as MeshStandardMaterial).map!.image as TextureImage
    let textures = texturesByImage.get(image)
    if (!textures) {
      textures = createWoodTextures(image, config)
      texturesByImage.set(image, textures)
    }
    return textures
  }, [materials, config])
}
