-- Biblioteca de cada usuario en Supabase: las mismas tablas que data/bookroom.sqlite (server/library.ts), con el dueño
-- (user_id) en cada fila. RLS: cada usuario solo lee y escribe lo suyo; la web usa la clave pública, así que sin estas
-- reglas cualquiera podría leer las bibliotecas de los demás.
-- Los límites (CHECK) son los mismos que comprobaba el servidor de Node.

-- Libros de cada usuario: lo que hoy está en src/data/booksMeta.json, más la ruta de su portada en Storage
create table public.books (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  isbn text not null check (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  title text check (char_length(title) <= 300),
  author text check (char_length(author) <= 300),
  publisher text check (char_length(publisher) <= 300),
  pages integer check (pages between 1 and 100000),
  saga text check (char_length(saga) <= 300),
  saga_index integer check (saga_index between 0 and 10000),
  -- Tamaño en la estantería ('pocket' de booksMeta.json se guarda como 'bolsillo')
  format text not null default 'book' check (format in ('book', 'manga', 'bolsillo')),
  type text check (char_length(type) <= 50),
  synopsis text check (char_length(synopsis) <= 3000),
  -- De dónde salió cada dato ({ added: 'consola', from: 'Open Library' }…)
  source jsonb check (jsonb_typeof(source) = 'object' and pg_column_size(source) <= 2000),
  complete boolean not null default false,
  -- covers/<user_id>/<isbn>.<ext> en Storage
  cover_path text check (char_length(cover_path) <= 200),
  primary key (user_id, isbn)
);

-- Lo que se hace con cada libro en la sala y en el lector
create table public.book_state (
  user_id uuid not null default auth.uid(),
  isbn text not null,
  reading_status text not null default 'unread' check (reading_status in ('finished', 'reading', 'unread')),
  flipped boolean not null default false,
  -- Sitio en la estantería (pared, módulo, balda y centro X); NULL = colocación por defecto
  wall text check (char_length(wall) between 1 and 20),
  module integer check (module between 0 and 99),
  shelf integer check (shelf between 0 and 99),
  x real check (abs(x) < 10),
  -- Por dónde se va leyendo el libro electrónico: EPUB { cfi } · PDF { page }
  reading_position jsonb check (jsonb_typeof(reading_position) = 'object' and pg_column_size(reading_position) <= 8000),
  reading_progress real check (reading_progress between 0 and 1),
  read_at timestamptz,
  current_page integer check (current_page between 0 and 100000),
  primary key (user_id, isbn),
  foreign key (user_id, isbn) references public.books (user_id, isbn) on delete cascade
);

-- Subrayados y comentarios del lector. location: EPUB { cfi } · PDF { page, rects: [[x, y, ancho, alto]] }
create table public.annotations (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  isbn text not null,
  location jsonb not null check (jsonb_typeof(location) = 'object' and pg_column_size(location) <= 8000),
  text text not null check (char_length(btrim(text)) between 1 and 5000),
  note text check (char_length(note) <= 5000),
  color text not null check (color in ('yellow', 'pink', 'green', 'blue')),
  created_at timestamptz not null default now(),
  foreign key (user_id, isbn) references public.books (user_id, isbn) on delete cascade
);
create index annotations_user_isbn on public.annotations (user_id, isbn);

-- Marcadores del lector. location: EPUB { cfi } · PDF { page }
create table public.bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  isbn text not null,
  location jsonb not null check (jsonb_typeof(location) = 'object' and pg_column_size(location) <= 8000),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  created_at timestamptz not null default now(),
  foreign key (user_id, isbn) references public.books (user_id, isbn) on delete cascade
);
create index bookmarks_user_isbn on public.bookmarks (user_id, isbn);

-- Diario de lecturas: cada vez que se lee un libro (puede haber varias por libro)
create table public.readings (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  isbn text not null,
  start_date date,
  end_date date check (end_date >= start_date),
  rating integer check (rating between 1 and 5),
  comment text check (char_length(comment) <= 5000),
  created_at timestamptz not null default now(),
  foreign key (user_id, isbn) references public.books (user_id, isbn) on delete cascade
);
create index readings_user_isbn on public.readings (user_id, isbn);

-- Datos de la sala que no son de un libro concreto (JSON): etiquetas, deseos, ajustes, retos, pósters, pila y corcho
create table public.app_data (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key in ('tags', 'wishlist', 'settings', 'goals', 'posters', 'pile', 'board')),
  value jsonb not null check (pg_column_size(value) <= 1048576),
  primary key (user_id, key)
);

-- Solo usuarios con sesión; las visitas sin cuenta (anon) no leen ni escriben nada
revoke all on public.books, public.book_state, public.annotations, public.bookmarks, public.readings, public.app_data from anon;
grant select, insert, update, delete on public.books, public.book_state, public.annotations, public.bookmarks, public.readings, public.app_data to authenticated;

-- Cada usuario, solo sus filas. (select auth.uid()) se evalúa una vez por consulta en vez de una por fila
alter table public.books enable row level security;
alter table public.book_state enable row level security;
alter table public.annotations enable row level security;
alter table public.bookmarks enable row level security;
alter table public.readings enable row level security;
alter table public.app_data enable row level security;

create policy "Cada usuario, sus libros" on public.books for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada usuario, su estado" on public.book_state for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada usuario, sus subrayados" on public.annotations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada usuario, sus marcadores" on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada usuario, su diario" on public.readings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada usuario, sus datos de la sala" on public.app_data for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Portadas: cubo privado con una carpeta por usuario (covers/<user_id>/<isbn>.<ext>); hasta 5 MB, solo imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Cada usuario, sus portadas" on storage.objects for all to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
