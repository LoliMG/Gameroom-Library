// Motor EPUB del lector (epub.js): dos páginas enfrentadas, subrayados con CFI (la "dirección" de un trozo de texto)
// epub.js 0.3.93 depende de una versión de @xmldom/xmldom con avisos de seguridad (inyección al serializar XML).
// shortcut: aceptable porque solo se abren EPUB propios de ebooks/ y sin ejecutar sus scripts; cambiar si epub.js publica una versión estable nueva
import ePub, { EpubCFI } from 'epubjs'
// Tipos de epub.js (vienen con la propia librería, en node_modules/epubjs/types)
import type { Contents, Location } from 'epubjs'
import type { Annotation } from '@/types'
import type { EngineHandlers, ReaderEngine } from '@/components/reader/engine'
import { ANNOTATION_FILL } from '@/components/reader/annotationColors'

// Aspecto del texto dentro de las páginas (el EPUB se pinta en un iframe con estos estilos encima de los suyos)
const THEME = {
  body: {
    'font-family': 'Georgia, "Times New Roman", serif !important',
    color: '#2b2118 !important',
    'line-height': '1.55 !important',
    padding: '0 8px !important',
  },
  '::selection': { background: 'rgba(226, 192, 112, 0.5)' },
  a: { color: '#7a4a1e !important' },
}

const cfi = new EpubCFI()

/**
 * Crea el motor EPUB dentro de container a partir del archivo (ArrayBuffer).
 * handlers: onSelect({ location, text, rect }), onAnnotationClick(id, rect),
 * onRelocate(location, { atStart, atEnd, label }), onKey(event), onPointerDown()
 */
export async function createEpubEngine(container: HTMLElement, data: ArrayBuffer, handlers: EngineHandlers): Promise<ReaderEngine> {
  const book = ePub(data)
  const rendition = book.renderTo(container, {
    width: '100%',
    height: '100%',
    spread: 'always',
    flow: 'paginated',
    allowScriptedContent: false,
  })
  rendition.themes.default(THEME)
  await book.ready
  let current: Location | null = null // Última ubicación: { start, end } de epub.js

  // Nombre de la zona actual para los marcadores: capítulo (del índice) y página dentro de él
  const describe = (location: Location) => {
    const chapter = book.navigation?.get(location.start.href)?.label?.trim()
    const page = location.start.displayed?.page
    return [chapter, page && `pág. ${page}`].filter(Boolean).join(' · ') || 'Marcador'
  }

  // rendition.on no sabe qué recibe cada evento: los tipos de los parámetros se escriben a mano
  rendition.on('selected', (cfiRange: string, contents: Contents) => {
    const range = rendition.getRange(cfiRange)
    const text = range?.toString().trim()
    if (!text) return
    // Rectángulo de la selección en la ventana: el de dentro del iframe más la posición del iframe
    const inner = range.getBoundingClientRect()
    const frame = contents.window.frameElement!.getBoundingClientRect()
    handlers.onSelect({
      location: { cfi: cfiRange },
      text,
      rect: { left: frame.left + inner.left, top: frame.top + inner.top, width: inner.width, height: inner.height },
    })
  })
  rendition.on('relocated', (location: Location) => {
    current = location
    handlers.onRelocate(
      { cfi: location.start.cfi },
      { atStart: Boolean(location.atStart), atEnd: Boolean(location.atEnd), label: describe(location) }
    )
  })
  // Lo que pasa dentro del iframe no llega a la ventana: teclas y pulsaciones se reenvían
  rendition.on('keyup', (event: KeyboardEvent) => handlers.onKey(event))
  rendition.on('mousedown', () => handlers.onPointerDown())

  // epub.js solo se ajusta cuando cambia la ventana: si cambia el hueco del libro (al abrir un panel) se le avisa
  // (el observador avisa nada más empezar, antes de que epub.js tenga vista: entonces aún no hay nada que ajustar)
  // (manager y resize() sin medidas existen en epub.js, pero sus tipos no los recogen: de ahí el "as")
  const live = rendition as unknown as { manager?: object; resize(): void }
  const resizeObserver = new ResizeObserver(() => live.manager && live.resize())
  resizeObserver.observe(container)

  // getContents() devuelve una lista de Contents (sus tipos dicen que uno solo: de ahí el "as")
  const clearSelection = () =>
    (rendition.getContents() as unknown as Contents[]).forEach((contents) => contents.window.getSelection()?.removeAllRanges())

  return {
    display: (location) => rendition.display(location?.cfi),
    next: () => rendition.next(),
    prev: () => rendition.prev(),

    /** Sitio y nombre de las páginas que se ven, para guardarlas como marcador */
    currentPlace: () => current && { location: { cfi: current.start.cfi }, label: describe(current) },
    /** ¿Ese sitio está en las páginas que se ven? */
    isVisible(location) {
      if (!current || !location?.cfi) return false
      try {
        return cfi.compare(location.cfi, current.start.cfi) >= 0 && cfi.compare(location.cfi, current.end.cfi) <= 0
      } catch {
        return false
      }
    },

    /** Posición en la ventana de cada subrayado visible ({ id: { left, top, height } }), para las burbujas */
    annotationRects(annotations) {
      const rects: ReturnType<ReaderEngine['annotationRects']> = {}
      const box = container.getBoundingClientRect()
      for (const annotation of annotations) {
        let range: Range | undefined
        try {
          range = rendition.getRange(annotation.location.cfi!)
        } catch {
          continue
        }
        const first = range?.getClientRects()[0]
        const frame = range?.startContainer.ownerDocument?.defaultView?.frameElement?.getBoundingClientRect()
        if (!first || !frame) continue
        const left = frame.left + first.left
        // Solo los de las páginas que se ven (el iframe guarda el capítulo entero, a izquierda y derecha)
        if (left < box.left - 1 || left > box.right) continue
        rects[annotation.id] = { left, top: frame.top + first.top, height: first.height }
      }
      return rects
    },

    /**
     * Copia de cómo se ven ahora las páginas (para la hoja que se pasa). Devuelve mount(target): cada llamada pone en
     * target una copia nueva (el texto del iframe se copia en un shadow DOM, así conserva sus estilos sin mezclarlos)
     */
    snapshot() {
      const original = container.querySelector('.epub-container')
      if (!original) return () => {}
      // cloneNode devuelve un Node genérico: se le dice qué es (la misma clase que el original)
      const template = original.cloneNode(true) as HTMLElement
      const frames = [...original.querySelectorAll('iframe')].map((frame) => {
        const doc = frame.contentDocument
        const root = doc?.documentElement.cloneNode(true) as HTMLElement | undefined
        // epub.js mete los estilos del tema con insertRule: el <style> clonado sale vacío, así que se copian sus reglas
        const copies = root?.querySelectorAll('style') ?? []
        doc?.querySelectorAll('style').forEach((style, i) => {
          if (style.sheet && copies[i]) copies[i].textContent = [...style.sheet.cssRules].map((rule) => rule.cssText).join('\n')
        })
        return { width: frame.offsetWidth, height: frame.offsetHeight, root }
      })
      const scroll = { left: original.scrollLeft, top: original.scrollTop }
      return (target) => {
        const copy = template.cloneNode(true) as HTMLElement
        copy.querySelectorAll('iframe').forEach((frame, i) => {
          const holder = document.createElement('div')
          holder.style.cssText = frame.style.cssText
          Object.assign(holder.style, { width: `${frames[i].width}px`, height: `${frames[i].height}px`, overflow: 'hidden' })
          if (frames[i].root) holder.attachShadow({ mode: 'open' }).append(frames[i].root.cloneNode(true))
          frame.replaceWith(holder)
        })
        target.replaceChildren(copy)
        copy.scrollLeft = scroll.left
        copy.scrollTop = scroll.top
      }
    },

    addHighlight(annotation: Annotation) {
      rendition.annotations.highlight(
        annotation.location.cfi!,
        { id: annotation.id },
        (event: MouseEvent) => {
          const target = (event.target as Element).getBoundingClientRect()
          handlers.onAnnotationClick(annotation.id, { left: target.left, top: target.top, width: target.width, height: target.height })
        },
        'reader-highlight',
        { fill: ANNOTATION_FILL[annotation.color], 'fill-opacity': '0.4', 'mix-blend-mode': 'multiply' }
      )
    },
    removeHighlight: (annotation: Annotation) => rendition.annotations.remove(annotation.location.cfi!, 'highlight'),
    clearSelection,
    destroy() {
      resizeObserver.disconnect()
      book.destroy()
    },
  }
}
