// Tiempo real de la ciudad de los ajustes, consultado a Open-Meteo al empezar y cada 15 minutos (lo que tarda en medir
// de nuevo). Si no se puede consultar (sin conexión), se queda el último conocido o, al principio, cielo despejado.
import { useEffect, useState } from 'react'
import type { AppSettings } from '@/types'
import { CLEAR_WEATHER } from '@/scene/core/ambiencePalette'
import type { Weather } from '@/scene/core/ambiencePalette'
import { fetchWeather } from '@/utils/weatherApi'

const UPDATE_MS = 15 * 60 * 1000

// Solo en desarrollo: ?clima=lluvia | tormenta | nieve | nublado | niebla | despejado en la dirección fuerza ese tiempo, para ver cómo queda
// sin esperar a que llueva de verdad
const PREVIEWS: Record<string, Weather> = {
  lluvia: { ...CLEAR_WEATHER, cloudCover: 1, rain: 0.8, windSpeed: 25, temperature: 14 },
  tormenta: { ...CLEAR_WEATHER, cloudCover: 1, rain: 1, thunder: true, windSpeed: 40, temperature: 13 },
  nieve: { ...CLEAR_WEATHER, cloudCover: 1, snow: 0.7, windSpeed: 10, temperature: -2 },
  nublado: { ...CLEAR_WEATHER, cloudCover: 1, temperature: 16 },
  niebla: { ...CLEAR_WEATHER, cloudCover: 0.6, fog: true, temperature: 12 },
  despejado: CLEAR_WEATHER,
}
const preview = import.meta.env.DEV ? PREVIEWS[new URLSearchParams(window.location.search).get('clima') ?? ''] : undefined

export default function useWeather({ latitude, longitude }: AppSettings): Weather {
  const [weather, setWeather] = useState<Weather>(preview ?? CLEAR_WEATHER)
  useEffect(() => {
    if (preview) return
    let cancelled = false
    const update = () =>
      fetchWeather(latitude, longitude)
        .then((current) => !cancelled && setWeather(current))
        .catch((error: Error) => console.warn('[tiempo] No se pudo consultar el tiempo:', error.message))
    update()
    const timer = setInterval(update, UPDATE_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [latitude, longitude])
  return weather
}
