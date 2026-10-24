// Llamadas del panel de administración: funciones de la base de datos (supabase/migrations/…_admin.sql, que comprueban
// que quien llama es la admin) y la Edge Function que borra cuentas (supabase/functions/admin-delete-user)
import type { Session } from '@supabase/supabase-js'
import { check, supabase } from '@/utils/supabase'

/** ¿Es la cuenta de administración? Solo decide si se dibuja el botón: lo que protege es la comprobación del servidor */
export const isAdminSession = (session: Session | null) => session?.user.app_metadata?.role === 'admin'

/** Resumen: cuentas, activas en 7 y 30 días, libros y espacio usado (en bytes) */
export interface AdminSummary {
  users: number
  active7: number
  active30: number
  books: number
  dbBytes: number
  coverBytes: number
}

/** Una cuenta de la lista (sin nada de su biblioteca salvo cuántos libros tiene) */
export interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  books: number
  blocked: boolean
}

export const fetchAdminSummary = async (): Promise<AdminSummary> => check(await supabase.rpc('admin_summary'))

export const fetchAdminUsers = async (): Promise<AdminUser[]> => check(await supabase.rpc('admin_users'))

/** Bloquea (no puede entrar) o desbloquea una cuenta, sin tocar sus datos */
export async function setUserBlocked(id: string, blocked: boolean): Promise<void> {
  check(await supabase.rpc('admin_set_blocked', { target: id, blocked }))
}

/** Borra una cuenta con todos sus datos y portadas (no se puede deshacer) */
export async function deleteUserAccount(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: id } })
  // Si la función responde con error, su mensaje viene en el cuerpo de la respuesta
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? error.message)
  }
  if (!data?.ok) throw new Error('No se pudo borrar la cuenta')
}
