// Hooks de React para seguir si el ratón está capturado y si está abierta la información legal
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import LegalInfo from '@/components/LegalInfo'
// Estilos del botón y la mirilla
import '@/styles/playControls.css'

/**
 * Controles HTML sobre el lienzo: botón "?" que abre la información legal (privacidad, cookies y créditos; los
 * controles están en los ajustes) y mirilla en el centro mientras el ratón está capturado. C captura o suelta el ratón; Esc también lo suelta.
 *
 * @param onLock - Pide al lienzo que capture el ratón
 * @param children - Más controles en la misma fila (el modo concentración)
 */
function PlayControls({ onLock, children }: { onLock: () => void; children?: ReactNode }) {
  // ¿Está el ratón capturado ahora mismo?
  const [locked, setLocked] = useState(false)
  // ¿Está abierta la información legal? (closeLegal estable: LegalInfo vuelve a registrar su Esc si cambia)
  const [legalOpen, setLegalOpen] = useState(false)
  const closeLegal = useCallback(() => setLegalOpen(false), [])

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
      // Con la información legal abierta, C no bloquea la cámara detrás del modal
      if (event.code !== 'KeyC' || event.repeat || legalOpen || (event.target as Element | null)?.closest?.('input, textarea')) return
      if (document.pointerLockElement) document.exitPointerLock()
      else onLock()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onLock, legalOpen])

  return (
    <>
      {/* Arriba a la derecha, el "?" de la información legal */}
      <div className="play-controls is-help">
        <button
          type="button"
          className="play-controls__help"
          aria-label="Qué puedo hacer, información legal y créditos"
          title="Qué puedo hacer, información legal y créditos"
          onClick={() => setLegalOpen(true)}
        >
          ?
        </button>
      </div>
      {legalOpen && <LegalInfo onClose={closeLegal} />}
      {/* Abajo a la izquierda, el resto de controles (el modo concentración) */}
      <div className="play-controls">{children}</div>
      {/* Mirilla: solo con el ratón capturado, marca el punto que se selecciona al hacer clic */}
      {locked && <div className="play-controls__crosshair" aria-hidden="true" />}
    </>
  )
}

export default PlayControls
