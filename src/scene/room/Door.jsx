// Importación de useMemo de React
import { useMemo } from 'react'
// Hook useGLTF de drei para carga del modelo GLB
import { useGLTF } from '@react-three/drei'
// Importación del manifiesto centralizado de modelos 3D
import { modelsManifest } from '@/data/modelsManifest'

// Escala por defecto para convertir unidades cm del modelo original a metros (~2.21 m de altura)
const DEFAULT_SCALE = modelsManifest.door.scale // 0.009

// Helper para aislar la puerta principal (nodo '01') y habilitar sombras en sus mallas
function setupDoorScene(scene) {
  // El archivo door.glb contiene dos puertas adyacentes: '01' (cerrada) y '01_1' (abierta de muestra).
  // Eliminamos '01_1' para conservar únicamente la puerta de entrada principal limpia.
  const duplicateDoorNode = scene.getObjectByName('01_1')
  if (duplicateDoorNode && duplicateDoorNode.parent) {
    duplicateDoorNode.parent.remove(duplicateDoorNode)
  }

  // Habilitamos sombras en la hoja de la puerta, marco y manilla
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })

  return scene
}

/**
 * Componente para renderizar la puerta de entrada de madera antigua (door.glb)
 * ubicada en la pared b en el hueco entre las estanterías del fondo y el sofá.
 */
function Door({
  position = [2.17, -1.0, -0.30],
  rotation = [0, -Math.PI / 2, 0],
  scale = DEFAULT_SCALE,
}) {
  // Carga del modelo GLB desde el manifiesto
  const { scene } = useGLTF(modelsManifest.door.url)

  // Clonación y configuración de la escena (aislando la puerta cerrada y activando sombras)
  const clonedScene = useMemo(() => setupDoorScene(scene.clone()), [scene])

  return (
    <primitive
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

export default Door
