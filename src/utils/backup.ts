// Copia de seguridad de la biblioteca de la cuenta: exportar todo a un archivo (con las portadas dentro) y volver a
// importarlo, en esta cuenta o en otra. Los PDF y EPUB no van: están en el navegador de cada persona.
// El formato y sus comprobaciones están en backupFormat.ts
import { currentUserId } from '@/utils/libraryApi'
import { check, supabase } from '@/utils/supabase'
import { BACKUP_COLUMNS, BACKUP_TABLES, BACKUP_VERSION, onlyNew, parseBackup } from '@/utils/backupFormat'
import type { Backup, BackupRow, BackupTable } from '@/utils/backupFormat'

// Filas que devuelve Supabase de cada vez (su máximo por petición)
const PAGE = 1000
// Portadas que se descargan a la vez al exportar
const PARALLEL_COVERS = 6
// Tamaño máximo del archivo que se importa (las portadas en base64 son la mayor parte: ~30 MB para 200 libros)
const MAX_BACKUP_BYTES = 300 * 1024 * 1024
const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const

// Todas las filas de la cuenta de una tabla, de PAGE en PAGE
async function selectAll(table: string, columns: string): Promise<BackupRow[]> {
  const rows: BackupRow[] = []
  for (let from = 0; ; from += PAGE) {
    const page = check(await supabase.from(table).select(columns).range(from, from + PAGE - 1)) as unknown as BackupRow[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

// Bytes ↔ base64 (en tandas: String.fromCharCode con millones de argumentos desborda la pila)
function toBase64(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const fromBase64 = (data: string) => Uint8Array.from(atob(data), (char) => char.charCodeAt(0))

/** Archivo con toda la biblioteca de la cuenta: libros, estado, subrayados, marcadores, diario, ajustes y portadas */
export async function exportLibrary(): Promise<Blob> {
  const tables = {} as Backup['tables']
  for (const table of BACKUP_TABLES) {
    const columns = table === 'books' ? [...BACKUP_COLUMNS.books, 'cover_path'] : BACKUP_COLUMNS[table]
    tables[table] = await selectAll(table, columns.join(', '))
  }
  // Portadas por su dirección pública, la misma que usa la sala: casi siempre están ya en la caché del navegador.
  // Varias a la vez (con una cola), que de una en una 200 portadas tardan más de un minuto
  const covers: Backup['covers'] = {}
  const queue = tables.books.flatMap((book) => {
    const path = book.cover_path as string | null
    delete book.cover_path
    return path ? [{ isbn: String(book.isbn), path }] : []
  })
  await Promise.all(
    Array.from({ length: PARALLEL_COVERS }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const response = await fetch(supabase.storage.from('covers').getPublicUrl(item.path).data.publicUrl)
        if (!response.ok) throw new Error(`No se pudo leer la portada de ${item.isbn} (${response.status})`)
        covers[item.isbn] = { extension: item.path.split('.').pop() as Backup['covers'][string]['extension'], data: toBase64(new Uint8Array(await response.arrayBuffer())) }
      }
    })
  )
  const backup: Backup = { app: 'fantasy-bookroom', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables, covers }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

/**
 * Importa una copia en la cuenta con la que se ha entrado. Los libros, su estado y los ajustes de la copia sustituyen a
 * los que ya hubiera con el mismo ISBN o la misma clave; los subrayados, marcadores y lecturas se añaden (sin repetir
 * los que ya estén). Devuelve cuántos libros y portadas ha importado.
 */
export async function importLibrary(file: File): Promise<{ books: number; covers: number }> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo es demasiado grande para ser una copia de seguridad')
  const backup = parseBackup(await file.text())
  const userId = await currentUserId()
  const own = (rows: BackupRow[]) => rows.map((row) => ({ ...row, user_id: userId }))

  // Portadas primero: los libros apuntan a ellas
  for (const [isbn, cover] of Object.entries(backup.covers)) {
    const upload = await supabase.storage.from('covers').upload(`${userId}/${isbn}.${cover.extension}`, fromBase64(cover.data), {
      contentType: CONTENT_TYPES[cover.extension],
      upsert: true,
    })
    if (upload.error) throw new Error(`No se pudo subir la portada de ${isbn}: ${upload.error.message}`)
  }
  const books = backup.tables.books.map((row) => {
    const cover = backup.covers[String(row.isbn)]
    return { ...row, user_id: userId, cover_path: cover ? `${userId}/${String(row.isbn)}.${cover.extension}` : null }
  })
  check(await supabase.from('books').upsert(books))
  check(await supabase.from('book_state').upsert(own(backup.tables.book_state)))
  check(await supabase.from('app_data').upsert(own(backup.tables.app_data)))
  for (const table of ['annotations', 'bookmarks', 'readings'] as const satisfies readonly BackupTable[]) {
    const fresh = onlyNew(await selectAll(table, 'isbn, created_at'), backup.tables[table])
    if (fresh.length) check(await supabase.from(table).insert(own(fresh)))
  }
  return { books: books.length, covers: Object.keys(backup.covers).length }
}
