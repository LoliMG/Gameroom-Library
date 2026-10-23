# Rincón de Lectura

Una sala de lectura en 3D interactiva que se puede recorrer desde el navegador: estanterías con tus libros físicos y digitales, un rincón con sofá y chimenea, un jardín tras el ventanal que sigue la hora solar y el tiempo meteorológico reales de tu ciudad, y una pantalla en la pared para gestionar toda tu colección.

Desarrollado con **React**, **Vite**, **React Three Fiber** (Three.js), **TypeScript** y **Supabase**.

Todas las funciones y controles detallados están explicados en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

---

## 🌟 Características principales

- **Salón en 3D interactivo**: camina en primera persona, explora las estanterías, siéntate junto al fuego, interactúa con la chimenea, la lámpara, las velas, el ventanal, el gramófono o acaricia al gato.
- **Cuentas y privacidad con Supabase**: registro e inicio de sesión seguros (Supabase Auth). Cada persona tiene su propia biblioteca independiente y privada gracias a reglas RLS (Row Level Security) en Postgres.
- **Gestión completa de la colección**: pantalla integrada en la pared para buscar libros, filtrar por estado (acabados, leyendo, sin leer), por formato (novela o manga) o etiquetas, marcar favoritos, cambiar estados en lote y localizar cualquier libro en la sala con una diana que lo ilumina.
- **Añadir y editar libros**: buscador por ISBN o título conectado a catálogos (Google Books y Open Library) o formulario manual con subida de imagen de portada. Edita datos o elimina libros con facilidad.
- **Lector de libros digitales integrado**: añade tus propios archivos **EPUB** o **PDF** a cualquier libro desde su ficha. Se guardan en tu propio navegador (**IndexedDB**), de forma privada y sin límites de servidor. Incluye cambio de página natural, subrayados con notas de colores y marcadores de página.
- **Diario de lecturas y retos**: fija tu reto de lectura anual, consulta tu calendario de lecturas con días coloreados, anota valoraciones (1 a 5 estrellas), reseñas y relecturas, y genera el resumen estadístico «✨ Ver mi año».
- **Tablero de corcho decorativo**: cuelga notas adhesivas de colores, pegatinas temáticas y frases favoritas de tus lecturas. Todo lo que pongas se refleja en el corcho 3D de la pared.
- **Modo concentración**: temporizador de lectura (10 a 60 min) con cuenta atrás, campana al finalizar y gato durmiendo junto al fuego durante la sesión.
- **Foto del rincón**: captura postal descargable de la vista 3D con sello y fecha.
- **Atmósfera viva**: la iluminación solar y el clima exterior (lluvia, nieve, tormenta, niebla) se sincronizan en directo con las coordenadas reales de la ciudad que elijas.

---

## 💻 Ejecutarlo en tu ordenador

Necesitas [Node.js](https://nodejs.org/) 22.18 o superior (compatible con TypeScript nativo para los scripts de comprobación).

1. **Instala las dependencias**:
   ```bash
   npm install
   ```

2. **Configura las variables de entorno**:
   Crea un archivo `.env.local` en la raíz del proyecto con la URL y la clave publicable de tu proyecto de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable-anon
   # Opcional: para ampliar las búsquedas de libros nuevos con Google Books
   GOOGLE_BOOKS_API_KEY=tu_clave_de_google_books
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre la dirección indicada en tu navegador. Si no has iniciado sesión, verás la pantalla de acceso donde puedes crear tu cuenta o iniciar sesión para entrar a tu sala.

---

## 🚀 Publicarlo en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com/).
2. Comprueba la configuración de compilación (detectada automáticamente para Vite):
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. En la sección **Environment Variables** de Vercel, añade:
   - `VITE_SUPABASE_URL`: la URL de tu proyecto de Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: tu clave publicable (*anon/publishable*) de Supabase.

Las reglas RLS de Supabase garantizan que ningún usuario pueda acceder a las bibliotecas o datos de otros usuarios, incluso usando la clave pública en el frontend.

---

## 🛠️ Comandos disponibles

```bash
# Servidor de desarrollo local
npm run dev

# Compilar para producción (en dist/)
npm run build

# Previsualizar la compilación de producción en local
npm run preview

# Comprobar tipos de TypeScript
npm run typecheck

# Ejecutar batería de comprobaciones automáticas (estanterías, colisiones, ciclo solar, diario y reglas RLS)
npm run check
```

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
    └── weatherApi.ts   # Integración con el clima y cálculo solar (Open-Meteo)
supabase/
└── migrations/         # Migraciones SQL para Supabase (tablas, RLS y Storage)
server/                 # Servidor de utilidades de catálogo y desarrollo
scripts/                # Pruebas automatizadas y herramientas de migración
docs/                   # Documentación detallada del proyecto
```

---

## 📜 Documentación y créditos

- **Funcionalidades detalladas**: manual completo con todo lo que puedes hacer en la sala, en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).
- **Créditos y licencias**: autorías y licencias de los modelos 3D y texturas utilizados, en [docs/CREDITS.md](docs/CREDITS.md).

Las portadas y los títulos de los libros pertenecen a sus respectivos autores y editoriales; se emplean con fines ilustrativos y de visualización de la biblioteca personal.
