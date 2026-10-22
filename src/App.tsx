import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Contenedor Canvas de React Three Fiber y su gestor de eventos de puntero por defecto
import { Canvas, events as createPointerEvents } from '@react-three/fiber'
import type { CanvasProps } from '@react-three/fiber'
// Tipos compartidos: libro, estado de la biblioteca, estado de lectura y formato de libro electrónico
import type { Book, EbookFormat, LibraryState, Reading, ReadingStatus } from '@/types'
import { FAVORITE_TAG, MAX_POSTERS } from '@/types'
import type { CollectionTools } from '@/components/BookDashboard'
// Importación de la experiencia principal utilizando el alias "@"
import Experience from '@/scene/core/Experience'
// Importación del panel de detalle HTML mediante el alias "@"
import BookDetailPanel from '@/components/BookDetailPanel'
// Botón para capturar el ratón, mirilla y ayuda de controles
import PlayControls from '@/components/PlayControls'
import FocusTimer from '@/components/FocusTimer'
// Estado de la biblioteca guardado en la base de datos (con copia en el navegador)
import { loadLibrary, saveLibraryPart } from '@/utils/libraryApi'
// Qué libros tienen libro electrónico para el lector
import { fetchEbooks, fetchProgress, saveCurrentPage } from '@/utils/readerApi'
import { createReading, fetchReadings, updateReading } from '@/utils/diaryApi'
import { todayIso } from '@/utils/readingCalendar'
import books from '@/data/books'

// Lector de libros electrónicos: se carga solo al abrir un libro (epub.js y PDF.js pesan bastante)
const BookReader = lazy(() => import('@/components/reader/BookReader'))

// Campo de visión vertical de la cámara (grados); la posición la fija FirstPersonControls
const CAMERA_FOV = 60

// Color de fondo oscuro y cálido para envolver la habitación y crear atmósfera nocturna/acogedora
const BACKGROUND_COLOR = '#171413'

// Eventos de puntero de R3F con un cambio: con el ratón capturado, el clic apunta al centro (la mirilla)
// en vez de a la última posición del cursor, que deja de moverse mientras está capturado.
// Su tipo es el de la propiedad "events" de <Canvas> (NonNullable: sin el undefined de las propiedades opcionales)
const centerPointerWhenLocked: NonNullable<CanvasProps['events']> = (store) => {
  return {
    ...createPointerEvents(store),
    compute(event, state) {
      if (document.pointerLockElement) state.pointer.set(0, 0)
      else state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },
  }
}

/**
 * Sala con la biblioteca ya cargada. library: { placements, flipped, readingStatus, tags, wishlist, settings } (ver libraryApi)
 */
function Bookroom({ library }: { library: LibraryState }) {
  // useState define el estado selectedBook que guarda el libro pulsado o null si no hay ninguno activo
  // (useState<Tipo>: TypeScript no puede deducirlo de null, así que se le dice qué puede guardar)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  // Libros con libro electrónico ({ isbn: 'epub' | 'pdf' }) y libro que se está leyendo
  const [ebooks, setEbooks] = useState<Record<string, EbookFormat>>({})
  const [readingBook, setReadingBook] = useState<Book | null>(null)
  // Modo concentración (el temporizador de los controles): mientras dura, el gato duerme junto a la chimenea
  const [focus, setFocus] = useState(false)
  // Cuánto se lleva de cada libro electrónico y el último leído (los pone al día el lector al pasar de página)
  // Y la página escrita a mano en el panel de los libros que se están leyendo
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [pages, setPages] = useState<Record<string, number>>({})
  const [lastRead, setLastRead] = useState<string | null>(null)
  useEffect(() => {
    fetchEbooks().then(setEbooks)
    fetchProgress().then((saved) => {
      setProgress(saved.progress)
      setPages(saved.pages)
      setLastRead(saved.lastRead)
    })
  }, [])
  // Página escrita en el panel: se guarda y, si se sabe cuántas tiene el libro, mueve su cinta
  const setCurrentPage = (book: Book, page: number) => {
    setPages((all) => ({ ...all, [book.isbn]: page }))
    if (book.pages) setProgress((all) => ({ ...all, [book.isbn]: page / book.pages! }))
    saveCurrentPage(book.isbn, page).catch((error: Error) => console.warn('[lector] No se pudo guardar la página:', error.message))
  }
  // ISBN de los libros puestos de frente (botón de volteo del panel)
  const [flippedIsbns, setFlippedIsbns] = useState(library.flipped)
  const flippedSet = useMemo(() => new Set(flippedIsbns), [flippedIsbns])
  useEffect(() => {
    saveLibraryPart('flipped', flippedIsbns)
  }, [flippedIsbns])
  const toggleFlip = (isbn: string) =>
    setFlippedIsbns((list) => (list.includes(isbn) ? list.filter((item) => item !== isbn) : [...list, isbn]))

  // Estado de lectura por ISBN ('finished' | 'reading'; sin entrada = sin leer), desde la pantalla de la biblioteca
  const [readingStatus, setReadingStatus] = useState(library.readingStatus)
  useEffect(() => {
    saveLibraryPart('readingStatus', readingStatus)
  }, [readingStatus])
  // Cambia el estado de lectura de uno o varios libros (pantalla de la biblioteca)
  const setStatuses = (isbns: string[], status: ReadingStatus) =>
    setReadingStatus((all) => ({ ...all, ...Object.fromEntries(isbns.map((isbn) => [isbn, status])) }))
  // Libro que se está leyendo (va a la mesa de café): el último abierto en el lector, si no está marcado como acabado
  const currentBook = books.find((book) => book.isbn === lastRead && readingStatus[book.isbn] !== 'finished' && ebooks[book.isbn]) ?? null

  // Etiquetas por ISBN, lista de deseos y ajustes (los cambia la consola; se guardan como el resto)
  const [tags, setTags] = useState(library.tags)
  const [wishlist, setWishlist] = useState(library.wishlist)
  const [settings, setSettings] = useState(library.settings)
  const [goals, setGoals] = useState(library.goals)
  useEffect(() => {
    saveLibraryPart('tags', tags)
  }, [tags])
  useEffect(() => {
    saveLibraryPart('wishlist', wishlist)
  }, [wishlist])
  useEffect(() => {
    saveLibraryPart('settings', settings)
  }, [settings])
  useEffect(() => {
    saveLibraryPart('goals', goals)
  }, [goals])
  // Favoritos colgados sobre la chimenea (al colgar uno más de los que caben, se descuelga el más antiguo); solo cuentan
  // los que siguen siendo favoritos
  const [posters, setPosters] = useState(library.posters)
  useEffect(() => {
    saveLibraryPart('posters', posters)
  }, [posters])
  const togglePoster = (isbn: string) =>
    setPosters((list) => (list.includes(isbn) ? list.filter((item) => item !== isbn) : [...list, isbn].slice(-MAX_POSTERS)))
  const posterBooks = posters
    .filter((isbn) => tags[isbn]?.includes(FAVORITE_TAG))
    .map((isbn) => books.find((book) => book.isbn === isbn))
    .filter((book): book is Book => book !== undefined)

  // Diario de lecturas (null = cargando): lo usan la consola, los libros terminados del año en la sala y "¡Terminado!"
  const [readings, setReadings] = useState<Reading[] | null>(null)
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const loadReadings = useCallback(() => {
    fetchReadings()
      .then((list) => {
        setReadings(list)
        setReadingsError(null)
      })
      .catch((error: Error) => setReadingsError(`No se pudo cargar el diario: ${error.message}`))
  }, [])
  useEffect(loadReadings, [loadReadings])
  // "¡Terminado!": el libro pasa a leído y su lectura se apunta en el diario con la fecha de hoy (cierra la que esté en
  // curso o, si no hay ninguna, añade una)
  const finishBook = async (isbn: string) => {
    setStatuses([isbn], 'finished')
    const open = readings?.find((reading) => reading.isbn === isbn && !reading.endDate)
    const endDate = todayIso()
    try {
      if (open) await updateReading(open.id, { startDate: open.startDate, endDate, rating: open.rating, comment: open.comment })
      else await createReading({ isbn, startDate: null, endDate, rating: null, comment: null })
      loadReadings()
    } catch (error) {
      console.warn('[diario] No se pudo apuntar la lectura terminada:', (error as Error).message)
    }
  }
  const collection: CollectionTools = {
    tags,
    onSetTags: (isbn, list) =>
      setTags((all) => {
        const next = { ...all }
        if (list.length > 0) next[isbn] = list
        else delete next[isbn]
        return next
      }),
    wishlist,
    onSetWishlist: setWishlist,
    settings,
    onSetSettings: setSettings,
    goals,
    onSetGoal: (year, count) => setGoals((all) => ({ ...all, [year]: count })),
    readings,
    readingsError,
    onReadingsChange: loadReadings,
  }

  // Lienzo WebGL, necesario para capturar el ratón desde el botón HTML
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Al abrir un libro se suelta el ratón para poder usar el panel
  const handleSelectBook = (book: Book | null) => {
    if (document.pointerLockElement) document.exitPointerLock()
    setSelectedBook(book)
  }

  return (
    <>
      {/* Lienzo WebGL a pantalla completa (100vw x 100vh) sin márgenes ni scroll */}
      <Canvas
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
        camera={{ fov: CAMERA_FOV }}
        events={centerPointerWhenLocked}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
        }}
        // shadows: habilita el cálculo y renderizado de mapas de sombras en el motor WebGL de Three.js
        shadows
      >
        {/* Color de fondo oscuro y cálido acoplado directamente al fondo de la escena WebGL */}
        <color attach="background" args={[BACKGROUND_COLOR]} />

        {/* Renderizado de la escena principal pasando el manejador de selección de libros */}
        <Experience
          onSelectBook={handleSelectBook}
          flippedIsbns={flippedSet}
          readingStatus={readingStatus}
          onSetStatus={setStatuses}
          savedPlacements={library.placements}
          onSavePlacements={(slots: LibraryState['placements']) => saveLibraryPart('placements', slots)}
          collection={collection}
          progress={progress}
          currentBook={currentBook}
          onReadBook={setReadingBook}
          reading={readingBook !== null}
          focus={focus}
          posters={posterBooks}
        />
      </Canvas>

      {/* Controles de juego: HTML fuera del Canvas, por encima del lienzo */}
      {/* Algunos visores (iframes sin permiso) rechazan la captura: se avisa y se sigue con arrastrar para mirar */}
      <PlayControls
        onLock={() =>
          canvasRef.current
            ?.requestPointerLock()
            ?.catch((error: Error) => console.warn('[PlayControls] No se pudo bloquear la cámara:', error.message))
        }
      >
        <FocusTimer sound={settings.sound} onFocusChange={setFocus} />
      </PlayControls>

      {/* BookDetailPanel se coloca fuera del <Canvas> como hermano suyo porque es un componente HTML tradicional; */}
      {/* los elementos HTML (div, img, button) no pueden procesarse dentro del contexto WebGL de Three.js. */}
      {/* Al estar fuera en el árbol DOM, se renderiza por encima del lienzo 3D mediante CSS con position: fixed y z-index. */}
      {/* Mientras se lee, el panel se oculta (y vuelve al cerrar el lector) */}
      <BookDetailPanel
        book={readingBook ? null : selectedBook}
        onClose={() => setSelectedBook(null)}
        flipped={selectedBook ? flippedSet.has(selectedBook.isbn) : false}
        onToggleFlip={() => selectedBook && toggleFlip(selectedBook.isbn)}
        ebookFormat={selectedBook ? ebooks[selectedBook.isbn] : undefined}
        onRead={() => setReadingBook(selectedBook)}
        status={selectedBook ? (readingStatus[selectedBook.isbn] ?? 'unread') : 'unread'}
        currentPage={selectedBook ? pages[selectedBook.isbn] : undefined}
        onSetPage={(page) => selectedBook && setCurrentPage(selectedBook, page)}
        onFinish={() => selectedBook && finishBook(selectedBook.isbn)}
        favorite={selectedBook ? Boolean(tags[selectedBook.isbn]?.includes(FAVORITE_TAG)) : false}
        posterOn={selectedBook ? posterBooks.some((book) => book.isbn === selectedBook.isbn) : false}
        onTogglePoster={() => selectedBook && togglePoster(selectedBook.isbn)}
      />

      {readingBook && (
        <Suspense fallback={<p className="app-loading reader-loading">Abriendo el lector…</p>}>
          <BookReader
            book={readingBook}
            format={ebooks[readingBook.isbn]}
            onClose={() => setReadingBook(null)}
            onProgress={(value) => {
              setProgress((all) => ({ ...all, [readingBook.isbn]: value }))
              setLastRead(readingBook.isbn)
            }}
          />
        </Suspense>
      )}
    </>
  )
}

// Carga la biblioteca (base de datos o copia del navegador) antes de montar la sala: así nunca se guarda
// el estado vacío por encima del guardado
function App() {
  const [library, setLibrary] = useState<LibraryState | null>(null)
  useEffect(() => {
    loadLibrary().then(setLibrary)
  }, [])
  if (!library) return <p className="app-loading">Abriendo la biblioteca…</p>
  return <Bookroom library={library} />
}

export default App
