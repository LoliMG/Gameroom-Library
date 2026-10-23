-- Portadas públicas: se pueden ver con su dirección (la del CDN de Supabase, que el navegador guarda en caché), pero
-- subir, cambiar, borrar y listar siguen siendo solo de cada cuenta (regla "Cada usuario, sus portadas").
-- Con el cubo privado, cada visita pedía otra vez las 191 portadas con direcciones firmadas nuevas y Supabase
-- respondía 429 (demasiadas peticiones).
update storage.buckets set public = true where id = 'covers';
