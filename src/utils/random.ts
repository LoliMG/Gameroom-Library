// Generador pseudoaleatorio determinista (mulberry32): con la misma semilla devuelve siempre la misma secuencia
// de números en [0, 1). Se usa para colocar hojas, flores y árboles de forma reproducible (igual en cada carga).

/**
 * @param seed - Semilla: un número entero cualquiera. Misma semilla → misma secuencia
 * @returns Función que, cada vez que se llama, da el siguiente número de la secuencia, entre 0 (incluido) y 1
 */
export function createRandom(seed: number): () => number {
  let a = seed
  return () => {
    // Operaciones con enteros de 32 bits (| 0, Math.imul, >>>): son las del algoritmo mulberry32
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
