# Rincón de Lectura

Una sala de lectura en 3D interactiva que se puede recorrer desde el navegador: estanterías con tus libros físicos y digitales, un rincón con sofá y chimenea, un jardín tras el ventanal que sigue la hora solar y el tiempo meteorológico reales de tu ciudad, y una pantalla en la pared para gestionar toda tu colección.

**👉 Entra en [gameroom-library.vercel.app](https://gameroom-library.vercel.app)**: crea tu cuenta y tendrás tu propia sala.

Desarrollado con **React**, **Vite**, **React Three Fiber** (Three.js), **TypeScript** y **Supabase**.

Todas las funciones y controles detallados están explicados en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

---

## 🌟 Características principales

- **Salón en 3D interactivo**: camina en primera persona, explora las estanterías, siéntate junto al fuego, interactúa con la chimenea, la lámpara, las velas, el ventanal, el gramófono o acaricia al gato.
- **Cuentas y privacidad con Supabase**: registro e inicio de sesión seguros (Supabase Auth). Cada persona tiene su propia biblioteca independiente y privada gracias a reglas RLS (Row Level Security) en Postgres.
- **Gestión completa de la colección**: pantalla integrada en la pared para buscar libros, filtrar por estado (acabados, leyendo, sin leer), por formato (novela o manga) o etiquetas, marcar favoritos, cambiar estados en lote y localizar cualquier libro en la sala con una diana que lo ilumina.
- **Añadir y editar libros**: buscador por ISBN o título conectado a catálogos (Open Library y, con clave, Google Books) o formulario manual con subida de imagen de portada. Edita datos o elimina libros con facilidad.
- **Lector de libros digitales integrado**: añade tus propios archivos **EPUB** o **PDF** a cualquier libro desde su ficha. Se guardan solo en tu propio navegador (**IndexedDB**, hasta 300 MB por archivo), sin subirse a ningún servidor. Incluye cambio de página natural, subrayados con notas de colores y marcadores de página.
- **Diario de lecturas y retos**: fija tu reto de lectura anual, consulta tu calendario de lecturas con días coloreados, anota valoraciones (1 a 5 estrellas), reseñas y relecturas, y genera el resumen estadístico «✨ Ver mi año».
- **Tablero de corcho decorativo**: cuelga notas adhesivas de colores, pegatinas temáticas y frases favoritas de tus lecturas. Todo lo que pongas se refleja en el corcho 3D de la pared.
- **Modo concentración**: temporizador de lectura (10 a 60 min) con cuenta atrás, campana al finalizar y gato durmiendo junto al fuego durante la sesión.
- **Foto del rincón**: captura postal descargable de la vista 3D con sello y fecha.
- **Atmósfera viva**: la iluminación solar y el clima exterior (lluvia, nieve, tormenta, niebla) se sincronizan en directo con las coordenadas reales de la ciudad que elijas.

---

## 📁 Estructura del proyecto

```text
src/
├── assets/             # Texturas PBR, sonidos ambientales y modelos 3D (.glb)
├── components/         # Interfaz HTML:
│   ├── reader/         # Lector digital para EPUB y PDF (subrayados, notas y marcadores)
│   ├── AuthScreen.tsx  # Pantalla de registro, inicio de sesión y recuperación
│   ├── BookDashboard.tsx # Pantalla de la biblioteca en la pared (búsqueda, filtros, etc.)
│   ├── BookDetailPanel.tsx # Ficha del libro, subir/quitar EPUB o PDF, voltear y progreso
│   ├── BookViewer.tsx  # Visor 3D en primer plano para girar el libro y ver sinopsis
│   ├── BoardEditor.tsx # Editor del tablero de corcho (pósits, pegatinas y frases)
│   ├── DiaryPanel.tsx  # Panel del diario de lecturas, reto del año y resumen anual
│   ├── FocusTimer.tsx  # Temporizador del modo concentración
│   └── PhotoButton.tsx # Captura fotográfica de la sala en formato postal
├── data/               # Configuración de libros, estilos y manifiesto de modelos
├── hooks/              # Hooks de React (ambiente, ciclo solar, clima y texturas)
├── scene/              # Escena 3D (React Three Fiber):
│   ├── core/           # Cámara en primera persona, iluminación, colisiones y postprocesado
│   ├── room/           # Estructura: suelo, paredes, ventanal, puerta, techo y alfombra
│   ├── shelves/        # Estanterías y distribución inteligente de volúmenes
│   ├── books/          # Modelado 3D de lomos, libros y pantalla mural
│   ├── decor/          # Sofá, chimenea, gato con animaciones, gramófono, corcho y atrezo
│   └── garden/         # Jardín exterior: cielo dinámico, lluvia, nieve y farolillos
├── styles/             # Hojas de estilo CSS modulares
├── types.ts            # Definiciones de tipos TypeScript compartidos
└── utils/              # Clientes de API y utilidades:
    ├── supabase.ts     # Cliente y utilidades de Supabase
    ├── ebookStore.ts   # Almacén de archivos EPUB/PDF en el navegador (IndexedDB)
    ├── libraryApi.ts   # Sincronización de estado de la biblioteca en Supabase
    ├── readerApi.ts    # Lecturas, subrayados y marcadores en Supabase
    ├── diaryApi.ts     # Gestión del diario de lecturas en Supabase
    ├── catalogApi.ts   # Búsqueda, alta, edición y baja de libros
    └── weatherApi.ts   # Tiempo real de la ciudad (Open-Meteo)
supabase/
└── migrations/         # Migraciones SQL para Supabase (tablas, RLS y Storage)
server/                 # API local de npm run dev (por ahora, buscar y añadir libros)
scripts/                # Pruebas automáticas e importación a Supabase
docs/                   # Documentación detallada del proyecto
```

---

## 📜 Documentación y créditos

- **Funcionalidades detalladas**: manual completo con todo lo que puedes hacer en la sala, en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).
- **Créditos y licencias**: autorías y licencias de los modelos 3D y texturas utilizados, en [docs/CREDITS.md](docs/CREDITS.md).

Las portadas y los títulos de los libros pertenecen a sus respectivos autores y editoriales; se emplean con fines ilustrativos y de visualización de la biblioteca personal.
