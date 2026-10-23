# Rincón de Lectura

Una sala de lectura en 3D que se puede recorrer desde el navegador: estanterías con tus libros, un rincón con sofá y chimenea, un jardín tras el ventanal que sigue la hora y el tiempo reales de tu ciudad, y una pantalla en la pared para gestionar la colección.

Hecho con **React**, **Vite**, **React Three Fiber** (Three.js) y **TypeScript**.

Todo lo que se puede hacer dentro está explicado en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

## 🌐 Versión publicada

La web publicada en Vercel es una muestra: solo incluye la sala y no tiene servidor ni base de datos. Por eso:

- **Funciona**: pasear por la sala, mirar y ordenar los libros, la pantalla de la biblioteca (buscar, filtrar, favoritos, estados de lectura, lista de deseos, ajustes), los objetos interactivos, el corcho, el modo concentración, la foto del rincón y el cielo y el tiempo reales.
- **Se guarda solo en tu navegador**: lo que cambies (sitio de los libros, estados, corcho…) queda en ese navegador y nadie más lo ve. Si borras los datos del navegador, se pierde.
- **No está disponible**: leer libros (el lector), el diario de lecturas, añadir, editar o quitar libros, y escribir sinopsis. Todo eso necesita el servidor local (ver más abajo).

## 💻 Ejecutarlo en tu ordenador

Necesitas [Node.js](https://nodejs.org/) 22.18 o superior (los scripts ejecutan TypeScript directamente con Node).

```bash
npm install
```

```bash
npm run dev
```

En local, el propio servidor de Vite guarda la biblioteca en una base de datos SQLite (`data/bookroom.sqlite`), así que funcionan todas las funciones, incluidos el lector, el diario y añadir libros.

### Opcional

- **Libros electrónicos**: pon tus EPUB o PDF en una carpeta `ebooks/` (o en `pdfs/`) con el ISBN como nombre, por ejemplo `ebooks/9788467550030.epub`. Más detalles en [pdfs/README.md](pdfs/README.md).
- **Google Books**: para que la búsqueda de libros nuevos consulte también Google Books, crea un archivo `.env.local` con tu clave:

  ```bash
  GOOGLE_BOOKS_API_KEY=tu_clave
  ```

  Sin clave, la búsqueda usa solo Open Library.

> La base de datos, los libros electrónicos y `.env.local` son personales: están en `.gitignore` y no se suben al repositorio.

## 🚀 Publicarlo en Vercel

Importa el repositorio en Vercel. Detecta Vite solo, y los valores por defecto sirven:

- **Build command**: `npm run build`
- **Output directory**: `dist`

No hace falta configurar variables de entorno: la versión publicada no usa la clave de Google Books.

## 🛠️ Otros comandos

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run typecheck
```

```bash
npm run check
```

- `build`: compila la web en `dist/`.
- `preview`: sirve esa compilación en local para comprobarla antes de publicar.
- `typecheck`: comprueba los tipos de TypeScript (Vite ejecuta el código sin revisarlos).
- `check`: lanza las pruebas (colocación en estanterías, ciclo del día, diario y base de datos).

## 📁 Estructura de carpetas

```text
src/
├── assets/             # Imágenes, texturas, portadas, sonidos y modelos 3D
├── components/         # Interfaz HTML (paneles, lector, consola, corcho, botones)
├── data/               # Datos de los libros
├── hooks/              # Hooks de React (ambiente, tiempo, texturas)
├── scene/              # Todo lo que se pinta en 3D
│   ├── core/           # Escena, cámara en primera persona, luces, postprocesado y paleta
│   ├── room/           # Suelo, paredes, ventanal, puerta, techo, rodapiés y alfombra
│   ├── shelves/        # Estanterías y mueble bajo
│   ├── books/          # Libros y pantalla de la biblioteca
│   ├── decor/          # Sofá, chimenea, gato, gramófono, corcho, pósters y decoración
│   ├── garden/         # Jardín: cielo, colinas, lluvia, nieve y farolillos
│   └── shared/         # Piezas reutilizables
├── styles/             # Estilos CSS
├── utils/              # Funciones de apoyo y llamadas a la API
├── types.ts            # Tipos compartidos
├── App.tsx             # Montaje de la sala
└── main.tsx            # Punto de entrada
server/                 # API local (SQLite) que sirve el servidor de desarrollo de Vite
scripts/                # Pruebas y utilidades del catálogo
docs/                   # Documentación
```

## 📜 Documentación y créditos

- **Funcionalidades**: todo lo que se puede hacer en la sala, en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).
- **Catálogo de libros**: el listado completo de la colección, en [docs/BOOKS.md](docs/BOOKS.md).
- **Créditos**: autores, enlaces y licencias de los modelos 3D y las texturas, en [docs/CREDITS.md](docs/CREDITS.md).

Las portadas y los títulos de los libros pertenecen a sus autores y editoriales; se usan solo para mostrar la colección.
