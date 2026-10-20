// Tiempo real de la ciudad de los ajustes con Open-Meteo (https://open-meteo.com: gratis y sin clave). Se pide el tiempo
// "actual" (lo mide cada 15 minutos) y se convierte en lo que usa la sala: nubes, lluvia, nieve, niebla, viento y temperatura.
import type { Weather } from '@/scene/core/ambiencePalette'

/** Respuesta de /v1/forecast con current=…: solo los campos que se leen */
interface ForecastResponse {
  current?: {
    weather_code?: number
    cloud_cover?: number
    precipitation?: number
    wind_speed_10m?: number
    temperature_2m?: number
  }
}

// Intensidad de la lluvia (0 a 1) según el código del tiempo de la OMM: llovizna, lluvia, chubascos y tormenta
const RAIN_BY_CODE: Record<number, number> = {
  51: 0.2, 53: 0.25, 55: 0.35, 56: 0.25, 57: 0.35, // Llovizna
  61: 0.4, 63: 0.65, 65: 1, 66: 0.5, 67: 0.8, // Lluvia
  80: 0.45, 81: 0.7, 82: 1, // Chubascos
  95: 0.9, 96: 1, 99: 1, // Tormenta
}
// Intensidad de la nieve (0 a 1): nevada débil, moderada y fuerte, granizo menudo y chubascos de nieve
const SNOW_BY_CODE: Record<number, number> = { 71: 0.35, 73: 0.6, 75: 1, 77: 0.25, 85: 0.5, 86: 0.9 }
const FOG_CODES = [45, 48]
const THUNDER_CODES = [95, 96, 99]
// Lluvia que se considera fuerte (mm por hora): con esto o más, intensidad 1
const HEAVY_RAIN_MM_PER_HOUR = 6

/** Convierte la respuesta de Open-Meteo en el tiempo de la sala (los campos que falten cuentan como cielo despejado) */
export function weatherFromForecast(response: ForecastResponse): Weather {
  const current = response.current ?? {}
  const code = current.weather_code ?? 0
  // precipitation es lo que ha caído en los últimos 15 minutos: × 4 = mm por hora. Con código de nieve, cae nieve
  const fromAmount = Math.min(1, ((current.precipitation ?? 0) * 4) / HEAVY_RAIN_MM_PER_HOUR)
  const snowing = code in SNOW_BY_CODE
  return {
    cloudCover: Math.min(1, Math.max(0, (current.cloud_cover ?? 0) / 100)),
    rain: snowing ? 0 : Math.max(RAIN_BY_CODE[code] ?? 0, fromAmount),
    snow: snowing ? Math.max(SNOW_BY_CODE[code], fromAmount) : 0,
    fog: FOG_CODES.includes(code),
    thunder: THUNDER_CODES.includes(code),
    windSpeed: current.wind_speed_10m ?? 0,
    temperature: current.temperature_2m ?? 20,
  }
}

/** Tiempo actual en esas coordenadas */
export async function fetchWeather(latitude: number, longitude: number): Promise<Weather> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,cloud_cover,precipitation,wind_speed_10m,temperature_2m&timezone=auto`
  )
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`)
  return weatherFromForecast(await response.json())
}
