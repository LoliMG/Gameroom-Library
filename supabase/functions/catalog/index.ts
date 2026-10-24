// Edge Function de Supabase (Deno): buscar libros en los catálogos y añadir uno a la colección de quien llama.
// Va en el servidor porque la clave de Google Books es secreta (GOOGLE_BOOKS_API_KEY en los secretos de Supabase) y
// porque las webs de portadas no dejan descargar sus imágenes desde el navegador.
// Escribe con la sesión de quien llama (no con la clave secreta): las reglas RLS siguen decidiendo qué puede tocar.
//   { action: 'search', query }  →  CatalogBook[]
//   { action: 'add', book }      →  el libro guardado y si su sinopsis está en español
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CatalogConflictError, ValidationError, prepareNewBook, searchBooks } from './catalog.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png' }

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido' })

  // Cliente con la sesión de quien llama: lee y escribe como esa cuenta
  const authorization = request.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data } = await supabase.auth.getUser(authorization.replace(/^Bearer /, ''))
  const user = data.user
  if (!user) return reply(401, { error: 'Hay que iniciar sesión' })

  const googleBooksKey = Deno.env.get('GOOGLE_BOOKS_API_KEY') || undefined
  const body = await request.json().catch(() => null)
  try {
    if (body?.action === 'search') return reply(200, await searchBooks(body.query, { googleBooksKey }))

    if (body?.action === 'add') {
      const exists = async (isbn: string) => {
        const { data: found, error } = await supabase.from('books').select('isbn').eq('isbn', isbn).maybeSingle()
        if (error) throw new Error(error.message)
        return Boolean(found)
      }
      const { entry, cover, synopsisInSpanish } = await prepareNewBook(body.book, { googleBooksKey, exists })
      // Portada primero: si falla, no queda un libro sin portada (la sala no pinta libros sin portada)
      const coverPath = `${user.id}/${entry.isbn}.${cover.extension}`
      const upload = await supabase.storage.from('covers').upload(coverPath, cover.bytes, { contentType: CONTENT_TYPES[cover.extension], upsert: true })
      if (upload.error) throw new Error(`No se pudo guardar la portada: ${upload.error.message}`)
      const insert = await supabase.from('books').insert({ ...entry, cover_path: coverPath })
      // Añadido a la vez desde otra pestaña: la portada es la de ese otro alta, no se borra
      if (insert.error?.code === '23505') throw new CatalogConflictError('Este libro ya está en tu colección')
      if (insert.error) {
        await supabase.storage.from('covers').remove([coverPath])
        throw new Error(`No se pudo guardar el libro: ${insert.error.message}`)
      }
      return reply(200, { ...entry, synopsisInSpanish })
    }
    return reply(400, { error: 'Acción no válida' })
  } catch (error) {
    if (error instanceof ValidationError) return reply(400, { error: error.message })
    if (error instanceof CatalogConflictError) return reply(409, { error: error.message })
    console.error('[catalog]', error)
    return reply(502, { error: (error as Error).message })
  }
})
