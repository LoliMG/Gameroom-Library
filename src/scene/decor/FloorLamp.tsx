// Lámpara de pie (floor_lamp.glb) con su luz cálida: encendida al oscurecer, apagada de día
import { useLayoutEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { Mesh, MeshStandardMaterial, Vector3Tuple } from 'three'
import { modelsManifest } from '@/data/modelsManifest'
import { prepareModel } from '@/utils/prepareModel'
import { withSpecularGlossiness } from '@/utils/specularGlossiness'

// Luz a la altura de la pantalla (en fracción del alto de la lámpara), que alumbra la sala
const LIGHT_HEIGHT = 0.85
const LIGHT_COLOR = '#ffc98a'
const LIGHT_INTENSITY = 3
const LIGHT_DISTANCE = 7

interface FloorLampProps {
  position: Vector3Tuple
  height: number
  /** Encendida */
  lit: boolean
}

function FloorLamp({ position, height, lit }: FloorLampProps) {
  const { scene } = useGLTF(modelsManifest.floorLamp.url, true, true, withSpecularGlossiness)
  const { wrapper, scale } = useMemo(() => prepareModel(scene, undefined, height), [scene, height])

  // La pantalla brilla por el mapa emisivo del modelo (un solo material para toda la lámpara): apagada, sin brillo.
  // El material es el del modelo cargado, pero solo hay una lámpara
  useLayoutEffect(() => {
    wrapper.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) (mesh.material as MeshStandardMaterial).emissiveIntensity = lit ? 1 : 0
    })
  }, [wrapper, lit])

  // La luz se queda con intensidad 0 en vez de quitarla: quitar o poner una luz obliga a recompilar los materiales
  return (
    <group position={position}>
      <primitive object={wrapper} scale={scale} />
      <pointLight position={[0, height * LIGHT_HEIGHT, 0]} color={LIGHT_COLOR} intensity={lit ? LIGHT_INTENSITY : 0} distance={LIGHT_DISTANCE} decay={2} />
    </group>
  )
}

export default FloorLamp
