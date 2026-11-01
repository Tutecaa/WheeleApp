-- WHEEL-E - WE-23 / WE-24 / WE-25 (Sprint 4)
-- Solicitudes de cupo (RF10), respuesta del conductor (RF11) y cancelacion
-- de una solicitud o reserva por el pasajero (RF12). Tambien los viajes
-- como pasajero en "Mis viajes" (RF7).
-- Depende de 001_perfiles.sql, 002_vehiculos_y_habilitacion.sql,
-- 004_viajes.sql y 005_ajustes_viajes.sql (wheele.ajuste_cupos).
--
-- Estados: pendiente -> aceptada (reserva confirmada) / rechazada; cancelada.
-- El cupo se descuenta solo cuando el conductor acepta y se devuelve si el
-- pasajero cancela una reserva confirmada.
-- Las solicitudes se crean y cambian solo con las funciones de abajo, que
-- validan las reglas dentro de una transaccion. Los mensajes llegan tal cual
-- a la app (codigo P0001).

create type public.seat_request_status as enum (
  'pendiente',
  'aceptada',
  'rechazada',
  'cancelada'
);

create table public.seat_requests (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.trips(id) on delete cascade,
  pasajero_id uuid not null references public.profiles(id) on delete cascade,
  -- Punto de partida con el que el pasajero encontro el viaje (RF8). Sirve
  -- al conductor para saber a que distancia de la ruta lo espera.
  punto_partida extensions.geography(Point, 4326),
  distancia_proximidad_metros integer check (distancia_proximidad_metros >= 0),
  -- Deben coincidir con LONGITUD_MAXIMA_MENSAJE_SOLICITUD y
  -- LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD en constants/config.ts.
  mensaje text check (mensaje is null or char_length(mensaje) <= 200),
  estado public.seat_request_status not null default 'pendiente',
  motivo_rechazo text check (motivo_rechazo is null or char_length(motivo_rechazo) <= 200),
  -- 'pasajero' si la cancelo el pasajero; 'viaje' si se cerro porque el
  -- conductor cancelo el viaje.
  cancelada_por text check (cancelada_por in ('pasajero', 'viaje')),
  -- RF12: cancelacion de una reserva confirmada poco antes de la salida.
  cancelada_con_poca_antelacion boolean not null default false,
  fecha_respuesta timestamptz,
  fecha_cancelacion timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cancelled_request_has_origin check (estado <> 'cancelada' or cancelada_por is not null)
);

create trigger seat_requests_set_updated_at
before update on public.seat_requests
for each row execute function public.set_updated_at();

-- RF10: una sola solicitud viva por pasajero y viaje. Si la cancela, puede
-- volver a solicitar; si el conductor la rechaza, no.
create unique index seat_requests_one_active_idx
on public.seat_requests(viaje_id, pasajero_id)
where estado <> 'cancelada';

create index seat_requests_viaje_id_idx on public.seat_requests(viaje_id);
create index seat_requests_pasajero_id_idx on public.seat_requests(pasajero_id);

alter table public.seat_requests enable row level security;

create policy "Passengers can view their own seat requests"
on public.seat_requests for select
to authenticated
using (pasajero_id = auth.uid());

create policy "Drivers can view seat requests for their trips"
on public.seat_requests for select
to authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = seat_requests.viaje_id
      and trips.conductor_id = auth.uid()
  )
);

create policy "Administrators can view seat requests"
on public.seat_requests for select
to authenticated
using (public.is_admin());

-- Cruce de horario (RF10): el viaje se cruza con otra reserva confirmada del
-- usuario o con un viaje que el mismo publico como conductor. Cada viaje
-- ocupa desde su salida hasta su llegada estimada.
create or replace function public.seat_schedule_conflict(p_usuario_id uuid, p_viaje_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with objetivo as (
    select
      trips.fecha_hora_salida as inicio,
      trips.fecha_hora_salida + make_interval(secs => trips.duracion_segundos) as fin
    from public.trips
    where trips.id = p_viaje_id
  )
  select exists (
    select 1
    from public.seat_requests
    join public.trips on trips.id = seat_requests.viaje_id
    cross join objetivo
    where seat_requests.pasajero_id = p_usuario_id
      and seat_requests.estado = 'aceptada'
      and trips.id <> p_viaje_id
      and trips.estado in ('publicado', 'en_curso')
      and trips.fecha_hora_salida < objetivo.fin
      and trips.fecha_hora_salida + make_interval(secs => trips.duracion_segundos) > objetivo.inicio
  )
  or exists (
    select 1
    from public.trips
    cross join objetivo
    where trips.conductor_id = p_usuario_id
      and trips.id <> p_viaje_id
      and trips.estado in ('publicado', 'en_curso')
      and trips.fecha_hora_salida < objetivo.fin
      and trips.fecha_hora_salida + make_interval(secs => trips.duracion_segundos) > objetivo.inicio
  );
$$;

-- Solo la usan las funciones de abajo.
revoke all on function public.seat_schedule_conflict(uuid, uuid) from public, anon, authenticated;

-- 1. RF10: el pasajero solicita un cupo. Queda pendiente; el cupo no se
--    descuenta hasta que el conductor acepte.
create or replace function public.request_seat(
  p_viaje_id uuid,
  p_mensaje text default null,
  p_latitud double precision default null,
  p_longitud double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  usuario uuid := auth.uid();
  viaje public.trips%rowtype;
  existente public.seat_requests%rowtype;
  punto extensions.geography;
  mensaje_limpio text := nullif(trim(coalesce(p_mensaje, '')), '');
  nueva uuid;
begin
  if usuario is null or not exists (
    select 1 from public.profiles where profiles.id = usuario and profiles.estado = 'activo'
  ) then
    raise exception 'Inicia sesión con una cuenta activa para solicitar un cupo.';
  end if;
  if public.is_admin() then
    raise exception 'El administrador no solicita cupos.';
  end if;

  select * into viaje from public.trips where trips.id = p_viaje_id;
  if not found then
    raise exception 'Este viaje no existe.';
  end if;
  if viaje.conductor_id = usuario then
    raise exception 'No puedes solicitar un cupo en tu propio viaje.';
  end if;
  if viaje.estado = 'cancelado' then
    raise exception 'El conductor canceló este viaje.';
  end if;
  if viaje.estado <> 'publicado' or viaje.fecha_hora_salida <= now() then
    raise exception 'Este viaje ya salió. Busca otro viaje.';
  end if;
  if not exists (
    select 1 from public.profiles where profiles.id = viaje.conductor_id and profiles.estado = 'activo'
  ) then
    raise exception 'Este viaje ya no está disponible.';
  end if;

  select * into existente
  from public.seat_requests
  where seat_requests.viaje_id = p_viaje_id
    and seat_requests.pasajero_id = usuario
    and seat_requests.estado <> 'cancelada';
  if found then
    raise exception using message = case existente.estado
      when 'pendiente' then 'Ya enviaste una solicitud para este viaje. Espera la respuesta del conductor.'
      when 'aceptada' then 'Ya tienes un cupo confirmado en este viaje.'
      else 'El conductor ya respondió tu solicitud para este viaje.'
    end;
  end if;

  if viaje.cupos_disponibles <= 0 then
    raise exception 'Este viaje ya no tiene cupos disponibles.';
  end if;
  if public.seat_schedule_conflict(usuario, p_viaje_id) then
    raise exception 'Este viaje se cruza con otro viaje que ya tienes confirmado a esa hora.';
  end if;
  if char_length(mensaje_limpio) > 200 then
    raise exception 'El mensaje puede tener hasta 200 caracteres.';
  end if;

  if p_latitud between -90 and 90 and p_longitud between -180 and 180 then
    punto := extensions.st_setsrid(extensions.st_makepoint(p_longitud, p_latitud), 4326)::extensions.geography;
  end if;

  insert into public.seat_requests (
    viaje_id,
    pasajero_id,
    punto_partida,
    distancia_proximidad_metros,
    mensaje
  )
  values (
    p_viaje_id,
    usuario,
    punto,
    case when punto is not null then round(extensions.st_distance(viaje.trazado, punto))::integer end,
    mensaje_limpio
  )
  returning seat_requests.id into nueva;

  return nueva;
exception
  -- Dos solicitudes enviadas al mismo tiempo: la segunda choca con el indice unico.
  when unique_violation then
    raise exception 'Ya enviaste una solicitud para este viaje. Espera la respuesta del conductor.';
end;
$$;

revoke all on function public.request_seat(uuid, text, double precision, double precision) from public, anon;
grant execute on function public.request_seat(uuid, text, double precision, double precision) to authenticated;

-- 2. RF11: el conductor acepta (descuenta un cupo) o rechaza (motivo
--    opcional) una solicitud pendiente de su viaje.
create or replace function public.respond_seat_request(
  p_solicitud_id uuid,
  p_aceptar boolean,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitud public.seat_requests%rowtype;
  viaje public.trips%rowtype;
  motivo_limpio text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  select * into solicitud from public.seat_requests where seat_requests.id = p_solicitud_id for update;
  if not found then
    raise exception 'Esta solicitud no existe.';
  end if;

  -- Se bloquea el viaje para que dos aceptaciones simultaneas no usen el mismo cupo.
  select * into viaje from public.trips where trips.id = solicitud.viaje_id for update;
  if viaje.conductor_id is distinct from auth.uid() then
    raise exception 'Solo el conductor del viaje puede responder esta solicitud.';
  end if;

  if solicitud.estado = 'cancelada' then
    raise exception using message = case solicitud.cancelada_por
      when 'viaje' then 'Esta solicitud se cerró porque cancelaste el viaje.'
      else 'El pasajero canceló esta solicitud.'
    end;
  end if;
  if solicitud.estado <> 'pendiente' then
    raise exception 'Ya respondiste esta solicitud.';
  end if;
  if viaje.estado <> 'publicado' or viaje.fecha_hora_salida <= now() then
    raise exception 'El viaje ya salió o fue cancelado, así que no puedes responder solicitudes.';
  end if;

  if p_aceptar then
    if viaje.cupos_disponibles <= 0 then
      raise exception 'No quedan cupos disponibles en este viaje.';
    end if;
    if not exists (
      select 1 from public.profiles
      where profiles.id = solicitud.pasajero_id and profiles.estado = 'activo'
    ) then
      raise exception 'La cuenta de este pasajero ya no está activa.';
    end if;
    if public.seat_schedule_conflict(solicitud.pasajero_id, viaje.id) then
      raise exception 'El pasajero ya tiene otro viaje confirmado a esa hora.';
    end if;

    -- validate_trip (005) solo deja cambiar cupos_disponibles con este ajuste.
    perform set_config('wheele.ajuste_cupos', 'on', true);
    update public.trips set cupos_disponibles = cupos_disponibles - 1 where trips.id = viaje.id;
    perform set_config('wheele.ajuste_cupos', 'off', true);

    update public.seat_requests
    set estado = 'aceptada', fecha_respuesta = timezone('utc', now())
    where seat_requests.id = solicitud.id;
  else
    if char_length(motivo_limpio) > 200 then
      raise exception 'El motivo puede tener hasta 200 caracteres.';
    end if;

    update public.seat_requests
    set estado = 'rechazada', motivo_rechazo = motivo_limpio, fecha_respuesta = timezone('utc', now())
    where seat_requests.id = solicitud.id;
  end if;
end;
$$;

revoke all on function public.respond_seat_request(uuid, boolean, text) from public, anon;
grant execute on function public.respond_seat_request(uuid, boolean, text) to authenticated;

-- 3. RF12: el pasajero cancela su solicitud o su reserva antes de que el
--    viaje inicie. Si estaba confirmada, el cupo vuelve a quedar libre.
--    Debe coincidir con HORAS_CANCELACION_POCA_ANTELACION en constants/config.ts.
create or replace function public.cancel_seat_request(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitud public.seat_requests%rowtype;
  viaje public.trips%rowtype;
begin
  select * into solicitud from public.seat_requests where seat_requests.id = p_solicitud_id for update;
  if not found or solicitud.pasajero_id is distinct from auth.uid() then
    raise exception 'Esta solicitud no existe o no es tuya.';
  end if;
  if solicitud.estado not in ('pendiente', 'aceptada') then
    raise exception 'Esta solicitud ya no está activa.';
  end if;

  select * into viaje from public.trips where trips.id = solicitud.viaje_id for update;
  if viaje.estado in ('en_curso', 'finalizado') or viaje.fecha_hora_salida <= now() then
    raise exception 'El viaje ya inició, así que no puedes cancelar.';
  end if;

  if solicitud.estado = 'aceptada' then
    perform set_config('wheele.ajuste_cupos', 'on', true);
    update public.trips set cupos_disponibles = cupos_disponibles + 1 where trips.id = viaje.id;
    perform set_config('wheele.ajuste_cupos', 'off', true);
  end if;

  update public.seat_requests
  set estado = 'cancelada',
      cancelada_por = 'pasajero',
      fecha_cancelacion = timezone('utc', now()),
      cancelada_con_poca_antelacion =
        solicitud.estado = 'aceptada' and viaje.fecha_hora_salida - now() < interval '2 hours'
  where seat_requests.id = solicitud.id;
end;
$$;

revoke all on function public.cancel_seat_request(uuid) from public, anon;
grant execute on function public.cancel_seat_request(uuid) to authenticated;

-- 4. RF6 / RF11: si el conductor cancela el viaje, se cierran sus
--    solicitudes pendientes y reservas confirmadas.
create or replace function public.close_requests_of_cancelled_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cancelado' and old.estado <> 'cancelado' then
    update public.seat_requests
    set estado = 'cancelada',
        cancelada_por = 'viaje',
        fecha_cancelacion = timezone('utc', now())
    where seat_requests.viaje_id = new.id
      and seat_requests.estado in ('pendiente', 'aceptada');
  end if;
  return null;
end;
$$;

create trigger trips_close_requests_on_cancel
after update of estado on public.trips
for each row execute function public.close_requests_of_cancelled_trip();

-- 5. RF7: viajes como pasajero, con la ultima solicitud de cada viaje. La
--    placa solo llega con la reserva confirmada, para reconocer el carro.
create or replace function public.get_my_seat_requests()
returns table (
  solicitud_id uuid,
  viaje_id uuid,
  estado public.seat_request_status,
  mensaje text,
  motivo_rechazo text,
  cancelada_por text,
  cancelada_con_poca_antelacion boolean,
  distancia_proximidad_metros integer,
  partida_latitud double precision,
  partida_longitud double precision,
  fecha_solicitud timestamptz,
  origen_nombre text,
  destino_nombre text,
  numero_paradas integer,
  fecha_hora_salida timestamptz,
  cupos_totales smallint,
  cupos_disponibles smallint,
  aporte_sugerido integer,
  distancia_metros integer,
  duracion_segundos integer,
  viaje_estado public.trip_status,
  conductor_id uuid,
  conductor_nombre text,
  conductor_foto text,
  conductor_promedio numeric,
  vehiculo_placa text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct on (seat_requests.viaje_id)
    seat_requests.id,
    seat_requests.viaje_id,
    seat_requests.estado,
    seat_requests.mensaje,
    seat_requests.motivo_rechazo,
    seat_requests.cancelada_por,
    seat_requests.cancelada_con_poca_antelacion,
    seat_requests.distancia_proximidad_metros,
    extensions.st_y(seat_requests.punto_partida::extensions.geometry),
    extensions.st_x(seat_requests.punto_partida::extensions.geometry),
    seat_requests.created_at,
    trips.origen_nombre,
    trips.destino_nombre,
    jsonb_array_length(trips.paradas),
    trips.fecha_hora_salida,
    trips.cupos_totales,
    trips.cupos_disponibles,
    trips.aporte_sugerido,
    trips.distancia_metros,
    trips.duracion_segundos,
    trips.estado,
    conductor.id,
    conductor.nombre_completo,
    conductor.foto_perfil_url,
    conductor.promedio_calificacion,
    case when seat_requests.estado = 'aceptada' then vehicles.placa end
  from public.seat_requests
  join public.trips on trips.id = seat_requests.viaje_id
  join public.profiles as conductor on conductor.id = trips.conductor_id
  left join public.vehicles on vehicles.id = trips.vehiculo_id
  where seat_requests.pasajero_id = auth.uid()
  order by seat_requests.viaje_id, seat_requests.created_at desc;
$$;

revoke all on function public.get_my_seat_requests() from public, anon;
grant execute on function public.get_my_seat_requests() to authenticated;

-- 6. RF11: solicitudes recibidas por el conductor, con el perfil publico de
--    cada pasajero (sin correo ni codigo). Sin viaje, trae las de sus viajes
--    publicados que aun no salen; con viaje, solo las de ese viaje.
create or replace function public.get_trip_requests(p_viaje_id uuid default null)
returns table (
  solicitud_id uuid,
  viaje_id uuid,
  estado public.seat_request_status,
  mensaje text,
  motivo_rechazo text,
  cancelada_por text,
  distancia_proximidad_metros integer,
  fecha_solicitud timestamptz,
  pasajero_id uuid,
  pasajero_nombre text,
  pasajero_programa text,
  pasajero_foto text,
  pasajero_promedio numeric,
  pasajero_total_viajes integer,
  origen_nombre text,
  destino_nombre text,
  fecha_hora_salida timestamptz,
  cupos_totales smallint,
  cupos_disponibles smallint,
  viaje_estado public.trip_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    seat_requests.id,
    seat_requests.viaje_id,
    seat_requests.estado,
    seat_requests.mensaje,
    seat_requests.motivo_rechazo,
    seat_requests.cancelada_por,
    seat_requests.distancia_proximidad_metros,
    seat_requests.created_at,
    pasajero.id,
    pasajero.nombre_completo,
    pasajero.programa_academico,
    pasajero.foto_perfil_url,
    pasajero.promedio_calificacion,
    pasajero.total_viajes,
    trips.origen_nombre,
    trips.destino_nombre,
    trips.fecha_hora_salida,
    trips.cupos_totales,
    trips.cupos_disponibles,
    trips.estado
  from public.seat_requests
  join public.trips on trips.id = seat_requests.viaje_id
  join public.profiles as pasajero on pasajero.id = seat_requests.pasajero_id
  where trips.conductor_id = auth.uid()
    and (
      (p_viaje_id is null and trips.estado = 'publicado' and trips.fecha_hora_salida > now())
      or trips.id = p_viaje_id
    )
  order by
    trips.fecha_hora_salida,
    case seat_requests.estado
      when 'pendiente' then 0
      when 'aceptada' then 1
      when 'rechazada' then 2
      else 3
    end,
    seat_requests.created_at;
$$;

revoke all on function public.get_trip_requests(uuid) from public, anon;
grant execute on function public.get_trip_requests(uuid) to authenticated;
