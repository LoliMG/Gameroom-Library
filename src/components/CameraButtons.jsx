// Lista de puntos de vista de la cámara
import { CAMERA_VIEWS } from '@/data/cameraViews'
// Estilos de los botones
import '@/styles/cameraButtons.css'

/**
 * Botones HTML para cambiar de punto de vista. Van fuera del <Canvas>, en la esquina superior izquierda,
 * para no chocar con el panel de detalle del libro (a la derecha en escritorio, abajo en móvil).
 */
function CameraButtons({ activeViewId, onSelectView }) {
  return (
    <nav className="camera-buttons" aria-label="Puntos de vista de la cámara">
      {CAMERA_VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className={`camera-buttons__button${view.id === activeViewId ? ' camera-buttons__button--active' : ''}`}
          aria-pressed={view.id === activeViewId}
          onClick={() => onSelectView(view.id)}
        >
          {view.label}
        </button>
      ))}
    </nav>
  )
}

export default CameraButtons
