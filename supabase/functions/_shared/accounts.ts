// Lo común de las Edge Functions que borran cuentas (admin-delete-user, para la admin, y delete-account, para borrar la
// propia): respuestas con CORS, quién llama y el borrado de una cuenta con sus portadas
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// Portadas que se piden de cada vez al listar la carpeta de la cuenta
const PAGE = 1000
const MAX_ROUNDS = 50

export const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Respuesta a OPTIONS y a métodos que no son POST; null si la petición puede seguir */
export function preflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido' })
  return null
}

/** Cliente con la clave secreta (SUPABASE_SERVICE_ROLE_KEY, que Supabase pone sola en las funciones; la web nunca la ve) */
export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

/** Quién llama, leído de la base de datos (no del token): así un permiso quitado o un bloqueo valen al momento */
export async function caller(admin: SupabaseClient, request: Request): Promise<User | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const { data } = await admin.auth.getUser(token)
  return data.user
}

/**
 * Borra una cuenta: primero sus portadas (covers/<id>/…; si no, quedarían a la vista en el cubo público) y luego la
 * cuenta, y la base de datos borra en cascada sus libros, estado, subrayados, marcadores, diario y ajustes.
 * Devuelve el mensaje de error, o null si ha ido bien.
 */
export async function deleteAccount(admin: SupabaseClient, userId: string): Promise<string | null> {
  // Tanda a tanda; con un tope por si algo no se dejara borrar y la lista no bajara nunca
  for (let round = 0; ; round++) {
    const { data: files, error } = await admin.storage.from('covers').list(userId, { limit: PAGE })
    if (error) return `No se pudieron listar las portadas: ${error.message}`
    if (!files.length) break
    if (round === MAX_ROUNDS) return 'No se pudieron borrar todas las portadas'
    const removed = await admin.storage.from('covers').remove(files.map((file) => `${userId}/${file.name}`))
    if (removed.error) return `No se pudieron borrar las portadas: ${removed.error.message}`
  }
  const { error } = await admin.auth.admin.deleteUser(userId)
  return error ? `No se pudo borrar la cuenta: ${error.message}` : null
}
