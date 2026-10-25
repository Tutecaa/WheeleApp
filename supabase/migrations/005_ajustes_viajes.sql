-- WHEEL-E - WE-18 / WE-19
-- Ajustes a 004_viajes.sql (ya aplicada) para modificar y cancelar un viaje (RF6).
-- Depende de 004_viajes.sql.

-- 1. Cupos al editar. Las reservas confirmadas son cupos_totales menos
--    cupos_disponibles. Si el conductor cambia los cupos totales, los
--    disponibles se recalculan y no pueden quedar por debajo de cero (RF6:
--    no se reducen los cupos por debajo de las reservas confirmadas).
--    El conductor no puede cambiar cupos_disponibles a mano: solo lo hacen
--    las funciones de solicitudes (Sprint 4), que activan para su transaccion
--    el ajuste `wheele.ajuste_cupos`.
create or replace function public.validate_trip()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  puestos smallint;
  reservados integer;
begin
  if tg_op = 'INSERT' then
    -- Al publicar, todos los cupos estan libres.
    new.estado = 'publicado';
    new.cupos_disponibles = new.cupos_totales;
  else
    reservados = old.cupos_totales - old.cupos_disponibles;
    if new.cupos_totales <> old.cupos_totales then
      new.cupos_disponibles = new.cupos_totales - reservados;
      if new.cupos_disponibles < 0 then
        raise exception 'No puedes dejar menos de % cupos: ya hay % reservas confirmadas.', reservados, reservados;
      end if;
    elsif new.cupos_disponibles <> old.cupos_disponibles
          and coalesce(current_setting('wheele.ajuste_cupos', true), '') <> 'on' then
      new.cupos_disponibles = old.cupos_disponibles;
    end if;
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

-- 2. Motivo de cancelacion con un largo razonable.
--    Debe coincidir con LONGITUD_MAXIMA_MOTIVO_CANCELACION en constants/config.ts.
alter table public.trips
add constraint trip_cancel_reason_length check (
  motivo_cancelacion is null or char_length(motivo_cancelacion) <= 300
);
