-- Bloquear una cuenta desde el panel la corta al momento. Antes solo impedía entrar de nuevo: una sesión ya abierta
-- seguía usando la biblioteca con su token (dura hasta una hora y se renueva solo).
-- 1) Las reglas RLS comprueban además que la cuenta no está bloqueada (con un error claro, no con una sala vacía).
-- 2) Al bloquear se cierran sus sesiones, así su token ya no se puede renovar.

-- Cierto si la cuenta de quien llama no está bloqueada; si lo está, error. Lee auth.users, por eso security definer.
-- Va como (select public.active_account()) en las reglas: así se calcula una vez por consulta, no por fila
create function public.active_account() returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id = auth.uid() and banned_until > now()) then
    raise exception 'Tu cuenta está bloqueada' using errcode = '42501';
  end if;
  return true;
end $$;
revoke execute on function public.active_account() from public, anon;
grant execute on function public.active_account() to authenticated;

alter policy "Cada usuario, sus libros" on public.books
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
alter policy "Cada usuario, su estado" on public.book_state
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
alter policy "Cada usuario, sus subrayados" on public.annotations
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
alter policy "Cada usuario, sus marcadores" on public.bookmarks
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
alter policy "Cada usuario, su diario" on public.readings
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
alter policy "Cada usuario, sus datos de la sala" on public.app_data
  using (user_id = (select auth.uid()) and (select public.active_account()))
  with check (user_id = (select auth.uid()) and (select public.active_account()));
-- Portadas: subir, listar y borrar (verlas por su dirección pública no pasa por aquí)
alter policy "Cada usuario, sus portadas" on storage.objects
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.active_account()))
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.active_account()));

-- Igual que antes, y al bloquear se borran sus sesiones (su token ya no se renueva y, al recargar, vuelve a la entrada)
create or replace function public.admin_set_blocked(target uuid, blocked boolean) returns void
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
  if blocked then
    delete from auth.sessions where user_id = target;
  end if;
end $$;
