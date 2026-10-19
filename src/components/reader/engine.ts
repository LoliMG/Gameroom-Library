// Lo que tienen en común los dos motores del lector (epubEngine.ts con epub.js y pdfEngine.ts con PDF.js). BookReader
// trabaja con un ReaderEngine sin saber si el libro es EPUB o PDF. Solo hay tipos: este archivo desaparece al compilar.
import type { Annotation, ReaderLocation } from '@/types'

/** Rectángulo en la ventana, en píxeles (como el de getBoundingClientRect) */
export interface ScreenRect {
  left: number
  top: number
  width: number
  height: number
}

/** Texto seleccionado en las páginas: dónde está en el libro, qué dice y dónde se ve (para poner el menú encima) */
export interface TextSelection {
  location: ReaderLocation
  text: string
  rect: ScreenRect
}

/** Lo que se sabe de las páginas que se ven: si son las primeras o las últimas y su nombre para un marcador */
export interface PlaceInfo {
  atStart: boolean
  atEnd: boolean
  label: string
}

/** Avisos del motor a BookReader */
export interface EngineHandlers {
  onSelect(selection: TextSelection): void
  onAnnotationClick(id: number, rect: ScreenRect): void
  onRelocate(location: ReaderLocation, place: PlaceInfo): void
  /** Teclas pulsadas dentro del iframe del EPUB (no llegan a la ventana) */
  onKey(event: KeyboardEvent): void
  /** Pulsación dentro del iframe del EPUB */
  onPointerDown(): void
}

/** Motor de un libro abierto: pasar páginas, subrayados y copias de las páginas para la animación */
export interface ReaderEngine {
  /** Proporción ancho / alto de una página (solo PDF: el EPUB se adapta al hueco) */
  pageRatio?: number
  display(location?: ReaderLocation | null): Promise<void>
  next(): Promise<void>
  prev(): Promise<void>
  /** Sitio y nombre de las páginas que se ven, para guardarlas como marcador */
  currentPlace(): { location: ReaderLocation; label: string } | null
  /** ¿Ese sitio está en las páginas que se ven? */
  isVisible(location: ReaderLocation | null | undefined): boolean
  /** Posición en la ventana de cada subrayado visible, por id (para las burbujas de los comentarios) */
  annotationRects(annotations: Annotation[]): Record<number, { left: number; top: number; height: number }>
  /** Copia de cómo se ven ahora las páginas; la función devuelta pone una copia nueva en target cada vez que se llama */
  snapshot(): (target: HTMLElement) => void
  addHighlight(annotation: Annotation): void
  removeHighlight(annotation: Annotation): void
  clearSelection(): void
  destroy(): void
}
