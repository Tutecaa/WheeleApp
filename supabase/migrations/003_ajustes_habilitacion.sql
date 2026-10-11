-- WHEEL-E - WE-14 / WE-15
-- Ajustes a 001 y 002 despues de aplicarlas.
-- Depende de 001_perfiles.sql y 002_vehiculos_y_habilitacion.sql.

-- 1. Perfil activo desde el inicio si el correo ya llega confirmado
--    (por ejemplo, si la confirmacion por correo esta desactivada).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nombre_completo,
    codigo_institucional,
    correo_institucional,
    programa_academico,
    correo_verificado,
    estado
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''),
    coalesce(new.raw_user_meta_data ->> 'codigo_institucional', ''),
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'programa_academico', ''),
    new.email_confirmed_at is not null,
    case
      when new.email_confirmed_at is not null then 'activo'::public.user_status
      else 'pendiente_confirmacion'::public.user_status
    end
  );
  return new;
end;
$$;

-- 2. Una sola solicitud pendiente por usuario (RF3). Un segundo vehiculo
--    se registra cuando la primera solicitud ya fue resuelta.
create unique index vehicles_one_pending_per_user_idx
on public.vehicles(conductor_id)
where estado_habilitacion = 'pendiente';

-- 3. El dueno puede borrar un vehiculo no aprobado. La app lo usa para
--    deshacer el registro si falla la subida de los documentos.
create policy "Users can delete their own unapproved vehicles"
on public.vehicles for delete
to authenticated
using (conductor_id = auth.uid() and estado_habilitacion <> 'aprobado');

-- 4. Los archivos solo se cargan, reemplazan o borran mientras el vehiculo
--    no este aprobado. Antes bastaba con que la carpeta fuera del usuario,
--    y un conductor aprobado podia cambiar sus documentos sin revision.
--    Ruta de cada archivo: <id_usuario>/<id_vehiculo>/<archivo>.
create or replace function public.is_own_unapproved_vehicle_folder(object_name text)
returns boolean
language sql
stable
as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.vehicles
      where vehicles.id::text = (storage.foldername(object_name))[2]
        and vehicles.conductor_id = auth.uid()
        and vehicles.estado_habilitacion <> 'aprobado'
    );
$$;

drop policy "Users can upload their own vehicle files" on storage.objects;
drop policy "Users can replace their own vehicle files" on storage.objects;
drop policy "Users can delete their own vehicle files" on storage.objects;

create policy "Users can upload files of their own unapproved vehicle"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documentos-vehiculos'
  and public.is_own_unapproved_vehicle_folder(name)
);

create policy "Users can replace files of their own unapproved vehicle"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documentos-vehiculos'
  and public.is_own_unapproved_vehicle_folder(name)
)
with check (
  bucket_id = 'documentos-vehiculos'
  and public.is_own_unapproved_vehicle_folder(name)
);

create policy "Users can delete files of their own unapproved vehicle"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documentos-vehiculos'
  and public.is_own_unapproved_vehicle_folder(name)
);
