// Sonidos de fondo del jardín hechos con la Web Audio API del navegador (sin archivos de audio): viento, grillos, lluvia y
// truenos.
// - Viento: ruido blanco con un filtro de graves cuya frecuencia y volumen suben y bajan despacio (ráfagas).
// - Grillos: varios grillos a distintas distancias y lados que cantan "cri-cri-cri" (pulsos cortos de un tono agudo,
//   cada uno con su ritmo y con pequeños cambios de tono), con un poco de eco y sin agudos ásperos: suenan fuera.
// - Lluvia: un fondo de ruido rosa suave (el rumor de la lluvia lejana) y, encima, el repiqueteo de las gotas: miles de
//   golpecitos de pocos milisegundos, cada uno con su tono, fuerza y lado, más seguidos cuanto más fuerte llueve.
// - Truenos (con tormenta): ruido marrón (muy grave) con un chasquido al principio y un retumbar que se apaga en unos
//   segundos, de vez en cuando y cada uno distinto.
// Lo de noche que es (setLevel), la lluvia (setRain), la tormenta (setThunder) y la cercanía al ventanal (setProximity)
// ponen el volumen de cada parte: el viento suena de noche o con lluvia, los grillos solo de noche sin lluvia. Encima,
// cada sonido tiene su volumen de los ajustes (setVolumes). Todo cambia poco a poco, sin cortes.

import type { SoundVolumes } from '@/types'

// Volumen máximo de cada parte (con nivel 1 y junto al ventanal): muy suaves, de fondo
const MASTER_VOLUME = 0.35
const WIND_VOLUME = 0.1
const CRICKET_VOLUME = 0.012
// Lluvia: volumen del rumor de fondo y de cada gota, y gotas por segundo con lluvia fuerte
const RAIN_WASH_VOLUME = 0.09
const RAIN_DROP_VOLUME = 0.05
const RAIN_DROPS_PER_SECOND = 110
// Rumor: ruido rosa (más graves que el blanco) sin los graves más hondos ni los agudos ásperos (Hz)
const RAIN_WASH_HIGHPASS = 150
const RAIN_WASH_LOWPASS = 2400
// Cada gota: un golpecito de ruido de esta duración (s), filtrado alrededor de un tono al azar (Hz) con este Q
const RAIN_DROP_LENGTH = 0.012
const RAIN_DROP_PITCH: [number, number] = [1400, 6500]
const RAIN_DROP_Q = 2.5
// Lejos del ventanal la lluvia baja algo (se oye en el tejado y en toda la casa): fracción que queda como mínimo
const RAIN_MIN_PROXIMITY = 0.35
// Truenos: volumen máximo, cada cuánto (s, al azar en este rango) y el primero tras empezar la tormenta
const THUNDER_VOLUME = 0.5
const THUNDER_INTERVAL: [number, number] = [14, 45]
const THUNDER_FIRST: [number, number] = [3, 10]
// Cada trueno: filtro que baja del chasquido al retumbar (Hz) y cuánto tarda en apagarse (constante de tiempo, s)
const THUNDER_CRACK = 1100
const THUNDER_RUMBLE = 140
const THUNDER_DECAY: [number, number] = [1.2, 2.4]
// Lejos del ventanal el viento baja menos que los grillos (se cuela por toda la casa): fracción que queda como mínimo
const WIND_MIN_PROXIMITY = 0.45
// Viento: frecuencia del filtro (Hz) y cuánto y con qué lentitud cambia (ráfagas)
const WIND_CUTOFF = 380
const WIND_CUTOFF_SWING = 220
const WIND_CUTOFF_RATE = 0.07 // Ciclos por segundo
const WIND_GUST_RATE = 0.11
const WIND_GUST_DEPTH = 0.5 // Fracción del volumen del viento que sube y baja
// Grillos: tono (Hz), lado (-1 izquierda, 1 derecha) y volumen relativo (los lejanos, más bajos)
const CRICKETS = [
  { pitch: 4150, pan: -0.7, volume: 1 },
  { pitch: 4420, pan: 0.35, volume: 0.65 },
  { pitch: 4680, pan: -0.15, volume: 0.45 },
  { pitch: 4950, pan: 0.75, volume: 0.3 },
]
// Cada canto: de 3 a 4 pulsos de esta duración y pausa (s); el tono de cada pulso varía hasta ±1 %
const PULSES_PER_CHIRP: [number, number] = [3, 4]
const PULSE_LENGTH = 0.02
const PULSE_GAP = 0.022
const PULSE_PITCH_JITTER = 0.01
// Subida y bajada de cada pulso (constantes de tiempo, s): suaves para que no hagan clic
const PULSE_ATTACK = 0.004
const PULSE_RELEASE = 0.006
// Tiempo entre cantos de un grillo (s, al azar en este rango) y cuánto se programa por adelantado
const CHIRP_INTERVAL: [number, number] = [0.6, 1.9]
const SCHEDULE_AHEAD = 3
const SCHEDULE_EVERY_MS = 1000
// Grillos "fuera": agudos suavizados y algo de eco (reverberación de un impulso de ruido que se apaga)
const CRICKET_LOWPASS = 5200
const REVERB_SECONDS = 1.4
const REVERB_MIX = 0.35
// Rapidez con que el volumen sigue al nivel y a la cercanía (constantes de tiempo, s)
const LEVEL_SMOOTHING = 2
const PROXIMITY_SMOOTHING = 0.3

export interface AmbientSounds {
  /** Lo de noche que es: 0 (día) a 1 (noche cerrada) */
  setLevel(level: number): void
  /** Lluvia: 0 (nada) a 1 (fuerte) */
  setRain(rain: number): void
  /** Tormenta: con true suenan truenos de vez en cuando */
  setThunder(storm: boolean): void
  /** Volumen de cada sonido (de los ajustes) */
  setVolumes(volumes: SoundVolumes): void
  /** Cercanía al ventanal: 1 (junto a él) a 0 (muy lejos); los grillos bajan del todo, el viento y la lluvia en parte */
  setProximity(proximity: number): void
  /** Para todo y libera el audio */
  stop(): void
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const between = ([min, max]: [number, number]) => min + Math.random() * (max - min)

// Oscilador lento (LFO) conectado a un parámetro: lo hace oscilar ±depth alrededor de su valor
function wobble(ctx: BaseAudioContext, param: AudioParam, rate: number, depth: number) {
  const lfo = ctx.createOscillator()
  lfo.frequency.value = rate
  const amount = ctx.createGain()
  amount.gain.value = depth
  lfo.connect(amount).connect(param)
  lfo.start()
  return lfo
}

// Respuesta de un espacio abierto: ruido estéreo que se apaga poco a poco (para el eco de los grillos)
function reverbImpulse(ctx: BaseAudioContext) {
  const length = Math.round(ctx.sampleRate * REVERB_SECONDS)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  }
  return impulse
}

// Ruido rosa (el método de Paul Kellet): el blanco filtrado para que cada octava tenga la misma energía; suena a
// lluvia o a mar lejano en vez de al siseo del blanco
function pinkNoise(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

// Ruido marrón: el blanco acumulado (cada muestra se parece a la anterior), casi solo graves: el retumbar de un trueno
function brownNoise(ctx: BaseAudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

// Golpecito de una gota: ruido que se apaga enseguida
function dropSound(ctx: BaseAudioContext) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * RAIN_DROP_LENGTH), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4
  return buffer
}

/**
 * Crea los sonidos de fondo en ctx (empiezan en silencio: los volúmenes los ponen setLevel y setRain).
 * Sirve también un OfflineAudioContext, para comprobar que suenan sin altavoces.
 */
export function createAmbientSounds(ctx: BaseAudioContext): AmbientSounds {
  const master = ctx.createGain()
  master.gain.value = MASTER_VOLUME
  master.connect(ctx.destination)
  // Volumen de cada parte según la noche y la lluvia (los ajusta update)
  const windLevel = ctx.createGain()
  const cricketLevel = ctx.createGain()
  const rainLevel = ctx.createGain()
  const thunderLevel = ctx.createGain()
  for (const gain of [windLevel, cricketLevel, rainLevel, thunderLevel]) {
    gain.gain.value = 0
    gain.connect(master)
  }

  // Viento: 2 s de ruido blanco en bucle, por un filtro de graves que se mueve
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const samples = noise.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const wind = ctx.createBufferSource()
  wind.buffer = noise
  wind.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = WIND_CUTOFF
  const windGain = ctx.createGain()
  windGain.gain.value = WIND_VOLUME
  const windDistance = ctx.createGain() // Cercanía al ventanal
  wind.connect(filter).connect(windGain).connect(windDistance).connect(windLevel)
  wind.start()

  // Lluvia: rumor de ruido rosa en bucle, entre dos filtros; las gotas (abajo, en schedule) van al mismo sitio
  const rainDistance = ctx.createGain()
  rainDistance.connect(rainLevel)
  const rainNoise = ctx.createBufferSource()
  rainNoise.buffer = pinkNoise(ctx, 3)
  rainNoise.loop = true
  const washHighpass = ctx.createBiquadFilter()
  washHighpass.type = 'highpass'
  washHighpass.frequency.value = RAIN_WASH_HIGHPASS
  const washLowpass = ctx.createBiquadFilter()
  washLowpass.type = 'lowpass'
  washLowpass.frequency.value = RAIN_WASH_LOWPASS
  const washGain = ctx.createGain()
  washGain.gain.value = RAIN_WASH_VOLUME
  rainNoise.connect(washHighpass).connect(washLowpass).connect(washGain).connect(rainDistance)
  rainNoise.start()
  const drop = dropSound(ctx)
  let nextDrop = ctx.currentTime
  // Una gota: el golpecito con su tono, fuerza y lado al azar (los nodos se liberan solos al acabar de sonar)
  const playDrop = (when: number) => {
    const source = ctx.createBufferSource()
    source.buffer = drop
    source.playbackRate.value = 0.7 + Math.random() * 0.7
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = between(RAIN_DROP_PITCH)
    filter.Q.value = RAIN_DROP_Q
    const gain = ctx.createGain()
    gain.gain.value = RAIN_DROP_VOLUME * (0.2 + Math.random() * 0.8)
    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.random() * 2 - 1
    source.connect(filter).connect(gain).connect(panner).connect(rainDistance)
    source.start(when)
  }

  // Truenos: el mismo ruido marrón para todos, cada uno con su fuerza, su retumbar y su punto de partida
  const thunderNoise = brownNoise(ctx, 8)
  let nextThunder = Infinity
  const playThunder = (when: number) => {
    const source = ctx.createBufferSource()
    source.buffer = thunderNoise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(THUNDER_CRACK, when)
    filter.frequency.exponentialRampToValueAtTime(THUNDER_RUMBLE, when + 1.5)
    const gain = ctx.createGain()
    const peak = THUNDER_VOLUME * (0.4 + Math.random() * 0.6)
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(peak, when + 0.08)
    gain.gain.setTargetAtTime(0, when + 0.4, between(THUNDER_DECAY))
    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.random() * 1.2 - 0.6
    source.connect(filter).connect(gain).connect(panner).connect(thunderLevel)
    source.start(when, Math.random() * 2, 7)
  }

  // Lo de noche que es, la lluvia, si hay tormenta y el volumen de cada sonido (los ponen los set… de abajo)
  let night = 0
  let rain = 0
  let storm = false
  let volumes: SoundVolumes = { wind: 1, rain: 1, thunder: 1, crickets: 1 }
  const lfos = [wobble(ctx, filter.frequency, WIND_CUTOFF_RATE, WIND_CUTOFF_SWING), wobble(ctx, windGain.gain, WIND_GUST_RATE, WIND_VOLUME * WIND_GUST_DEPTH)]

  // Grillos: todos pasan por un bus con filtro de agudos y eco; su volumen es la cercanía al ventanal
  const cricketBus = ctx.createGain()
  const cricketFilter = ctx.createBiquadFilter()
  cricketFilter.type = 'lowpass'
  cricketFilter.frequency.value = CRICKET_LOWPASS
  const reverb = ctx.createConvolver()
  reverb.buffer = reverbImpulse(ctx)
  const reverbGain = ctx.createGain()
  reverbGain.gain.value = REVERB_MIX
  cricketBus.connect(cricketFilter)
  cricketFilter.connect(cricketLevel)
  cricketFilter.connect(reverb).connect(reverbGain).connect(cricketLevel)

  // Cada grillo: un tono continuo cuyo volumen se abre y se cierra en cada pulso
  const crickets = CRICKETS.map(({ pitch, pan, volume }) => {
    const tone = ctx.createOscillator()
    tone.frequency.value = pitch
    const envelope = ctx.createGain()
    envelope.gain.value = 0
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    tone.connect(envelope).connect(panner).connect(cricketBus)
    tone.start()
    return { tone, envelope, pitch, volume, nextChirp: ctx.currentTime + Math.random() * CHIRP_INTERVAL[1] }
  })
  // Programa los cantos y las gotas de los próximos segundos (el reloj del audio es preciso; el de JavaScript, no tanto)
  const schedule = () => {
    // Gotas: al azar, con una media de RAIN_DROPS_PER_SECOND × lluvia por segundo (sin lluvia, ninguna)
    nextDrop = Math.max(nextDrop, ctx.currentTime)
    while (rain > 0 && nextDrop < ctx.currentTime + SCHEDULE_AHEAD) {
      playDrop(nextDrop)
      nextDrop += -Math.log(1 - Math.random()) / (RAIN_DROPS_PER_SECOND * rain)
    }
    // Truenos: de vez en cuando, mientras dure la tormenta
    while (storm && nextThunder < ctx.currentTime + SCHEDULE_AHEAD) {
      playThunder(nextThunder)
      nextThunder += between(THUNDER_INTERVAL)
    }
    for (const cricket of crickets) {
      while (cricket.nextChirp < ctx.currentTime + SCHEDULE_AHEAD) {
        const pulses = Math.round(between(PULSES_PER_CHIRP))
        for (let p = 0; p < pulses; p++) {
          const start = cricket.nextChirp + p * (PULSE_LENGTH + PULSE_GAP)
          cricket.tone.frequency.setValueAtTime(cricket.pitch * (1 + (Math.random() * 2 - 1) * PULSE_PITCH_JITTER), start)
          cricket.envelope.gain.setValueAtTime(0, start)
          cricket.envelope.gain.setTargetAtTime(CRICKET_VOLUME * cricket.volume, start, PULSE_ATTACK)
          cricket.envelope.gain.setTargetAtTime(0, start + PULSE_LENGTH * 0.6, PULSE_RELEASE)
        }
        cricket.nextChirp += between(CHIRP_INTERVAL)
      }
    }
  }
  schedule()
  const timer = setInterval(schedule, SCHEDULE_EVERY_MS)

  // Volumen de cada parte: viento de noche o con lluvia; grillos de noche, callados con lluvia; lluvia cuando llueve;
  // truenos con tormenta. Cada uno por su volumen de los ajustes
  const update = () => {
    windLevel.gain.setTargetAtTime(Math.max(night, rain) * volumes.wind, ctx.currentTime, LEVEL_SMOOTHING)
    cricketLevel.gain.setTargetAtTime(night * (1 - rain) * volumes.crickets, ctx.currentTime, LEVEL_SMOOTHING)
    rainLevel.gain.setTargetAtTime(rain * volumes.rain, ctx.currentTime, LEVEL_SMOOTHING)
    thunderLevel.gain.setTargetAtTime(volumes.thunder, ctx.currentTime, 0.1)
  }

  return {
    setLevel(level) {
      night = clamp01(level)
      update()
    },
    setRain(level) {
      rain = clamp01(level)
      update()
      schedule() // Que las gotas empiecen ya, sin esperar a la siguiente vuelta
    },
    setThunder(on) {
      if (on && !storm) nextThunder = ctx.currentTime + between(THUNDER_FIRST)
      storm = on
      schedule()
    },
    setVolumes(next) {
      volumes = next
      update()
    },
    setProximity(proximity) {
      const near = clamp01(proximity)
      cricketBus.gain.setTargetAtTime(near, ctx.currentTime, PROXIMITY_SMOOTHING)
      windDistance.gain.setTargetAtTime(WIND_MIN_PROXIMITY + (1 - WIND_MIN_PROXIMITY) * near, ctx.currentTime, PROXIMITY_SMOOTHING)
      rainDistance.gain.setTargetAtTime(RAIN_MIN_PROXIMITY + (1 - RAIN_MIN_PROXIMITY) * near, ctx.currentTime, PROXIMITY_SMOOTHING)
    },
    stop() {
      clearInterval(timer)
      for (const source of [wind, rainNoise, ...lfos, ...crickets.map((cricket) => cricket.tone)]) source.stop()
      master.disconnect()
    },
  }
}
