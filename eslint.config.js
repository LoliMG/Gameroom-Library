import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    // El código es TypeScript; este archivo de configuración sigue en JavaScript
    files: ['**/*.{js,ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // TypeScript: su analizador y sus reglas recomendadas (las comprobaciones de tipos las hace npm run typecheck)
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    // Servidor y scripts se ejecutan en Node: sus variables globales son las de Node (process, Buffer…)
    files: ['server/**', 'scripts/**', 'vite.config.*'],
    languageOptions: { globals: globals.node },
  },
])
