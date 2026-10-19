// Selección de varios libros con recuadro: con Ctrl pulsado, arrastrar sobre la sala dibuja un rectángulo y al soltar
// se seleccionan los libros cuyo centro queda dentro (se suman a los que ya estaban seleccionados)
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

// Por debajo de estos píxeles de lado no es un recuadro sino un Ctrl+clic (lo atiende el propio libro)
export const MIN_BOX_SIZE = 4

/**
 * @param onSelect - Recibe los id de los libros que han quedado dentro del recuadro
 */
function SelectionBox({ onSelect }: { onSelect: (ids: number[]) => void }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    // El recuadro es un div por encima del lienzo (estilos en global.css)
    const box = document.createElement('div')
    box.className = 'selection-box'
    box.hidden = true
    document.body.append(box)
    // Punto donde empezó el recuadro (null: no se está dibujando)
    let start: { x: number; y: number } | null = null
    // Esquinas del recuadro en píxeles de la ventana
    type Box = { left: number; top: number; right: number; bottom: number }

    const rectTo = (from: { x: number; y: number }, event: PointerEvent): Box => ({
      left: Math.min(from.x, event.clientX),
      top: Math.min(from.y, event.clientY),
      right: Math.max(from.x, event.clientX),
      bottom: Math.max(from.y, event.clientY),
    })
    const isTiny = (r: Box) => r.right - r.left < MIN_BOX_SIZE && r.bottom - r.top < MIN_BOX_SIZE

    const onPointerDown = (event: PointerEvent) => {
      // Con el ratón capturado no hay cursor con el que dibujar
      if (event.button !== 0 || !event.ctrlKey || document.pointerLockElement) return
      start = { x: event.clientX, y: event.clientY }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!start) return
      const r = rectTo(start, event)
      box.hidden = isTiny(r)
      Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` })
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!start) return
      const r = rectTo(start, event)
      start = null
      box.hidden = true
      if (isTiny(r)) return
      // Centro de cada libro pasado a píxeles de la ventana
      const bounds = canvas.getBoundingClientRect()
      const point = new Vector3()
      const ids: number[] = []
      scene.traverse((object) => {
        if (object.userData.bookId === undefined) return
        object.getWorldPosition(point).project(camera)
        if (point.z > 1) return // Detrás de la cámara
        const x = bounds.left + ((point.x + 1) / 2) * bounds.width
        const y = bounds.top + ((1 - point.y) / 2) * bounds.height
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) ids.push(object.userData.bookId)
      })
      onSelect(ids)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      box.remove()
    }
  }, [camera, canvas, scene, onSelect])

  return null
}

export default SelectionBox
