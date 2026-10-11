-- WHEEL-E - WE-35
-- Perfiles e identidad UIS.
-- WE-10: activar el perfil cuando Supabase confirma el correo institucional.

create extension if not exists "pgcrypto";

-- No hay rol "conductor": es conductor quien tenga un vehiculo aprobado
-- (ver is_enabled_driver en 002). Un mismo usuario puede ser conductor y pasajero.
create type public.user_role as enum ('pasajero', 'administrador');
create type public.user_status as enum (
  'pendiente_confirmacion',
  'activo',
  'sancionado',
  'inactivo'
);

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

create or replace function public.handle_user_email_confirmation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email_confirmed_at <> new.email_confirmed_at) then
    update public.profiles
    set correo_verificado = true,
        estado = 'activo',
        updated_at = timezone('utc', now())
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
after update of email_confirmed_at on auth.users
for each row execute function public.handle_user_email_confirmation();

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

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- El usuario solo edita sus datos personales; rol, estado, verificacion y
-- estadisticas los cambian los triggers o el administrador.
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and rol = (select rol from public.profiles where id = auth.uid())
  and estado = (select estado from public.profiles where id = auth.uid())
  and correo_verificado = (select correo_verificado from public.profiles where id = auth.uid())
  and promedio_calificacion = (select promedio_calificacion from public.profiles where id = auth.uid())
  and total_viajes = (select total_viajes from public.profiles where id = auth.uid())
);

create policy "Administrators can view profiles"
on public.profiles for select
to authenticated
using (public.is_admin());
