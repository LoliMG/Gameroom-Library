// Constantes de dimensiones de la habitación en metros (1 unidad = 1 metro)
const ROOM_WIDTH = 4.0
const ROOM_DEPTH = 4.0
const ROOM_HEIGHT = 2.8

// Nivel del suelo coincidente con la base de la estantería (Y = -1.0)
const FLOOR_Y = -1.0

// Posición Y central de las paredes verticales
const WALL_CENTER_Y = FLOOR_Y + ROOM_HEIGHT / 2 // -1.0 + 1.4 = 0.4

// Colores lisos de los materiales de la habitación
const FLOOR_COLOR = '#3a2312' // Color madera oscura cálida para el suelo
const WALL_COLOR = '#ebe5dc'  // Tono crema / beige apagado suave y cálido para las paredes

function Room() {
  return (
    // Grupo contenedor 3D que agrupa el suelo y las 3 paredes visibles
    <group>
      {/* 1. SUELO: Plano horizontal en el fondo inferior de la estancia */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje X para que la cara visible (normal) apunte hacia ARRIBA (+Y) */}
      {/* Posición: Centrado en X=0 y Z=0, a la altura del suelo Y=FLOOR_Y (-1.0) */}
      <mesh
        position={[0, FLOOR_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {/* Geometría plana con ancho (ROOM_WIDTH) y profundidad (ROOM_DEPTH) */}
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        {/* Material estándar liso con color de madera oscura cálida */}
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>

      {/* 2. PARED DEL FONDO: Plano vertical perpendicular al eje Z en la parte posterior */}
      {/* Rotación: Sin rotación [0, 0, 0], su normal natural ya mira hacia el frente interior (+Z) */}
      {/* Posición: En el límite trasero de la habitación Z = -ROOM_DEPTH / 2 (-2.0), centrada en X=0 y Y=0.4 */}
      <mesh
        position={[0, WALL_CENTER_Y, -ROOM_DEPTH / 2]}
        rotation={[0, 0, 0]}
      >
        {/* Geometría plana con ancho de la estancia y altura vertical */}
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* 3. PARED IZQUIERDA: Plano vertical en el lateral izquierdo */}
      {/* Rotación: +90 grados (+PI / 2) sobre el eje Y para que la normal apunte hacia la DERECHA (+X, hacia el interior) */}
      {/* Posición: En el límite izquierdo X = -ROOM_WIDTH / 2 (-2.0), centrada en Z=0 y Y=0.4 */}
      <mesh
        position={[-ROOM_WIDTH / 2, WALL_CENTER_Y, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        {/* Geometría plana con profundidad de la estancia y altura vertical */}
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* 4. PARED DERECHA: Plano vertical en el lateral derecho */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje Y para que la normal apunte hacia la IZQUIERDA (-X, hacia el interior) */}
      {/* Posición: En el límite derecho X = +ROOM_WIDTH / 2 (+2.0), centrada en Z=0 y Y=0.4 */}
      <mesh
        position={[ROOM_WIDTH / 2, WALL_CENTER_Y, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        {/* Geometría plana con profundidad de la estancia y altura vertical */}
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {/* Material estándar liso con tono beige cálido suave */}
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    </group>
  )
}

export default Room
