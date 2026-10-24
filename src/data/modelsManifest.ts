/**
 * Manifiesto centralizado de modelos 3D descargados.
 * Define la ruta resuelta con Vite (?url), escalas recomendadas calculadas a partir
 * de las cajas envolventes reales para ajustarse a las medidas objetivo en metros,
 * desplazamientos de suelo (groundOffset) y atribuciones de licencia según credits.md.
 *
 * Los `import … from '…glb?url'` los resuelve Vite: devuelven la dirección (string) del archivo ya copiado a la
 * compilación. Su tipo lo declara `vite/client` (en tsconfig.json, "types").
 */

// Modelos de mobiliario
import sofaUrl from '@/assets/models/furniture/sofa.glb?url'
import coffeeTableUrl from '@/assets/models/furniture/table.glb?url'
import rugUrl from '@/assets/models/furniture/rug.glb?url'
import windowUrl from '@/assets/models/furniture/window.glb?url'
import doorUrl from '@/assets/models/furniture/door.glb?url'
import shelfUrl from '@/assets/models/furniture/repisalarga.glb?url'
import skirtingUrl from '@/assets/models/other/wall_skirting_board.glb?url'
import cabinetUrl from '@/assets/models/furniture/old_storage_cabinet.glb?url'
import grassGroundUrl from '@/assets/models/flowers/grass_texture.glb?url'
import gardenBenchUrl from '@/assets/models/furniture/jap_bench.glb?url'
import plushieSharkUrl from '@/assets/models/other/plushie_shark.glb?url'
import fountainUrl from '@/assets/models/other/fountain.glb?url'
import paperLanternsUrl from '@/assets/models/other/japanese_paper_lanterns.glb?url'
import stoneWallUrl from '@/assets/models/other/stone_wall.glb?url'
import elderStonesUrl from '@/assets/models/other/elder_stones.glb?url'
import warriorUrl from '@/assets/models/other/warrior.glb?url'
import flowerPotUrl from '@/assets/models/other/flower_pot.glb?url'
import katanaUrl from '@/assets/models/other/katana.glb?url'
import floorLampUrl from '@/assets/models/furniture/floor_lamp.glb?url'
import fireplaceUrl from '@/assets/models/furniture/fireplace.glb?url'
import toonCatUrl from '@/assets/models/other/toon_cat_free.glb?url'
import gramophoneUrl from '@/assets/models/furniture/old_gramophone.glb?url'

// Modelos varios (libros y accesorios de mesa)
import bookTableUrl from '@/assets/models/other/book_open.glb?url'
import candleUrl from '@/assets/models/other/candle.glb?url'
import coffeeUrl from '@/assets/models/other/coffee.glb?url'

// Modelos de vegetación y jardín
import treesGardenUrl from '@/assets/models/flowers/trees.glb?url'
import lilies1Url from '@/assets/models/flowers/lilies1.glb?url'
import purpleLiliesUrl from '@/assets/models/flowers/purple_lilies.glb?url'
import roseInAPotUrl from '@/assets/models/flowers/rose_in_a_pot.glb?url'
import spiderLilyUrl from '@/assets/models/flowers/spider_lily.glb?url'

// Constantes de dimensiones objetivo en metros (Three.js: 1 unidad = 1 metro)
export const TARGET_HEIGHT_SOFA = 0.85 // metros de alto (ancho ~2.0 m)
export const TARGET_HEIGHT_COFFEE_TABLE = 0.45 // metros de alto (diámetro ~0.65-0.8 m)
export const TARGET_SIZE_RUG = { width: 2.4, depth: 1.8 } // metros
export const TARGET_HEIGHT_BOOK_TABLE = 0.21 // metros
export const TARGET_HEIGHT_GARDEN_TREE = 5.5 // metros (rango 4-8 m)
export const TARGET_HEIGHT_INDOOR_TALL_PLANT = 1.5 // metros (rango 1.2-1.8 m)
export const TARGET_HEIGHT_SMALL_FLOWER = 0.5 // metros

/** Autoría y licencia de un modelo descargado (de Sketchfab; se listan en credits.md) */
export interface ModelCredit {
  title: string
  author: string
  license: string
  url: string
}

/** Un modelo 3D del manifiesto */
export interface ModelEntry {
  /** Dirección del .glb que da Vite (import …?url) */
  url: string
  /** Ruta dentro de src/assets/models (solo informativa) */
  file: string
  /** Medidas que debe tener en la sala, en metros */
  targetDimensions?: { width: number; height: number; depth: number }
  /** Escala que lleva el modelo a targetDimensions */
  scale?: number
  /** Cuánto se sube para que apoye en el suelo, en metros */
  groundOffset?: number
  credit: ModelCredit
}

// `satisfies` comprueba que cada entrada es un ModelEntry sin perder sus claves exactas: así
// modelsManifest.sofa existe para TypeScript y modelsManifest.sofá (mal escrito) da error
export const modelsManifest = {
  // Sofá para el rincón de lectura (pared b)
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

  // Repisa de pared con escuadras (sobre el sofá); su textura de madera también se usa en estanterías y rodapiés.
  // Caja original: 200 × 53.3 × 45.7 (tabla arriba, de Y = 45 a 53.3; cara de la pared en Z = +22.83)
  shelf: {
    url: shelfUrl,
    file: 'furniture/repisalarga.glb',
    credit: {
      title: 'RepisaLarga',
      author: 'EmpDevTeam',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/repisalarga-8b0bdc6ce8af46b5b7bf19599d34fd42',
    },
  },

  // Perfil de rodapié extruido (sin textura ni UV). Caja original: largo X 2939.8, alto Y 1548.5 (de -98.7 a 1449.8),
  // grueso Z 140.1 (cara de la pared en Z = +55.9, más grueso abajo)
  skirting: {
    url: skirtingUrl,
    file: 'other/wall_skirting_board.glb',
    credit: {
      title: 'wall skirting board',
      author: 'acaslavke',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/wall-skirting-board-3df08454597b4d438097bcb4678d5855',
    },
  },

  // Mueble bajo de almacenaje integrado en las estanterías de la pared a (302 triángulos)
  cabinet: {
    url: cabinetUrl,
    file: 'furniture/old_storage_cabinet.glb',
    credit: {
      title: 'Old Storage Cabinet',
      author: 'Daniyal Malik',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/old-storage-cabinet-feddab14991f4f368466fd6116161562',
    },
  },

  // Banco de jardín japonés de madera (rincón del jardín)
  gardenBench: {
    url: gardenBenchUrl,
    file: 'furniture/jap_bench.glb',
    credit: {
      title: 'Japanese Garden Bench',
      author: 'stasloveless',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/japanese-garden-bench-df71b965d0ba4a9596375133ac785e21',
    },
  },

  // Tiburón de peluche tumbado en la repisa de abajo, sobre el sofá
  plushieShark: {
    url: plushieSharkUrl,
    file: 'other/plushie_shark.glb',
    credit: {
      title: 'Plushie Shark',
      author: 'QuazrSCI',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/plushie-shark-875414d5e45c42f9a5323ba8a8beed19',
    },
  },

  // Fuente de piedra del jardín, frente a la ventana derecha
  fountain: {
    url: fountainUrl,
    file: 'other/fountain.glb',
    credit: {
      title: 'Fountain',
      author: 'yorre.detavernier',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/fountain-8580500134194ba5be3f6df7593049f2',
    },
  },

  // Cuatro farolillos japoneses de papel distintos (nodos 'paper lantern1' a 'paper lantern4'), con brillo propio
  paperLanterns: {
    url: paperLanternsUrl,
    file: 'other/japanese_paper_lanterns.glb',
    credit: {
      title: 'Japanese paper lanterns collection',
      author: 'patrakeevasveta',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/japanese-paper-lanterns-collection-484f311e91514be482f36234aad3934c',
    },
  },

  // Tramo de muro de piedra con un pilar en cada extremo (se repite alrededor de la casa y el jardín; texturas: ~100 MB)
  stoneWall: {
    url: stoneWallUrl,
    file: 'other/stone_wall.glb',
    credit: {
      title: 'Stone Wall | Low Poly | Game Ready',
      author: 'kEam',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/stone-wall-low-poly-game-ready-53b1128497e34d4b9766dcde10df230b',
    },
  },

  // Varias losas de piedra planas en una sola malla (se separan al cargar: losas del camino del jardín)
  elderStones: {
    url: elderStonesUrl,
    file: 'other/elder_stones.glb',
    credit: {
      title: 'Elder Stones',
      author: 'Cheyenne.Bockart',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/elder-stones-aa44e2d042e44238acd25c1a5e95b22c',
    },
  },

  // Guerrero (sacerdote caído) de pie en el jardín, junto al banco. Simplificado de 1,9 millones a ~221 000 triángulos (24 MB); sin Meshopt porque turnHead edita sus vértices
  warrior: {
    url: warriorUrl,
    file: 'other/warrior.glb',
    credit: {
      title: 'Corrupted Fallen Priest - Dark Fantasy',
      author: 'Pigcraft',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/corrupted-fallen-priest-dark-fantasy-1ab734d8c4464ae49d5b5091f3ea2afc',
    },
  },

  // Macetero de piedra junto al banco del jardín
  flowerPot: {
    url: flowerPotUrl,
    file: 'other/flower_pot.glb',
    credit: {
      title: 'Flower pot',
      author: 'Ryoce',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/flower-pot-ea1e03b01f8d45039d900e379f1f87d0',
    },
  },

  // Lámpara de pie entre los dos arcos del ventanal
  floorLamp: {
    url: floorLampUrl,
    file: 'furniture/floor_lamp.glb',
    credit: {
      title: 'Floor Lamp',
      author: 'bilgehan.korkmaz',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/floor-lamp-33eb258d9873435690254cfbb0ea46ec',
    },
  },

  // Chimenea en la pared del fondo (d), entre las estanterías y la pantalla de la biblioteca
  fireplace: {
    url: fireplaceUrl,
    file: 'furniture/fireplace.glb',
    credit: {
      title: 'Fireplace',
      author: 'Mark Bai',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6UUFs',
    },
  },

  // Gato de dibujos animados con animación (esqueleto y un ciclo de 0.83 s)
  toonCat: {
    url: toonCatUrl,
    file: 'other/toon_cat_free.glb',
    credit: {
      title: 'Toon Cat FREE',
      author: 'Omabuarts Studio',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6TKrP',
    },
  },

  // Gramófono de bocina sobre la repisa de la chimenea (trae una animación)
  gramophone: {
    url: gramophoneUrl,
    file: 'furniture/old_gramophone.glb',
    credit: {
      title: 'Old Gramophone',
      author: 'KIFIR',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/6WDvr',
    },
  },

  // Katana en su soporte, sobre las estanterías de la pared a
  katana: {
    url: katanaUrl,
    file: 'other/katana.glb',
    credit: {
      title: 'Katana',
      author: 'aneeqayounas',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/katana-b061754e94ce434cbe1396b3bb6d8abc',
    },
  },

  // Plano de césped de 4 × 4 m con material PBR; su material cubre el suelo del jardín (texturas pesadas: ~27 MB)
  grassGround: {
    url: grassGroundUrl,
    file: 'flowers/grass_texture.glb',
    credit: {
      title: 'Simple Grass Ground (Free Low Model)',
      author: 'Shun Koizumi',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/simple-grass-ground-free-low-model-758b5be71cd6427e9834d2968afff7c4',
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
      title: 'Coffee',
      author: 'Rosnandie Yikie',
      license: 'CC-BY-4.0',
      url: 'https://sketchfab.com/3d-models/coffee-963a9e5d288c42509886c5efd4fedd3c',
    },
  },

  // Colección de árboles realistas para el jardín exterior (7 árboles y arbustos separables por nodo)
  treesGarden: {
    url: treesGardenUrl,
    file: 'flowers/trees.glb',
    // Sin targetDimensions/scale/groundOffset: el jardín (Outside.tsx) mide el modelo y lo escala a una altura objetivo
    credit: {
      title: 'Realistic Trees Collection',
      author: 'Jungle Jim',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/pDzJR',
    },
  },

  // Lirios blancos de jardín
  lilies1: {
    url: lilies1Url,
    file: 'flowers/lilies1.glb',
    // Sin targetDimensions/scale/groundOffset: el jardín (Outside.tsx) mide el modelo y lo escala a una altura objetivo
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
    // Sin targetDimensions/scale/groundOffset: el jardín (Outside.tsx) mide el modelo y lo escala a una altura objetivo
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
    // Sin targetDimensions/scale/groundOffset: el jardín (Outside.tsx) mide el modelo y lo escala a una altura objetivo
    credit: {
      title: 'Spider Lily (Lycoris Radiata)',
      author: 'Osian CG',
      license: 'CC-BY-4.0',
      url: 'https://skfb.ly/oJJBW',
    },
  },
} satisfies Record<string, ModelEntry>

/** Nombre de cada modelo del manifiesto ('sofa' | 'coffeeTable' | …) */
export type ModelName = keyof typeof modelsManifest
