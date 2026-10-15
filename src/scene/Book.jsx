function Book({ position, width, height, depth, color, onSelect, book }) {
  // Manejador de clic sobre el libro en la escena 3D
  const handleClick = (event) => {
    // event.stopPropagation() detiene la propagación del raycasting de React Three Fiber;
    // está aquí para que el clic sea capturado exclusivamente por este libro y no atraviese
    // hacia otros objetos 3D que se encuentren detrás en la misma trayectoria del puntero.
    event.stopPropagation()

    // Ejecuta la función callback recibida por prop enviando el objeto completo del libro
    if (onSelect) {
      onSelect(book)
    }
  }

  return (
    // Malla 3D del libro con posición espacial y manejador de clic gestionado por R3F
    <mesh position={position} onClick={handleClick}>
      {/* Geometría de caja que define las dimensiones tridimensionales del libro */}
      <boxGeometry args={[width, height, depth]} />
      {/* Material estándar de Three.js que responde a la iluminación con el color asignado */}
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default Book
