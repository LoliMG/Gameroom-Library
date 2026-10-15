// Constantes de dimensiones de la habitación en metros (1 unidad = 1 metro)
export const ROOM_WIDTH = 4.0   // Ancho de la habitación (paredes c y d)
export const ROOM_DEPTH = 6.0   // Profundidad de la habitación alargada hacia la cámara (paredes laterales a y b)
export const ROOM_HEIGHT = 2.8  // Altura libre del suelo al techo

// Posición Z fija de la pared del fondo (d) donde apoya la estantería
export const BACK_WALL_Z = -2.0

// Posición Z central de la habitación alargada hacia la cámara: de Z=-2.0 a Z=+4.0, centro en Z=+1.0
export const ROOM_CENTER_Z = BACK_WALL_Z + ROOM_DEPTH / 2

// Nivel del suelo coincidente con la base de la estantería (Y = -1.0)
export const FLOOR_Y = -1.0

// Posición Y central de las paredes verticales
export const WALL_CENTER_Y = FLOOR_Y + ROOM_HEIGHT / 2 // -1.0 + 1.4 = 0.4

// Colores lisos de los materiales de la habitación
const FLOOR_COLOR = '#3a2312' // Color madera oscura cálida para el suelo
const WALL_COLOR = '#ebe5dc'  // Tono crema / beige apagado suave y cálido para las paredes

function Room() {
  return (
    // Grupo contenedor 3D que agrupa el suelo y las 3 paredes visibles
    <group>
      {/* 1. SUELO: Plano horizontal en la base de la estancia */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje X para que la normal apunte hacia ARRIBA (+Y) */}
      {/* Posición: Centrado en X=0, cota Y=FLOOR_Y (-1.0), y centro en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[0, FLOOR_Y, ROOM_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        // receiveShadow: permite que la superficie del suelo reciba y muestre las sombras proyectadas por otros objetos
        receiveShadow
      >
        {/* Geometría plana con ancho (ROOM_WIDTH = 4.0) y profundidad alargada (ROOM_DEPTH = 6.0) */}
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        {/* Material estándar liso con color de madera oscura cálida */}
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>

      {/* 2. PARED DEL FONDO (d): Plano vertical perpendicular al eje Z en la parte posterior */}
      {/* Rotación: Sin rotación [0, 0, 0], su normal natural mira hacia el frente interior (+Z) */}
      {/* Posición: En la cota fija Z = BACK_WALL_Z (-2.0), centrada en X=0 y Y=WALL_CENTER_Y (0.4) */}
      <mesh
        position={[0, WALL_CENTER_Y, BACK_WALL_Z]}
        rotation={[0, 0, 0]}
        // receiveShadow: permite proyectar sombras sobre la pared trasera
        receiveShadow
      >
        {/* Geometría plana con ancho de la estancia y altura vertical */}
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* 3. PARED IZQUIERDA (a): Plano vertical en el lateral izquierdo alargado a 6 metros */}
      {/* Rotación: +90 grados (+PI / 2) sobre el eje Y para que la normal apunte hacia la DERECHA (+X, interior) */}
      {/* Posición: En el límite izquierdo X = -ROOM_WIDTH / 2 (-2.0), centrada en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[-ROOM_WIDTH / 2, WALL_CENTER_Y, ROOM_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        // receiveShadow: permite proyectar sombras sobre la pared lateral izquierda
        receiveShadow
      >
        {/* Geometría plana con la nueva profundidad de la estancia (6.0) y altura vertical */}
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* 4. PARED DERECHA (b): Plano vertical en el lateral derecho alargado a 6 metros */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje Y para que la normal apunte hacia la IZQUIERDA (-X, interior) */}
      {/* Posición: En el límite derecho X = +ROOM_WIDTH / 2 (+2.0), centrada en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[ROOM_WIDTH / 2, WALL_CENTER_Y, ROOM_CENTER_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        // receiveShadow: permite proyectar sombras sobre la pared lateral derecha
        receiveShadow
      >
        {/* Geometría plana con la nueva profundidad de la estancia (6.0) y altura vertical */}
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    </group>
  )
}

export default Room
