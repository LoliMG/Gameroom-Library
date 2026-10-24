// Tipos compartidos por toda la aplicación. Describen la forma de los datos que van y vienen entre la sala 3D,
// los paneles HTML y el servidor; cada uno dice de dónde sale.

/** Estados de lectura (los mismos que acepta el servidor en server/library.ts) */
export type ReadingStatus = 'finished' | 'reading' | 'unread'

/** Nombre de cada estado de lectura en la consola y en el panel del libro */
export const READING_LABELS: Record<ReadingStatus, string> = { finished: 'Acabado', reading: 'Leyendo', unread: 'Sin leer' }

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

/** Formato del libro electrónico de un ISBN (su PDF o EPUB guardado en el navegador: src/utils/ebookStore.ts) */
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
  /** Etiquetas de cada libro por ISBN (FAVORITE_TAG marca los favoritos) */
  tags: Record<string, string[]>
  /** Libros que se quieren tener (aún no están en la colección) */
  wishlist: WishItem[]
  /** Ajustes de la sala */
  settings: AppSettings
  /** Retos de lectura: libros que se quieren leer cada año ({ '2026': 50 }) */
  goals: Record<string, number>
  /** Favoritos colgados como pósters sobre la chimenea (ISBN, como mucho MAX_POSTERS) */
  posters: string[]
  /** Pila "por leer" junto al sofá: ISBN de abajo arriba (salen de la estantería mientras están en ella) */
  pile: string[]
  /** Corcho de la pared: pósits, pegatinas y frases, en el orden en que se pegaron (lo último, encima) */
  board: BoardItem[]
}

/**
 * Una lectura del diario: un libro leído (o que se está leyendo) con sus fechas, su puntuación y un comentario. Un libro
 * puede tener varias (relecturas). Las fechas van como 'AAAA-MM-DD'; sin fin, se está leyendo. La guarda la base de datos
 */
export interface Reading {
  id: number
  isbn: string
  startDate: string | null
  endDate: string | null
  /** Estrellas: 1 a 5 (null = sin puntuar) */
  rating: number | null
  comment: string | null
}

/** Un libro de la lista de deseos: lo necesario para añadirlo a la colección cuando se tenga (sale de la búsqueda) */
export interface WishItem {
  isbn: string
  title: string
  author: string | null
  publisher: string | null
  pages: number | null
  coverUrl: string
  format: BookFormat
}

/** Ajustes de la sala: ciudad del tiempo (con sus coordenadas, para pedir el clima a Open-Meteo) y sonido */
export interface AppSettings {
  city: string
  latitude: number
  longitude: number
  /** Sonidos de fondo (grillos, viento, lluvia y truenos); false = silenciados todos */
  sound: boolean
  /** Volumen de cada sonido: 0 (apagado) a 1.5 (150 %); 1 es el volumen normal */
  volumes: SoundVolumes
}

/** Volumen de cada sonido de fondo (ver src/utils/ambientSounds.ts) */
export interface SoundVolumes {
  wind: number
  rain: number
  thunder: number
  crickets: number
}

/**
 * Ajustes guardados encima de los de por defecto: los guardados antes de añadir un ajuste nuevo (como sound o el volumen
 * de un sonido) lo reciben así. Lo usan el servidor (lo de la base de datos) y libraryApi.ts (lo de localStorage)
 */
export function withDefaultSettings(saved: Partial<AppSettings>): AppSettings {
  return { ...DEFAULT_SETTINGS, ...saved, volumes: { ...DEFAULT_SETTINGS.volumes, ...saved.volumes } }
}

/** Volumen más alto que se puede poner a un sonido (150 %) */
export const MAX_SOUND_VOLUME = 1.5

/** Etiqueta de los libros favoritos (la estrella de la consola) */
export const FAVORITE_TAG = 'Favorito'

/** Pósters de favoritos que caben sobre la chimenea */
export const MAX_POSTERS = 2

/** Libros que caben en la pila "por leer" */
export const MAX_PILE = 40

/** Colores de los pósits */
export const NOTE_COLORS = ['yellow', 'pink', 'mint', 'blue', 'lilac'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]
/** Cosas que caben en el corcho y largo máximo de los textos */
export const MAX_BOARD_ITEMS = 80
export const MAX_NOTE_TEXT = 200
export const MAX_QUOTE_TEXT = 400

/**
 * Algo pegado en el corcho. x, y: su centro, en fracción del ancho y del alto del corcho (0 a 1); rotation: giro en
 * grados. Pósit: texto y color. Pegatina: un emoji o "img:archivo" (imagen de src/assets/stickers). Frase: texto y,
 * si es de un libro, su ISBN
 */
export type BoardItem = { id: string; x: number; y: number; rotation: number } & BoardContent
/** Lo que es cada cosa del corcho, sin su sitio */
export type BoardContent =
  | { kind: 'note'; text: string; color: NoteColor }
  | { kind: 'sticker'; sticker: string }
  | { kind: 'quote'; text: string; isbn: string | null }

/** Frase subrayada en el lector (para pegarla en el corcho) */
export interface Highlight {
  id: number
  isbn: string
  text: string
}

/** Ajustes por defecto (los que hay hasta que se cambian en la consola) */
export const DEFAULT_SETTINGS: AppSettings = {
  city: 'Málaga',
  latitude: 36.7213,
  longitude: -4.4214,
  sound: true,
  volumes: { wind: 1, rain: 1, thunder: 1, crickets: 1 },
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

/** Resultado de buscar un libro en los catálogos desde la consola (lo define la Edge Function catalog) */
export type { CatalogBook } from '../supabase/functions/catalog/catalog.ts'
