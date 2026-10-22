// Objeto de la sala que se puede pulsar (chimenea, lámpara, velas, ventana, gato, gramófono): mano al pasar por encima
// y el clic, salvo que fuera el final de un arrastre para mirar alrededor
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

// Píxeles que se puede mover el ratón entre pulsar y soltar para que cuente como clic (más, era girar la vista)
const CLICK_TOLERANCE = 5

// maxDistance: solo se puede pulsar (y sale la mano) a menos de esa distancia de la cámara, en metros
function Clickable({ onClick, maxDistance = Infinity, children }: { onClick: () => void; maxDistance?: number; children: ReactNode }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        // Lo que haya detrás (un libro, otro objeto) no recibe este clic
        event.stopPropagation()
        if (event.delta <= CLICK_TOLERANCE && event.distance <= maxDistance) onClick()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(event.distance <= maxDistance)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  )
}

export default Clickable
