// Formato de la copia de seguridad de una biblioteca (botones "Exportar" e "Importar" de los ajustes): un JSON con las
// filas de cada tabla de la cuenta y las portadas en base64. Sin Supabase ni navegador (lo prueba scripts/checkBackup.ts);
// lo usa src/utils/backup.ts.

export const BACKUP_VERSION = 1

// Columnas que se guardan y se vuelven a escribir de cada tabla: user_id e id no (al importar son los de la cuenta y
// los nuevos de la base de datos), cover_path tampoco (se calcula con la carpeta de la cuenta)
export const BACKUP_COLUMNS = {
  books: ['isbn', 'title', 'author', 'publisher', 'pages', 'saga', 'saga_index', 'format', 'type', 'synopsis', 'source', 'complete'],
  book_state: ['isbn', 'reading_status', 'flipped', 'wall', 'module', 'shelf', 'x', 'reading_position', 'reading_progress', 'read_at', 'current_page'],
  annotations: ['isbn', 'location', 'text', 'note', 'color', 'created_at'],
  bookmarks: ['isbn', 'location', 'label', 'created_at'],
  readings: ['isbn', 'start_date', 'end_date', 'rating', 'comment', 'created_at'],
  app_data: ['key', 'value'],
} as const

export type BackupTable = keyof typeof BACKUP_COLUMNS
export const BACKUP_TABLES = Object.keys(BACKUP_COLUMNS) as BackupTable[]
export type BackupRow = Record<string, unknown>

/** Copia de seguridad: filas por tabla y portadas por ISBN ({ extension, data en base64 }) */
export interface Backup {
  app: 'fantasy-bookroom'
  version: number
  exportedAt: string
  tables: Record<BackupTable, BackupRow[]>
  covers: Record<string, { extension: 'jpg' | 'png' | 'webp'; data: string }>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const ISBN = /^([0-9]{9}[0-9X]|[0-9]{13})$/
const COVER_EXTENSIONS = ['jpg', 'png', 'webp']

/** Solo las columnas conocidas de una fila (lo demás del archivo se ignora: no puede colar user_id ni otras columnas) */
export const pickColumns = (table: BackupTable, row: BackupRow): BackupRow =>
  Object.fromEntries(BACKUP_COLUMNS[table].filter((column) => column in row).map((column) => [column, row[column]]))

/**
 * Lee el texto de un archivo de copia y comprueba su forma. Lanza un error con un mensaje claro si no es una copia de
 * esta web o está rota. Los valores de cada columna los vuelve a comprobar la base de datos al importarlos.
 */
export function parseBackup(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es una copia de seguridad (no es JSON)')
  }
  if (!isPlainObject(json) || json.app !== 'fantasy-bookroom') throw new Error('El archivo no es una copia de seguridad de esta web')
  if (json.version !== BACKUP_VERSION) throw new Error(`Esta copia es de otra versión (${String(json.version)}) y no se puede importar`)
  if (!isPlainObject(json.tables) || !isPlainObject(json.covers)) throw new Error('La copia está incompleta')
  const tables = {} as Backup['tables']
  for (const table of BACKUP_TABLES) {
    const rows = json.tables[table] ?? []
    if (!Array.isArray(rows) || !rows.every(isPlainObject)) throw new Error(`La copia tiene datos rotos en "${table}"`)
    tables[table] = rows.map((row) => pickColumns(table, row))
  }
  if (!tables.books.every((row) => typeof row.isbn === 'string' && ISBN.test(row.isbn))) throw new Error('La copia tiene un libro con un ISBN no válido')
  const covers: Backup['covers'] = {}
  for (const [isbn, cover] of Object.entries(json.covers)) {
    if (!ISBN.test(isbn) || !isPlainObject(cover) || !COVER_EXTENSIONS.includes(cover.extension as string) || typeof cover.data !== 'string') {
      throw new Error(`La copia tiene una portada rota (${isbn})`)
    }
    covers[isbn] = { extension: cover.extension as Backup['covers'][string]['extension'], data: cover.data }
  }
  return { app: 'fantasy-bookroom', version: BACKUP_VERSION, exportedAt: String(json.exportedAt ?? ''), tables, covers }
}

/**
 * Filas de subrayados, marcadores o lecturas que aún no están en la cuenta (por libro y fecha de creación): así importar
 * dos veces la misma copia no las duplica
 */
export function onlyNew(existing: BackupRow[], incoming: BackupRow[]): BackupRow[] {
  const key = (row: BackupRow) => `${String(row.isbn)}|${new Date(String(row.created_at)).getTime()}`
  const seen = new Set(existing.map(key))
  return incoming.filter((row) => !seen.has(key(row)))
}
