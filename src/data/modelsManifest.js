/**
 * Manifiesto centralizado de modelos 3D descargados.
 * Define la ruta resuelta con Vite (?url), escalas recomendadas calculadas a partir
 * de las cajas envolventes reales para ajustarse a las medidas objetivo en metros,
 * desplazamientos de suelo (groundOffset) y atribuciones de licencia según credits.md.
 */

// Modelos de mobiliario
import sofaUrl from '@/assets/models/furniture/sofa.glb?url'
import coffeeTableUrl from '@/assets/models/furniture/table.glb?url'
import rugUrl from '@/assets/models/furniture/rug.glb?url'
import windowUrl from '@/assets/models/furniture/window.glb?url'
import doorUrl from '@/assets/models/furniture/door.glb?url'

// Modelos varios (libros y accesorios de mesa)
import bookTableUrl from '@/assets/models/other/book_open.glb?url'
import bookMagicUrl from '@/assets/models/other/viking_book.glb?url'
import candleUrl from '@/assets/models/other/candle.glb?url'
import coffeeUrl from '@/assets/models/other/coffee.glb?url'

// Modelos de vegetación y jardín
import treesGardenUrl from '@/assets/models/flowers/trees.glb?url'
import asiaticLilyUrl from '@/assets/models/flowers/asiatic_lily.glb?url'
import azaleaUrl from '@/assets/models/flowers/azalea.glb?url'
import lilies1Url from '@/assets/models/flowers/lilies1.glb?url'
import purpleLiliesUrl from '@/assets/models/flowers/purple_lilies.glb?url'
import roseInAPotUrl from '@/assets/models/flowers/rose_in_a_pot.glb?url'
import spiderLilyUrl from '@/assets/models/flowers/spider_lily.glb?url'

// Constantes de dimensiones objetivo en metros (Three.js: 1 unidad = 1 metro)
export const TARGET_HEIGHT_SOFA = 0.85 // metros de alto (ancho ~2.0 m)
export const TARGET_HEIGHT_COFFEE_TABLE = 0.45 // metros de alto (diámetro ~0.65-0.8 m)
export const TARGET_SIZE_RUG = { width: 2.4, depth: 1.8 } // metros
export const TARGET_HEIGHT_BOOK_TABLE = 0.21 // metros
export const TARGET_HEIGHT_BOOK_MAGIC = 0.25 // metros
export const TARGET_HEIGHT_GARDEN_TREE = 5.5 // metros (rango 4-8 m)
export const TARGET_HEIGHT_INDOOR_TALL_PLANT = 1.5 // metros (rango 1.2-1.8 m)
export const TARGET_HEIGHT_SMALL_FLOWER = 0.5 // metros

export const modelsManifest = {
  // Sofá para el rincón de lectura (pared a)
  sofa: {
    url: sofaUrl,
    file: 'furniture/sofa.glb',
    targetDimensions: { width: 2.07, height: 0.85, depth: 0.70 },
    scale: 0.76,
    groundOffset: 0.0,
    credit: {
      title: 'Sofa_03_diff.png-sofa_03_opacity',
      author: 'adamdmaxadam',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pLRTo',
    },
  },

  // Mesa de café redonda marquetería
  coffeeTable: {
    url: coffeeTableUrl,
    file: 'furniture/table.glb',
    targetDimensions: { width: 0.65, height: 0.45, depth: 0.67 },
    scale: 0.53,
    groundOffset: 0.0, // Patas en Y=0 al cargar en Three.js
    credit: {
      title: 'Marquetry table',
      author: 'Virtual Museums of Małopolska',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pMANs',
    },
  },

  // Alfombra estampada con borlas
  rug: {
    url: rugUrl,
    file: 'furniture/rug.glb',
    targetDimensions: { width: 1.65, height: 0.01, depth: 2.40 },
    scale: 0.65,
    groundOffset: 0.002,
    credit: {
      title: 'Rug with Tassles',
      author: 'Diligence7540',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/p8AuF',
    },
  },

  // Gran ventanal para la pared c (frontal)
  window: {
    url: windowUrl,
    file: 'furniture/window.glb',
    targetDimensions: { width: 4.50, height: 2.55, depth: 0.42 },
    scale: 0.5536,
    groundOffset: 0.0,
    credit: {
      title: 'Window matal - 7MB',
      author: 'Mehdi Shahsavan',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/oXZqW',
    },
  },

  // Puerta de madera antigua para la pared b
  door: {
    url: doorUrl,
    file: 'furniture/door.glb',
    targetDimensions: { width: 1.14, height: 2.21, depth: 0.29 },
    scale: 0.009,
    groundOffset: 0.0,
    credit: {
      title: 'Door_Wooden_Old -9MB',
      author: 'Mehdi Shahsavan',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/oVRQx',
    },
  },

  // Libro abierto sobre la mesa de café
  bookTable: {
    url: bookTableUrl,
    file: 'other/book_open.glb',
    targetDimensions: { width: 0.145, height: 0.024, depth: 0.21 },
    scale: 0.0043,
    groundOffset: 0.106,
    credit: {
      title: 'Book Open',
      author: 'FlukierJupiter',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6pMGN',
    },
  },

  // Libro mágico que levita en el rincón
  bookMagic: {
    url: bookMagicUrl,
    file: 'other/viking_book.glb',
    targetDimensions: { width: 0.43, height: 0.25, depth: 0.27 },
    scale: 0.00094,
    groundOffset: 0.125,
    credit: {
      title: 'Viking book',
      author: 'katrin.kor',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6TqoO',
    },
  },

  // Candelabro con vela de cobre para la mesa de café
  candle: {
    url: candleUrl,
    file: 'other/candle.glb',
    targetDimensions: { width: 0.15, height: 0.19, depth: 0.14 },
    scale: 0.9,
    groundOffset: 0.0,
    credit: {
      title: 'Copper candlestick',
      author: 'shuvalov.di',
      license: 'CC-BY-SA-4.0',
      url: 'https://skfb.ly/oMYp6',
    },
  },

  // Taza y plato de café para la mesa de café
  coffee: {
    url: coffeeUrl,
    file: 'other/coffee.glb',
    targetDimensions: { width: 0.145, height: 0.038, depth: 0.145 },
    scale: 0.001,
    groundOffset: 0.0,
    credit: {
      title: 'Coffee cup',
      author: 'Pendiente en credits.md',
      license: 'N/A',
      url: '',
    },
  },

  // Colección de árboles realistas para el jardín exterior (escala reducida para altura natural ~5.5 m)
  treesGarden: {
    url: treesGardenUrl,
    file: 'flowers/trees.glb',
    targetDimensions: { width: 24.3, height: 5.5, depth: 5.6 },
    scale: 0.000515,
    groundOffset: 0.0,
    credit: {
      title: 'Realistic Trees Collection',
      author: 'Jungle Jim',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pDzJR',
    },
  },

  // Lirio asiático ornamental
  asiaticLily: {
    url: asiaticLilyUrl,
    file: 'flowers/asiatic_lily.glb',
    targetDimensions: { width: 0.84, height: 0.60, depth: 1.04 },
    scale: 0.008,
    groundOffset: 0.0,
    credit: {
      title: 'Asiatic Lily',
      author: 'local.yany',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/oYLWL',
    },
  },

  // Arbusto de azalea
  azalea: {
    url: azaleaUrl,
    file: 'flowers/azalea.glb',
    targetDimensions: { width: 1.12, height: 1.20, depth: 0.95 },
    scale: 0.0487,
    groundOffset: 0.034,
    credit: {
      title: 'Rhododendron - Azalea ( Free download )',
      author: 'Nestaeric',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pzprt',
    },
  },

  // Lirios blancos de jardín (escala corregida para contrarrestar la matriz interna de 1000x del nodo)
  lilies1: {
    url: lilies1Url,
    file: 'flowers/lilies1.glb',
    targetDimensions: { width: 0.70, height: 0.81, depth: 0.84 },
    scale: 0.00011,
    groundOffset: 0.0,
    credit: {
      title: 'Lilies',
      author: 'sligocreatures',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6V9YF',
    },
  },

  // Lirios morados altos
  purpleLilies: {
    url: purpleLiliesUrl,
    file: 'flowers/purple_lilies.glb',
    targetDimensions: { width: 1.20, height: 1.20, depth: 1.04 },
    scale: 0.0926,
    groundOffset: 0.77,
    credit: {
      title: 'Purple lilies',
      author: 'Chenchanchong',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pBGwp',
    },
  },

  // Maceta con rosal alto para interiores
  roseInAPot: {
    url: roseInAPotUrl,
    file: 'flowers/rose_in_a_pot.glb',
    targetDimensions: { width: 0.99, height: 1.42, depth: 1.10 },
    scale: 0.07,
    groundOffset: 0.0,
    credit: {
      title: 'Rose in a pot',
      author: 'Lassi Kaukonen',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6SDLR',
    },
  },

  // Lirio de araña (Lycoris Radiata)
  spiderLily: {
    url: spiderLilyUrl,
    file: 'flowers/spider_lily.glb',
    targetDimensions: { width: 0.74, height: 0.50, depth: 0.45 },
    scale: 0.0042,
    groundOffset: 0.004,
    credit: {
      title: 'Spider Lily (Lycoris Radiata)',
      author: 'Osian CG',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/oJJBW',
    },
  },
}

export default modelsManifest
