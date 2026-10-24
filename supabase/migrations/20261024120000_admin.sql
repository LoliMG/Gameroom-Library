-- Panel de administración (botón "Dashboard" de la sala): resumen, usuarios, espacio y bloquear cuentas.
-- Solo para la cuenta con app_metadata.role = 'admin' (se pone en Supabase, nunca desde la web: el usuario no puede
-- cambiar su app_metadata). Las funciones son SECURITY DEFINER (se ejecutan con permisos del dueño, para leer
-- auth.users) y por eso cada una comprueba primero que quien llama es admin.
-- No devuelven nada de las bibliotecas: solo cuentas, correos, fechas y números. Borrar una cuenta va por la Edge
-- Function admin-delete-user (tiene que borrar también sus portadas con la clave secreta).

-- ¿La sesión es de la cuenta de administración? (lo dice el token, que firma Supabase)
create function public.is_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

-- Corta la función que la llama si no es la cuenta de administración
create function public.admin_only() returns void
language plpgsql stable set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo para la cuenta de administración' using errcode = '42501';
  end if;
end $$;

-- Resumen: cuentas, cuántas han entrado en 7 y 30 días, libros en total y espacio usado (base de datos y portadas)
create function public.admin_summary() returns json
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_only();
  return json_build_object(
    'users', (select count(*) from auth.users),
    'active7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active30', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'books', (select count(*) from public.books),
    'dbBytes', pg_database_size(current_database()),
    'coverBytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects where bucket_id = 'covers')
  );
end $$;

-- Lista de cuentas: correo, alta, último acceso, número de libros y si está bloqueada (de la más antigua a la más nueva)
create function public.admin_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, books bigint, blocked boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.admin_only();
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
      (select count(*) from public.books b where b.user_id = u.id),
      coalesce(u.banned_until > now(), false)
    from auth.users u
    order by u.created_at;
end $$;

-- Bloquea o desbloquea una cuenta sin borrar sus datos (Supabase no deja entrar mientras banned_until sea futuro).
-- La sesión que ya tenga abierta dura como mucho lo que le quede a su token (una hora)
create function public.admin_set_blocked(target uuid, blocked boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.admin_only();
  if target = auth.uid() then
    raise exception 'No puedes bloquear tu propia cuenta';
  end if;
  update auth.users set banned_until = case when blocked then now() + interval '100 years' end where id = target;
  if not found then
    raise exception 'Esa cuenta no existe';
  end if;
end $$;

-- Solo usuarios con sesión (y dentro, solo la admin pasa admin_only)
revoke execute on function public.is_admin(), public.admin_only(), public.admin_summary(), public.admin_users(), public.admin_set_blocked(uuid, boolean) from public, anon;
grant execute on function public.is_admin(), public.admin_only(), public.admin_summary(), public.admin_users(), public.admin_set_blocked(uuid, boolean) to authenticated;
