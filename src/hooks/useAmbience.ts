// Ambiente de la sala según la hora real en la ciudad de los ajustes y su tiempo: la atmósfera (colores y luces, con
// las nubes encima) y la dirección del sol, recalculados cada minuto (el sol avanza un cuarto de grado por minuto)
import { useEffect, useMemo, useState } from 'react'
import type { Vector3 } from 'three'
import type { AppSettings } from '@/types'
import { applyWeather, paletteForElevation, sunDirection, sunPosition } from '@/scene/core/ambiencePalette'
import type { AmbiencePalette, Weather } from '@/scene/core/ambiencePalette'

const UPDATE_MS = 60 * 1000

/** Lo que necesita la escena para pintar el momento del día */
export interface Ambience {
  /** Colores y luces del momento, ya con el tiempo encima */
  palette: AmbiencePalette
  /** Dirección hacia el sol en la escena (unitaria) */
  sunDirection: Vector3
  /** Altura del sol en grados (negativa: de noche) */
  sunElevation: number
  /** Tiempo de la ciudad (nubes, lluvia, niebla…) */
  weather: Weather
}

export default function useAmbience({ latitude, longitude }: AppSettings, weather: Weather): Ambience {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), UPDATE_MS)
    return () => clearInterval(timer)
  }, [])
  return useMemo(() => {
    const { elevation, azimuth } = sunPosition(now, latitude, longitude)
    return {
      palette: applyWeather(paletteForElevation(elevation), weather),
      sunDirection: sunDirection(elevation, azimuth),
      sunElevation: elevation,
      weather,
    }
  }, [now, latitude, longitude, weather])
}
