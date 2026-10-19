// Importación de useEffect y useState de React para seguir si el ratón está capturado
import { useEffect, useState } from 'react'
// Estilos del botón, la mirilla y la ayuda
import '@/styles/playControls.css'

/**
 * Controles HTML sobre el lienzo: botón "?" que muestra la ayuda al pasar el puntero (o al llegar con el teclado) y
 * mirilla en el centro mientras el ratón está capturado. C captura o suelta el ratón; Esc también lo suelta.
 *
 * @param onLock - Pide al lienzo que capture el ratón
 */
function PlayControls({ onLock }: { onLock: () => void }) {
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
    const onKeyDown = (event: KeyboardEvent) => {
      // event.target es el elemento con el foco (puede no ser un Element: entonces no tiene closest)
      if (event.code !== 'KeyC' || event.repeat || (event.target as Element | null)?.closest?.('input, textarea')) return
      if (document.pointerLockElement) document.exitPointerLock()
      else onLock()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLock])

  return (
    <>
      <div className="play-controls">
        <button type="button" className="play-controls__help" aria-label="Ayuda con los controles" aria-describedby="play-controls-hint">
          ?
        </button>
        <p id="play-controls-hint" role="tooltip" className="play-controls__hint">
          {locked
            ? 'WASD para moverte · Z para agacharte · ratón para mirar · apunta y haz clic en un libro · mantén pulsado sobre un libro y suéltalo donde quieras de las estanterías · C o Esc para soltar'
            : 'C para bloquear la cámara · WASD para moverte · Z para agacharte · arrastra para mirar · clic en un libro para ver sus datos · arrastra un libro a cualquier sitio de las estanterías · Ctrl + arrastrar o Ctrl + clic para elegir varios (Esc los suelta)'}
        </p>
      </div>
      {/* Mirilla: solo con el ratón capturado, marca el punto que se selecciona al hacer clic */}
      {locked && <div className="play-controls__crosshair" aria-hidden="true" />}
    </>
  )
}

export default PlayControls
