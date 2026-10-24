// Constantes de dimensiones de la habitación en metros (1 unidad = 1 metro)
// Ancho: el ventanal más el fondo de una estantería a cada lado, para que las estanterías de la pared a
// terminen justo en el borde del arco en vez de taparlo (4.50 + 2 × 0.35 = 5.20 m)
export const ROOM_WIDTH = WINDOW_WIDTH + 2 * BOOKSHELF_DEPTH
export const ROOM_DEPTH = 6.0   // Profundidad de la habitación alargada hacia la cámara (paredes laterales a y b)
export const ROOM_HEIGHT = 2.8  // Altura libre del suelo al techo

// Posición Z fija de la pared del fondo (d) donde apoya la estantería
export const BACK_WALL_Z = -2.0

// Posición Z central de la habitación alargada hacia la cámara: de Z=-2.0 a Z=+4.0, centro en Z=+1.0
export const ROOM_CENTER_Z = BACK_WALL_Z + ROOM_DEPTH / 2

// Posición Z de la pared frontal c donde se ubica el ventanal (+4.0m)
export const FRONT_WALL_Z = BACK_WALL_Z + ROOM_DEPTH

// Importación de useMemo de React
import { useMemo } from 'react'
// Hook useTexture de drei para la carga de mapas de textura PBR
import { useTexture } from '@react-three/drei'
// Importación de constantes de Three.js para repetición y espacio de color
import { RepeatWrapping, SRGBColorSpace, Shape, ShapeGeometry } from 'three'
import type { ColorSpace, Texture } from 'three'
// Importación de las texturas de suelo de madera oscura (Poly Haven, CC0)
import woodDiffUrl from '@/assets/textures/floor/wood_diff_1k.jpg'
import woodNorUrl from '@/assets/textures/floor/wood_nor_1k.jpg'
import woodRoughUrl from '@/assets/textures/floor/wood_rough_1k.jpg'
// Importación del componente del ventanal para la pared c
import WindowWall, { WALL_THICKNESS as FRONT_WALL_THICKNESS, WINDOW_WIDTH } from '@/scene/room/WindowWall'
// Papel pintado de las paredes
import useWallpaper, { WALLPAPER_TILE_SIZE, WALLPAPER_TINT } from '@/hooks/useWallpaper'
// Fondo de las estanterías (para dejar muro a los lados del ventanal)
import { BOOKSHELF_DEPTH } from '@/scene/shelves/Bookshelf'

// Cara interior del muro del ventanal (c): ahí se apoyan moldura, enredaderas, polvo y maceta
export const FRONT_WALL_INNER_Z = FRONT_WALL_Z - FRONT_WALL_THICKNESS / 2 // 4.0 - 0.06 = 3.94 m

// Nivel del suelo coincidente con la base de la estantería (Y = -1.0)
export const FLOOR_Y = -1.0

// Centro de la puerta de entrada a lo largo de la pared b (+X); la coloca Experience.tsx y ahí empieza el jugador
export const DOOR_Z = -0.3

// Posición Y central de las paredes verticales
export const WALL_CENTER_Y = FLOOR_Y + ROOM_HEIGHT / 2 // -1.0 + 1.4 = 0.4

// Tamaño en metros que cubre una repetición de la textura de madera: la imagen contiene ~9 tablones,
// así que con 1 m por repetición cada tablón mide ~11 cm de ancho (objetivo del plan: ~12 cm)
const FLOOR_TEXTURE_TILE_SIZE = 1.0
// Repeticiones calculadas a partir de las dimensiones de la habitación para que el tablón no se estire
// El suelo sigue por debajo de la pared b hasta pasar el marco de la puerta (empotrada hasta X ≈ 2.88 m): así bajo
// la puerta se ve madera y no el césped del jardín. Fuera del hueco de la puerta queda tapado por la pared
const FLOOR_DOORWAY_EXTENSION = 0.35
const FLOOR_WIDTH = ROOM_WIDTH + FLOOR_DOORWAY_EXTENSION
const FLOOR_REPEAT_X = FLOOR_WIDTH / FLOOR_TEXTURE_TILE_SIZE // Una repetición por metro, también en el trozo bajo la puerta
const FLOOR_REPEAT_Y = ROOM_DEPTH / FLOOR_TEXTURE_TILE_SIZE // 6.0 / 1.0 = 6.0 repeticiones a lo largo

/** Hueco de la puerta en la pared b: de minZ a maxZ (Z del mundo) y desde el suelo hasta height (m) */
export interface DoorOpening {
  minZ: number
  maxZ: number
  height: number
}

// Pared b con el hueco de la puerta recortado desde el suelo (contorno en U, sin agujeros interiores).
// Coordenadas locales del plano: X a lo largo de la pared (= Z del mundo - ROOM_CENTER_Z), Y en altura desde su centro.
function createDoorWallGeometry({ minZ, maxZ, height }: DoorOpening) {
  const halfDepth = ROOM_DEPTH / 2
  const halfHeight = ROOM_HEIGHT / 2
  const holeStart = minZ - ROOM_CENTER_Z
  const holeEnd = maxZ - ROOM_CENTER_Z
  const holeTop = -halfHeight + height
  const shape = new Shape()
  shape.moveTo(-halfDepth, -halfHeight)
  shape.lineTo(holeStart, -halfHeight)
  shape.lineTo(holeStart, holeTop)
  shape.lineTo(holeEnd, holeTop)
  shape.lineTo(holeEnd, -halfHeight)
  shape.lineTo(halfDepth, -halfHeight)
  shape.lineTo(halfDepth, halfHeight)
  shape.lineTo(-halfDepth, halfHeight)
  shape.closePath()
  return new ShapeGeometry(shape)
}

/**
 * @param doorOpening - Hueco de la puerta en la pared b (m)
 */
// windowOpen / onToggleWindow: las hojas del ventanal, que se abren pulsándolo
function Room({ doorOpening, windowOpen, onToggleWindow }: { doorOpening: DoorOpening; windowOpen: boolean; onToggleWindow: () => void }) {
  // Carga asíncrona de mapas PBR de madera oscura para el suelo (useTexture suspende hasta que están listos)
  const loadedTextures = useTexture({
    map: woodDiffUrl,
    normalMap: woodNorUrl,
    roughnessMap: woodRoughUrl,
  })

  // Copias configuradas de las texturas: repetición continua y sRGB solo en el mapa de color
  // (se clonan para no modificar los objetos que devuelve el hook, que la caché de drei comparte)
  const floorTextures = useMemo(() => {
    const setupTexture = (tex: Texture, colorSpace?: ColorSpace) => {
      const copy = tex.clone()
      copy.wrapS = RepeatWrapping
      copy.wrapT = RepeatWrapping
      copy.repeat.set(FLOOR_REPEAT_X, FLOOR_REPEAT_Y)
      if (colorSpace) copy.colorSpace = colorSpace // sRGB evita colores lavados en la textura de color
      copy.needsUpdate = true
      return copy
    }

    return {
      map: setupTexture(loadedTextures.map, SRGBColorSpace),
      normalMap: setupTexture(loadedTextures.normalMap),
      roughnessMap: setupTexture(loadedTextures.roughnessMap),
    }
  }, [loadedTextures])

  // Geometría de la pared b con el hueco de la puerta; se recalcula solo si cambia el hueco
  const { minZ, maxZ, height } = doorOpening
  const doorWallGeometry = useMemo(() => createDoorWallGeometry({ minZ, maxZ, height }), [minZ, maxZ, height])

  // Papel pintado: los planos de las paredes d y a tienen coordenadas de textura de 0 a 1 (repetición = medida / baldosa);
  // la pared b con el hueco las tiene en metros (repetición = 1 / baldosa)
  const wallpaperD = useWallpaper(ROOM_WIDTH / WALLPAPER_TILE_SIZE, ROOM_HEIGHT / WALLPAPER_TILE_SIZE)
  const wallpaperA = useWallpaper(ROOM_DEPTH / WALLPAPER_TILE_SIZE, ROOM_HEIGHT / WALLPAPER_TILE_SIZE)
  const wallpaperB = useWallpaper(1 / WALLPAPER_TILE_SIZE, 1 / WALLPAPER_TILE_SIZE)

  return (
    // Grupo contenedor 3D que agrupa el suelo y las 3 paredes visibles
    <group>
      {/* 1. SUELO: Plano horizontal en la base de la estancia con textura de madera oscura */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje X para que la normal apunte hacia ARRIBA (+Y) */}
      {/* Posición: Centrado en X=0, cota Y=FLOOR_Y (-1.0), y centro en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[FLOOR_DOORWAY_EXTENSION / 2, FLOOR_Y, ROOM_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        // receiveShadow: permite que la superficie del suelo reciba y muestre las sombras proyectadas por otros objetos
        receiveShadow
      >
        {/* Geometría plana con ancho (ROOM_WIDTH = 5.2) y profundidad alargada (ROOM_DEPTH = 6.0) */}
        <planeGeometry args={[FLOOR_WIDTH, ROOM_DEPTH]} />
        {/* Material PBR estándar con mapas de madera oscura, vetas y rugosidad */}
        <meshStandardMaterial
          map={floorTextures.map}
          normalMap={floorTextures.normalMap}
          roughnessMap={floorTextures.roughnessMap}
          roughness={0.8}
        />
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
        {/* Papel pintado botánico */}
        <meshStandardMaterial map={wallpaperD} color={WALLPAPER_TINT} />
      </mesh>

      {/* 3. PARED IZQUIERDA (a): Plano vertical en el lateral izquierdo alargado a 6 metros */}
      {/* Rotación: +90 grados (+PI / 2) sobre el eje Y para que la normal apunte hacia la DERECHA (+X, interior) */}
      {/* Posición: En el límite izquierdo X = -ROOM_WIDTH / 2 (-2.6), centrada en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[-ROOM_WIDTH / 2, WALL_CENTER_Y, ROOM_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        // receiveShadow: permite proyectar sombras sobre la pared lateral izquierda
        receiveShadow
      >
        {/* Geometría plana con la nueva profundidad de la estancia (6.0) y altura vertical */}
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        {/* Papel pintado botánico */}
        <meshStandardMaterial map={wallpaperA} color={WALLPAPER_TINT} />
      </mesh>

      {/* 4. PARED DERECHA (b): Plano vertical en el lateral derecho alargado a 6 metros, con el hueco de la puerta */}
      {/* Rotación: -90 grados (-PI / 2) sobre el eje Y para que la normal apunte hacia la IZQUIERDA (-X, interior) */}
      {/* Posición: En el límite derecho X = +ROOM_WIDTH / 2 (+2.6), centrada en Z=ROOM_CENTER_Z (+1.0) */}
      <mesh
        position={[ROOM_WIDTH / 2, WALL_CENTER_Y, ROOM_CENTER_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        // receiveShadow: permite proyectar sombras sobre la pared lateral derecha
        receiveShadow
      >
        {/* Pared de 6.0 × 2.8 m con el hueco de la puerta recortado */}
        <primitive object={doorWallGeometry} attach="geometry" />
        {/* Papel pintado botánico */}
        <meshStandardMaterial map={wallpaperB} color={WALLPAPER_TINT} />
      </mesh>

      {/* 5. PARED FRONTAL (c): Gran ventanal de cuarterones y cristal translúcido */}
      <WindowWall
        position={[0, 0, FRONT_WALL_Z]}
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        floorY={FLOOR_Y}
        open={windowOpen}
        onToggle={onToggleWindow}
      />
    </group>
  )
}

export default Room
