# Rincón de Lectura

Proyecto interactivo 3D desarrollado con **React**, **Vite** y **React Three Fiber (R3F)**. Proporciona una base limpia y modular para construir una experiencia de lectura inmersiva en tres dimensiones con Three.js.

## Instalación

Instala las dependencias del proyecto ejecutando:

```bash
npm install
```

## Ejecución

Para iniciar el servidor de desarrollo local:

```bash
npm run dev
```

Para compilar la aplicación para producción:

```bash
npm run build
```

Para previsualizar la compilación de producción localmente:

```bash
npm run preview
```

## Estructura de Carpetas

```text
src/
├── assets/             # Imágenes, texturas y modelos 3D
├── components/         # Componentes de interfaz HTML (paneles, botones)
├── data/               # Datos de la aplicación (libros, catálogo)
├── hooks/              # Hooks personalizados de React
├── scene/              # Todo lo que se renderiza dentro del <Canvas>
│   ├── core/           # Composición de la escena, cámara en primera persona, luces, postprocesado y paleta
│   ├── room/           # Estructura de la sala: suelo y paredes, ventanal, puerta, techo, rodapiés, alfombra
│   ├── shelves/        # Estanterías de la pared a y mueble bajo empotrado
│   ├── books/          # Libros (lomos y contraportadas generados) y pantalla de la biblioteca
│   ├── decor/          # Rincón de lectura y decoración: sofá, repisas, velas, figuras, plantas
│   ├── garden/         # Jardín al atardecer: cielo, colinas, muro, fuente, banco, farolillos
│   └── shared/         # Piezas reutilizables para repetir modelos y geometrías (instanciado)
├── styles/             # Estilos CSS globales
│   └── global.css      # Reset mínimo para visualización a pantalla completa
├── App.jsx             # Montaje del <Canvas> y la escena
└── main.jsx            # Punto de entrada de la aplicación
```

## Créditos de modelos 3D

Los siguientes modelos 3D en formato `.glb` se encuentran en `src/assets/models/` y están licenciados bajo **Creative Commons Attribution (CC-BY 4.0)**:

### Mobiliario (Furniture)
- **Sofa (`furniture/sofa.glb`)**: ["Sofa_03_diff.png-sofa_03_opacity"](https://skfb.ly/pLRTo) por *adamdmaxadam*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Mesa de café (`furniture/table.glb`)**: ["Marquetry table"](https://skfb.ly/pMANs) por *Virtual Museums of Małopolska*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Alfombra (`furniture/rug.glb`)**: ["Rug with Tassles"](https://skfb.ly/p8AuF) por *Diligence7540*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Ventanal (`furniture/window.glb`)**: ["Window matal - 7MB"](https://skfb.ly/oXZqW) por *Mehdi Shahsavan*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Puerta de madera antigua (`furniture/door.glb`)**: ["Door_Wooden_Old -9MB"](https://skfb.ly/oVRQx) por *Mehdi Shahsavan*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

### Vegetación y Flores (Flowers)
- **Colección de árboles (`flowers/trees.glb`)**: ["Realistic Trees Collection"](https://skfb.ly/pDzJR) por *Jungle Jim*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirios blancos (`flowers/lilies1.glb`)**: ["Lilies"](https://skfb.ly/6V9YF) por *sligocreatures*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirios morados (`flowers/purple_lilies.glb`)**: ["Purple lilies"](https://skfb.ly/pBGwp) por *Chenchanchong*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Rosal en maceta (`flowers/rose_in_a_pot.glb`)**: ["Rose in a pot"](https://skfb.ly/6SDLR) por *Lassi Kaukonen*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirio de araña (`flowers/spider_lily.glb`)**: ["Spider Lily (Lycoris Radiata)"](https://skfb.ly/oJJBW) por *Osian CG*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

### Varios (Others)
- **Libro abierto (`other/book_open.glb`)**: ["Book Open"](https://skfb.ly/6pMGN) por *FlukierJupiter*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Candelabro con vela (`other/candle.glb`)**: ["Copper candlestick"](https://skfb.ly/oMYp6) por *shuvalov.di*, licenciado bajo [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/).
- **Taza de café (`other/coffee.glb`)**: ["Coffee"](https://sketchfab.com/3d-models/coffee-963a9e5d288c42509886c5efd4fedd3c) por *Rosnandie Yikie*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Repisa de pared (`furniture/repisalarga.glb`)**: ["RepisaLarga"](https://sketchfab.com/3d-models/repisalarga-8b0bdc6ce8af46b5b7bf19599d34fd42) por *EmpDevTeam*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Rodapié (`other/wall_skirting_board.glb`)**: ["wall skirting board"](https://sketchfab.com/3d-models/wall-skirting-board-3df08454597b4d438097bcb4678d5855) por *acaslavke*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Mueble de almacenaje (`furniture/old_storage_cabinet.glb`)**: ["Old Storage Cabinet"](https://sketchfab.com/3d-models/old-storage-cabinet-feddab14991f4f368466fd6116161562) por *Daniyal Malik*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Hiedra colgante (`flowers/ivy.glb`)**: ["ivy"](https://sketchfab.com/3d-models/ivy-b4b0419ec9ac4a71ae454145dbc88037) por *heyyodd*, licenciado bajo [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) (uso no comercial).
- **Ponyta (`other/ponyta.glb`)**: ["Ponyta - Pokemon"](https://sketchfab.com/3d-models/ponyta-pokemon-e4e73f5a6b174e2d8fa957d7b720c7aa) por *Locur*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Figura de Bakugo (`furniture/bakugo.glb`)**: ["Bakugo - My Hero Ultra Rumble"](https://sketchfab.com/3d-models/bakugo-my-hero-ultra-rumble-6e150076998047e185825153361400e0) por *Ye ye AI sh1t*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Césped del jardín (`flowers/grass_texture.glb`)**: ["Simple Grass Ground (Free Low Model)"](https://sketchfab.com/3d-models/simple-grass-ground-free-low-model-758b5be71cd6427e9834d2968afff7c4) por *Shun Koizumi*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Banco del jardín (`furniture/jap_bench.glb`)**: ["Japanese Garden Bench"](https://sketchfab.com/3d-models/japanese-garden-bench-df71b965d0ba4a9596375133ac785e21) por *stasloveless*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Tiburón de peluche (`other/plushie_shark.glb`)**: ["Plushie Shark"](https://sketchfab.com/3d-models/plushie-shark-875414d5e45c42f9a5323ba8a8beed19) por *QuazrSCI*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Cojín pez (`other/pillow_fish.glb`)**: ["pillow fish"](https://sketchfab.com/3d-models/pillow-fish-40dc80cd0bbd4cf68f5ece871ceebbf0) por *bintangprabulukita*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Fuente del jardín (`other/fountain.glb`)**: ["Fountain"](https://sketchfab.com/3d-models/fountain-8580500134194ba5be3f6df7593049f2) por *yorre.detavernier*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Farolillos del jardín (`other/japanese_paper_lanterns.glb`)**: ["Japanese paper lanterns collection"](https://sketchfab.com/3d-models/japanese-paper-lanterns-collection-484f311e91514be482f36234aad3934c) por *patrakeevasveta*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Muro del jardín (`other/stone_wall.glb`)**: ["Stone Wall | Low Poly | Game Ready"](https://sketchfab.com/3d-models/stone-wall-low-poly-game-ready-53b1128497e34d4b9766dcde10df230b) por *kEam*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Losas del camino (`other/elder_stones.glb`)**: ["Elder Stones"](https://sketchfab.com/3d-models/elder-stones-aa44e2d042e44238acd25c1a5e95b22c) por *Cheyenne.Bockart*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Guerrero del jardín (`other/warrior.glb`)**: ["Corrupted Fallen Priest - Dark Fantasy"](https://sketchfab.com/3d-models/corrupted-fallen-priest-dark-fantasy-1ab734d8c4464ae49d5b5091f3ea2afc) por *Pigcraft*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Macetero del jardín (`other/flower_pot.glb`)**: ["Flower pot"](https://sketchfab.com/3d-models/flower-pot-ea1e03b01f8d45039d900e379f1f87d0) por *Ryoce*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Katana (`other/katana.glb`)**: ["Katana"](https://sketchfab.com/3d-models/katana-b061754e94ce434cbe1396b3bb6d8abc) por *aneeqayounas*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

## Créditos de texturas

- **Suelo de madera oscura (`src/assets/textures/floor/`)**: ["Dark Wooden Planks"](https://polyhaven.com/a/dark_wooden_planks) por *Poly Haven*, bajo licencia [CC0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/).



