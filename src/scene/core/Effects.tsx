// Composición de efectos de postprocesado para React Three Fiber
import {
  EffectComposer,
  Bloom,
  Vignette,
  DepthOfField,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { GRAPHICS, useGraphicsLevel } from '@/utils/graphics'

// Interruptor general: false apaga todo el postprocesado y la niebla y devuelve la escena a como estaba
export const ENABLE_EFFECTS = true

// Bloom suave: solo brillan los colores por encima del umbral (llamas de las velas con color > 1)
const BLOOM_INTENSITY = 0.9
const BLOOM_LUMINANCE_THRESHOLD = 0.85
const BLOOM_LUMINANCE_SMOOTHING = 0.25
const BLOOM_MIPMAP_BLUR = true // Halo más suave y amplio

// Viñeta sutil que oscurece un poco los bordes
const VIGNETTE_OFFSET = 0.3
const VIGNETTE_DARKNESS = 0.55

// Profundidad de campo (apagada por defecto)
const ENABLE_DOF = false
const DOF_FOCUS_DISTANCE = 0.02
const DOF_FOCAL_LENGTH = 0.05
const DOF_BOKEH_SCALE = 2

// Corrección de color ligera
const HUE_SHIFT = 0           // Giro de tono en radianes
const SATURATION = 0.06       // Ligero aumento de saturación (-1 a 1)
const BRIGHTNESS = 0.0        // Brillo (-1 a 1)
const CONTRAST = 0.06         // Ligero aumento de contraste (-1 a 1)

// Niebla exponencial muy ligera: dentro de la sala apenas se nota (≈3 % en la pared del fondo); en el jardín es la bruma
// que aclara (u oscurece, de noche) lo lejano. Su color es el del momento del día (el cielo y las colinas no la usan)
const FOG_DENSITY = 0.028
// Con niebla o lluvia de verdad (el tiempo de la ciudad), la bruma es más espesa: por cuánto se multiplica
const FOG_WEATHER_DENSITY = 4
const RAIN_WEATHER_DENSITY = 1.8

/**
 * Postprocesado (Bloom, viñeta, profundidad de campo opcional y corrección de color) y niebla ligera.
 */
/**
 * @param fogColor - Color de la bruma del momento del día
 * @param fog - Hay niebla en la ciudad
 * @param rain - Lluvia: 0 (nada) a 1 (fuerte)
 */
function Effects({ fogColor, fog, rain }: { fogColor: string; fog: boolean; rain: number }) {
  const density = FOG_DENSITY * (fog ? FOG_WEATHER_DENSITY : 1) * (1 + (RAIN_WEATHER_DENSITY - 1) * rain)
  // Nivel de gráficos: el bajo se queda sin bloom y sin muestreo múltiple
  const { bloom, multisampling } = GRAPHICS[useGraphicsLevel()]
  if (!ENABLE_EFFECTS) return null

  return (
    <>
      {/* Niebla exponencial: attach="fog" la asigna a scene.fog */}
      <fogExp2 attach="fog" args={[fogColor, density]} />

      {/* EffectComposer sustituye el render normal por una cadena de pasadas de postprocesado. multisampling: muestreo
          múltiple para mantener los bordes suaves (sustituye al antialias del lienzo) */}
      <EffectComposer multisampling={multisampling}>
        {ENABLE_DOF && (
          <DepthOfField
            focusDistance={DOF_FOCUS_DISTANCE}
            focalLength={DOF_FOCAL_LENGTH}
            bokehScale={DOF_BOKEH_SCALE}
          />
        )}
        {bloom && (
          <Bloom
            intensity={BLOOM_INTENSITY}
            luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
            luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
            mipmapBlur={BLOOM_MIPMAP_BLUR}
          />
        )}
        <HueSaturation hue={HUE_SHIFT} saturation={SATURATION} />
        <BrightnessContrast brightness={BRIGHTNESS} contrast={CONTRAST} />
        <Vignette offset={VIGNETTE_OFFSET} darkness={VIGNETTE_DARKNESS} />
      </EffectComposer>
    </>
  )
}

export default Effects
