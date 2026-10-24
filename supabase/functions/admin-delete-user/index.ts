// Edge Function de Supabase (Deno): borra una cuenta con todos sus datos y sus portadas. Solo para la admin.
// Va en el servidor porque necesita la clave secreta (SUPABASE_SERVICE_ROLE_KEY, que Supabase pone sola en las
// funciones): con ella se borran las portadas de otra cuenta y la propia cuenta. La web nunca ve esa clave.
// Al borrar la cuenta, la base de datos borra en cascada sus libros, estado, subrayados, marcadores, diario y ajustes.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Portadas que se piden de cada vez al listar la carpeta de la cuenta
const PAGE = 1000
const MAX_ROUNDS = 50

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // Quién llama: su app_metadata se lee de la base de datos (no del token), así un permiso quitado vale al momento
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const { data: caller } = await admin.auth.getUser(token)
  if (caller.user?.app_metadata?.role !== 'admin') return reply(403, { error: 'Solo para la cuenta de administración' })

  const body = await request.json().catch(() => null)
  const userId = body?.userId
  if (typeof userId !== 'string' || !UUID.test(userId)) return reply(400, { error: 'Cuenta no válida' })
  if (userId === caller.user.id) return reply(400, { error: 'No puedes borrar tu propia cuenta desde el panel' })

  // Primero sus portadas (covers/<id>/…): si no, quedarían a la vista en el cubo público. Tanda a tanda; con un tope
  // por si algo no se dejara borrar y la lista no bajara nunca
  for (let round = 0; ; round++) {
    const { data: files, error } = await admin.storage.from('covers').list(userId, { limit: PAGE })
    if (error) return reply(500, { error: `No se pudieron listar sus portadas: ${error.message}` })
    if (!files.length) break
    if (round === MAX_ROUNDS) return reply(500, { error: 'No se pudieron borrar todas sus portadas' })
    const removed = await admin.storage.from('covers').remove(files.map((file) => `${userId}/${file.name}`))
    if (removed.error) return reply(500, { error: `No se pudieron borrar sus portadas: ${removed.error.message}` })
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return reply(500, { error: `No se pudo borrar la cuenta: ${error.message}` })
  return reply(200, { ok: true })
})
