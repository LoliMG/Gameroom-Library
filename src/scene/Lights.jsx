// Importación de las cotas de la habitación para calcular la posición de la lámpara sin números fijos
import { FLOOR_Y, BACK_WALL_Z } from '@/scene/Room'

// Constantes de configuración de la luz ambiental
const AMBIENT_LIGHT_COLOR = '#ffe3c6' // Tono cálido tenue para la luz de ambiente general
const AMBIENT_LIGHT_INTENSITY = 0.25  // Intensidad baja para mantener una atmósfera íntima y acogedora

// Constantes de configuración de la luz direccional (luz exterior suave)
const DIR_LIGHT_COLOR = '#cce0ff'          // Tono ligeramente azulado que simula luz exterior tenue
const DIR_LIGHT_INTENSITY = 0.5            // Intensidad suave para no sobreexponer la escena
const DIR_LIGHT_POSITION = [3.0, 4.0, 2.5] // Posición situada arriba y a la derecha de la habitación

// Constantes de colocación de la lámpara
const LAMP_HEIGHT = 1.6                   // Altura de la lámpara en metros sobre el suelo (1.6 m)
const LAMP_DISTANCE_FROM_BACK_WALL = 1.5  // Distancia en metros por delante de la pared del fondo

// Cálculo de la posición 3D de la lámpara a partir de las dimensiones de la habitación:
// - X = 0: centrada en la habitación a lo ancho
// - Y = FLOOR_Y + LAMP_HEIGHT: a 1.6 m sobre el suelo (-1.0 + 1.6 = 0.6 m)
// - Z = BACK_WALL_Z + LAMP_DISTANCE_FROM_BACK_WALL: 1.5 m por delante de la pared trasera (-2.0 + 1.5 = -0.5 m)
// Al estar en Z = -0.5 m, queda 1.15 m por delante del frente de las estanterías (Z = -1.65 m), fuera de cualquier módulo.
const POINT_LIGHT_POSITION = [
  0,
  FLOOR_Y + LAMP_HEIGHT,
  BACK_WALL_Z + LAMP_DISTANCE_FROM_BACK_WALL,
]

// Constantes de configuración de la lámpara puntual (pointLight)
const POINT_LIGHT_COLOR = '#ffa53b'          // Color ámbar cálido característico de bombilla incandescente
const POINT_LIGHT_INTENSITY = 8.5            // Intensidad luminosa que genera el foco
// Alcance en metros: desde Z = -0.5 m hasta la pared del fondo (1.5 m) y hasta las esquinas delanteras opuestas
// a Z = +4.0 m (distancia diagonal sqrt(2^2 + 1.6^2 + 4.5^2) ≈ 5.18 m). Con 6.5 m cubre toda la estancia.
const POINT_LIGHT_DISTANCE = 6.5
const POINT_LIGHT_DECAY = 2                  // Atenuación cuadrática física de la luz con la distancia
const BULB_RADIUS = 0.05                     // Radio de 5 cm para la bombilla esférica visible

// Constantes de configuración de sombras para la luz puntual
const SHADOW_MAP_SIZE = 1024 // shadow-mapSize: resolución en píxeles del mapa de sombras (1024x1024 para bordes definidos y nítidos)
const SHADOW_BIAS = -0.0005  // shadow-bias: desplazamiento numérico negativo para prevenir el acné de sombra (rayas o artefactos en superficies)

function Lights() {
  return (
    // Grupo contenedor para todas las fuentes de luz de la escena
    <group>
      {/* 1. Luz ambiental cálida y difusa para levantar suavemente las sombras generales */}
      <ambientLight
        color={AMBIENT_LIGHT_COLOR}
        intensity={AMBIENT_LIGHT_INTENSITY}
      />

      {/* 2. Luz direccional suave con tinte azulado frío desde arriba y la derecha (luz exterior) */}
      <directionalLight
        color={DIR_LIGHT_COLOR}
        intensity={DIR_LIGHT_INTENSITY}
        position={DIR_LIGHT_POSITION}
      />

      {/* 3. Luz puntual cálida que emula una lámpara de lectura junto a la estantería */}
      {/* - intensity: define la potencia lumínica o brillo de la fuente de luz puntual. */}
      {/* - distance: determina el radio límite en metros a partir del cual la luz ya no tiene efecto. */}
      {/* - decay: indica la velocidad de atenuación según la distancia (2 simula la ley física cuadrática inversa). */}
      {/* - castShadow: habilita que esta fuente de luz proyecte sombras dinámicas sobre los objetos de la escena. */}
      {/* - shadow-mapSize-width / height: resolución del búfer de profundidad para calcular las siluetas de las sombras. */}
      {/* - shadow-bias: desfase leve para evitar que una superficie se proyecte sombra a sí misma indebidamente (shadow acne). */}
      <pointLight
        color={POINT_LIGHT_COLOR}
        intensity={POINT_LIGHT_INTENSITY}
        distance={POINT_LIGHT_DISTANCE}
        decay={POINT_LIGHT_DECAY}
        position={POINT_LIGHT_POSITION}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-bias={SHADOW_BIAS}
      />

      {/* 4. Malla esférica visible que representa físicamente la bombilla encendida */}
      <mesh position={POINT_LIGHT_POSITION}>
        {/* Geometría esférica de radio 0.05 m con subdivisiones para acabado curvo suave */}
        <sphereGeometry args={[BULB_RADIUS, 16, 16]} />
        {/* Material básico autorreflectante que no depende de las luces y se ve brillante */}
        <meshBasicMaterial color={POINT_LIGHT_COLOR} />
      </mesh>
    </group>
  )
}

export default Lights
