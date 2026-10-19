// Atmósfera del momento del día (useAmbience): color e intensidad de la luz del ventanal y de la luz difusa
import type { AmbiencePalette } from '@/scene/core/ambiencePalette'
// Vector3Tuple: [x, y, z] en metros (el formato que aceptan position y rotation en React Three Fiber)
import type { Vector3Tuple } from 'three'

// La luz difusa y la del ventanal cambian con la hora (colores e intensidades de la atmósfera: ver ambiencePalette.ts).
// La del ventanal entra siempre por el ventanal (es la luz del cielo, no la del sol directo: de mañana el sol queda
// detrás de la casa y alumbraría la sala atravesando la pared del fondo).
// Sol bajo del atardecer: del mismo lado que el sol del cielo (SunsetSky, al fondo a la derecha) pero algo más alto,
// para que entre por el ventanal y estire las sombras de los parteluces por el suelo
const WINDOW_LIGHT_POSITION: Vector3Tuple = [-2.4, 2.2, 10]

// Constantes de configuración de sombras proyectadas por la luz del ventanal
const SHADOW_MAP_SIZE = 1024 // Resolución en píxeles del mapa de sombras
const SHADOW_BIAS = -0.0005  // Desplazamiento numérico para evitar acné de sombra

/**
 * Componente de iluminación de la escena.
 * Se eliminan las luces artificiales dentro de la habitación (lámpara y bombilla puntual),
 * dejando que la iluminación provenga exclusivamente del ventanal exterior y de la luz difusa natural.
 */
function Lights({ palette }: { palette: AmbiencePalette }) {
  return (
    // Grupo contenedor para todas las fuentes de iluminación de la escena
    <group>
      {/* 1. Luz ambiental natural difusa para levantar suavemente las penumbras de la biblioteca */}
      <ambientLight
        color={palette.ambientColor}
        intensity={palette.ambientIntensity}
      />

      {/* 2. Luz exterior natural que entra por el ventanal proyectando sombras en el interior */}
      <directionalLight
        color={palette.lightColor}
        intensity={palette.lightIntensity}
        position={WINDOW_LIGHT_POSITION}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-bias={SHADOW_BIAS}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
    </group>
  )
}

export default Lights
