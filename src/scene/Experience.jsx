// Importación de Suspense de React para pausar el render hasta que las texturas estén cargadas
import { Suspense } from 'react'
// Control orbital interactivo de drei para rotar y revisar la escena
import { OrbitControls } from '@react-three/drei'
// Importación del componente de iluminación personalizada
import Lights from '@/scene/Lights'
// Importación de la estructura de la habitación (suelo y paredes)
import Room from '@/scene/Room'
// Importación del componente de la estantería mediante el alias "@"
import Bookshelf from '@/scene/Bookshelf'

// Posición Z para apoyar la trasera de la estantería (fondo = 0.35m) contra la pared del fondo (Z = -2.0m)
// -2.0 + (0.35 / 2) = -1.825. En Y=0 la base de la estantería queda exactamente a nivel de suelo (Y = -1.0)
const BOOKSHELF_GROUP_POSITION = [0, 0, -1.825]

function Experience({ onSelectBook, orbitTarget = [0, 0.2, -1.825] }) {
  return (
    <>
      {/* Control orbital de cámara con el objetivo (target) centrado en la estantería apoyada en la pared */}
      <OrbitControls makeDefault target={orbitTarget} />

      {/* Iluminación cálida de rincón de lectura (luz ambiental, direccional suave y punto de luz puntual ámbar) */}
      <Lights />

      {/* Renderizado de la carcasa de la habitación (suelo y 3 paredes) */}
      <Room />

      {/* Suspense gestiona la carga asíncrona de las texturas de los libros */}
      <Suspense fallback={null}>
        {/* Grupo que posiciona la estantería apoyada contra la pared del fondo con la base a nivel del suelo */}
        <group position={BOOKSHELF_GROUP_POSITION}>
          {/* Renderizado de la estantería sin alterar sus dimensiones ni elementos internos */}
          <Bookshelf onSelectBook={onSelectBook} />
        </group>
      </Suspense>
    </>
  )
}

export default Experience
