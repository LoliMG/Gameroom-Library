// Cliente de Supabase: cuentas de usuario y la biblioteca de cada una.
// URL y clave publicable: .env.local en local, variables del proyecto en Vercel. La clave es pública a propósito
// (va dentro de la web); lo que impide leer datos ajenos son las reglas RLS de supabase/migrations
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

/** Respuesta de Supabase → sus datos, o una excepción con el mensaje del error (sin error, los datos llegan siempre;
 * solo maybeSingle puede dar null) */
export function check<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}
