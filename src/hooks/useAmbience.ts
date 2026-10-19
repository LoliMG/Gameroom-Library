// Ambiente de la sala según la hora real en la ciudad de los ajustes: la atmósfera (colores y luces) y la dirección del
// sol, recalculados cada minuto (el sol avanza un cuarto de grado por minuto: no hace falta más a menudo)
import { useEffect, useMemo, useState } from 'react'
import type { Vector3 } from 'three'
import type { AppSettings } from '@/types'
import { paletteForElevation, sunDirection, sunPosition } from '@/scene/core/ambiencePalette'
import type { AmbiencePalette } from '@/scene/core/ambiencePalette'

const UPDATE_MS = 60 * 1000

/** Lo que necesita la escena para pintar el momento del día */
export interface Ambience {
  palette: AmbiencePalette
  /** Dirección hacia el sol en la escena (unitaria) */
  sunDirection: Vector3
  /** Altura del sol en grados (negativa: de noche) */
  sunElevation: number
}

export default function useAmbience({ latitude, longitude }: AppSettings): Ambience {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), UPDATE_MS)
    return () => clearInterval(timer)
  }, [])
  return useMemo(() => {
    const { elevation, azimuth } = sunPosition(now, latitude, longitude)
    return { palette: paletteForElevation(elevation), sunDirection: sunDirection(elevation, azimuth), sunElevation: elevation }
  }, [now, latitude, longitude])
}
