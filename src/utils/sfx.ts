// Sonidos sueltos de la sala, hechos con Web Audio (como los del jardín en ambientSounds.ts): el ronroneo del gato y la
// campanita del final del modo concentración

// Vibración del ronroneo (veces por segundo), ritmo de la respiración (s por inspiración y espiración) y duración
const PURR_RATE = 25
const BREATH_SECONDS = 1.5
const BREATHS = 2
// Graves: el ronroneo es un retumbar suave por debajo de esta frecuencia (Hz)
const PURR_LOWPASS = 220
const PURR_VOLUME = 0.6

// Un solo contexto de audio para todos: se crea al primer sonido, que siempre llega tras un clic (antes el navegador no
// deja sonar)
let context: AudioContext | null = null
const audio = () => (context ??= new AudioContext())

/** Ronroneo: ruido grave que vibra unas 25 veces por segundo y respira (sube y baja) un par de veces. */
export function purr() {
  const ctx = audio()
  const now = ctx.currentTime
  const duration = BREATHS * BREATH_SECONDS

  // Ruido blanco que se pasa por un filtro de graves
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = PURR_LOWPASS

  // Vibración: un oscilador que abre y cierra el volumen PURR_RATE veces por segundo
  const tremolo = ctx.createGain()
  tremolo.gain.value = 0.5
  const vibration = ctx.createOscillator()
  vibration.frequency.value = PURR_RATE
  const depth = ctx.createGain()
  depth.gain.value = 0.5
  vibration.connect(depth).connect(tremolo.gain)

  // Respiración: sube al inspirar y baja al espirar, más flojo al espirar
  const breath = ctx.createGain()
  breath.gain.setValueAtTime(0, now)
  for (let i = 0; i < BREATHS; i++) {
    const start = now + i * BREATH_SECONDS
    breath.gain.linearRampToValueAtTime(PURR_VOLUME, start + BREATH_SECONDS * 0.4)
    breath.gain.linearRampToValueAtTime(PURR_VOLUME * 0.5, start + BREATH_SECONDS * 0.8)
    breath.gain.linearRampToValueAtTime(0.02, start + BREATH_SECONDS)
  }

  noise.connect(lowpass).connect(tremolo).connect(breath).connect(ctx.destination)
  noise.start(now)
  vibration.start(now)
  noise.stop(now + duration)
  vibration.stop(now + duration)
}

// Campanita: dos notas (Hz) una tras otra, cada una con su armónico, que se apagan despacio
const CHIME_NOTES = [988, 1319]
const CHIME_GAP = 0.35
const CHIME_DECAY = 2.5
const CHIME_VOLUME = 0.25

/** Campanita suave (fin del modo concentración). */
export function chime() {
  const ctx = audio()
  const now = ctx.currentTime
  CHIME_NOTES.forEach((frequency, i) => {
    const start = now + i * CHIME_GAP
    for (const [multiple, level] of [[1, 1], [2.76, 0.3]]) {
      const tone = ctx.createOscillator()
      tone.frequency.value = frequency * multiple
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(CHIME_VOLUME * level, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + CHIME_DECAY)
      tone.connect(gain).connect(ctx.destination)
      tone.start(start)
      tone.stop(start + CHIME_DECAY)
    }
  })
}
