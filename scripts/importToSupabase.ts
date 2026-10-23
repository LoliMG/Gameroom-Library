// Importa la biblioteca local (data/bookroom.sqlite, src/data/booksMeta.json y src/assets/covers/) a una cuenta de
// Supabase. Solo lee los archivos locales: no cambia nada en ellos.
//
//   node scripts/importToSupabase.ts <correo>             importa (pide la contraseña de esa cuenta, sin mostrarla)
//   node scripts/importToSupabase.ts <correo> --dry-run   solo cuenta lo que se importaría, sin conectarse
//
// Se puede repetir sin duplicar: libros, estado, datos de la sala y portadas se sobrescriben; subrayados, marcadores
// y diario solo se suben si la cuenta aún no tiene ninguno. Al final comprueba que en la cuenta está todo.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createClient } from '@supabase/supabase-js'
import type { BookMeta } from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const DB_FILE = path.join(ROOT, 'data/bookroom.sqlite')
const BOOKS_META_FILE = path.join(ROOT, 'src/data/booksMeta.json')
const COVERS_DIR = path.join(ROOT, 'src/assets/covers')
const COVER_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

const [email, flag] = process.argv.slice(2)
const dryRun = flag === '--dry-run'
if (!email?.includes('@')) {
  console.error('Uso: node scripts/importToSupabase.ts <correo> [--dry-run]')
  process.exit(1)
}

// Fecha de SQLite ('AAAA-MM-DD HH:MM:SS', en UTC) → ISO que entiende Postgres
const sqliteDate = (value: string | null) => (value ? `${value.replace(' ', 'T')}Z` : null)
const json = (value: string | null) => (value ? JSON.parse(value) : null)

// --- Lo que hay en local ---
const local = new DatabaseSync(DB_FILE, { readOnly: true })
// Filas de cada tabla tal como las guarda server/library.ts (fechas y JSON como texto, booleanos como 0/1)
const all = <T>(sql: string) => local.prepare(sql).all() as T[]
type StateRow = {
  isbn: string
  reading_status: string
  flipped: number
  wall: string | null
  module: number | null
  shelf: number | null
  x: number | null
  reading_position: string | null
  reading_progress: number | null
  read_at: string | null
  current_page: number | null
}
type AnnotationRow = { isbn: string; location: string; text: string; note: string | null; color: string; created_at: string }
type BookmarkRow = { isbn: string; location: string; label: string; created_at: string }
type ReadingRow = { isbn: string; start_date: string | null; end_date: string | null; rating: number | null; comment: string | null; created_at: string }
const booksMeta = JSON.parse(fs.readFileSync(BOOKS_META_FILE, 'utf8')) as BookMeta[]
const coverFiles = new Map(fs.readdirSync(COVERS_DIR).map((file) => [file.split('.')[0], file]))

function rows(userId: string) {
  const isbns = new Set(booksMeta.map((book) => book.isbn))
  const ofKnownBook = (row: { isbn: string }) => isbns.has(row.isbn)
  return {
    books: booksMeta.map((book) => {
      const cover = coverFiles.get(book.isbn)
      return {
        user_id: userId,
        isbn: book.isbn,
        title: book.title ?? null,
        author: book.author ?? null,
        publisher: book.publisher ?? null,
        pages: book.pages ?? null,
        saga: book.saga ?? null,
        saga_index: book.saga_index ?? null,
        // 'pocket' es el nombre antiguo de 'bolsillo'
        format: book.format === 'pocket' ? 'bolsillo' : (book.format ?? 'book'),
        type: book.type ?? null,
        synopsis: book.synopsis ?? null,
        source: book.source ?? null,
        complete: book.complete ?? false,
        cover_path: cover ? `${userId}/${cover}` : null,
      }
    }),
    book_state: all<StateRow>('SELECT * FROM book_state').filter(ofKnownBook).map((row) => ({
      user_id: userId,
      isbn: row.isbn,
      reading_status: row.reading_status,
      flipped: row.flipped === 1,
      wall: row.wall,
      module: row.module,
      shelf: row.shelf,
      x: row.x,
      reading_position: json(row.reading_position),
      reading_progress: row.reading_progress,
      read_at: sqliteDate(row.read_at),
      current_page: row.current_page,
    })),
    app_data: all<{ key: string; value: string }>('SELECT * FROM app_data').map((row) => ({ user_id: userId, key: row.key, value: JSON.parse(row.value) })),
    annotations: all<AnnotationRow>('SELECT * FROM annotations ORDER BY id').filter(ofKnownBook).map((row) => ({
      user_id: userId,
      isbn: row.isbn,
      location: JSON.parse(row.location),
      text: row.text,
      note: row.note,
      color: row.color,
      created_at: sqliteDate(row.created_at),
    })),
    bookmarks: all<BookmarkRow>('SELECT * FROM bookmarks ORDER BY id').filter(ofKnownBook).map((row) => ({
      user_id: userId,
      isbn: row.isbn,
      location: JSON.parse(row.location),
      label: row.label,
      created_at: sqliteDate(row.created_at),
    })),
    readings: all<ReadingRow>('SELECT * FROM readings ORDER BY id').filter(ofKnownBook).map((row) => ({
      user_id: userId,
      isbn: row.isbn,
      start_date: row.start_date,
      end_date: row.end_date,
      rating: row.rating,
      comment: row.comment,
      created_at: sqliteDate(row.created_at),
    })),
  }
}

const unusedCovers = [...coverFiles.keys()].filter((isbn) => !booksMeta.some((book) => book.isbn === isbn))
if (unusedCovers.length) console.log(`Portadas sin libro en booksMeta.json (no se suben): ${unusedCovers.join(', ')}`)

if (dryRun) {
  const preview = rows('<id de la cuenta>')
  for (const [table, list] of Object.entries(preview)) console.log(`${table}: ${list.length}`)
  console.log(`portadas: ${preview.books.filter((book) => book.cover_path).length}`)
  console.log('Primer libro:', preview.books[0])
  console.log('Primer estado:', preview.book_state[0])
  process.exit(0)
}

// Contraseña sin mostrarla en pantalla (ni guardarla en el historial de la terminal)
function askPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      console.error('Ejecuta el script en una terminal: hace falta para escribir la contraseña sin que se vea.')
      process.exit(1)
    }
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    let password = ''
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') process.exit(1) // Ctrl + C
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(password)
        }
        password = char === '\u007f' || char === '\b' ? password.slice(0, -1) : password + char
      }
    }
    process.stdin.on('data', onData)
  })
}

process.loadEnvFile(path.join(ROOT, '.env.local'))
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password: await askPassword(`Contraseña de ${email}: `) })
if (signInError) {
  console.error('No se ha podido entrar:', signInError.message)
  process.exit(1)
}
const userId = signIn.user.id
const data = rows(userId)

// Corta el script al primer error (con lo ya subido, se puede volver a ejecutar sin duplicar)
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) {
    console.error(`Error al subir ${what}:`, result.error.message)
    process.exit(1)
  }
  return result.data
}

// Libros antes que su estado (el estado cuelga del libro)
check(await supabase.from('books').upsert(data.books), 'libros')
check(await supabase.from('book_state').upsert(data.book_state), 'estado de los libros')
check(await supabase.from('app_data').upsert(data.app_data), 'datos de la sala')
for (const table of ['annotations', 'bookmarks', 'readings'] as const) {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (count) console.log(`${table}: la cuenta ya tiene ${count}, no se vuelven a subir`)
  else if (data[table].length) check(await supabase.from(table).insert(data[table] as object[]), table)
}

let uploaded = 0
for (const book of data.books) {
  if (!book.cover_path) continue
  const file = coverFiles.get(book.isbn)!
  const result = await supabase.storage
    .from('covers')
    .upload(book.cover_path, fs.readFileSync(path.join(COVERS_DIR, file)), { contentType: COVER_TYPES[file.split('.').pop()!.toLowerCase()], upsert: true })
  check(result, `la portada ${file}`)
  uploaded++
  if (uploaded % 25 === 0) console.log(`Portadas subidas: ${uploaded}`)
}

// Comprobación final: lo que hay en la cuenta frente a lo que había en local
const { data: stored } = await supabase.storage.from('covers').list(userId, { limit: 1000 })
let ok = true
for (const [table, list] of Object.entries(data)) {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  const same = (count ?? 0) >= list.length
  ok &&= same
  console.log(`${same ? '✔' : '✘'} ${table}: ${count ?? 0} en la cuenta / ${list.length} en local`)
}
const coversOk = (stored?.length ?? 0) >= uploaded
ok &&= coversOk
console.log(`${coversOk ? '✔' : '✘'} portadas: ${stored?.length ?? 0} en la cuenta / ${uploaded} en local`)
await supabase.auth.signOut()
console.log(ok ? 'Importación completa.' : 'Falta algo: revisa los ✘ de arriba y vuelve a ejecutar el script.')
process.exit(ok ? 0 : 1)
