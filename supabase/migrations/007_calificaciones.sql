-- WHEEL-E - WE-26 (Sprint 4)
-- Iniciar y finalizar un viaje (tarea del alcance sin historia propia) y
-- calificar a los participantes de un viaje finalizado (RF13). Tambien los
-- comentarios del perfil publico (RF14).
-- Depende de 001_perfiles.sql, 004_viajes.sql y 006_solicitudes.sql.
--
-- Valores provisionales (contexto-proyecto.md, seccion 17). Deben coincidir
-- con constants/config.ts:
--   MINUTOS_ANTES_PARA_INICIAR_VIAJE = 30
--   HORAS_DESPUES_PARA_INICIAR_VIAJE = 12
--   DIAS_PLAZO_CALIFICAR = 7
--   LONGITUD_MAXIMA_COMENTARIO_CALIFICACION = 300

-- 1. Cuando inicio y cuando termino cada viaje.
alter table public.trips
add column fecha_inicio timestamptz,
add column fecha_finalizacion timestamptz;

-- Pasajeros confirmados de un viaje: sus solicitudes aceptadas.
create or replace function public.trip_passengers(p_viaje_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select seat_requests.pasajero_id
  from public.seat_requests
  where seat_requests.viaje_id = p_viaje_id
    and seat_requests.estado = 'aceptada';
$$;

revoke all on function public.trip_passengers(uuid) from public, anon, authenticated;

-- 2. El conductor inicia el viaje desde 30 minutos antes de la salida y hasta
--    12 horas despues. Desde ahi ya no se edita ni se cancela (RF6).
create or replace function public.start_trip(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viaje public.trips%rowtype;
begin
  select * into viaje from public.trips where trips.id = p_viaje_id for update;
  if not found or viaje.conductor_id is distinct from auth.uid() then
    raise exception 'Solo el conductor del viaje puede iniciarlo.';
  end if;
  if viaje.estado <> 'publicado' then
    raise exception 'Este viaje ya inició, finalizó o fue cancelado.';
  end if;
  if now() < viaje.fecha_hora_salida - interval '30 minutes' then
    raise exception 'Podrás iniciar el viaje desde 30 minutos antes de la salida.';
  end if;
  if now() > viaje.fecha_hora_salida + interval '12 hours' then
    raise exception 'Pasaron más de 12 horas desde la salida, así que este viaje ya no se puede iniciar.';
  end if;

  update public.trips
  set estado = 'en_curso', fecha_inicio = timezone('utc', now())
  where trips.id = p_viaje_id;
end;
$$;

revoke all on function public.start_trip(uuid) from public, anon;
grant execute on function public.start_trip(uuid) to authenticated;

-- 3. El conductor finaliza el viaje en curso. Cuenta un viaje realizado para
--    el conductor y para cada pasajero confirmado, y abre las calificaciones.
create or replace function public.finish_trip(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viaje public.trips%rowtype;
begin
  select * into viaje from public.trips where trips.id = p_viaje_id for update;
  if not found or viaje.conductor_id is distinct from auth.uid() then
    raise exception 'Solo el conductor del viaje puede finalizarlo.';
  end if;
  if viaje.estado <> 'en_curso' then
    raise exception 'Solo se puede finalizar un viaje que está en curso.';
  end if;

  update public.trips
  set estado = 'finalizado', fecha_finalizacion = timezone('utc', now())
  where trips.id = p_viaje_id;

  update public.profiles
  set total_viajes = total_viajes + 1
  where profiles.id = viaje.conductor_id
     or profiles.id in (select public.trip_passengers(p_viaje_id));
end;
$$;

revoke all on function public.finish_trip(uuid) from public, anon;
grant execute on function public.finish_trip(uuid) to authenticated;

-- 4. RF13: calificaciones. El conductor califica a cada pasajero confirmado
--    y cada pasajero califica al conductor, una vez por viaje.
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.trips(id) on delete cascade,
  evaluador_id uuid not null references public.profiles(id) on delete cascade,
  evaluado_id uuid not null references public.profiles(id) on delete cascade,
  puntuacion smallint not null check (puntuacion between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 300),
  created_at timestamptz not null default timezone('utc', now()),
  constraint rating_not_self check (evaluador_id <> evaluado_id),
  constraint one_rating_per_participant unique (viaje_id, evaluador_id, evaluado_id)
);

create index ratings_evaluado_id_idx on public.ratings(evaluado_id, created_at desc);

alter table public.ratings enable row level security;

-- Cada uno ve las calificaciones que hizo y las que recibio. Los comentarios
-- publicos se leen con get_profile_reviews. Solo se crean con rate_participant.
create policy "Users can view ratings they gave or received"
on public.ratings for select
to authenticated
using (evaluador_id = auth.uid() or evaluado_id = auth.uid());

create policy "Administrators can view ratings"
on public.ratings for select
to authenticated
using (public.is_admin());

-- Personas que el usuario puede calificar en un viaje finalizado: el
-- conductor a sus pasajeros confirmados; el pasajero confirmado, al conductor.
create or replace function public.rating_targets(p_viaje_id uuid, p_usuario_id uuid)
returns table (persona_id uuid, rol text)
language sql
stable
security definer
set search_path = public
as $$
  select pasajero_id, 'pasajero'::text
  from public.trip_passengers(p_viaje_id) as pasajero_id
  where exists (
    select 1 from public.trips
    where trips.id = p_viaje_id and trips.conductor_id = p_usuario_id
  )
  union all
  select trips.conductor_id, 'conductor'::text
  from public.trips
  where trips.id = p_viaje_id
    and p_usuario_id in (select public.trip_passengers(p_viaje_id));
$$;

revoke all on function public.rating_targets(uuid, uuid) from public, anon, authenticated;

create or replace function public.rate_participant(
  p_viaje_id uuid,
  p_evaluado_id uuid,
  p_puntuacion integer,
  p_comentario text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
  viaje public.trips%rowtype;
  comentario_limpio text := nullif(trim(coalesce(p_comentario, '')), '');
begin
  select * into viaje from public.trips where trips.id = p_viaje_id;
  if not found or not exists (
    select 1 from public.rating_targets(p_viaje_id, usuario) as objetivo
    where objetivo.persona_id = p_evaluado_id
  ) then
    raise exception 'Solo los participantes del viaje pueden calificarse entre sí.';
  end if;
  if viaje.estado <> 'finalizado' then
    raise exception 'Solo puedes calificar cuando el viaje haya finalizado.';
  end if;
  if now() > viaje.fecha_finalizacion + interval '7 days' then
    raise exception 'Venció el plazo para calificar este viaje.';
  end if;
  if p_puntuacion is null or p_puntuacion not between 1 and 5 then
    raise exception 'Elige una nota de 1 a 5 estrellas.';
  end if;
  if char_length(comentario_limpio) > 300 then
    raise exception 'El comentario puede tener hasta 300 caracteres.';
  end if;

  insert into public.ratings (viaje_id, evaluador_id, evaluado_id, puntuacion, comentario)
  values (p_viaje_id, usuario, p_evaluado_id, p_puntuacion, comentario_limpio);

  -- El promedio del calificado se recalcula con todas sus calificaciones.
  update public.profiles
  set promedio_calificacion = (
    select round(avg(ratings.puntuacion), 1)
    from public.ratings
    where ratings.evaluado_id = p_evaluado_id
  )
  where profiles.id = p_evaluado_id;
exception
  when unique_violation then
    raise exception 'Ya calificaste a esta persona en este viaje.';
end;
$$;

revoke all on function public.rate_participant(uuid, uuid, integer, text) from public, anon;
grant execute on function public.rate_participant(uuid, uuid, integer, text) to authenticated;

-- 5. Pantalla de calificar: a quien puede calificar el usuario en el viaje,
--    con sus datos publicos y la calificacion que ya le dio, si existe.
create or replace function public.get_rating_targets(p_viaje_id uuid)
returns table (
  persona_id uuid,
  rol text,
  nombre_completo text,
  programa_academico text,
  foto_perfil_url text,
  promedio_calificacion numeric,
  puntuacion smallint,
  comentario text,
  viaje_estado public.trip_status,
  fecha_finalizacion timestamptz,
  origen_nombre text,
  destino_nombre text,
  fecha_hora_salida timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    objetivo.persona_id,
    objetivo.rol,
    persona.nombre_completo,
    persona.programa_academico,
    persona.foto_perfil_url,
    persona.promedio_calificacion,
    ratings.puntuacion,
    ratings.comentario,
    trips.estado,
    trips.fecha_finalizacion,
    trips.origen_nombre,
    trips.destino_nombre,
    trips.fecha_hora_salida
  from public.rating_targets(p_viaje_id, auth.uid()) as objetivo
  join public.profiles as persona on persona.id = objetivo.persona_id
  join public.trips on trips.id = p_viaje_id
  left join public.ratings
    on ratings.viaje_id = p_viaje_id
   and ratings.evaluador_id = auth.uid()
   and ratings.evaluado_id = objetivo.persona_id
  order by objetivo.rol, persona.nombre_completo;
$$;

revoke all on function public.get_rating_targets(uuid) from public, anon;
grant execute on function public.get_rating_targets(uuid) to authenticated;

-- 6. RF14: comentarios recibidos por un usuario activo, del mas reciente al
--    mas antiguo, con el nombre y la foto de quien califico.
create or replace function public.get_profile_reviews(p_usuario_id uuid)
returns table (
  id uuid,
  puntuacion smallint,
  comentario text,
  created_at timestamptz,
  evaluador_id uuid,
  evaluador_nombre text,
  evaluador_foto text,
  evaluador_rol text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ratings.id,
    ratings.puntuacion,
    ratings.comentario,
    ratings.created_at,
    evaluador.id,
    evaluador.nombre_completo,
    evaluador.foto_perfil_url,
    case when trips.conductor_id = ratings.evaluador_id then 'conductor' else 'pasajero' end
  from public.ratings
  join public.profiles as evaluado on evaluado.id = ratings.evaluado_id
  join public.profiles as evaluador on evaluador.id = ratings.evaluador_id
  join public.trips on trips.id = ratings.viaje_id
  where ratings.evaluado_id = p_usuario_id
    and evaluado.estado = 'activo'
    and auth.uid() is not null
  order by ratings.created_at desc
  limit 30;
$$;

revoke all on function public.get_profile_reviews(uuid) from public, anon;
grant execute on function public.get_profile_reviews(uuid) to authenticated;
