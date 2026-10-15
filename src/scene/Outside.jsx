// Importación de Suspense y useMemo de React
import { Suspense, useMemo } from 'react'
// Hook useGLTF de drei para la carga de modelos 3D GLB
import { useGLTF } from '@react-three/drei'
// Importación de la paleta ambiental activa (CLOUDY o DUSK)
import { PALETTE } from '@/scene/ambiencePalette'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'
// Importación del espacio sRGB y CanvasTexture desde Three.js
import { CanvasTexture, SRGBColorSpace } from 'three'

// Componente para renderizar árboles en el jardín con escala natural desde el manifiesto
function Trees({ position = [1.8, -1.0, 7.5], scale = modelsManifest.treesGarden.scale, rotationY = Math.PI / 4 }) {
  const { scene } = useGLTF(modelsManifest.treesGarden.url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, rotationY, 0]}
    />
  )
}

// Componente para renderizar arbustos de azaleas
function Azaleas({ position = [-1.5, -1.0, 5.6], scale = modelsManifest.azalea.scale }) {
  const { scene } = useGLTF(modelsManifest.azalea.url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, -0.3, 0]}
    />
  )
}

// Componente para renderizar lirios cerca del ventanal
function Lilies({ position = [1.4, -1.0, 5.4], scale = modelsManifest.lilies1.scale }) {
  const { scene } = useGLTF(modelsManifest.lilies1.url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, 0.4, 0]}
    />
  )
}

// Componente para renderizar lirios de araña (spider lilies)
function SpiderLilies({ position = [0.3, -1.0, 5.3], scale = modelsManifest.spiderLily.scale }) {
  const { scene } = useGLTF(modelsManifest.spiderLily.url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  return (
    <primitive
      object={clonedScene}
      position={position}
      scale={scale}
      rotation={[0, -0.2, 0]}
    />
  )
}

/**
 * Componente que simula el jardín y cielo exterior visible a través del gran ventanal
 */
function Outside() {
  // Generación procedimental de la textura de degradado del cielo según la paleta activa
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, PALETTE.skyTop)
    gradient.addColorStop(1, PALETTE.skyBottom)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 16, 256)

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])

  return (
    // Grupo contenedor del entorno exterior posicionado detrás del ventanal (Z > 4.0 m)
    <group>
      {/* 1. Fondo de cielo con degradado atmosférico */}
      <mesh position={[0, 3.5, 10.0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshBasicMaterial map={skyTexture} depthWrite={false} />
      </mesh>

      {/* 2. Suelo del jardín con césped oscuro húmedo (a ras del suelo de la habitación y estrictamente detrás del ventanal Z >= 4.0 m) */}
      <mesh position={[0, -1.02, 10.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#1a2b1c" roughness={0.9} />
      </mesh>

      {/* 3. Capas de follaje y siluetas vegetales a distintas profundidades */}
      {/* Capa de follaje lejana */}
      <mesh position={[-2.5, 1.2, 8.5]}>
        <planeGeometry args={[7.0, 4.5]} />
        <meshStandardMaterial color={PALETTE.foliageColor} roughness={0.9} transparent opacity={0.85} />
      </mesh>
      <mesh position={[2.8, 1.4, 8.2]}>
        <planeGeometry args={[7.5, 4.8]} />
        <meshStandardMaterial color={PALETTE.foliageColor} roughness={0.9} transparent opacity={0.85} />
      </mesh>

      {/* Capa de follaje intermedia */}
      <mesh position={[-1.8, 0.4, 6.8]}>
        <planeGeometry args={[5.0, 3.2]} />
        <meshStandardMaterial color={PALETTE.foliageColor} roughness={0.95} transparent opacity={0.9} />
      </mesh>
      <mesh position={[2.0, 0.5, 6.5]}>
        <planeGeometry args={[5.2, 3.4]} />
        <meshStandardMaterial color={PALETTE.foliageColor} roughness={0.95} transparent opacity={0.9} />
      </mesh>

      {/* 4. Modelos 3D reales cargados exclusivamente a través de modelsManifest */}
      <Suspense fallback={null}>
        <Trees position={[1.8, -1.0, 7.5]} scale={modelsManifest.treesGarden.scale} rotationY={Math.PI / 4} />
        <Trees position={[-2.2, -1.0, 8.0]} scale={modelsManifest.treesGarden.scale * 1.1} rotationY={-Math.PI / 3} />
        <Lilies position={[1.4, -1.0, 5.4]} scale={modelsManifest.lilies1.scale} />
        <SpiderLilies position={[0.3, -1.0, 5.3]} scale={modelsManifest.spiderLily.scale} />
      </Suspense>
    </group>
  )
}

export default Outside
