import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
// API de la biblioteca (SQLite) servida por el propio servidor de desarrollo
import { libraryApiPlugin } from './server/library.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    libraryApiPlugin({
      dbFile: path.resolve(__dirname, 'data/bookroom.sqlite'),
      booksMetaFile: path.resolve(__dirname, 'src/data/booksMeta.json'),
      // Libros electrónicos para el lector: ebooks/<isbn>.epub o ebooks/<isbn>.pdf
      ebooksDir: path.resolve(__dirname, 'ebooks'),
      // Añadir libros desde la consola: portada en assets/covers y entrada en booksMeta.json e isbns.json.
      // Google Books solo se consulta con clave (GOOGLE_BOOKS_API_KEY en .env.local; sin ella su cuota es 0)
      catalog: {
        isbnsFile: path.resolve(__dirname, 'src/data/isbns.json'),
        coversDir: path.resolve(__dirname, 'src/assets/covers'),
        googleBooksKey: loadEnv(mode, __dirname, '').GOOGLE_BOOKS_API_KEY,
      },
    }),
  ],
  assetsInclude: ['**/*.glb'],
  // El lector carga epub.js y PDF.js solo al abrir un libro: se preparan al arrancar para que Vite no recargue la página
  // la primera vez que se abre uno
  optimizeDeps: {
    include: ['epubjs', 'pdfjs-dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
