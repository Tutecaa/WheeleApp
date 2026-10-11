-- WHEEL-E - WE-35
-- Vehiculos, documentos y habilitacion de conductores (RF3, RF16).
-- Depende de 001_perfiles.sql (profiles, set_updated_at, is_admin).

-- pendiente -> aprobado / rechazado; cancelado cuando el usuario retira la solicitud.
create type public.vehicle_approval_status as enum (
  'pendiente',
  'aprobado',
  'rechazado',
  'cancelado'
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references public.profiles(id) on delete restrict,
  placa text not null unique check (char_length(trim(placa)) between 5 and 8),
  marca text not null,
  linea text not null,
  modelo smallint not null check (modelo between 1950 and 2100),
  color text not null,
  numero_puestos smallint not null check (numero_puestos between 1 and 50),
  estado_habilitacion public.vehicle_approval_status not null default 'pendiente',
  motivo_rechazo text,
  revisado_por_admin_id uuid references public.profiles(id) on delete set null,
  fecha_registro timestamptz not null default timezone('utc', now()),
  fecha_revision timestamptz,
  constraint rejected_vehicle_requires_reason check (
    estado_habilitacion <> 'rechazado'
    or char_length(trim(coalesce(motivo_rechazo, ''))) >= 3
  ),
  constraint reviewed_vehicle_requires_date check (
    estado_habilitacion in ('pendiente', 'cancelado')
    or fecha_revision is not null
  )
);

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null unique references public.vehicles(id) on delete cascade,
  soat_path text not null,
  rtm_path text not null,
  licencia_conduccion_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger vehicle_documents_set_updated_at
before update on public.vehicle_documents
for each row execute function public.set_updated_at();

-- Cuando el dueno edita su vehiculo (reenviar tras un rechazo o retirar la
-- solicitud) se borran los datos de la revision anterior. Asi el usuario no
-- puede marcar una revision a mano y el reenvio queda limpio para el admin.
create or replace function public.reset_vehicle_review_on_owner_update()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    new.revisado_por_admin_id = null;
    new.fecha_revision = null;
    new.motivo_rechazo = null;
  end if;
  return new;
end;
$$;

create trigger vehicles_reset_review_on_owner_update
before update on public.vehicles
for each row execute function public.reset_vehicle_review_on_owner_update();

-- Conductor habilitado: usuario activo con al menos un vehiculo aprobado.
-- La usaran la publicacion de viajes (003) y la app.
create or replace function public.is_enabled_driver(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.vehicles
    join public.profiles on profiles.id = vehicles.conductor_id
    where vehicles.conductor_id = user_id
      and vehicles.estado_habilitacion = 'aprobado'
      and profiles.estado = 'activo'
  );
$$;

alter table public.vehicles enable row level security;
alter table public.vehicle_documents enable row level security;

create policy "Users can view their own vehicles"
on public.vehicles for select
to authenticated
using (conductor_id = auth.uid());

create policy "Administrators can view vehicles"
on public.vehicles for select
to authenticated
using (public.is_admin());

create policy "Users can register their own vehicles"
on public.vehicles for insert
to authenticated
with check (conductor_id = auth.uid() and estado_habilitacion = 'pendiente');

-- El dueno edita mientras el vehiculo no este aprobado: corrige y reenvia
-- (queda pendiente) o retira la solicitud (queda cancelado).
create policy "Users can update their own unapproved vehicles"
on public.vehicles for update
to authenticated
using (conductor_id = auth.uid() and estado_habilitacion <> 'aprobado')
with check (
  conductor_id = auth.uid()
  and estado_habilitacion in ('pendiente', 'cancelado')
);

-- El admin solo decide sobre solicitudes pendientes: no sobre las canceladas
-- ni sobre las que ya resolvio otro administrador.
create policy "Administrators can review pending vehicles"
on public.vehicles for update
to authenticated
using (public.is_admin() and estado_habilitacion = 'pendiente')
with check (
  public.is_admin()
  and estado_habilitacion in ('aprobado', 'rechazado')
  and revisado_por_admin_id = auth.uid()
  and fecha_revision is not null
);

create policy "Users can view their own vehicle documents"
on public.vehicle_documents for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_documents.vehiculo_id
      and vehicles.conductor_id = auth.uid()
  )
);

create policy "Administrators can view vehicle documents"
on public.vehicle_documents for select
to authenticated
using (public.is_admin());

create policy "Users can add documents to their own unapproved vehicle"
on public.vehicle_documents for insert
to authenticated
with check (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_documents.vehiculo_id
      and vehicles.conductor_id = auth.uid()
      and vehicles.estado_habilitacion <> 'aprobado'
  )
);

-- Permite volver a cargar los documentos despues de un rechazo.
create policy "Users can replace documents of their own unapproved vehicle"
on public.vehicle_documents for update
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_documents.vehiculo_id
      and vehicles.conductor_id = auth.uid()
      and vehicles.estado_habilitacion <> 'aprobado'
  )
)
with check (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_documents.vehiculo_id
      and vehicles.conductor_id = auth.uid()
      and vehicles.estado_habilitacion <> 'aprobado'
  )
);

create policy "Administrators can review vehicle documents"
on public.vehicle_documents for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index vehicles_conductor_id_idx on public.vehicles(conductor_id);
create index vehicles_status_idx on public.vehicles(estado_habilitacion);

-- Archivos del SOAT, la revision tecnomecanica y la licencia (Supabase Storage).
-- Ruta de cada archivo: <id_usuario>/<id_vehiculo>/<archivo>.
-- Limite de tamano y formatos provisionales: acordarlos con el equipo
-- (contexto-proyecto.md, seccion 17).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-vehiculos',
  'documentos-vehiculos',
  false,
  5242880, -- 5 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "Users can upload their own vehicle files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documentos-vehiculos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own vehicle files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documentos-vehiculos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can replace their own vehicle files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documentos-vehiculos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documentos-vehiculos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own vehicle files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documentos-vehiculos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Administrators can view vehicle files"
on storage.objects for select
to authenticated
using (bucket_id = 'documentos-vehiculos' and public.is_admin());
