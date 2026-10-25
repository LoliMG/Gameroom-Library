// Edge Function de Supabase (Deno): borra una cuenta con todos sus datos y sus portadas. Solo para la admin.
// Va en el servidor porque necesita la clave secreta: con ella se borran las portadas de otra cuenta y la propia cuenta
import { caller, deleteAccount, preflight, reply, serviceClient } from '../_shared/accounts.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

Deno.serve(async (request) => {
  const early = preflight(request)
  if (early) return early
  const admin = serviceClient()

  const user = await caller(admin, request)
  if (user?.app_metadata?.role !== 'admin') return reply(403, { error: 'Solo para la cuenta de administración' })

  const body = await request.json().catch(() => null)
  const userId = body?.userId
  if (typeof userId !== 'string' || !UUID.test(userId)) return reply(400, { error: 'Cuenta no válida' })
  if (userId === user.id) return reply(400, { error: 'No puedes borrar tu propia cuenta desde el panel' })

  const error = await deleteAccount(admin, userId)
  return error ? reply(500, { error }) : reply(200, { ok: true })
})
