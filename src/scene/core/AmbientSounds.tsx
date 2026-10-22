// Sonidos de fondo del jardín: viento siempre, grillos de noche, lluvia cuando llueve y truenos con tormenta (ver
// ambientSounds.ts). No pinta nada.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createAmbientSounds } from '@/utils/ambientSounds'
import type { AmbientSounds as Sounds } from '@/utils/ambientSounds'
import type { SoundVolumes } from '@/types'
// Cara interior del muro del ventanal: de ahí vienen los sonidos del jardín
import { FRONT_WALL_INNER_Z } from '@/scene/room/Room'

// Cercanía al ventanal según la distancia d (m): 1 junto a él y bajando como 1 / (1 + d) (al fondo de la sala, ≈ 0.2)
const NEAR_DISTANCE = 0.4 // Lo más cerca que se puede estar (radio del jugador)
const proximityAt = (distance: number) => Math.min(1, (1 + NEAR_DISTANCE) / (1 + Math.max(0, distance)))
// Cambio mínimo de cercanía para avisar al audio (no hace falta en cada fotograma)
const PROXIMITY_STEP = 0.02

interface AmbientSoundsProps {
  /** Lo de noche que es: 0 (día) a 1 (noche cerrada) */
  level: number
  /** Lluvia: 0 (nada) a 1 (fuerte) */
  rain: number
  /** Tormenta: suenan truenos */
  thunder: boolean
  /** Volumen de cada sonido (con los sonidos silenciados en Ajustes, todos a 0) */
  volumes: SoundVolumes
}

function AmbientSounds({ level, rain, thunder, volumes }: AmbientSoundsProps) {
  const ambienceRef = useRef<Sounds | null>(null)
  // Los valores más recientes, para dárselos al audio cuando arranque (con el primer clic o tecla)
  const latestRef = useRef({ level, rain, thunder, volumes })
  useEffect(() => {
    latestRef.current = { level, rain, thunder, volumes }
  })
  const proximityRef = useRef(1)

  // Los navegadores no dejan sonar una página hasta que se toca: el audio arranca con el primer clic o tecla
  useEffect(() => {
    let ctx: AudioContext | null = null
    const start = () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      ctx = new AudioContext()
      const sounds = createAmbientSounds(ctx)
      const latest = latestRef.current
      sounds.setVolumes(latest.volumes)
      sounds.setLevel(latest.level)
      sounds.setRain(latest.rain)
      sounds.setThunder(latest.thunder)
      ambienceRef.current = sounds
      ambienceRef.current.setProximity(proximityRef.current)
    }
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      ambienceRef.current?.stop()
      ambienceRef.current = null
      ctx?.close()
    }
  }, [])

  useEffect(() => ambienceRef.current?.setLevel(level), [level])
  useEffect(() => ambienceRef.current?.setRain(rain), [rain])
  useEffect(() => ambienceRef.current?.setThunder(thunder), [thunder])
  useEffect(() => ambienceRef.current?.setVolumes(volumes), [volumes])

  // Más bajo cuanto más lejos del ventanal: distancia de la cámara al muro del ventanal, en cada fotograma
  useFrame(({ camera }) => {
    const proximity = proximityAt(FRONT_WALL_INNER_Z - camera.position.z)
    if (Math.abs(proximity - proximityRef.current) < PROXIMITY_STEP) return
    proximityRef.current = proximity
    ambienceRef.current?.setProximity(proximity)
  })

  return null
}

export default AmbientSounds
