// Paleta ambiental para el exterior y la iluminación de la estancia.
// Permite alternar entre tres atmósferas: día nublado (CLOUDY), anochecer de fantasía (DUSK) y atardecer dorado (SUNSET).

// 1. Paleta por defecto: día nublado frío estilo inglés (luz suave gris azulada)
export const CLOUDY = {
  name: 'CLOUDY',
  skyTop: '#5c738b',        // Azul grisáceo frío superior del cielo
  skyBottom: '#adc2d1',     // Neblina clara difusa hacia el horizonte
  lightColor: '#b4cbde',    // Luz tenue y fría entrando por el ventanal
  lightIntensity: 1.4,      // Intensidad de la luz del ventanal (la que usaba Lights.jsx antes de leerla de la paleta)
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
  lightIntensity: 1.4,      // Intensidad de la luz del ventanal (la que usaba Lights.jsx antes de leerla de la paleta)
  foliageColor: '#16281a',  // Verde oscuro nocturno para el jardín
  envPreset: 'night',       // Preset nocturno
  envIntensity: 0.08,       // Intensidad ambiental baja
}

// 3. Atardecer dorado (Fase 11): cielo azul que se vuelve naranja en el horizonte y luz cálida más intensa
export const SUNSET = {
  name: 'SUNSET',
  skyTop: '#5b7fb0',        // Azul de tarde en lo alto
  skyBottom: '#f2a35e',     // Naranja dorado en el horizonte
  lightColor: '#ffc98f',    // Luz dorada de sol bajo
  lightIntensity: 2.4,      // Más intensa que las otras paletas para que la sala se vea luminosa
  foliageColor: '#2c3b1f',  // Verde oliva cálido iluminado por el sol
  envPreset: 'sunset',      // Preset de atardecer de drei para reflejos cálidos
  envIntensity: 0.15,       // Algo más de reflejo que de noche
}

// Selector único de la paleta activa: 'CLOUDY', 'DUSK' o 'SUNSET'
export const ACTIVE_PALETTE = 'SUNSET'

// Objeto de la paleta activa seleccionado según ACTIVE_PALETTE (CLOUDY si el nombre no existe)
export const PALETTE = { CLOUDY, DUSK, SUNSET }[ACTIVE_PALETTE] ?? CLOUDY

export default PALETTE
