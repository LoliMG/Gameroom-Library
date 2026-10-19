// Grillos y viento de fondo cuando es de noche (ver nightAmbience.ts). No pinta nada en la escena.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createNightAmbience } from '@/utils/nightAmbience'
import type { NightAmbience } from '@/utils/nightAmbience'
// Cara interior del muro del ventanal: de ahí vienen los sonidos del jardín
import { FRONT_WALL_INNER_Z } from '@/scene/room/Room'

// Cercanía al ventanal según la distancia d (m): 1 junto a él y bajando como 1 / (1 + d) (al fondo de la sala, ≈ 0.2)
const NEAR_DISTANCE = 0.4 // Lo más cerca que se puede estar (radio del jugador)
const proximityAt = (distance: number) => Math.min(1, (1 + NEAR_DISTANCE) / (1 + Math.max(0, distance)))
// Cambio mínimo de cercanía para avisar al audio (no hace falta en cada fotograma)
const PROXIMITY_STEP = 0.02

/**
 * @param level - Lo de noche que es: 0 (día, silencio) a 1 (noche cerrada); el volumen lo sigue poco a poco
 */
function NightSounds({ level }: { level: number }) {
  const ambienceRef = useRef<NightAmbience | null>(null)
  const levelRef = useRef(level)
  const proximityRef = useRef(1)

  // Los navegadores no dejan sonar una página hasta que se toca: el audio arranca con el primer clic o tecla
  useEffect(() => {
    let ctx: AudioContext | null = null
    const start = () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      ctx = new AudioContext()
      ambienceRef.current = createNightAmbience(ctx)
      ambienceRef.current.setLevel(levelRef.current)
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

  useEffect(() => {
    levelRef.current = level
    ambienceRef.current?.setLevel(level)
  }, [level])

  // Más bajo cuanto más lejos del ventanal: distancia de la cámara al muro del ventanal, en cada fotograma
  useFrame(({ camera }) => {
    const proximity = proximityAt(FRONT_WALL_INNER_Z - camera.position.z)
    if (Math.abs(proximity - proximityRef.current) < PROXIMITY_STEP) return
    proximityRef.current = proximity
    ambienceRef.current?.setProximity(proximity)
  })

  return null
}

export default NightSounds
