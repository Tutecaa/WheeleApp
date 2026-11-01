-- WHEEL-E - WE-27 (Sprint 4)
-- Bandeja de notificaciones dentro de la app (RF15). Las crean triggers
-- cuando pasa cada evento; la app solo las lee y las marca como leidas.
-- Depende de 001, 002 (vehicles), 004 (trips), 006 (seat_requests) y
-- 007 (trip_passengers, estado finalizado).
--
-- Eventos: nueva solicitud, solicitud aceptada o rechazada, cancelacion de
-- una solicitud, de una reserva o del viaje, cambios en un viaje con
-- reservas confirmadas, decision de habilitacion (RF16), recordatorio de
-- salida y calificacion disponible.
-- Cada notificacion guarda los datos del evento (lugares, hora, nombres,
-- motivo) y la app arma el texto, asi la hora se muestra en la zona del
-- celular.

create type public.notification_type as enum (
  'solicitud_nueva',
  'solicitud_aceptada',
  'solicitud_rechazada',
  'solicitud_retirada',
  'reserva_cancelada',
  'viaje_cancelado',
  'viaje_modificado',
  'recordatorio_salida',
  'calificacion_disponible',
  'habilitacion_aprobada',
  'habilitacion_rechazada'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  tipo public.notification_type not null,
  -- A donde lleva la notificacion al abrirla.
  viaje_id uuid references public.trips(id) on delete cascade,
  solicitud_id uuid references public.seat_requests(id) on delete cascade,
  vehiculo_id uuid references public.vehicles(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  -- Identifica el evento. Si el mismo evento se reporta dos veces, no se
  -- duplica la notificacion (RF15).
  clave text not null,
  leida boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint one_notification_per_event unique (usuario_id, clave)
);

create index notifications_usuario_created_idx on public.notifications(usuario_id, created_at desc);
create index notifications_unread_idx on public.notifications(usuario_id) where not leida;

alter table public.notifications enable row level security;

-- Cada usuario ve solo las suyas. Se crean con triggers y se marcan como
-- leidas con mark_notifications_read.
create policy "Users can view their own notifications"
on public.notifications for select
to authenticated
using (usuario_id = auth.uid());

-- Crea una notificacion. No se envian a cuentas suspendidas o inactivas, y
-- un evento repetido no se duplica.
create or replace function public.notify(
  p_usuario_id uuid,
  p_tipo public.notification_type,
  p_clave text,
  p_datos jsonb default '{}'::jsonb,
  p_viaje_id uuid default null,
  p_solicitud_id uuid default null,
  p_vehiculo_id uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (usuario_id, tipo, clave, datos, viaje_id, solicitud_id, vehiculo_id)
  select p_usuario_id, p_tipo, p_clave, coalesce(p_datos, '{}'::jsonb), p_viaje_id, p_solicitud_id, p_vehiculo_id
  where exists (
    select 1 from public.profiles
    where profiles.id = p_usuario_id and profiles.estado = 'activo'
  )
  on conflict (usuario_id, clave) do nothing;
$$;

revoke all on function public.notify(uuid, public.notification_type, text, jsonb, uuid, uuid, uuid) from public, anon, authenticated;

-- Datos del viaje que acompanan a casi todas las notificaciones.
create or replace function public.trip_notification_data(p_viaje_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'origen', trips.origen_nombre,
    'destino', trips.destino_nombre,
    'salida', trips.fecha_hora_salida
  )
  from public.trips
  where trips.id = p_viaje_id;
$$;

revoke all on function public.trip_notification_data(uuid) from public, anon, authenticated;

-- 1. Solicitudes de cupo (RF10, RF11, RF12; RF6 al cancelar el viaje).
create or replace function public.notify_seat_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conductor uuid;
  motivo_viaje text;
  datos jsonb;
begin
  select trips.conductor_id, trips.motivo_cancelacion into conductor, motivo_viaje
  from public.trips
  where trips.id = new.viaje_id;

  datos := public.trip_notification_data(new.viaje_id) || jsonb_build_object(
    'pasajero', (select profiles.nombre_completo from public.profiles where profiles.id = new.pasajero_id)
  );

  if tg_op = 'INSERT' then
    perform public.notify(
      conductor, 'solicitud_nueva', 'solicitud_nueva:' || new.id,
      datos || jsonb_build_object('mensaje', new.mensaje), new.viaje_id, new.id
    );
  elsif new.estado is distinct from old.estado then
    if new.estado = 'aceptada' then
      perform public.notify(
        new.pasajero_id, 'solicitud_aceptada', 'solicitud_aceptada:' || new.id, datos, new.viaje_id, new.id
      );
    elsif new.estado = 'rechazada' then
      perform public.notify(
        new.pasajero_id, 'solicitud_rechazada', 'solicitud_rechazada:' || new.id,
        datos || jsonb_build_object('motivo', new.motivo_rechazo), new.viaje_id, new.id
      );
    elsif new.estado = 'cancelada' and new.cancelada_por = 'pasajero' then
      perform public.notify(
        conductor,
        case when old.estado = 'aceptada'
          then 'reserva_cancelada'::public.notification_type
          else 'solicitud_retirada'::public.notification_type
        end,
        'solicitud_cancelada:' || new.id,
        datos || jsonb_build_object('poca_antelacion', new.cancelada_con_poca_antelacion),
        new.viaje_id, new.id
      );
    elsif new.estado = 'cancelada' and new.cancelada_por = 'viaje' then
      perform public.notify(
        new.pasajero_id, 'viaje_cancelado', 'viaje_cancelado:' || new.viaje_id,
        datos || jsonb_build_object('motivo', motivo_viaje), new.viaje_id, new.id
      );
    end if;
  end if;
  return null;
end;
$$;

create trigger seat_requests_notify
after insert or update of estado on public.seat_requests
for each row execute function public.notify_seat_request_change();

-- 2. Viajes: cambios con reservas confirmadas (RF6) y calificacion
--    disponible al finalizar (RF13).
create or replace function public.notify_trip_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pasajero uuid;
  datos jsonb := jsonb_build_object(
    'origen', new.origen_nombre,
    'destino', new.destino_nombre,
    'salida', new.fecha_hora_salida
  );
begin
  -- Solo cuentan los cambios que hace el conductor al editar; aceptar o
  -- cancelar reservas cambia los cupos disponibles y no avisa a todos.
  if old.estado = 'publicado' and new.estado = 'publicado' and (
    new.fecha_hora_salida is distinct from old.fecha_hora_salida
    or new.origen_nombre is distinct from old.origen_nombre
    or new.destino_nombre is distinct from old.destino_nombre
    or new.paradas is distinct from old.paradas
    or new.aporte_sugerido is distinct from old.aporte_sugerido
    or new.vehiculo_id is distinct from old.vehiculo_id
    or extensions.st_asbinary(new.trazado) is distinct from extensions.st_asbinary(old.trazado)
  ) then
    for pasajero in select public.trip_passengers(new.id) loop
      perform public.notify(
        pasajero, 'viaje_modificado',
        'viaje_modificado:' || new.id || ':' || extract(epoch from new.updated_at)::bigint,
        datos || jsonb_build_object('salida_anterior', old.fecha_hora_salida), new.id
      );
    end loop;
  end if;

  if new.estado = 'finalizado' and old.estado <> 'finalizado' then
    perform public.notify(
      new.conductor_id, 'calificacion_disponible', 'calificar:' || new.id,
      datos || jsonb_build_object('rol', 'conductor'), new.id
    );
    for pasajero in select public.trip_passengers(new.id) loop
      perform public.notify(
        pasajero, 'calificacion_disponible', 'calificar:' || new.id,
        datos || jsonb_build_object('rol', 'pasajero'), new.id
      );
    end loop;
  end if;
  return null;
end;
$$;

create trigger trips_notify
after update on public.trips
for each row execute function public.notify_trip_change();

-- 3. RF16: decision del administrador sobre la habilitacion de un vehiculo.
create or replace function public.notify_vehicle_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estado_habilitacion = 'pendiente' and new.estado_habilitacion in ('aprobado', 'rechazado') then
    perform public.notify(
      new.conductor_id,
      case when new.estado_habilitacion = 'aprobado'
        then 'habilitacion_aprobada'::public.notification_type
        else 'habilitacion_rechazada'::public.notification_type
      end,
      'habilitacion:' || new.id || ':' || extract(epoch from coalesce(new.fecha_revision, now()))::bigint,
      jsonb_build_object('placa', new.placa, 'motivo', new.motivo_rechazo),
      null, null, new.id
    );
  end if;
  return null;
end;
$$;

create trigger vehicles_notify_review
after update of estado_habilitacion on public.vehicles
for each row execute function public.notify_vehicle_review();

-- 4. Recordatorio de salida: viajes que salen en la proxima hora, para el
--    conductor y sus pasajeros confirmados. Debe coincidir con
--    MINUTOS_RECORDATORIO_SALIDA en constants/config.ts (provisional).
--    La app lo pide para el usuario cada vez que consulta sus notificaciones.
create or replace function public.create_my_departure_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  viaje record;
begin
  if usuario is null then
    return;
  end if;

  for viaje in
    select trips.id, trips.conductor_id
    from public.trips
    where trips.estado = 'publicado'
      and trips.fecha_hora_salida > now()
      and trips.fecha_hora_salida <= now() + interval '60 minutes'
      and (
        trips.conductor_id = usuario
        or usuario in (select public.trip_passengers(trips.id))
      )
  loop
    perform public.notify(
      usuario, 'recordatorio_salida', 'recordatorio:' || viaje.id,
      public.trip_notification_data(viaje.id) || jsonb_build_object(
        'rol', case when viaje.conductor_id = usuario then 'conductor' else 'pasajero' end
      ),
      viaje.id
    );
  end loop;
end;
$$;

revoke all on function public.create_my_departure_reminders() from public, anon;
grant execute on function public.create_my_departure_reminders() to authenticated;

-- 5. Marca como leidas las notificaciones indicadas, o todas si no se indica ninguna.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set leida = true
  where notifications.usuario_id = auth.uid()
    and not notifications.leida
    and (p_ids is null or notifications.id = any(p_ids));
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
