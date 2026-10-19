// Lista de libros de la sala. Junta tres fuentes:
// - src/data/booksMeta.json: los datos de cada libro (los escribe la consola al añadir libros, o a mano)
// - src/assets/covers/<isbn>.jpg: las portadas (Vite las importa y da su dirección)
// - bookStyles, más abajo: retoques escritos a mano (colores del lomo, sinopsis, tamaño especial)
import type { Book, BookMeta, BookPalette } from '@/types'
// Lectura de los metadatos (Vite importa el JSON como un objeto de JavaScript)
import booksMetaJson from '@/data/booksMeta.json'

const booksMeta = booksMetaJson as BookMeta[]

// Importación de todas las portadas guardadas en assets/covers con nombre ISBN.(jpg|png|jpeg|webp).
// import.meta.glob es de Vite: con eager e import 'default' devuelve { ruta del archivo: dirección de la imagen }
const coverModules = import.meta.glob<string>('@/assets/covers/*.{jpg,png,jpeg,webp}', { eager: true, import: 'default' })

// Mapa dinámico de portadas indexado por ISBN
const coverMap: Record<string, string> = {}
for (const [filePath, url] of Object.entries(coverModules)) {
  const match = filePath.match(/(\d{13})\.(jpg|png|jpeg|webp)$/)
  if (match) {
    coverMap[match[1]] = url
  }
}

// Constantes para el cálculo dinámico del grosor del lomo en función de las páginas reales
export const DEPTH_PER_PAGE = 0.00006
export const MIN_DEPTH = 0.01

/**
 * Calcula el grosor del lomo en metros a partir del número de páginas del libro
 */
export function calcularGrosor(pages: number | null | undefined): number {
  return Math.max(MIN_DEPTH, (pages || 0) * DEPTH_PER_PAGE)
}

// Editorial según el código de editorial del ISBN, para los libros que la traen vacía en booksMeta.json
const PUBLISHER_BY_ISBN_PREFIX: Record<string, string> = {
  '97884679': 'Norma Editorial',
  '97884082571': 'Crossbooks', // Una corte de… (Planeta, sello Crossbooks)
  '978841835': 'Hidra',        // Trono de cristal
  '978849043': 'Montena',      // Guardianes de la Ciudadela, El secreto de Xein
  '978841746': 'Montena',      // La misión de Rox
  '978846753': 'SM',           // Crónicas de la Torre
}
const publisherFromIsbn = (isbn: string): string | undefined =>
  Object.entries(PUBLISHER_BY_ISBN_PREFIX).find(([prefix]) => isbn.startsWith(prefix))?.[1]

// Título del lomo cuando el título trae la saga u otros añadidos que no son el título (el panel muestra el completo)
const SPINE_TITLES: Record<string, string> = {
  '9788408269144': 'Mírame y bésame',                 // Las guerreras Maxwell 8
  '9788466376976': 'Shogun',
  '9788490602737': 'Forsaken',                        // Assassin's Creed 5
  '9788410190108': 'Casa de tierra y sangre',
  '9788410190443': 'Casa de cielo y aliento',
  '9788410190603': 'Casa de llama y sombra',
  '9788467502695': 'La Resistencia',                 // Memorias de Idhún I. …
  '9788467505597': 'Tríada',                         // Memorias de Idhún II. …
  '9788467511482': 'Panteón',                        // Memorias de Idhún III. …
  '9788490439319': 'El bestiario de Axlin',          // Guardianes de la Ciudadela. …
  '9788467539677': 'El valle de los lobos',          // Crónicas de la Torre I: …
  '9788467539684': 'La maldición del maestro',       // Crónicas de la Torre II: …
  '9788467539691': 'La llamada de los muertos',      // Crónicas de la Torre III: …
  '9788467539707': 'Fenris, el elfo',                // Crónicas de la Torre IV: …
  '9788408257127': 'Una corte de alas y ruina',      // … Nueva presentación
  '9788408257134': 'Una corte de hielo y estrellas', // … Nueva presentación
  '9788491462538': 'Your Name',
}

// Configuración estilística personalizada para cada libro (paletas y sinopsis calibradas con las cubiertas)
/** Retoques de un libro escritos a mano: colores, editorial, sinopsis y tamaño de la cubierta (metros, sin escalar) */
interface BookStyle extends BookPalette {
  publisher?: string
  synopsis?: string
  coverHeight?: number
  coverDepth?: number
}

const bookStyles: Record<string, BookStyle> = {
  '9788401015489': {
    publisher: 'Plaza & Janés',
    coverHeight: 0.23, // Formato grande tapa blanda (23 cm)
    coverDepth: 0.15,
  },
  '9788401018466': {
    publisher: 'Plaza & Janés',
    coverHeight: 0.23, // Formato grande tapa blanda (23 cm)
    coverDepth: 0.15,
  },
  '9788410190108': {
    publisher: 'Alfaguara',
    spineGradient: { top: '#ff90bc', mid: '#b62a5b', bottom: '#48061d' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#ffdbe8',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#ffdbe8',
    backColor: '#360515',
    backTextColor: '#fcebf1',
    synopsis: 'Bryce Quinlan tenía la vida perfecta trabajando en una galería y saliendo de fiesta con sus amigos, hasta que un demonio asesinó a sus seres más queridos. Dos años después, el asesino vuelve a actuar y Bryce emprenderá una peligrosa investigación junto a Hunt Athalar, un ángel caído en desgracia.',
    coverHeight: 0.22,
    coverDepth: 0.15,
  },
  '9788410190443': {
    publisher: 'Alfaguara',
    spineGradient: { top: '#67b3e8', mid: '#2c67aa', bottom: '#0f274c' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#e0effc',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#e0effc',
    backColor: '#0b1d3a',
    backTextColor: '#eef6fc',
    synopsis: 'Bryce Quinlan y Hunt Athalar han salvado Ciudad Medialuna, pero tras tanto caos solo quieren descansar y descubrir qué les depara el futuro. Sin embargo, los rebeldes amenazan con socavar el poder de los Asteri y ambos no podrán quedarse al margen cuando la rebelión estalle.',
    coverHeight: 0.22,
    coverDepth: 0.15,
  },
  '9788410190603': {
    publisher: 'Alfaguara',
    spineGradient: { top: '#f8d254', mid: '#d38216', bottom: '#643206' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#fff2ce',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#fff2ce',
    backColor: '#3d1c02',
    backTextColor: '#fbf4e6',
    synopsis: 'Bryce Quinlan se encuentra en un mundo extraño y letal, lejos de todo lo que conoce. Mientras busca el camino de vuelta a Ciudad Medialuna con la ayuda de un misterioso guerrero fae, Hunt Athalar está atrapado en las mazmorras de los Asteri, privado de su libertad y de Bryce.',
    coverHeight: 0.22,
    coverDepth: 0.15,
  },
  '9788410140462': {
    publisher: 'NdeNovela',
    spineGradient: { top: '#260a19', mid: '#3d1127', bottom: '#1c0612' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#f7edf2',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#c88ea9',
    backColor: '#200715',
    backTextColor: '#f5ecf1',
    synopsis: 'Salazar es un nigromante atrapado en un castillo de sombras. Talía, conocida como Flordemuerte, posee una magia prohibida que se alimenta de la muerte. Juntos deberán enfrentarse a los secretos de los feys y a un pacto oscuro que cambiará sus destinos para siempre.',
    coverHeight: 0.215,
    coverDepth: 0.145,
  },
  '9788408279990': {
    publisher: 'Planeta',
    spineGradient: { top: '#caa055', mid: '#dbb369', bottom: '#b98f45' },
    spineTitleColor: '#0a0a0a',
    spineAuthorColor: '#171717',
    spinePublisherColor: '#0a0a0a',
    spineRibsColor: '#171717',
    backColor: '#baa068',
    backTextColor: '#141414',
    synopsis: 'Violet Sorrengail esperaba vivir una vida tranquila entre libros. Pero por orden de su madre, se ve obligada a unirse a los candidatos para convertirse en jinete de dragones en el Colegio de Guerra de Basgiath, donde solo hay dos finales: graduarse o morir.',
    coverHeight: 0.21,
    coverDepth: 0.14,
  },
  '9788408284550': {
    publisher: 'Planeta',
    spineGradient: { top: '#dc5b22', mid: '#b53d16', bottom: '#340f06' },
    spineTitleColor: '#080808',
    spineAuthorColor: '#f7d899',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#f7d899',
    backColor: '#280c05',
    backTextColor: '#f6ebd7',
    synopsis: 'Todos esperaban que Violet Sorrengail muriera durante su primer año en Basgiath. Ahora empieza el verdadero entrenamiento, y la nueva vicerrectora se ha propuesto enseñarle lo indefensa que está, a menos que traicione al hombre que ama.',
    coverHeight: 0.212,
    coverDepth: 0.142,
  },
  '9788408297079': {
    publisher: 'Planeta',
    spineGradient: { top: '#101215', mid: '#1d2127', bottom: '#69727c' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#f0f3f6',
    spinePublisherColor: '#101215',
    spineRibsColor: '#d8b664',
    backColor: '#111317',
    backTextColor: '#edf1f5',
    synopsis: 'La guerra por el continente de Navarre alcanza su punto culminante. Con secretos milenarios revelados y la amenaza de los venin más cerca que nunca, Violet y sus aliados deberán luchar por la supervivencia en una batalla sin precedentes.',
    coverHeight: 0.21,
    coverDepth: 0.14,
  },
  '9788466321570': {
    publisher: 'Punto de Lectura',
    coverHeight: 0.19,
    coverDepth: 0.125,
    spineGradient: { top: '#1c1c1c', mid: '#0d0d0d', bottom: '#050505' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#e63946',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#333333',
    backColor: '#0a0a0a',
    backTextColor: '#f0f0f0',
    synopsis: 'Isabella Swan se muda a Forks, un pueblo lluvioso donde conoce al misterioso y fascinante Edward Cullen. Su vida dará un giro radical al descubrir que Edward oculta un secreto mortal: pertenece a una familia de vampiros que renuncia a beber sangre humana. Entre ambos surge una pasión arrolladora y letal.',
  },
  '9788420471136': {
    publisher: 'Alfaguara',
    coverHeight: 0.22,
    coverDepth: 0.15,
    spineGradient: { top: '#1c1c1c', mid: '#0f0f0f', bottom: '#070707' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#e63946',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#333333',
    backColor: '#0a0a0a',
    backTextColor: '#f0f0f0',
    synopsis: 'Para Bella Swan, la devoción hacia Edward Cullen supera cualquier instinto de supervivencia. Sin embargo, tras un trágico incidente durante su decimoctavo cumpleaños, Edward y los suyos abandonan Forks para protegerla, sumiendo a Bella en una profunda depresión hasta que halla consuelo en Jacob Black.',
  },
  '9788420472331': {
    publisher: 'Alfaguara',
    coverHeight: 0.22,
    coverDepth: 0.15,
    spineGradient: { top: '#1c1c1c', mid: '#0f0f0f', bottom: '#070707' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#e63946',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#333333',
    backColor: '#0a0a0a',
    backTextColor: '#f0f0f0',
    synopsis: 'Seattle sufre una oleada de crueles asesinatos atribuidos a un ejército de vampiros neófitos comandados por una vieja enemiga sedienta de venganza. Bella se verá atrapada en un dilema desgarrador entre el amor incondicional por Edward y su profunda lealtad hacia Jacob.',
  },
  '9788420473062': {
    publisher: 'Alfaguara',
    coverHeight: 0.22,
    coverDepth: 0.15,
    spineGradient: { top: '#1c1c1c', mid: '#0f0f0f', bottom: '#070707' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#e63946',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#333333',
    backColor: '#0a0a0a',
    backTextColor: '#f0f0f0',
    synopsis: 'Estar irremediablemente enamorada de un vampiro es una fantasía y una pesadilla entretejidas en una peligrosa realidad. El enlace entre Bella y Edward desata una serie de acontecimientos prodigiosos y sobrecogedores que amenazan con movilizar al clan de los Vulturis contra ellos.',
  },
  '9788427201187': {
    publisher: 'Molino',
    coverHeight: 0.215,
    coverDepth: 0.145,
    // Lomo Divergente: llama de fuego ardiente de Osadía sobre nubes de tormenta y horizonte azul
    spineGradient: { top: '#1c2833', mid: '#d35400', bottom: '#0b1928' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#ffb703',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#fb8500',
    backColor: '#0f1722',
    backTextColor: '#e2e8f0',
    synopsis: 'En una Chicago distópica, la sociedad está dividida en cinco facciones consagradas a cultivar una virtud específica: Abnegación, Concordia, Erudición, Verdad y Osadía. A los dieciséis años, Beatrice Prior descubre en su prueba de aptitud que es Divergente, un secreto mortal que debe ocultar.',
  },
  '9788427203181': {
    publisher: 'Molino',
    coverHeight: 0.215,
    coverDepth: 0.145,
    // Lomo Insurgente: verde oliva / musgo bosque y reflejo lima del árbol de Cordialidad
    spineGradient: { top: '#1b2715', mid: '#587c26', bottom: '#0f180c' },
    spineTitleColor: '#cbf382',
    spineAuthorColor: '#f1faee',
    spinePublisherColor: '#cbf382',
    spineRibsColor: '#709732',
    backColor: '#11180d',
    backTextColor: '#e8f0e4',
    synopsis: 'Una sola elección puede transformarte o destruirte. La guerra de facciones ha comenzado y las lealtades se ponen a prueba mientras la rebelión se extiende. Tris debe abrazar su divergencia por completo y enfrentarse a las consecuencias de sus elecciones.',
  },
  '9788427206861': {
    publisher: 'Molino',
    coverHeight: 0.215,
    coverDepth: 0.145,
    // Lomo Leal: carmesí crepúsculo y naranja fuego con acento cian del vórtice de agua
    spineGradient: { top: '#8a1f11', mid: '#e35118', bottom: '#2d0e07' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#48cae4',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#ffd166',
    backColor: '#210a05',
    backTextColor: '#fdf2ec',
    synopsis: 'La sociedad basada en facciones que Tris Prior conoció ha quedado destruida por la violencia y las luchas de poder. Dispuesta a descubrir el mundo más allá de la valla que rodea su ciudad, Tris emprenderá un peligroso viaje hacia lo desconocido.',
  },
  '9788491462538': {
    publisher: 'Planeta Cómic',
    coverHeight: 0.21,
    coverDepth: 0.14,
    spineGradient: { top: '#215c8a', mid: '#123957', bottom: '#081c2d' },
    spineTitleColor: '#ffffff',
    spineAuthorColor: '#f7d486',
    spinePublisherColor: '#ffffff',
    spineRibsColor: '#6cb2eb',
    backColor: '#0b2031',
    backTextColor: '#f0f7fd',
    synopsis: 'Mitsuha es una estudiante de secundaria que vive en un idílico pero aburrido pueblo de montaña; Taki es un chico de instituto de Tokio que trabaja a tiempo parcial y sueña con la arquitectura. Durante el paso de un cometa milenario, ambos empiezan a intercambiar misteriosamente sus cuerpos al soñar, tejiendo un vínculo inolvidable.',
  },
};

// Transformación y exportación del array completo de libros con dimensiones para visualización de canto
// Escala de los libros respecto a sus medidas reales: algo más grandes para que se lean y se cojan mejor en la sala.
// El más alto (0.215 m × 1.2 ≈ 0.26 m) sigue cabiendo en el hueco entre baldas (0.29 m)
const BOOK_SCALE = 1.2

// Medidas base estándar (metros antes de BOOK_SCALE)
// Novela estándar: 21 cm de alto x 14 cm de profundidad
const DEFAULT_BOOK_HEIGHT = 0.21
const DEFAULT_BOOK_DEPTH = 0.14

// Manga (formato tankōbon estándar: 17.5 cm de alto x 11.5 cm de profundidad; visiblemente más pequeños)
const MANGA_DEFAULT_HEIGHT = 0.175
const MANGA_DEFAULT_DEPTH = 0.115

// Bolsillo (formato de bolsillo estándar: 19 cm de alto x 12.5 cm de profundidad; intermedio entre manga y novela estándar)
const POCKET_DEFAULT_HEIGHT = 0.19
const POCKET_DEFAULT_DEPTH = 0.125

// Solo los libros con portada y título: sin portada useTexture falla y sin título no hay lomo; en ambos casos la escena
// entera dejaría de cargar (pasa mientras se rellena booksMeta.json a mano)
const books: Book[] = booksMeta.filter((item) => coverMap[item.isbn] && item.title).map((item, index) => {
  const coverImage = coverMap[item.isbn]
  const style: BookStyle = bookStyles[item.isbn] || {}

  const isManga = item.format === 'manga' || item.type === 'manga' || item.saga === 'Pandora Hearts'
  const isPocket = item.format === 'bolsillo' || item.format === 'pocket'
  const isBlackButler = item.saga === 'Black Butler'

  // Lomos negros góticos para toda la saga Black Butler con tipografía plateada y nervios oscuros
  const defaultSagaStyle: BookPalette = isBlackButler
    ? {
        spineGradient: { top: '#080808', mid: '#141414', bottom: '#050505' },
        spineTitleColor: '#ffffff',
        spineAuthorColor: '#d6d6d6',
        spinePublisherColor: '#ffffff',
        spineRibsColor: '#5a5a5a',
        backColor: '#0a0a0a',
        backTextColor: '#f0f0f0',
      }
    : {}

  let defaultHeight = DEFAULT_BOOK_HEIGHT
  let defaultDepth = DEFAULT_BOOK_DEPTH
  if (isManga) {
    defaultHeight = MANGA_DEFAULT_HEIGHT
    defaultDepth = MANGA_DEFAULT_DEPTH
  } else if (isPocket) {
    defaultHeight = POCKET_DEFAULT_HEIGHT
    defaultDepth = POCKET_DEFAULT_DEPTH
  }

  const baseHeight = style.coverHeight || defaultHeight
  const baseDepth = style.coverDepth || defaultDepth

  // Grosor del lomo calculado a partir de las páginas reales
  const spineThickness = calcularGrosor(item.pages)

  return {
    id: index + 1,
    isbn: item.isbn,
    title: item.title!, // El filtro de arriba ya ha quitado los libros sin título
    author: item.author ?? '', // Sin autor, el lomo lo deja en blanco
    publisher: item.publisher || style.publisher || publisherFromIsbn(item.isbn) || 'Editorial',
    pages: item.pages ?? null,
    saga: item.saga ?? null,
    saga_index: item.saga_index ?? null,
    format: isManga ? 'manga' : isPocket ? 'bolsillo' : 'book',
    isManga,
    cover: coverImage,
    // Dimensiones de canto: width = grosor lomo, height = alto, depth = fondo de la cubierta
    width: spineThickness * BOOK_SCALE,
    height: baseHeight * BOOK_SCALE,
    depth: baseDepth * BOOK_SCALE,
    color: '#f5eee3',
    spineGradient: style.spineGradient || defaultSagaStyle.spineGradient,
    spineTitleColor: style.spineTitleColor || defaultSagaStyle.spineTitleColor,
    spineAuthorColor: style.spineAuthorColor || defaultSagaStyle.spineAuthorColor,
    spinePublisherColor: style.spinePublisherColor || defaultSagaStyle.spinePublisherColor,
    spineRibsColor: style.spineRibsColor || defaultSagaStyle.spineRibsColor,
    backColor: style.backColor || defaultSagaStyle.backColor,
    backTextColor: style.backTextColor || defaultSagaStyle.backTextColor,
    synopsis: style.synopsis || item.synopsis || '',
    spineTitle: SPINE_TITLES[item.isbn],
  }
})

export default books
