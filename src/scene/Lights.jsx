// Importación de la paleta ambiental activa para coordinar la luz exterior
import { PALETTE } from '@/scene/ambiencePalette'

// Constantes de configuración de la luz ambiental interior difusa
// Se eleva la intensidad ambiental suavemente para mantener visibilidad acogedora sin luces artificiales interiores
const AMBIENT_LIGHT_COLOR = '#e8ecf0' // Tono natural neutro para levantar penumbras sin bombillas artificiales
const AMBIENT_LIGHT_INTENSITY = 0.65  // Intensidad suficiente para leer lomos y apreciar las texturas de la sala

// Constantes de configuración de la luz natural exterior que entra por el gran ventanal
const WINDOW_LIGHT_COLOR = PALETTE.lightColor         // Color de luz exterior según la paleta activa
const WINDOW_LIGHT_INTENSITY = 1.4                    // Intensidad principal que baña la habitación desde la ventana
const WINDOW_LIGHT_POSITION = [0.6, 2.8, 5.5]         // Posición exterior en altura apuntando hacia el interior de la sala

// Constantes de configuración de sombras proyectadas por la luz del ventanal
const SHADOW_MAP_SIZE = 1024 // Resolución en píxeles del mapa de sombras
const SHADOW_BIAS = -0.0005  // Desplazamiento numérico para evitar acné de sombra

/**
 * Componente de iluminación de la escena.
 * Se eliminan las luces artificiales dentro de la habitación (lámpara y bombilla puntual),
 * dejando que la iluminación provenga exclusivamente del ventanal exterior y de la luz difusa natural.
 */
function Lights() {
  return (
    // Grupo contenedor para todas las fuentes de iluminación de la escena
    <group>
      {/* 1. Luz ambiental natural difusa para levantar suavemente las penumbras de la biblioteca */}
      <ambientLight
        color={AMBIENT_LIGHT_COLOR}
        intensity={AMBIENT_LIGHT_INTENSITY}
      />

      {/* 2. Luz exterior natural que entra por el ventanal proyectando sombras en el interior */}
      <directionalLight
        color={WINDOW_LIGHT_COLOR}
        intensity={WINDOW_LIGHT_INTENSITY}
        position={WINDOW_LIGHT_POSITION}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-bias={SHADOW_BIAS}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
    </group>
  )
}

export default Lights
