// Importación de useMemo de React para crear las texturas una sola vez
import { useMemo } from 'react'
// useGLTF de drei: la madera sale de la textura de un modelo ya cargado
import { useGLTF } from '@react-three/drei'
// CanvasTexture para las texturas recortadas
import { CanvasTexture, SRGBColorSpace } from 'three'
// Manifiesto de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'

// Zonas de tabla limpia dentro del atlas de textura de cada modelo (fracciones de la imagen, medidas sobre ella)
// y dirección de la veta en esa zona.
const WOOD_SOURCES = {
  // Repisa: la tabla ocupa la franja izquierda, con la veta en vertical
  shelf: { model: 'shelf', cropX: [0.02, 0.52], cropY: [0, 1], grain: 'vertical' },
  // Mueble: tabla larga arriba a la izquierda, con la veta en horizontal
  cabinet: { model: 'cabinet', cropX: [0.005, 0.497], cropY: [0.005, 0.166], grain: 'horizontal' },
}

// Texturas ya creadas por imagen y origen: todas las piezas comparten las mismas, así que se generan una única vez
const texturesByImage = new WeakMap()

// Dibuja la zona recortada en un lienzo, girada 90° si hace falta
function drawCrop(image, source, rotate) {
  const sx = source.cropX[0] * image.width
  const sy = source.cropY[0] * image.height
  const sw = (source.cropX[1] - source.cropX[0]) * image.width
  const sh = (source.cropY[1] - source.cropY[0]) * image.height
  const canvas = document.createElement('canvas')
  canvas.width = rotate ? sh : sw
  canvas.height = rotate ? sw : sh
  const ctx = canvas.getContext('2d')
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
function createWoodTextures(image, source) {
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
export default function useShelfWood(source = 'shelf') {
  const config = WOOD_SOURCES[source]
  const { materials } = useGLTF(modelsManifest[config.model].url)
  return useMemo(() => {
    const image = Object.values(materials)[0].map.image
    if (!texturesByImage.has(image)) texturesByImage.set(image, createWoodTextures(image, config))
    return texturesByImage.get(image)
  }, [materials, config])
}
