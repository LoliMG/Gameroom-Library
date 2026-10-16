// Espacio de color para la textura de color
import { SRGBColorSpace } from 'three'

// Extensión antigua de materiales glTF (sustituida por metallic-roughness). three.js ya no la soporta: sin este
// plugin los modelos que la usan (bakugo.glb) pierden sus texturas y salen grises.
const EXTENSION_NAME = 'KHR_materials_pbrSpecularGlossiness'

// Plugin de GLTFLoader: convierte lo básico de specular-glossiness a los parámetros del material estándar
// (textura difusa → textura de color, brillo → rugosidad). No reproduce el reflejo especular coloreado.
class SpecularGlossinessPlugin {
  constructor(parser) {
    this.parser = parser
    this.name = EXTENSION_NAME
  }

  extendMaterialParams(materialIndex, materialParams) {
    const extension = this.parser.json.materials[materialIndex].extensions?.[EXTENSION_NAME]
    if (!extension) return Promise.resolve()
    const [r, g, b, a] = extension.diffuseFactor ?? [1, 1, 1, 1]
    materialParams.color.setRGB(r, g, b)
    materialParams.opacity = a
    materialParams.roughness = 1 - (extension.glossinessFactor ?? 1)
    materialParams.metalness = 0
    if (!extension.diffuseTexture) return Promise.resolve()
    return this.parser.assignTexture(materialParams, 'map', extension.diffuseTexture, SRGBColorSpace)
  }
}

/**
 * Para el cuarto argumento de useGLTF (extendLoader): registra el plugin en el cargador.
 */
export function withSpecularGlossiness(loader) {
  loader.register((parser) => new SpecularGlossinessPlugin(parser))
}
