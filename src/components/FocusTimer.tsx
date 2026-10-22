// Modo concentración: un rato de lectura (10 a 60 minutos, a elegir) con cuenta atrás. Mientras dura, el gato se duerme
// junto a la chimenea; al acabar suena una campanita (si los sonidos están activados) y sale un aviso
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { chime } from '@/utils/sfx'

// Duraciones que se pueden elegir (minutos)
const FOCUS_OPTIONS = [10, 15, 30, 45, 60]
// Lo que se queda el aviso de "terminado" (ms)
const NOTICE_MS = 8000

// Minutos y segundos que quedan: "24:59"
const formatRemaining = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Botón del reloj de arena: abre un menú con las duraciones y, al elegir una, empieza la cuenta atrás (que se ve en el
 * botón; pulsarlo entonces la cancela).
 *
 * @param sound - Con los sonidos activados (Ajustes) suena la campanita al acabar
 * @param onFocusChange - Avisa al empezar (true) y al acabar o cancelar (false)
 */
function FocusTimer({ sound, onFocusChange }: { sound: boolean; onFocusChange: (focus: boolean) => void }) {
  // Hora a la que acaba (o null sin concentración), la de ahora (para la cuenta atrás), minutos del rato en marcha o
  // recién terminado, el aviso de terminado y el menú de duraciones
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [finished, setFinished] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Cada segundo, la cuenta atrás; al llegar a 0, se acaba. Se mide con la hora (no contando segundos): si la pestaña
  // queda en segundo plano y el navegador retrasa los avisos, no se desfasa
  useEffect(() => {
    if (endsAt === null) return
    const timer = setInterval(() => {
      const time = Date.now()
      if (time < endsAt) return setNow(time)
      setEndsAt(null)
      setFinished(true)
      onFocusChange(false)
      if (sound) chime()
    }, 1000)
    return () => clearInterval(timer)
  }, [endsAt, sound, onFocusChange])

  // El aviso se va solo
  useEffect(() => {
    if (!finished) return
    const timer = setTimeout(() => setFinished(false), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [finished])

  // El menú se cierra con Esc o pulsando fuera de él
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    const onPointerDown = (event: PointerEvent) => !rootRef.current?.contains(event.target as Node) && setMenuOpen(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  // Al elegir una duración (la lleva el botón en data-minutes) empieza la cuenta atrás
  const start = (event: MouseEvent<HTMLButtonElement>) => {
    const value = Number(event.currentTarget.dataset.minutes)
    const time = Date.now()
    setMenuOpen(false)
    setFinished(false)
    setMinutes(value)
    setNow(time)
    setEndsAt(time + value * 60 * 1000)
    onFocusChange(true)
  }

  const onButton = () => {
    if (endsAt === null) return setMenuOpen((open) => !open)
    setEndsAt(null)
    onFocusChange(false)
  }

  const running = endsAt !== null
  return (
    <div className="focus-timer" ref={rootRef}>
      <button
        type="button"
        className={`play-controls__focus${running ? ' is-running' : ''}`}
        aria-label={running ? 'Cancelar el modo concentración' : 'Modo concentración'}
        aria-haspopup={running ? undefined : 'menu'}
        aria-expanded={running ? undefined : menuOpen}
        title={running ? 'Cancelar' : 'Modo concentración'}
        onClick={onButton}
      >
        {running ? formatRemaining(endsAt - now) : '⏳'}
      </button>
      {menuOpen && (
        <div className="focus-timer__menu" role="menu" aria-label="¿Cuánto rato quieres leer?">
          <p className="focus-timer__title">¿Cuánto rato quieres leer?</p>
          <div className="focus-timer__options">
            {FOCUS_OPTIONS.map((option) => (
              <button key={option} type="button" role="menuitem" className="focus-timer__option" data-minutes={option} onClick={start}>
                {option}
                <small>min</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {finished && (
        <p className="play-controls__notice" role="status">
          ¡{minutes} minutos de lectura! El gato se despierta.
        </p>
      )}
    </div>
  )
}

export default FocusTimer
