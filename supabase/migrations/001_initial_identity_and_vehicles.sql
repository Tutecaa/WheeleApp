-- WHEEL-E - WE-35
-- Modelo inicial para identidad UIS y habilitacion de conductores.
-- Viajes, reservas y calificaciones se agregaran en migraciones posteriores.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('pasajero', 'conductor', 'administrador');
create type public.user_status as enum (
  'pendiente_confirmacion',
  'activo',
  'sancionado',
  'inactivo'
);
create type public.vehicle_approval_status as enum ('pendiente', 'aprobado', 'rechazado');

create or replace function public.is_institutional_email(email text)
returns boolean
language sql
immutable
as $$
  select lower(email) ~ '^[^[:space:]@]+@(uis\.edu\.co|correo\.uis\.edu\.co)$';
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null check (char_length(trim(nombre_completo)) >= 3),
  codigo_institucional text not null unique,
  correo_institucional text not null unique
    check (public.is_institutional_email(correo_institucional)),
  programa_academico text not null,
  foto_perfil_url text,
  rol public.user_role not null default 'pasajero',
  estado public.user_status not null default 'pendiente_confirmacion',
  correo_verificado boolean not null default false,
  promedio_calificacion numeric(2, 1) not null default 0
    check (promedio_calificacion between 0 and 5),
  total_viajes integer not null default 0
    check (total_viajes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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
    estado_habilitacion = 'pendiente'
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger vehicle_documents_set_updated_at
before update on public.vehicle_documents
for each row execute function public.set_updated_at();

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
    correo_verificado
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''),
    coalesce(new.raw_user_meta_data ->> 'codigo_institucional', ''),
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'programa_academico', ''),
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'administrador'
      and estado = 'activo'
  );
$$;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_documents enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and rol = (select rol from public.profiles where id = auth.uid())
  and estado = (select estado from public.profiles where id = auth.uid())
);

create policy "Administrators can view profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

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
with check (conductor_id = auth.uid());

create policy "Users can update pending vehicles"
on public.vehicles for update
to authenticated
using (conductor_id = auth.uid() and estado_habilitacion = 'pendiente')
with check (conductor_id = auth.uid() and estado_habilitacion = 'pendiente');

create policy "Administrators can review vehicles"
on public.vehicles for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and (
    estado_habilitacion = 'pendiente'
    or (
      estado_habilitacion in ('aprobado', 'rechazado')
      and revisado_por_admin_id = auth.uid()
      and fecha_revision is not null
    )
  )
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

create policy "Users can add documents to their own pending vehicle"
on public.vehicle_documents for insert
to authenticated
with check (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_documents.vehiculo_id
      and vehicles.conductor_id = auth.uid()
      and vehicles.estado_habilitacion = 'pendiente'
  )
);

create policy "Administrators can review vehicle documents"
on public.vehicle_documents for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index vehicles_conductor_id_idx on public.vehicles(conductor_id);
create index vehicles_status_idx on public.vehicles(estado_habilitacion);
