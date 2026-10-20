// Ambiente de la sala según la hora real: dónde está el sol (con la hora y las coordenadas de la ciudad de los ajustes)
// y qué colores tienen el cielo, las colinas, la luz y la niebla. Hay cuatro atmósferas (día, hora dorada, crepúsculo y
// noche) y se mezclan poco a poco según la altura del sol, así no hay saltos. Lo prueba scripts/checkDaylight.ts.
import { Color, Vector3 } from 'three'

/** Colores y luces de un momento del día */
export interface AmbiencePalette {
  /** Cielo: cénit, horizonte y resplandor alrededor del sol */
  skyTop: string
  skyBottom: string
  skyGlow: string
  /** Luz que entra por el ventanal */
  lightColor: string
  lightIntensity: number
  /** Luz difusa de la sala */
  ambientColor: string
  ambientIntensity: number
  /** Reflejos del entorno (cristal, metal) */
  envIntensity: number
  /** Bruma del jardín */
  fogColor: string
  /** Capas de colinas, de la más lejana a la más cercana */
  hills: [string, string, string]
  /** Prado: cerca de la casa y al fondo */
  meadowNear: string
  meadowFar: string
  /** Estrellas: 0 (no se ven) a 1 (noche cerrada) */
  stars: number
}

// Día despejado: cielo azul, luz blanca y cálida, colinas verdes azuladas por la distancia
export const DAY: AmbiencePalette = {
  skyTop: '#3f78bd',
  skyBottom: '#b9d5ea',
  skyGlow: '#fff1cf',
  lightColor: '#fff2dc',
  lightIntensity: 2.2,
  ambientColor: '#f6efe4',
  ambientIntensity: 0.95,
  envIntensity: 0.2,
  fogColor: '#a9c0d2',
  hills: ['#9db3c6', '#7d9884', '#5c7650'],
  meadowNear: '#5a7838',
  meadowFar: '#8aa1a6',
  stars: 0,
}

// Hora dorada (sol bajo): la atmósfera de atardecer que tenía la sala
export const GOLDEN: AmbiencePalette = {
  skyTop: '#5d6596',
  skyBottom: '#f3a77c',
  skyGlow: '#ffc35e',
  lightColor: '#ffc98f',
  lightIntensity: 2.4,
  ambientColor: '#f3e4d0',
  ambientIntensity: 0.8,
  envIntensity: 0.15,
  fogColor: '#b58272',
  hills: ['#d49a8e', '#a0768a', '#5d546b'],
  meadowNear: '#3f4a2c',
  meadowFar: '#6a5a6e',
  stars: 0,
}

// Crepúsculo (sol justo bajo el horizonte): azul profundo arriba, rosa apagado abajo, aparecen las primeras estrellas
export const TWILIGHT: AmbiencePalette = {
  skyTop: '#252a58',
  skyBottom: '#b8728a',
  skyGlow: '#dd8f74',
  lightColor: '#9c8cc4',
  lightIntensity: 0.8,
  ambientColor: '#cbbad8',
  ambientIntensity: 0.5,
  envIntensity: 0.08,
  fogColor: '#55466a',
  hills: ['#86698a', '#5c4d6e', '#3b3650'],
  meadowNear: '#2c3222',
  meadowFar: '#463d56',
  stars: 0.4,
}

// Noche: cielo azul marino, luz de luna tenue y fría; la sala la alumbran las velas, los farolillos y la lámpara
export const NIGHT: AmbiencePalette = {
  skyTop: '#070b1d',
  skyBottom: '#18203a',
  skyGlow: '#26304f',
  lightColor: '#6f80b8',
  lightIntensity: 0.3,
  ambientColor: '#8a98c4',
  ambientIntensity: 0.3,
  envIntensity: 0.03,
  fogColor: '#121a2c',
  hills: ['#283049', '#1c2135', '#131626'],
  meadowNear: '#0f140d',
  meadowFar: '#191b29',
  stars: 1,
}

// Tramos de altura del sol (grados) en los que se pasa de una atmósfera a la siguiente, de día a noche
const STAGES: [number, AmbiencePalette][] = [
  [12, DAY],
  [2, GOLDEN],
  [-4, TWILIGHT],
  [-12, NIGHT],
]

const mixColor = (a: string, b: string, t: number) => `#${new Color(a).lerp(new Color(b), t).getHexString()}`
const mixNumber = (a: number, b: number, t: number) => a + (b - a) * t

function mixPalettes(a: AmbiencePalette, b: AmbiencePalette, t: number): AmbiencePalette {
  return {
    skyTop: mixColor(a.skyTop, b.skyTop, t),
    skyBottom: mixColor(a.skyBottom, b.skyBottom, t),
    skyGlow: mixColor(a.skyGlow, b.skyGlow, t),
    lightColor: mixColor(a.lightColor, b.lightColor, t),
    lightIntensity: mixNumber(a.lightIntensity, b.lightIntensity, t),
    ambientColor: mixColor(a.ambientColor, b.ambientColor, t),
    ambientIntensity: mixNumber(a.ambientIntensity, b.ambientIntensity, t),
    envIntensity: mixNumber(a.envIntensity, b.envIntensity, t),
    fogColor: mixColor(a.fogColor, b.fogColor, t),
    hills: [mixColor(a.hills[0], b.hills[0], t), mixColor(a.hills[1], b.hills[1], t), mixColor(a.hills[2], b.hills[2], t)],
    meadowNear: mixColor(a.meadowNear, b.meadowNear, t),
    meadowFar: mixColor(a.meadowFar, b.meadowFar, t),
    stars: mixNumber(a.stars, b.stars, t),
  }
}

/** Atmósfera para una altura del sol en grados (por encima de 12°, día; por debajo de -12°, noche) */
export function paletteForElevation(elevation: number): AmbiencePalette {
  if (elevation >= STAGES[0][0]) return STAGES[0][1]
  for (let i = 1; i < STAGES.length; i++) {
    const [high, upper] = STAGES[i - 1]
    const [low, lower] = STAGES[i]
    if (elevation >= low) return mixPalettes(upper, lower, (high - elevation) / (high - low))
  }
  return NIGHT
}

/** Tiempo de la ciudad (lo da weatherApi.ts con Open-Meteo) */
export interface Weather {
  /** Nubes: 0 (despejado) a 1 (cubierto) */
  cloudCover: number
  /** Lluvia: 0 (nada) a 1 (fuerte) */
  rain: number
  /** Nieve: 0 (nada) a 1 (fuerte) */
  snow: number
  /** Niebla */
  fog: boolean
  /** Tormenta (suenan truenos) */
  thunder: boolean
  /** Viento en km/h */
  windSpeed: number
  /** Temperatura en °C */
  temperature: number
}

/** Cielo despejado y sin viento (mientras no se sabe el tiempo, o si no se puede consultar) */
export const CLEAR_WEATHER: Weather = { cloudCover: 0, rain: 0, snow: 0, fog: false, thunder: false, windSpeed: 0, temperature: 20 }

// Cielo cubierto: cuánto se apagan los colores (saturación) y cuánto se oscurecen, y cuánto baja la luz del ventanal
const OVERCAST_DESATURATE = 0.75
const OVERCAST_DARKEN = 0.25
const OVERCAST_LIGHT = 0.55
// Nieve: color del manto y cuánto blanquea el prado y las colinas con nevada fuerte
const SNOW_COLOR = '#e6ecf2'
const SNOW_COVER = 0.65

// Color gris a medias: menos saturado y algo más oscuro, según amount (0 = igual, 1 = del todo cubierto)
function overcastColor(color: string, amount: number) {
  const hsl = { h: 0, s: 0, l: 0 }
  new Color(color).getHSL(hsl)
  return `#${new Color().setHSL(hsl.h, hsl.s * (1 - OVERCAST_DESATURATE * amount), hsl.l * (1 - OVERCAST_DARKEN * amount)).getHexString()}`
}

/**
 * La atmósfera con el tiempo encima: las nubes (y más aún la lluvia o la nieve) apagan el cielo, las colinas y la luz, y
 * tapan las estrellas; la nieve además blanquea el prado y las colinas. El sol y la niebla los ajusta quien pinta
 * (SunsetSky y Effects) con weather.
 */
export function applyWeather(palette: AmbiencePalette, weather: Weather): AmbiencePalette {
  const amount = Math.min(1, weather.cloudCover * 0.85 + (weather.rain + weather.snow) * 0.3)
  if (amount === 0) return palette
  const cover = weather.snow * SNOW_COVER
  const gray = (color: string) => overcastColor(color, amount)
  const snowy = (color: string) => mixColor(gray(color), SNOW_COLOR, cover)
  return {
    ...palette,
    skyTop: gray(palette.skyTop),
    skyBottom: gray(palette.skyBottom),
    skyGlow: gray(palette.skyGlow),
    lightColor: gray(palette.lightColor),
    lightIntensity: palette.lightIntensity * (1 - OVERCAST_LIGHT * amount),
    ambientIntensity: palette.ambientIntensity * (1 - 0.2 * amount),
    envIntensity: palette.envIntensity * (1 - 0.4 * amount),
    fogColor: gray(palette.fogColor),
    hills: [snowy(palette.hills[0]), snowy(palette.hills[1]), snowy(palette.hills[2])],
    meadowNear: snowy(palette.meadowNear),
    meadowFar: snowy(palette.meadowFar),
    stars: palette.stars * (1 - weather.cloudCover),
  }
}

/**
 * Posición del sol en el cielo para una fecha y un lugar (fórmula aproximada del Almanaque Náutico; error < 1°).
 *
 * @param date - Momento (la hora del reloj del ordenador: Date ya la guarda en UTC)
 * @param latitude - Latitud en grados (norte positiva)
 * @param longitude - Longitud en grados (este positiva)
 * @returns elevation: altura sobre el horizonte en grados (negativa: de noche); azimuth: rumbo en grados desde el norte,
 *   en el sentido de las agujas del reloj (90 = este, 180 = sur, 270 = oeste)
 */
export function sunPosition(date: Date, latitude: number, longitude: number): { elevation: number; azimuth: number } {
  const rad = Math.PI / 180
  const days = date.getTime() / 86400000 - 10957.5 // Días desde el 1 de enero de 2000 a mediodía (J2000)
  const meanAnomaly = (357.529 + 0.98560028 * days) * rad
  const meanLongitude = 280.459 + 0.98564736 * days
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * rad
  const obliquity = (23.439 - 0.00000036 * days) * rad
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  // Hora sideral local (en radianes) y ángulo horario del sol
  const siderealTime = ((18.697374558 + 24.06570982441908 * days) * 15 + longitude) * rad
  const hourAngle = siderealTime - rightAscension
  const lat = latitude * rad
  const elevation = Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle))
  const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle))
  return { elevation: elevation / rad, azimuth: ((azimuth / rad) % 360 + 360) % 360 }
}

/**
 * Dirección del sol en la escena. El ventanal (+Z) mira al oeste, así el sol se pone tras el jardín como en la realidad:
 * oeste = +Z, este = -Z, norte = -X y sur = +X (mirando por el ventanal, el norte queda a la derecha).
 */
export function sunDirection(elevation: number, azimuth: number): Vector3 {
  const rad = Math.PI / 180
  const horizontal = Math.cos(elevation * rad)
  return new Vector3(-Math.cos(azimuth * rad) * horizontal, Math.sin(elevation * rad), -Math.sin(azimuth * rad) * horizontal)
}
