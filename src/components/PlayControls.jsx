// Importación de useEffect y useState de React para seguir si el ratón está capturado
import { useEffect, useState } from 'react'
// Estilos del botón, la mirilla y la ayuda
import '@/styles/playControls.css'

/**
 * Controles HTML sobre el lienzo: botón para capturar el ratón (modo juego), mirilla en el centro
 * mientras está capturado y una ayuda breve. C o Esc sueltan el ratón.
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

  // Tecla C: bloquea o suelta la cámara (Esc no siempre llega: algunas ventanas, como el visor de la app, se la quedan)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyC' || event.repeat || event.target.closest?.('input, textarea')) return
      if (document.pointerLockElement) document.exitPointerLock()
      else onLock()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLock])

  return (
    <>
      <div className="play-controls">
        {!locked && (
          <button type="button" className="play-controls__button" onClick={onLock}>
            Bloquear cámara (C)
          </button>
        )}
        <p className="play-controls__hint">
          {locked
            ? 'WASD para moverte · Z para agacharte · ratón para mirar · apunta y haz clic en un libro · mantén pulsado sobre un libro y suéltalo donde quieras de las estanterías · C o Esc para soltar'
            : 'WASD para moverte · Z para agacharte · arrastra para mirar · clic en un libro para ver sus datos · arrastra un libro a cualquier sitio de las estanterías'}
        </p>
      </div>
      {/* Mirilla: solo con el ratón capturado, marca el punto que se selecciona al hacer clic */}
      {locked && <div className="play-controls__crosshair" aria-hidden="true" />}
    </>
  )
}

export default PlayControls
