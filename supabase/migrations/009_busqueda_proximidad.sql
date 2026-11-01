-- WHEEL-E - WE-21 / WE-22 / WE-13 (Sprint 3)
-- Busqueda por proximidad (RF8), detalle del viaje para el pasajero (RF9),
-- perfil publico (RF14) y foto de perfil opcional (RF1).
-- Depende de 001_perfiles.sql, 002_vehiculos_y_habilitacion.sql,
-- 004_viajes.sql y 005_ajustes_viajes.sql.
--
-- RLS solo deja ver los viajes y el perfil propios. Estas funciones son
-- security definer para que un pasajero vea los viajes de otros, pero
-- entregan unicamente datos publicos: nunca el correo, el codigo
-- institucional ni la placa del vehiculo.

-- 1. RF8: viajes cuyo trazado pasa a menos de `p_radio_metros` del punto de
--    partida, ordenados de menor a mayor distancia. La distancia es en linea
--    recta hasta el trazado (PostGIS sobre geography).
--    Los mensajes llegan tal cual a la app (codigo P0001).
create or replace function public.search_trips(
  p_latitud double precision,
  p_longitud double precision,
  p_desde timestamptz,
  p_hasta timestamptz,
  p_radio_metros integer
)
returns table (
  id uuid,
  conductor_id uuid,
  conductor_nombre text,
  conductor_foto text,
  conductor_promedio numeric,
  origen_nombre text,
  destino_nombre text,
  numero_paradas integer,
  fecha_hora_salida timestamptz,
  cupos_totales smallint,
  cupos_disponibles smallint,
  aporte_sugerido integer,
  distancia_metros integer,
  duracion_segundos integer,
  distancia_proximidad_metros integer
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  punto extensions.geography;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where profiles.id = auth.uid() and profiles.estado = 'activo'
  ) then
    raise exception 'Inicia sesión con una cuenta activa para buscar viajes.';
  end if;

  if p_latitud is null or p_longitud is null
     or p_latitud not between -90 and 90
     or p_longitud not between -180 and 180 then
    raise exception 'Marca tu punto de partida en el mapa.';
  end if;

  -- Deben coincidir con RADIO_BUSQUEDA_MINIMO_METROS y RADIO_BUSQUEDA_MAXIMO_METROS
  -- en constants/config.ts.
  if p_radio_metros is null or p_radio_metros not between 100 and 5000 then
    raise exception 'El radio de tolerancia debe estar entre 100 m y 5 km.';
  end if;

  if p_desde is null or p_hasta is null or p_hasta <= p_desde then
    raise exception 'La hora final debe ser posterior a la inicial. Corrígela.';
  end if;
  if p_hasta - p_desde > interval '1 day' then
    raise exception 'La franja horaria puede abarcar como máximo un día.';
  end if;
  if p_hasta <= now() then
    raise exception 'Esa fecha y franja ya pasaron. Elige una fecha u hora futura.';
  end if;

  punto := extensions.st_setsrid(extensions.st_makepoint(p_longitud, p_latitud), 4326)::extensions.geography;

  return query
  -- Primero se filtra por fecha, franja, cupos, viaje no propio y conductor
  -- activo; solo despues se calculan distancias (RF8).
  with candidatos as materialized (
    select
      trips.id,
      trips.conductor_id,
      trips.origen_nombre,
      trips.destino_nombre,
      trips.paradas,
      trips.trazado,
      trips.fecha_hora_salida,
      trips.cupos_totales,
      trips.cupos_disponibles,
      trips.aporte_sugerido,
      trips.distancia_metros,
      trips.duracion_segundos,
      conductor.nombre_completo,
      conductor.foto_perfil_url,
      conductor.promedio_calificacion
    from public.trips
    join public.profiles as conductor on conductor.id = trips.conductor_id
    where trips.estado = 'publicado'
      and trips.fecha_hora_salida >= p_desde
      and trips.fecha_hora_salida <= p_hasta
      and trips.fecha_hora_salida > now()
      and trips.cupos_disponibles > 0
      and trips.conductor_id <> auth.uid()
      and conductor.estado = 'activo'
  )
  select
    candidatos.id,
    candidatos.conductor_id,
    candidatos.nombre_completo,
    candidatos.foto_perfil_url,
    candidatos.promedio_calificacion,
    candidatos.origen_nombre,
    candidatos.destino_nombre,
    jsonb_array_length(candidatos.paradas),
    candidatos.fecha_hora_salida,
    candidatos.cupos_totales,
    candidatos.cupos_disponibles,
    candidatos.aporte_sugerido,
    candidatos.distancia_metros,
    candidatos.duracion_segundos,
    round(extensions.st_distance(candidatos.trazado, punto))::integer
  from candidatos
  where extensions.st_dwithin(candidatos.trazado, punto, p_radio_metros)
  order by extensions.st_distance(candidatos.trazado, punto), candidatos.fecha_hora_salida
  limit 50;
end;
$$;

revoke all on function public.search_trips(double precision, double precision, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.search_trips(double precision, double precision, timestamptz, timestamptz, integer) to authenticated;

-- 2. RF9: detalle de un viaje con su trazado. Si llega el punto de partida
--    del pasajero, incluye la distancia al trazado y el punto de la ruta
--    donde pasa mas cerca. Lo ve cualquier usuario si el conductor esta
--    activo; el conductor y el administrador lo ven siempre. La placa solo
--    llega al conductor y al administrador.
create or replace function public.get_trip_detail(
  p_viaje_id uuid,
  p_latitud double precision default null,
  p_longitud double precision default null
)
returns table (
  id uuid,
  conductor_id uuid,
  vehiculo_id uuid,
  origen_latitud double precision,
  origen_longitud double precision,
  origen_nombre text,
  destino_latitud double precision,
  destino_longitud double precision,
  destino_nombre text,
  paradas jsonb,
  trazado_geojson jsonb,
  distancia_metros integer,
  duracion_segundos integer,
  fecha_hora_salida timestamptz,
  cupos_totales smallint,
  cupos_disponibles smallint,
  aporte_sugerido integer,
  estado public.trip_status,
  motivo_cancelacion text,
  created_at timestamptz,
  updated_at timestamptz,
  vehiculo_placa text,
  vehiculo_marca text,
  vehiculo_linea text,
  vehiculo_color text,
  conductor_nombre text,
  conductor_programa text,
  conductor_foto text,
  conductor_promedio numeric,
  conductor_total_viajes integer,
  distancia_proximidad_metros integer,
  cercano_latitud double precision,
  cercano_longitud double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with partida as (
    select case
      when p_latitud between -90 and 90 and p_longitud between -180 and 180
        then extensions.st_setsrid(extensions.st_makepoint(p_longitud, p_latitud), 4326)
    end as punto
  )
  select
    trips.id,
    trips.conductor_id,
    trips.vehiculo_id,
    extensions.st_y(trips.origen::extensions.geometry),
    extensions.st_x(trips.origen::extensions.geometry),
    trips.origen_nombre,
    extensions.st_y(trips.destino::extensions.geometry),
    extensions.st_x(trips.destino::extensions.geometry),
    trips.destino_nombre,
    trips.paradas,
    extensions.st_asgeojson(trips.trazado)::jsonb,
    trips.distancia_metros,
    trips.duracion_segundos,
    trips.fecha_hora_salida,
    trips.cupos_totales,
    trips.cupos_disponibles,
    trips.aporte_sugerido,
    trips.estado,
    trips.motivo_cancelacion,
    trips.created_at,
    trips.updated_at,
    case when trips.conductor_id = auth.uid() or public.is_admin() then vehicles.placa end,
    vehicles.marca,
    vehicles.linea,
    vehicles.color,
    conductor.nombre_completo,
    conductor.programa_academico,
    conductor.foto_perfil_url,
    conductor.promedio_calificacion,
    conductor.total_viajes,
    round(extensions.st_distance(trips.trazado, partida.punto::extensions.geography))::integer,
    extensions.st_y(extensions.st_closestpoint(trips.trazado::extensions.geometry, partida.punto)),
    extensions.st_x(extensions.st_closestpoint(trips.trazado::extensions.geometry, partida.punto))
  from public.trips
  join public.profiles as conductor on conductor.id = trips.conductor_id
  left join public.vehicles on vehicles.id = trips.vehiculo_id
  cross join partida
  where trips.id = p_viaje_id
    and auth.uid() is not null
    and (
      trips.conductor_id = auth.uid()
      or public.is_admin()
      or conductor.estado = 'activo'
    );
$$;

revoke all on function public.get_trip_detail(uuid, double precision, double precision) from public, anon;
grant execute on function public.get_trip_detail(uuid, double precision, double precision) to authenticated;

-- 3. RF14: perfil publico de un usuario. No devuelve nada si la cuenta no
--    esta activa (suspendida, inactiva o sin confirmar).
create or replace function public.get_public_profile(p_usuario_id uuid)
returns table (
  id uuid,
  nombre_completo text,
  programa_academico text,
  foto_perfil_url text,
  promedio_calificacion numeric,
  total_viajes integer,
  viajes_publicados integer,
  es_conductor boolean,
  miembro_desde timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.nombre_completo,
    profiles.programa_academico,
    profiles.foto_perfil_url,
    profiles.promedio_calificacion,
    profiles.total_viajes,
    (
      select count(*)::integer
      from public.trips
      where trips.conductor_id = profiles.id
        and trips.estado <> 'cancelado'
    ),
    exists (
      select 1
      from public.vehicles
      where vehicles.conductor_id = profiles.id
        and vehicles.estado_habilitacion = 'aprobado'
    ),
    profiles.created_at
  from public.profiles
  where profiles.id = p_usuario_id
    and profiles.estado = 'activo'
    and auth.uid() is not null;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

-- 4. RF1: foto de perfil opcional. foto_perfil_url guarda la ruta del archivo
--    dentro del bucket (<id_usuario>/<archivo>), no una URL: asi nadie puede
--    poner un enlace externo como foto. La app arma la URL publica.
update public.profiles
set foto_perfil_url = null
where foto_perfil_url is not null
  and foto_perfil_url not like id::text || '/%';

alter table public.profiles
add constraint profile_photo_in_own_folder check (
  foto_perfil_url is null
  or (
    foto_perfil_url like id::text || '/%'
    and char_length(foto_perfil_url) <= 200
    and position('..' in foto_perfil_url) = 0
  )
);

-- Bucket publico: las fotos se ven en resultados, detalle y perfil sin
-- pedir URLs firmadas. Debe coincidir con BUCKET_FOTOS_PERFIL,
-- TAMANO_MAXIMO_FOTO_BYTES y TIPOS_FOTO_PERMITIDOS en constants/config.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-perfil',
  'fotos-perfil',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Cada usuario solo sube, reemplaza o borra archivos en su propia carpeta.
-- Borrar un archivo tambien requiere poder verlo (select).
create policy "Users can view their own profile photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can replace their own profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
);
