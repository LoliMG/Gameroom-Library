import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
// API de la biblioteca (SQLite) servida por el propio servidor de desarrollo
import { libraryApiPlugin } from './server/library.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    libraryApiPlugin({
      dbFile: path.resolve(__dirname, 'data/bookroom.sqlite'),
      booksMetaFile: path.resolve(__dirname, 'src/data/booksMeta.json'),
    }),
  ],
  assetsInclude: ['**/*.glb'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
