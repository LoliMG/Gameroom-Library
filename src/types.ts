// Tipos compartidos por toda la aplicación. Describen la forma de los datos que van y vienen entre la sala 3D,
// los paneles HTML y el servidor; cada uno dice de dónde sale.

/** Estados de lectura (los mismos que acepta el servidor en server/library.ts) */
export type ReadingStatus = 'finished' | 'reading' | 'unread'

/** Formato físico del libro: decide su tamaño en la estantería (src/data/books.ts) */
export type BookFormat = 'book' | 'manga' | 'bolsillo'

/**
 * Un libro tal como está en src/data/booksMeta.json. Lo escriben la consola al añadir libros (server/bookCatalog.ts)
 * y scripts/fetchBooks.ts; los libros antiguos no traen todos los campos.
 */
export interface BookMeta {
  isbn: string
  title?: string | null
  author?: string | null
  pages?: number | null
  publisher?: string | null
  /** 'pocket' es el nombre antiguo de 'bolsillo' */
  format?: BookFormat | 'pocket'
  type?: string
  saga?: string | null
  saga_index?: number | null
  synopsis?: string | null
  /**
   * De dónde salió el libro. La consola guarda { added: 'consola', from: 'Open Library' | 'Google Books' | 'a mano' };
   * scripts/fetchBooks.ts, el catálogo de cada dato ({ title: 'Open Library', cover: 'Google Books'… })
   */
  source?: Partial<Record<string, string>>
  /** Si tiene ya todos los datos (las páginas, sobre todo) */
  complete?: boolean
}

/** Formato del libro electrónico de un ISBN (ebooks/<isbn>.epub o .pdf; lo lista GET /api/ebooks) */
export type EbookFormat = 'epub' | 'pdf'

/** Degradado del lomo, de arriba abajo (colores CSS) */
export interface SpineGradient {
  top: string
  mid: string
  bottom: string
}

/**
 * Colores del lomo y la contraportada. Unos libros los traen escritos a mano en src/data/books.ts; al resto se los
 * calcula paletteFromCover (src/scene/books/bookTextureGenerator.ts) a partir de su portada.
 */
export interface BookPalette {
  spineGradient?: SpineGradient
  spineTitleColor?: string
  spineAuthorColor?: string
  spinePublisherColor?: string
  spineRibsColor?: string
  backColor?: string
  backTextColor?: string
}

/**
 * Un libro de la colección, ya listo para la sala. Lo construye src/data/books.ts juntando:
 * - src/data/booksMeta.json (título, autor, páginas… lo que escribe la consola al añadir libros),
 * - la portada de src/assets/covers/<isbn>.jpg,
 * - y los retoques de bookStyles (colores, sinopsis, tamaño) de ese mismo archivo.
 */
export interface Book extends BookPalette {
  /** Número de orden en la lista (1, 2, 3…): lo usan la sala y la selección múltiple */
  id: number
  isbn: string
  title: string
  author: string
  publisher: string
  pages: number | null
  saga: string | null
  saga_index: number | null
  format: BookFormat
  isManga: boolean
  /** Dirección de la imagen de portada (la da Vite al importar los archivos de src/assets/covers) */
  cover: string
  /** Medidas de canto en metros: width = grosor del lomo, height = alto, depth = fondo de la cubierta */
  width: number
  height: number
  depth: number
  color: string
  synopsis: string
  /** Título corto para el lomo, cuando el título completo trae la saga u otros añadidos */
  spineTitle?: string
}

/**
 * Sitio de un libro en las estanterías: tramo de pared (a0, a1, a2), módulo dentro del tramo, balda (0 = la de abajo)
 * y centro X a lo largo de la balda (0 = centro del módulo). Es lo que se guarda en la base de datos por cada ISBN.
 */
export interface Slot {
  wall: string
  module: number
  shelf: number
  x: number
}

/** Un libro colocado en la sala: el libro y su sitio */
export interface Placement<B = Book> extends Slot {
  book: B
}

/**
 * Tramo de estanterías de la pared, con sus medidas ya calculadas (lo construye Experience.tsx con las constantes de
 * src/scene/shelves).
 */
export interface ShelfWall {
  key: string
  moduleCount: number
  /** Ancho útil de cada balda, sin los laterales (metros) */
  innerWidth: number
  shelfCount: number
}

/** Estado de la biblioteca que se guarda: viene de GET /api/state (o, sin servidor, de localStorage) */
export interface LibraryState {
  /** Sitio de cada libro, por ISBN */
  placements: Record<string, Slot>
  /** ISBN de los libros que están de frente (con la portada a la vista) */
  flipped: string[]
  /** Estado de lectura por ISBN (los que no aparecen están sin leer) */
  readingStatus: Record<string, ReadingStatus>
}

/** Colores de subrayado del lector (los mismos que acepta el servidor) */
export type AnnotationColor = 'yellow' | 'pink' | 'green' | 'blue'

/**
 * Sitio dentro de un libro electrónico. EPUB: una CFI (la "dirección" de un trozo de texto que usa epub.js).
 * PDF: número de página y, en los subrayados, los rectángulos marcados (en fracciones del tamaño de la página).
 */
export interface ReaderLocation {
  cfi?: string
  page?: number
  rects?: [number, number, number, number][]
}

/** Un subrayado del lector, tal como lo devuelve la API (/api/reader/:isbn) */
export interface Annotation {
  id: number
  location: ReaderLocation
  text: string
  note: string | null
  color: AnnotationColor
  createdAt: string
}

/** Un marcador del lector, tal como lo devuelve la API */
export interface Bookmark {
  id: number
  location: ReaderLocation
  label: string
  createdAt: string
}

/** Resultado de buscar un libro en los catálogos desde la consola (GET /api/catalog/search) */
export interface CatalogBook {
  isbn: string
  title: string
  author: string | null
  publisher: string | null
  pages: number | null
  coverUrl: string
  format: BookFormat
  /** Idioma de la edición ("Español", "Inglés"…), si el catálogo lo dice */
  language: string | null
  saga: string | null
  saga_index: number | null
  /** Catálogo del que sale: "Open Library" o "Google Books" */
  source: string
}
