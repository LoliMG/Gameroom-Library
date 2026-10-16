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
│   ├── Experience.jsx  # Luces y composición de la escena
│   └── SpinningBox.jsx # Cubo 3D con rotación en el eje Y
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
- **Azalea (`flowers/azalea.glb`)**: ["Rhododendron - Azalea ( Free download )"](https://skfb.ly/pzprt) por *Nestaeric*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirios blancos (`flowers/lilies1.glb`)**: ["Lilies"](https://skfb.ly/6V9YF) por *sligocreatures*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirios morados (`flowers/purple_lilies.glb`)**: ["Purple lilies"](https://skfb.ly/pBGwp) por *Chenchanchong*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Rosal en maceta (`flowers/rose_in_a_pot.glb`)**: ["Rose in a pot"](https://skfb.ly/6SDLR) por *Lassi Kaukonen*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirio asiático (`flowers/asiatic_lily.glb`)**: ["Asiatic Lily"](https://skfb.ly/oYLWL) por *local.yany*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Lirio de araña (`flowers/spider_lily.glb`)**: ["Spider Lily (Lycoris Radiata)"](https://skfb.ly/oJJBW) por *Osian CG*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

### Varios (Others)
- **Libro abierto (`other/book_open.glb`)**: ["Book Open"](https://skfb.ly/6pMGN) por *FlukierJupiter*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Libro vikingo / mágico (`other/viking_book.glb`)**: ["Viking book"](https://skfb.ly/6TqoO) por *katrin.kor*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).
- **Candelabro con vela (`other/candle.glb`)**: ["Copper candlestick"](https://skfb.ly/oMYp6) por *shuvalov.di*, licenciado bajo [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/).
- **Taza de café (`other/coffee.glb`)**: ["Coffee"](https://sketchfab.com/3d-models/coffee-963a9e5d288c42509886c5efd4fedd3c) por *Rosnandie Yikie*, licenciado bajo [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

## Créditos de texturas

- **Suelo de madera oscura (`src/assets/textures/floor/`)**: ["Dark Wooden Planks"](https://polyhaven.com/a/dark_wooden_planks) por *Poly Haven*, bajo licencia [CC0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/).



