// Comprobación de las migraciones de Supabase en un Postgres local (PGlite, sin conexión): node scripts/checkSupabaseRls.ts
// Lo importante son las reglas RLS: la web usa la clave pública, así que son lo único que impide que una cuenta lea o
// cambie la biblioteca de otra. Simula lo mínimo de Supabase: los roles anon y authenticated, auth.uid() y storage.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../supabase/migrations')

const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create table auth.users (id uuid primary key);
  -- Como en Supabase: el id de la cuenta sale del token de la petición (aquí, de un ajuste de la sesión)
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated; grant select, insert, update, delete on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;
`)
// Las migraciones en orden, como las aplica Supabase
for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
}

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
await db.exec(`insert into auth.users values ('${A}'), ('${B}')`)
const TABLES = ['books', 'book_state', 'annotations', 'bookmarks', 'readings', 'app_data']

// Consulta como una cuenta (o sin sesión, con null), con las reglas RLS activas
async function as(user: string | null, sql: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`)
  try {
    return await db.query(sql)
  } finally {
    await db.exec('reset role')
  }
}
const fails = (user: string | null, sql: string, why: string) => assert.rejects(as(user, sql), Error, why)

// A crea un libro con todo lo que cuelga de él
await as(A, `insert into books (isbn, title, format, source) values ('9788416334711', 'Libro de A', 'bolsillo', '{"added":"consola"}')`)
await as(A, `insert into book_state (isbn, reading_status, wall, module, shelf, x, reading_position) values ('9788416334711', 'reading', 'a', 1, 2, 0.5, '{"page":3}')`)
await as(A, `insert into annotations (isbn, location, text, color) values ('9788416334711', '{"page":1,"rects":[[0,0,1,1]]}', 'hola', 'pink')`)
await as(A, `insert into bookmarks (isbn, location, label) values ('9788416334711', '{"page":2}', 'aquí')`)
await as(A, `insert into readings (isbn, start_date, end_date, rating) values ('9788416334711', '2026-01-01', '2026-02-01', 5)`)
await as(A, `insert into app_data (key, value) values ('tags', '{"9788416334711":["fantasía"]}')`)
assert.equal((await as(A, 'select user_id from books')).rows.length, 1)
assert.deepEqual((await as(A, 'select user_id from books')).rows[0], { user_id: A }, 'user_id se pone solo con la cuenta')

// B no ve ni toca nada de A
for (const table of TABLES) assert.equal((await as(B, `select * from ${table}`)).rows.length, 0, `B ve ${table} de A`)
assert.equal((await as(B, `update books set title = 'robado'`)).affectedRows, 0, 'B cambia libros de A')
assert.equal((await as(B, 'delete from books')).affectedRows, 0, 'B borra libros de A')
await fails(B, `insert into books (user_id, isbn) values ('${A}', '9788417390617')`, 'B escribe con el user_id de A')
await fails(B, `insert into book_state (isbn) values ('9788416334711')`, 'B cuelga estado de un libro que no es suyo')
// Sin sesión, nada
for (const table of TABLES) await fails(null, `select * from ${table}`, `sin sesión se lee ${table}`)

// Restricciones (las mismas que comprobaba el servidor de Node)
await fails(A, `insert into books (isbn) values ('123')`, 'ISBN no válido')
await fails(A, `insert into books (isbn, format) values ('9788417390624', 'pocket')`, 'formato antiguo')
await fails(A, `update book_state set reading_status = 'leyendo'`, 'estado no válido')
await fails(A, `insert into annotations (isbn, location, text, color) values ('9788416334711', '{"page":1}', 'x', 'red')`, 'color no válido')
await fails(A, `insert into readings (isbn, start_date, end_date) values ('9788416334711', '2026-02-01', '2026-01-01')`, 'fin antes de inicio')
await fails(A, `insert into app_data (key, value) values ('otra', '1')`, 'clave de app_data desconocida')

// Portadas: el cubo se ve por dirección (público), pero cada cuenta solo sube, lista y borra en su carpeta
assert.deepEqual((await db.query(`select public from storage.buckets where id = 'covers'`)).rows, [{ public: true }], 'cubo covers público')
await as(A, `insert into storage.objects (bucket_id, name) values ('covers', '${A}/9788416334711.jpg')`)
await fails(A, `insert into storage.objects (bucket_id, name) values ('covers', '${B}/x.jpg')`, 'A sube a la carpeta de B')
assert.equal((await as(B, 'select * from storage.objects')).rows.length, 0, 'B lista portadas de A')
assert.equal((await as(B, 'delete from storage.objects')).affectedRows, 0, 'B borra portadas de A')

// Borrar la cuenta borra todo lo suyo
await db.exec(`delete from auth.users where id = '${A}'`)
for (const table of TABLES) {
  assert.deepEqual((await db.query(`select count(*)::int as count from ${table}`)).rows, [{ count: 0 }], `queda ${table} tras borrar la cuenta`)
}

await db.close()
console.log('Reglas de Supabase (RLS, restricciones, portadas y borrado de cuenta): OK')
