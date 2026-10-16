// Activa "proyecta sombra" y "recibe sombra" en todas las mallas de un modelo (por ejemplo, un clon de un .glb)
export function enableShadows(object) {
  object.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return object
}
