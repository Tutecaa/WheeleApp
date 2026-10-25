-- WHEEL-E - WE-16 / WE-17
-- Viajes publicados y su trazado por calles (RF4, RF5). Deja listo lo que
-- usan modificar o cancelar un viaje (RF6) y mis viajes (RF7).
-- Depende de 001_perfiles.sql (profiles, set_updated_at, is_admin) y de
-- 002_vehiculos_y_habilitacion.sql (vehicles, is_enabled_driver).

-- PostGIS va en el esquema `extensions`, como recomienda Supabase.
create extension if not exists postgis with schema extensions;

-- publicado -> en_curso -> finalizado; cancelado mientras no haya iniciado.
create type public.trip_status as enum (
  'publicado',
  'en_curso',
  'finalizado',
  'cancelado'
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references public.profiles(id) on delete restrict,
  vehiculo_id uuid not null references public.vehicles(id) on delete restrict,
  origen extensions.geography(Point, 4326) not null,
  origen_nombre text check (origen_nombre is null or char_length(origen_nombre) <= 80),
  destino extensions.geography(Point, 4326) not null,
  destino_nombre text check (destino_nombre is null or char_length(destino_nombre) <= 80),
  -- Paradas intermedias en orden de recorrido: [{"latitud": 7.1, "longitud": -73.1}, ...]
  paradas jsonb not null default '[]'::jsonb check (jsonb_typeof(paradas) = 'array'),
  -- Trazado real por las calles que devuelve OpenRouteService (RF5). Se
  -- calcula una sola vez, al publicar o al cambiar el recorrido.
  trazado extensions.geography(LineString, 4326) not null,
  distancia_metros integer not null check (distancia_metros > 0),
  duracion_segundos integer not null check (duracion_segundos >= 0),
  fecha_hora_salida timestamptz not null,
  cupos_totales smallint not null check (cupos_totales between 1 and 50),
  cupos_disponibles smallint not null,
  -- Aporte voluntario por pasajero, en pesos. Solo se registra: no hay pagos.
  aporte_sugerido integer not null default 0 check (aporte_sugerido >= 0),
  estado public.trip_status not null default 'publicado',
  motivo_cancelacion text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_seats_in_range check (cupos_disponibles between 0 and cupos_totales),
  constraint cancelled_trip_requires_reason check (
    estado <> 'cancelado'
    or char_length(trim(coalesce(motivo_cancelacion, ''))) >= 3
  )
);

create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

-- Reglas de RF4 que no caben en un check: dependen del vehiculo o de la hora
-- actual. Los mensajes llegan tal cual a la app (codigo P0001).
create or replace function public.validate_trip()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  puestos smallint;
begin
  if tg_op = 'INSERT' then
    -- Al publicar, todos los cupos estan libres.
    new.estado = 'publicado';
    new.cupos_disponibles = new.cupos_totales;
  end if;

  if tg_op = 'INSERT'
     or new.vehiculo_id <> old.vehiculo_id
     or new.cupos_totales <> old.cupos_totales then
    select numero_puestos into puestos
    from public.vehicles
    where id = new.vehiculo_id
      and conductor_id = new.conductor_id
      and estado_habilitacion = 'aprobado';

    if puestos is null then
      raise exception 'El vehículo elegido no está aprobado o no es tuyo.';
    end if;
    if new.cupos_totales > puestos then
      raise exception 'Los cupos deben estar entre 1 y %, los puestos del vehículo.', puestos;
    end if;
  end if;

  if (tg_op = 'INSERT' or new.fecha_hora_salida <> old.fecha_hora_salida)
     and new.fecha_hora_salida <= now() then
    raise exception 'La fecha y hora de salida ya pasaron. Elige una futura.';
  end if;

  -- Debe coincidir con DISTANCIA_MINIMA_ORIGEN_DESTINO_METROS en constants/config.ts.
  if st_dwithin(new.origen, new.destino, 100) then
    raise exception 'El origen y el destino están en el mismo lugar. Corrige los puntos.';
  end if;

  return new;
end;
$$;

create trigger trips_validate
before insert or update on public.trips
for each row execute function public.validate_trip();

alter table public.trips enable row level security;

create policy "Drivers can view their own trips"
on public.trips for select
to authenticated
using (conductor_id = auth.uid());

create policy "Administrators can view trips"
on public.trips for select
to authenticated
using (public.is_admin());

-- Solo publica un conductor habilitado (RF3/RF16). El administrador no publica.
create policy "Enabled drivers can publish trips"
on public.trips for insert
to authenticated
with check (
  conductor_id = auth.uid()
  and estado = 'publicado'
  and public.is_enabled_driver()
  and not public.is_admin()
);

-- RF6: el conductor edita o cancela su viaje solo si aun no inicia.
-- Iniciar y finalizar el viaje se hara con funciones aparte.
create policy "Drivers can update their own trips before they start"
on public.trips for update
to authenticated
using (conductor_id = auth.uid() and estado = 'publicado')
with check (conductor_id = auth.uid() and estado in ('publicado', 'cancelado'));

create index trips_conductor_id_idx on public.trips(conductor_id);
create index trips_departure_idx on public.trips(fecha_hora_salida) where estado = 'publicado';
-- Para la busqueda por proximidad (RF8, migracion 008).
create index trips_route_gix on public.trips using gist (trazado);

-- PostgREST devuelve las columnas geography en binario. Esta vista entrega
-- las coordenadas y el trazado en GeoJSON. security_invoker hace que se
-- apliquen las politicas RLS de trips y vehicles del usuario que consulta.
create view public.trip_details
with (security_invoker = true)
as
select
  trips.id,
  trips.conductor_id,
  trips.vehiculo_id,
  extensions.st_y(trips.origen::extensions.geometry) as origen_latitud,
  extensions.st_x(trips.origen::extensions.geometry) as origen_longitud,
  trips.origen_nombre,
  extensions.st_y(trips.destino::extensions.geometry) as destino_latitud,
  extensions.st_x(trips.destino::extensions.geometry) as destino_longitud,
  trips.destino_nombre,
  trips.paradas,
  extensions.st_asgeojson(trips.trazado)::jsonb as trazado_geojson,
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
  vehicles.placa as vehiculo_placa,
  vehicles.marca as vehiculo_marca,
  vehicles.linea as vehiculo_linea,
  vehicles.color as vehiculo_color
from public.trips
left join public.vehicles on vehicles.id = trips.vehiculo_id;

-- RF5: cuando se agota la cuota de OpenRouteService se registra el error
-- para avisar al administrador.
create table public.route_service_errors (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  codigo_http integer,
  mensaje text not null check (char_length(mensaje) <= 300),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.route_service_errors enable row level security;

create policy "Users can report route service errors"
on public.route_service_errors for insert
to authenticated
with check (usuario_id = auth.uid());

create policy "Administrators can view route service errors"
on public.route_service_errors for select
to authenticated
using (public.is_admin());

create index route_service_errors_created_at_idx on public.route_service_errors(created_at desc);
