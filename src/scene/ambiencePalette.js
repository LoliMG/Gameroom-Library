// Paleta ambiental para el exterior y la iluminación de la estancia.
// Permite alternar entre dos atmósferas atmosféricas: día nublado (CLOUDY) y anochecer de fantasía (DUSK).

// 1. Paleta por defecto: día nublado frío estilo inglés (luz suave gris azulada)
export const CLOUDY = {
  name: 'CLOUDY',
  skyTop: '#5c738b',        // Azul grisáceo frío superior del cielo
  skyBottom: '#adc2d1',     // Neblina clara difusa hacia el horizonte
  lightColor: '#b4cbde',    // Luz tenue y fría entrando por el ventanal
  lightIntensity: 0.85,     // Intensidad moderada para no deslumbrar el interior
  foliageColor: '#1d3322',  // Verde bosque profundo para el follaje exterior
  envPreset: 'night',       // Preset ambiental nocturno suave de drei para reflejos
  envIntensity: 0.06,       // Intensidad mínima solo para matizar el cristal y metales
}

// 2. Paleta alternativa: anochecer de fantasía (violeta, azul oscuro y verde)
export const DUSK = {
  name: 'DUSK',
  skyTop: '#18163b',        // Azul noche profundo
  skyBottom: '#5c325c',     // Violeta crepuscular en el horizonte
  lightColor: '#8a77b8',    // Luz violeta-azulada fría y mágica
  lightIntensity: 0.95,     // Intensidad de luz exterior
  foliageColor: '#16281a',  // Verde oscuro nocturno para el jardín
  envPreset: 'night',       // Preset nocturno
  envIntensity: 0.08,       // Intensidad ambiental baja
}

// Selector único de la paleta activa: cambia a 'DUSK' para el ambiente crepuscular
export const ACTIVE_PALETTE = 'CLOUDY'

// Objeto de la paleta activa seleccionado según ACTIVE_PALETTE
export const PALETTE = ACTIVE_PALETTE === 'DUSK' ? DUSK : CLOUDY

export default PALETTE
