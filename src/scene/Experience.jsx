// Importación del componente del cubo animado usando el alias "@"
import SpinningBox from '@/scene/SpinningBox'

function Experience() {
  return (
    <>
      {/* Luz ambiental que ilumina todos los objetos de la escena uniformemente en todas direcciones */}
      <ambientLight intensity={0.6} />

      {/* Luz direccional con rayos paralelos para crear sombreado y volumen en los objetos */}
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      {/* Componente 3D que renderiza el cubo rotatorio */}
      <SpinningBox />
    </>
  )
}

export default Experience
