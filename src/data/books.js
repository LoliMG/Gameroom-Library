// Lectura de los metadatos generados
import booksMeta from '@/data/booksMeta.json'

// Importación de todas las portadas guardadas en assets/covers con nombre ISBN.(jpg|png|jpeg|webp)
const coverModules = import.meta.glob('@/assets/covers/*.{jpg,png,jpeg,webp}', { eager: true, import: 'default' })

// Mapa dinámico de portadas indexado por ISBN
const coverMap = {}
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
export function calcularGrosor(pages) {
  return Math.max(MIN_DEPTH, (pages || 0) * DEPTH_PER_PAGE)
}

// Configuración estilística personalizada para cada libro (paletas y sinopsis calibradas con las cubiertas)
const bookStyles = {
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
}

// Transformación y exportación del array completo de libros con dimensiones para visualización de canto
// Solo los libros con portada: con cover null useTexture lanza un error y la escena entera no carga
const books = booksMeta.filter((item) => coverMap[item.isbn]).map((item, index) => {
  const coverImage = coverMap[item.isbn]
  const style = bookStyles[item.isbn] || {}

  // Grosor del lomo calculado a partir de las páginas reales
  const spineThickness = calcularGrosor(item.pages)

  return {
    id: index + 1,
    isbn: item.isbn,
    title: item.title,
    author: item.author,
    publisher: item.publisher || style.publisher || 'Editorial',
    pages: item.pages,
    cover: coverImage,
    // Dimensiones de canto: width = grosor lomo, height = alto, depth = fondo de la cubierta
    width: spineThickness,
    height: style.coverHeight || 0.21,
    depth: style.coverDepth || 0.14,
    color: '#f5eee3',
    spineGradient: style.spineGradient,
    spineTitleColor: style.spineTitleColor,
    spineAuthorColor: style.spineAuthorColor,
    spinePublisherColor: style.spinePublisherColor,
    spineRibsColor: style.spineRibsColor,
    backColor: style.backColor,
    backTextColor: style.backTextColor,
    synopsis: style.synopsis,
  }
})

export default books
