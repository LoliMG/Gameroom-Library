// Comprobación de las migraciones de Supabase en un Postgres local (PGlite, sin conexión): node scripts/checkSupabaseRls.ts
// Lo importante son las reglas RLS: la web usa la clave pública, así que son lo único que impide que una cuenta lea o
// cambie la biblioteca de otra. Y que las funciones del panel de administración solo funcionen para la admin.
// Simula lo mínimo de Supabase: los roles anon y authenticated, auth.uid(), auth.jwt() y storage.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../supabase/migrations')

const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz);
  create table auth.sessions (id serial primary key, user_id uuid references auth.users on delete cascade);
  -- Como en Supabase: el id de la cuenta y su app_metadata salen del token de la petición (aquí, de un ajuste de la sesión)
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text, metadata jsonb);
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
const ADMIN = '00000000-0000-0000-0000-0000000000ad'
await db.exec(`insert into auth.users (id, email, last_sign_in_at) values ('${A}', 'a@test', now()), ('${B}', 'b@test', now() - interval '20 days'), ('${ADMIN}', 'admin@test', now())`)
const TABLES = ['books', 'book_state', 'annotations', 'bookmarks', 'readings', 'app_data']

// Consulta como una cuenta (o sin sesión, con null), con las reglas RLS activas; la cuenta ADMIN lleva role 'admin'
async function as(user: string | null, sql: string) {
  const claims = user ? JSON.stringify({ sub: user, app_metadata: user === ADMIN ? { role: 'admin' } : {} }) : ''
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims}', false); set role ${user ? 'authenticated' : 'anon'};`)
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

// Panel de administración: solo la admin, y sin ver las bibliotecas
for (const sql of ['select public.admin_summary()', 'select * from public.admin_users()', `select public.admin_set_blocked('${B}', true)`]) {
  await fails(A, sql, `una cuenta normal usa el panel: ${sql}`)
  await fails(null, sql, `sin sesión se usa el panel: ${sql}`)
}
const summary = (await as(ADMIN, 'select public.admin_summary() as s')).rows[0] as { s: { users: number; active7: number; active30: number; books: number } }
assert.deepEqual([summary.s.users, summary.s.active7, summary.s.active30, summary.s.books], [3, 2, 3, 1], 'resumen del panel')
const users = (await as(ADMIN, 'select email, books, blocked from public.admin_users()')).rows
assert.deepEqual(users, [{ email: 'a@test', books: 1, blocked: false }, { email: 'b@test', books: 0, blocked: false }, { email: 'admin@test', books: 0, blocked: false }], 'lista de usuarios')
for (const table of TABLES) assert.equal((await as(ADMIN, `select * from ${table}`)).rows.length, 0, `la admin ve ${table} de otra cuenta`)
// Bloquear corta al momento a una sesión ya abierta: no lee ni escribe su biblioteca ni sus portadas, y sus sesiones
// se cierran. Desbloquear la deja como estaba
await as(B, `insert into books (isbn, title) values ('9788417390617', 'Libro de B')`)
await as(B, `insert into storage.objects (bucket_id, name) values ('covers', '${B}/9788417390617.jpg')`)
await db.exec(`insert into auth.sessions (user_id) values ('${B}'), ('${A}')`)
await as(ADMIN, `select public.admin_set_blocked('${B}', true)`)
assert.equal(((await as(ADMIN, `select blocked from public.admin_users() where email = 'b@test'`)).rows[0] as { blocked: boolean }).blocked, true, 'bloquear')
await fails(B, 'select * from books', 'una cuenta bloqueada lee sus libros')
await fails(B, `insert into app_data (key, value) values ('tags', '{}')`, 'una cuenta bloqueada escribe')
await fails(B, 'select * from storage.objects', 'una cuenta bloqueada lista sus portadas')
await assert.rejects(as(B, 'select * from books'), /Tu cuenta está bloqueada/, 'mensaje del bloqueo')
assert.deepEqual((await db.query(`select user_id from auth.sessions`)).rows, [{ user_id: A }], 'bloquear cierra solo sus sesiones')
assert.equal((await as(A, 'select * from books')).rows.length, 1, 'el bloqueo de B afecta a A')
await as(ADMIN, `select public.admin_set_blocked('${B}', false)`)
assert.equal(((await as(ADMIN, `select blocked from public.admin_users() where email = 'b@test'`)).rows[0] as { blocked: boolean }).blocked, false, 'desbloquear')
assert.equal((await as(B, 'select * from books')).rows.length, 1, 'desbloqueada vuelve a ver sus libros')
await as(B, 'delete from books')
await as(B, 'delete from storage.objects')
await fails(ADMIN, `select public.admin_set_blocked('${ADMIN}', true)`, 'la admin se bloquea a sí misma')

// Borrar la cuenta borra todo lo suyo
await db.exec(`delete from auth.users where id = '${A}'`)
for (const table of TABLES) {
  assert.deepEqual((await db.query(`select count(*)::int as count from ${table}`)).rows, [{ count: 0 }], `queda ${table} tras borrar la cuenta`)
}

await db.close()
console.log('Reglas de Supabase (RLS, restricciones, portadas, panel de administración y borrado de cuenta): OK')
