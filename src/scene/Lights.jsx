// Constantes de configuración de la luz ambiental
const AMBIENT_LIGHT_COLOR = '#ffe3c6' // Tono cálido tenue para la luz de ambiente general
const AMBIENT_LIGHT_INTENSITY = 0.25  // Intensidad baja para mantener una atmósfera íntima y acogedora

// Constantes de configuración de la luz direccional (luz exterior suave)
const DIR_LIGHT_COLOR = '#cce0ff'          // Tono ligeramente azulado que simula luz exterior tenue
const DIR_LIGHT_INTENSITY = 0.5            // Intensidad suave para no sobreexponer la escena
const DIR_LIGHT_POSITION = [3.0, 4.0, 2.5] // Posición situada arriba y a la derecha de la habitación

// Constantes de configuración de la lámpara puntual (pointLight)
const POINT_LIGHT_COLOR = '#ffa53b'          // Color ámbar cálido característico de bombilla incandescente
const POINT_LIGHT_INTENSITY = 8.5            // Intensidad luminosa que genera el foco
const POINT_LIGHT_DISTANCE = 3.8             // Distancia máxima (en metros) hasta donde alcanza la iluminación
const POINT_LIGHT_DECAY = 2                  // Atenuación cuadrática física de la luz con la distancia
const POINT_LIGHT_POSITION = [0.9, 0.6, -1.4] // Cerca de la estantería (a su derecha) y a 1.6m sobre el suelo (Y=-1.0 + 1.6 = 0.6)
const BULB_RADIUS = 0.05                     // Radio de 5 cm para la bombilla esférica visible

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
      <pointLight
        color={POINT_LIGHT_COLOR}
        intensity={POINT_LIGHT_INTENSITY}
        distance={POINT_LIGHT_DISTANCE}
        decay={POINT_LIGHT_DECAY}
        position={POINT_LIGHT_POSITION}
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
