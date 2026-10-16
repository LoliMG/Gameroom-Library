// Importación de useEffect y useState de React para seguir si el ratón está capturado
import { useEffect, useState } from 'react'
// Estilos del botón, la mirilla y la ayuda
import '@/styles/playControls.css'

/**
 * Controles HTML sobre el lienzo: botón para capturar el ratón (modo juego), mirilla en el centro
 * mientras está capturado y una ayuda breve. Esc suelta el ratón (lo hace el navegador).
 *
 * @param {Function} onLock - Pide al lienzo que capture el ratón
 */
function PlayControls({ onLock }) {
  // ¿Está el ratón capturado ahora mismo?
  const [locked, setLocked] = useState(false)

  // El navegador avisa cuando se captura o se suelta el ratón (también al pulsar Esc)
  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement))
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  return (
    <>
      <div className="play-controls">
        {!locked && (
          <button type="button" className="play-controls__button" onClick={onLock}>
            Bloquear cámara
          </button>
        )}
        <p className="play-controls__hint">
          {locked
            ? 'WASD para moverte · ratón para mirar · apunta y haz clic en un libro · Esc para soltar'
            : 'WASD para moverte · arrastra para mirar · clic en un libro para ver sus datos'}
        </p>
      </div>
      {/* Mirilla: solo con el ratón capturado, marca el punto que se selecciona al hacer clic */}
      {locked && <div className="play-controls__crosshair" aria-hidden="true" />}
    </>
  )
}

export default PlayControls
