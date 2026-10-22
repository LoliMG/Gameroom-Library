// Gramófono de la repisa (old_gramophone.glb): al pulsarlo pone música lofi (las pistas de src/assets/audio/lofi/, una
// al azar y al acabar otra) y gira el disco y la manivela con la animación del modelo; al volver a pulsarlo, se para
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import type { Vector3Tuple } from 'three'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'
import Clickable from '@/scene/shared/Clickable'

// Pistas de música: { ruta del archivo: dirección } (import.meta.glob es de Vite; si no hay ninguna, el gramófono no suena)
const TRACKS = Object.values(import.meta.glob<string>('@/assets/audio/lofi/*.{mp3,ogg,m4a,wav}', { eager: true, import: 'default' }))
// Animación del modelo (8 s): gira el disco (Object001) y la manivela (Object002)
const SPIN_CLIP = 'Gramofon_Anim'
// Volumen de la música (0 a 1): de fondo, por debajo de la lluvia y la chimenea
const MUSIC_VOLUME = 0.45

// Una pista al azar que no sea la que acaba de sonar (si hay más de una; audio.src da la dirección completa)
const pickTrack = (previous?: string) => {
  const options = TRACKS.length > 1 ? TRACKS.filter((track) => new URL(track, window.location.href).href !== previous) : TRACKS
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * @param sound - Con los sonidos silenciados (Ajustes) la música se para
 */
function Gramophone({ position, height, sound }: { position: Vector3Tuple; height: number; sound: boolean }) {
  const { scene, animations } = useGLTF(modelsManifest.gramophone.url, true, true)
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, height), [scene, height])
  const { actions } = useAnimations(animations, wrapper)
  const [playing, setPlaying] = useState(false)
  // Reproductor de la música (uno para todas las pistas)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Música: suena mientras está puesto y con los sonidos activados; al acabar una pista, otra
  useEffect(() => {
    if (!playing || !sound) return
    const audio = (audioRef.current ??= new Audio())
    audio.volume = MUSIC_VOLUME
    audio.onended = () => {
      audio.src = pickTrack(audio.src)
      audio.play().catch((error: Error) => console.warn('[gramófono] No se pudo poner la música:', error.message))
    }
    if (!audio.src) audio.src = pickTrack()
    audio.play().catch((error: Error) => console.warn('[gramófono] No se pudo poner la música:', error.message))
    return () => audio.pause()
  }, [playing, sound])

  // El disco gira mientras suena (a velocidad 0 se queda quieto donde estaba)
  useEffect(() => {
    actions[SPIN_CLIP]?.setEffectiveTimeScale(playing && sound ? 1 : 0).play()
  }, [actions, playing, sound])

  const toggle = () => {
    if (TRACKS.length === 0) {
      console.info('[gramófono] No hay música: pon archivos .mp3 en src/assets/audio/lofi/')
      return
    }
    setPlaying((value) => !value)
  }

  return (
    <Clickable onClick={toggle}>
      <primitive object={wrapper} position={position} scale={scale} />
    </Clickable>
  )
}

export default Gramophone
