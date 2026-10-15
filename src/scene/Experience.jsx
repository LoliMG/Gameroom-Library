// Importación de Suspense de React para pausar el render hasta que las texturas estén cargadas
import { Suspense } from 'react'
// Control orbital interactivo de drei para rotar y revisar la estantería de forma temporal
import { OrbitControls } from '@react-three/drei'
// Importación del componente de la estantería mediante el alias "@"
import Bookshelf from '@/scene/Bookshelf'

function Experience() {
  return (
    <>
      {/* Control orbital de cámara que permite rotar e inspeccionar el modelo 3D */}
      <OrbitControls makeDefault />

      {/* Luz ambiental que aporta iluminación general homogénea a toda la escena */}
      <ambientLight intensity={0.7} />

      {/* Luz direccional con ángulo que aporta profundidad y sombreado a la estantería y los libros */}
      <directionalLight position={[4, 5, 4]} intensity={1.5} />

      {/* Suspense requerido por useTexture para gestionar la carga asíncrona de las portadas sin bloquear */}
      <Suspense fallback={null}>
        {/* Renderizado de la estantería completa con sus libros integrados */}
        <Bookshelf />
      </Suspense>
    </>
  )
}

export default Experience
