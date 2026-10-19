// Paleta ambiental para el exterior y la iluminación de la estancia.
// Permite alternar entre tres atmósferas: día nublado (CLOUDY), anochecer de fantasía (DUSK) y atardecer dorado (SUNSET).

/** Colores del cielo y de la luz del ventanal de una atmósfera */
export interface AmbiencePalette {
  name: string
  skyTop: string
  skyBottom: string
  skyGlow: string
  lightColor: string
  lightIntensity: number
  envIntensity: number
}

// 1. Paleta por defecto: día nublado frío estilo inglés (luz suave gris azulada)
export const CLOUDY: AmbiencePalette = {
  name: 'CLOUDY',
  skyTop: '#5c738b',        // Azul grisáceo frío superior del cielo
  skyBottom: '#adc2d1',     // Neblina clara difusa hacia el horizonte
  skyGlow: '#d8dfe4',       // Claridad alrededor del sol tras las nubes
  lightColor: '#b4cbde',    // Luz tenue y fría entrando por el ventanal
  lightIntensity: 1.4,      // Intensidad de la luz del ventanal (la que usaba Lights.tsx antes de leerla de la paleta)
  envIntensity: 0.06,       // Intensidad mínima solo para matizar el cristal y metales
}

// 2. Paleta alternativa: anochecer de fantasía (violeta, azul oscuro y verde)
export const DUSK: AmbiencePalette = {
  name: 'DUSK',
  skyTop: '#18163b',        // Azul noche profundo
  skyBottom: '#5c325c',     // Violeta crepuscular en el horizonte
  skyGlow: '#9a5a7a',       // Último resplandor rosado donde se puso el sol
  lightColor: '#8a77b8',    // Luz violeta-azulada fría y mágica
  lightIntensity: 1.4,      // Intensidad de la luz del ventanal (la que usaba Lights.tsx antes de leerla de la paleta)
  envIntensity: 0.08,       // Intensidad ambiental baja
}

// 3. Atardecer dorado: cielo violeta azulado arriba, melocotón en el horizonte y resplandor dorado alrededor del sol
export const SUNSET: AmbiencePalette = {
  name: 'SUNSET',
  skyTop: '#5d6596',        // Azul violáceo de última hora en lo alto
  skyBottom: '#f3a77c',     // Melocotón rosado en el horizonte
  skyGlow: '#ffc35e',       // Dorado intenso alrededor del sol
  lightColor: '#ffc98f',    // Luz dorada de sol bajo
  lightIntensity: 2.4,      // Más intensa que las otras paletas para que la sala se vea luminosa
  envIntensity: 0.15,       // Algo más de reflejo que de noche
}

// Selector único de la paleta activa: 'CLOUDY', 'DUSK' o 'SUNSET'
export const ACTIVE_PALETTE: 'CLOUDY' | 'DUSK' | 'SUNSET' = 'SUNSET'

// Objeto de la paleta activa seleccionado según ACTIVE_PALETTE (CLOUDY si el nombre no existe)
export const PALETTE = { CLOUDY, DUSK, SUNSET }[ACTIVE_PALETTE] ?? CLOUDY
