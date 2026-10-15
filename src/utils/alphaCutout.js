// Umbral de alfa por debajo del cual se descarta el píxel
const ALPHA_CUTOFF = 0.5

// Cambia los materiales con transparencia mezclada (BLEND) de un modelo a recorte por alfa (alphaTest).
// Con mezcla, three.js no puede ordenar los triángulos de una misma malla y unas partes tapan a otras
// (sofá "cortado", hojas que desaparecen); con recorte cada píxel es opaco o invisible y se ordena por profundidad.
// Los clones de un modelo comparten materiales, así que el cambio afecta a todos; es idempotente.
export function applyAlphaCutout(object) {
  object.traverse((child) => {
    if (child.isMesh && child.material.transparent && child.material.map) {
      child.material.alphaTest = ALPHA_CUTOFF
      child.material.transparent = false
      child.material.depthWrite = true
    }
  })
  return object
}
