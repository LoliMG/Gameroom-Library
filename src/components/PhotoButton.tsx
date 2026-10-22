// Foto del rincón: botón abajo a la derecha que copia lo que se ve en la sala, lo monta como una postal (borde crema con
// esquinas redondeadas y, abajo, "Rincón de lectura" y la fecha) y lo enseña con un botón para guardarlo (PNG)
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { todayIso } from '@/utils/readingCalendar'

// Ancho de la foto en la postal (px), borde, franja de abajo para el texto y radio de las esquinas
const PHOTO_WIDTH = 1600
const BORDER = 56
const FOOTER = 130
const RADIUS = 36
const CARD_COLOR = '#f4ead8'
const LINE_COLOR = '#d9c7a8'
const TEXT_COLOR = '#5b4636'

// Monta la postal con la imagen del lienzo y devuelve su dirección (data: PNG)
function postcard(source: HTMLCanvasElement) {
  const photoHeight = Math.round((PHOTO_WIDTH * source.height) / source.width)
  const card = document.createElement('canvas')
  card.width = PHOTO_WIDTH + 2 * BORDER
  card.height = photoHeight + BORDER + FOOTER
  const ctx = card.getContext('2d')!
  // Fondo crema con las esquinas redondeadas
  ctx.fillStyle = CARD_COLOR
  ctx.beginPath()
  ctx.roundRect(0, 0, card.width, card.height, RADIUS)
  ctx.fill()
  // La foto, con un filete fino alrededor
  ctx.drawImage(source, BORDER, BORDER, PHOTO_WIDTH, photoHeight)
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 3
  ctx.strokeRect(BORDER - 6, BORDER - 6, PHOTO_WIDTH + 12, photoHeight + 12)
  // Abajo: el nombre a la izquierda y la fecha a la derecha
  const baseline = BORDER + photoHeight + FOOTER / 2 + 14
  ctx.fillStyle = TEXT_COLOR
  ctx.font = 'italic 52px Georgia, "Times New Roman", serif'
  ctx.textAlign = 'left'
  ctx.fillText('Rincón de lectura', BORDER, baseline)
  ctx.font = '34px Georgia, "Times New Roman", serif'
  ctx.textAlign = 'right'
  ctx.fillText(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), BORDER + PHOTO_WIDTH, baseline)
  return card.toDataURL('image/png')
}

/**
 * @param canvasRef - Lienzo de la sala (el de WebGL)
 */
function PhotoButton({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  // Postal hecha (data: PNG) o null sin vista previa
  const [photo, setPhoto] = useState<string | null>(null)

  // La vista previa se cierra con Esc
  useEffect(() => {
    if (!photo) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setPhoto(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo])

  // El lienzo de WebGL se borra después de enseñar cada fotograma: se copia justo tras pintarse (en el siguiente
  // fotograma, después de que React Three Fiber pinte), sin tener que guardar todos los fotogramas
  const take = () =>
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (canvas) setPhoto(postcard(canvas))
    })

  return (
    <>
      <button type="button" className="photo-button" aria-label="Hacer una foto del rincón" title="Foto del rincón" onClick={take}>
        📷
      </button>
      {photo && (
        <div className="photo-preview" role="dialog" aria-modal="true" aria-label="Foto del rincón" onPointerDown={(event) => event.target === event.currentTarget && setPhoto(null)}>
          <div className="photo-preview__card">
            <img src={photo} alt="Foto del rincón de lectura en una postal con la fecha de hoy" />
            <div className="photo-preview__actions">
              <a className="photo-preview__save" href={photo} download={`rincon-de-lectura-${todayIso()}.png`}>
                Guardar
              </a>
              <button type="button" className="photo-preview__close" onClick={() => setPhoto(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PhotoButton
