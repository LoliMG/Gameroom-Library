// Motor PDF del lector (PDF.js): dos páginas enfrentadas, cada una con su imagen (canvas), una capa de texto invisible
// para poder seleccionar y una capa con los subrayados (rectángulos en fracciones de la página)
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Annotation } from '@/types'
import type { EngineHandlers, ReaderEngine } from '@/components/reader/engine'
import { ANNOTATION_FILL } from '@/components/reader/annotationColors'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Máximo de rectángulos por subrayado (el servidor admite 200)
const MAX_RECTS = 200

/**
 * Crea el motor PDF dentro de container a partir del archivo (ArrayBuffer).
 * handlers: onSelect({ location, text, rect }), onAnnotationClick(id, rect), onRelocate(location, { atStart, atEnd, label })
 * (onKey y onPointerDown no hacen falta: aquí el texto está en la propia página, y la ventana ya recibe teclas y clics)
 */
export async function createPdfEngine(container: HTMLElement, data: ArrayBuffer, handlers: EngineHandlers): Promise<ReaderEngine> {
  // El documento se libera con la tarea de carga (en PDF.js 6 el documento no tiene destroy)
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  const annotations = new Map<number, Annotation>() // id → subrayado
  let first = 1 // Página de la izquierda (impar): las páginas van por parejas 1-2, 3-4…
  let renderToken = 0
  // Proporción (ancho / alto) de una página interior: el libro se ajusta a dos así para que las páginas lo llenen
  const sample = (await doc.getPage(Math.min(2, pageCount))).getViewport({ scale: 1 })
  const pageRatio = sample.width / sample.height

  const spread = document.createElement('div')
  spread.className = 'reader-pdf-spread'
  const slots = [document.createElement('div'), document.createElement('div')]
  slots.forEach((slot) => {
    slot.className = 'reader-pdf-slot'
    spread.append(slot)
  })
  container.append(spread)

  // Subrayados de una página ya pintada
  function drawMarks(pageEl: HTMLElement) {
    // La capa existe siempre: la crea renderPage junto con la página
    const marks = pageEl.querySelector('.reader-pdf-marks')!
    marks.replaceChildren()
    const number = Number(pageEl.dataset.page)
    for (const annotation of annotations.values()) {
      if (annotation.location.page !== number) continue
      for (const [x, y, width, height] of annotation.location.rects ?? []) {
        const mark = document.createElement('div')
        mark.className = 'reader-pdf-mark'
        Object.assign(mark.style, {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          background: ANNOTATION_FILL[annotation.color],
        })
        mark.title = annotation.note || annotation.text
        mark.addEventListener('click', () => {
          const r = mark.getBoundingClientRect()
          handlers.onAnnotationClick(annotation.id, { left: r.left, top: r.top, width: r.width, height: r.height })
        })
        marks.append(mark)
      }
    }
  }

  async function renderPage(number: number, slot: HTMLElement, token: number) {
    slot.replaceChildren()
    if (number > pageCount) return
    const page = await doc.getPage(number)
    if (token !== renderToken) return
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(slot.clientWidth / base.width, slot.clientHeight / base.height)
    const viewport = page.getViewport({ scale })
    const ratio = window.devicePixelRatio || 1

    const pageEl = document.createElement('div')
    pageEl.className = 'reader-pdf-page'
    pageEl.dataset.page = String(number)
    pageEl.style.width = `${viewport.width}px`
    pageEl.style.height = `${viewport.height}px`
    // Variables que usa la capa de texto de PDF.js para medirse
    pageEl.style.setProperty('--total-scale-factor', String(scale))
    pageEl.style.setProperty('--scale-round-x', '1px')
    pageEl.style.setProperty('--scale-round-y', '1px')
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    const marks = document.createElement('div')
    marks.className = 'reader-pdf-marks'
    pageEl.append(canvas, textLayer, marks)
    slot.append(pageEl)

    await page.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise
    if (token !== renderToken) return
    await new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport }).render()
    drawMarks(pageEl)
  }

  async function renderSpread() {
    const token = ++renderToken
    try {
      await Promise.all([renderPage(first, slots[0], token), renderPage(first + 1, slots[1], token)])
    } catch (error) {
      // Pintado interrumpido (se pasó de página antes de acabar, o se cerró el lector): no es un error
      if (token !== renderToken) return
      throw error
    }
    if (token !== renderToken) return
    const last = Math.min(first + 1, pageCount)
    handlers.onRelocate(
      { page: first },
      {
        atStart: first <= 1,
        atEnd: first + 1 >= pageCount,
        label: last > first ? `Páginas ${first}–${last} de ${pageCount}` : `Página ${first} de ${pageCount}`,
        progress: last / pageCount,
      }
    )
  }

  // Seleccionar texto en una página: rectángulos de la selección en fracciones de esa página
  function onMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element) : range.startContainer.parentElement
    const pageEl = startNode?.closest<HTMLElement>('.reader-pdf-page')
    if (!pageEl || !container.contains(pageEl)) return
    const box = pageEl.getBoundingClientRect()
    const rects = [...range.getClientRects()]
      .filter((r) => r.width > 1 && r.height > 1 && r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom)
      .slice(0, MAX_RECTS)
      .map((r): [number, number, number, number] => [(r.left - box.left) / box.width, (r.top - box.top) / box.height, r.width / box.width, r.height / box.height])
    const text = selection.toString().trim()
    if (!text || rects.length === 0) return
    const bounds = range.getBoundingClientRect()
    handlers.onSelect({
      location: { page: Number(pageEl.dataset.page), rects },
      text,
      rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
    })
  }
  container.addEventListener('mouseup', onMouseUp)

  // Al cambiar el tamaño de la ventana se vuelven a pintar las páginas a su nuevo tamaño
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => renderSpread().catch((error) => console.warn('[lector] No se pudo repintar el PDF:', error)), 150)
  })
  resizeObserver.observe(container)

  const visiblePages = () => [...container.querySelectorAll<HTMLElement>('.reader-pdf-page')]
  const pageLabel = () => {
    const last = Math.min(first + 1, pageCount)
    return last > first ? `Páginas ${first}–${last}` : `Página ${first}`
  }

  return {
    pageRatio,
    display(location) {
      const page = Math.min(Math.max(1, location?.page ?? 1), pageCount)
      first = page % 2 === 1 ? page : page - 1
      return renderSpread()
    },
    next() {
      if (first + 2 > pageCount) return Promise.resolve()
      first += 2
      return renderSpread()
    },
    prev() {
      if (first <= 1) return Promise.resolve()
      first -= 2
      return renderSpread()
    },
    /** Sitio y nombre de las páginas que se ven, para guardarlas como marcador */
    currentPlace: () => ({ location: { page: first }, label: pageLabel() }),
    /** ¿Ese sitio está en las páginas que se ven? */
    isVisible: (location) => location?.page !== undefined && Number.isInteger(location.page) && location.page >= first && location.page <= first + 1,

    /** Posición en la ventana de cada subrayado visible ({ id: { left, top, height } }), para las burbujas */
    annotationRects(list) {
      const rects: ReturnType<ReaderEngine['annotationRects']> = {}
      for (const annotation of list) {
        const pageEl = container.querySelector(`.reader-pdf-page[data-page="${annotation.location.page}"]`)
        const firstRect = annotation.location.rects?.[0]
        if (!pageEl || !firstRect) continue
        const [x, y, , height] = firstRect
        const box = pageEl.getBoundingClientRect()
        rects[annotation.id] = { left: box.left + x * box.width, top: box.top + y * box.height, height: height * box.height }
      }
      return rects
    },

    /** Copia de cómo se ven ahora las páginas (para la hoja que se pasa): mount(target) pone una copia nueva en target */
    snapshot() {
      const template = spread.cloneNode(true) as HTMLElement
      // Los canvas se clonan en blanco: se guarda una copia de su imagen para pintarla en cada copia
      const images = [...spread.querySelectorAll('canvas')].map((canvas) => {
        const copy = document.createElement('canvas')
        copy.width = canvas.width
        copy.height = canvas.height
        // getContext('2d') de un lienzo nuevo nunca es null
        copy.getContext('2d')!.drawImage(canvas, 0, 0)
        return copy
      })
      return (target) => {
        const copy = template.cloneNode(true) as HTMLElement
        copy.querySelectorAll('canvas').forEach((canvas, i) => canvas.getContext('2d')!.drawImage(images[i], 0, 0))
        target.replaceChildren(copy)
      }
    },

    addHighlight(annotation) {
      annotations.set(annotation.id, annotation)
      visiblePages().forEach(drawMarks)
    },
    removeHighlight(annotation) {
      annotations.delete(annotation.id)
      visiblePages().forEach(drawMarks)
    },
    clearSelection: () => window.getSelection()?.removeAllRanges(),
    destroy() {
      renderToken++
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      container.removeEventListener('mouseup', onMouseUp)
      spread.remove()
      loadingTask.destroy().catch((error) => console.warn('[lector] No se pudo liberar el PDF:', error))
    },
  }
}
