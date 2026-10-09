-- WE-10: activar el perfil cuando Supabase confirma el correo institucional.

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
