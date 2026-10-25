// Edge Function de Supabase (Deno): cada persona borra su propia cuenta con todos sus datos y sus portadas (botón
// "Borrar mi cuenta" de los ajustes). Va en el servidor porque borrar una cuenta necesita la clave secreta
import { caller, deleteAccount, preflight, reply, serviceClient } from '../_shared/accounts.ts'

Deno.serve(async (request) => {
  const early = preflight(request)
  if (early) return early
  const admin = serviceClient()

  // Siempre la cuenta de quien llama: no se acepta ninguna otra
  const user = await caller(admin, request)
  if (!user) return reply(401, { error: 'Tienes que entrar en tu cuenta' })
  // La de administración no: sin ella nadie podría gestionar la web
  if (user.app_metadata?.role === 'admin') return reply(400, { error: 'La cuenta de administración no se puede borrar desde aquí' })

  const error = await deleteAccount(admin, user.id)
  return error ? reply(500, { error }) : reply(200, { ok: true })
})
