// Espacio de color para la textura de color; Color es el tipo del color de un material
import { SRGBColorSpace } from 'three'
import type { Color, ColorSpace } from 'three'
// Tipos del cargador de .glb que usa useGLTF de drei por dentro: el de three-stdlib (una copia del de three.js que trae
// drei). Solo se importan tipos, así que no añade nada al código que se ejecuta
import type { GLTFLoader, GLTFLoaderPlugin, GLTFParser } from 'three-stdlib'

// Extensión antigua de materiales glTF (sustituida por metallic-roughness). three.js ya no la soporta: sin este
// plugin los modelos que la usan (fountain.glb) pierden sus texturas y salen grises.
const EXTENSION_NAME = 'KHR_materials_pbrSpecularGlossiness'

// Lo que trae la extensión en el JSON del .glb (todo es opcional en el formato)
interface SpecularGlossinessExtension {
  diffuseFactor?: [number, number, number, number]
  glossinessFactor?: number
  diffuseTexture?: { index: number }
}

// Parámetros del material que está construyendo GLTFLoader (los que este plugin rellena)
interface MaterialParams {
  color: Color
  opacity?: number
  roughness?: number
  metalness?: number
}

// Plugin de GLTFLoader: convierte lo básico de specular-glossiness a los parámetros del material estándar
// (textura difusa → textura de color, brillo → rugosidad). No reproduce el reflejo especular coloreado.
class SpecularGlossinessPlugin implements GLTFLoaderPlugin {
  readonly name = EXTENSION_NAME
  private readonly parser: GLTFParser

  constructor(parser: GLTFParser) {
    this.parser = parser
  }

  // GLTFLoader pasa los parámetros como un objeto genérico: aquí se usan con los campos que este plugin rellena
  extendMaterialParams(materialIndex: number, params: Record<string, unknown>): Promise<unknown> {
    const materialParams = params as unknown as MaterialParams
    const extension: SpecularGlossinessExtension | undefined = this.parser.json.materials[materialIndex].extensions?.[EXTENSION_NAME]
    if (!extension) return Promise.resolve()
    const [r, g, b, a] = extension.diffuseFactor ?? [1, 1, 1, 1]
    materialParams.color.setRGB(r, g, b)
    materialParams.opacity = a
    materialParams.roughness = 1 - (extension.glossinessFactor ?? 1)
    materialParams.metalness = 0
    if (!extension.diffuseTexture) return Promise.resolve()
    // assignTexture admite un cuarto argumento, el espacio de color (three-stdlib lo aplica), aunque sus tipos no lo recojan
    const assignTexture = this.parser.assignTexture as (params: object, mapName: string, mapDef: object, colorSpace: ColorSpace) => Promise<unknown>
    return assignTexture.call(this.parser, params, 'map', extension.diffuseTexture, SRGBColorSpace)
  }
}

/**
 * Para el cuarto argumento de useGLTF (extendLoader): registra el plugin en el cargador.
 *
 * @param loader - El GLTFLoader que crea drei para cargar el modelo
 */
export function withSpecularGlossiness(loader: GLTFLoader): void {
  loader.register((parser) => new SpecularGlossinessPlugin(parser))
}
