// Objeto de la sala que se puede pulsar (chimenea, lámpara, velas, ventana, gato, gramófono): mano al pasar por encima
// y el clic, salvo que fuera el final de un arrastre para mirar alrededor
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

// Píxeles que se puede mover el ratón entre pulsar y soltar para que cuente como clic (más, era girar la vista)
const CLICK_TOLERANCE = 5

function Clickable({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        // Lo que haya detrás (un libro, otro objeto) no recibe este clic
        event.stopPropagation()
        if (event.delta <= CLICK_TOLERANCE) onClick()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  )
}

export default Clickable
