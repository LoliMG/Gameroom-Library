// Sonido de noche hecho con la Web Audio API del navegador (sin archivos de audio): viento suave y grillos.
// - Viento: ruido blanco con un filtro de graves cuya frecuencia y volumen suben y bajan despacio (ráfagas).
// - Grillos: varios grillos a distintas distancias y lados que cantan "cri-cri-cri" (pulsos cortos de un tono agudo,
//   cada uno con su ritmo y con pequeños cambios de tono), con un poco de eco y sin agudos ásperos: suenan fuera.
// El volumen general lo pone setLevel (0 = silencio, 1 = noche cerrada) y la cercanía al ventanal setProximity; los dos
// cambian poco a poco, sin cortes.

// Volumen máximo de cada parte (con nivel 1 y junto al ventanal): muy suaves, de fondo
const MASTER_VOLUME = 0.35
const WIND_VOLUME = 0.1
const CRICKET_VOLUME = 0.012
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

export interface NightAmbience {
  /** Volumen según lo de noche que sea: 0 (día, silencio) a 1 (noche cerrada) */
  setLevel(level: number): void
  /** Cercanía al ventanal: 1 (junto a él) a 0 (muy lejos); los grillos bajan del todo, el viento solo en parte */
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

/**
 * Crea el sonido de noche en ctx (empieza en silencio: el volumen lo pone setLevel).
 * Sirve también un OfflineAudioContext, para comprobar que suena sin altavoces.
 */
export function createNightAmbience(ctx: BaseAudioContext): NightAmbience {
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

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
  wind.connect(filter).connect(windGain).connect(windDistance).connect(master)
  wind.start()
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
  cricketFilter.connect(master)
  cricketFilter.connect(reverb).connect(reverbGain).connect(master)

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
  // Programa los cantos de los próximos segundos (el reloj del audio es preciso; el de JavaScript, no tanto)
  const schedule = () => {
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

  return {
    setLevel(level) {
      master.gain.setTargetAtTime(clamp01(level) * MASTER_VOLUME, ctx.currentTime, LEVEL_SMOOTHING)
    },
    setProximity(proximity) {
      const near = clamp01(proximity)
      cricketBus.gain.setTargetAtTime(near, ctx.currentTime, PROXIMITY_SMOOTHING)
      windDistance.gain.setTargetAtTime(WIND_MIN_PROXIMITY + (1 - WIND_MIN_PROXIMITY) * near, ctx.currentTime, PROXIMITY_SMOOTHING)
    },
    stop() {
      clearInterval(timer)
      for (const source of [wind, ...lfos, ...crickets.map((cricket) => cricket.tone)]) source.stop()
      master.disconnect()
    },
  }
}
