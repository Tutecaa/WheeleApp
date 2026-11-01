import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { urlFotoPerfil } from "@/services/perfiles.service";
import {
  LONGITUD_MAXIMA_MENSAJE_SOLICITUD,
  LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD,
} from "@/constants/config";
import type {
  CanceladaPor,
  Coordenada,
  EstadoSolicitudCupo,
  EstadoViaje,
  ResumenViaje,
  SolicitudCupo,
  ViajeConSolicitudes,
} from "@/types";

// Los mensajes de las funciones de 006_solicitudes.sql ya están escritos para el usuario.
function traducirError(error: PostgrestError, porDefecto: string): string {
  if (error.code === "P0001") return error.message;
  return porDefecto;
}

// RF10: solicita un cupo. Queda pendiente hasta que el conductor responda.
export async function solicitarCupo(viajeId: string, mensaje: string, partida?: Coordenada): Promise<void> {
  const mensajeLimpio = mensaje.trim();
  if (mensajeLimpio.length > LONGITUD_MAXIMA_MENSAJE_SOLICITUD) {
    throw new Error(`El mensaje puede tener hasta ${LONGITUD_MAXIMA_MENSAJE_SOLICITUD} caracteres.`);
  }

  const { error } = await supabase.rpc("request_seat", {
    p_viaje_id: viajeId,
    p_mensaje: mensajeLimpio || null,
    p_latitud: partida?.latitud ?? null,
    p_longitud: partida?.longitud ?? null,
  });
  if (error) {
    throw new Error(traducirError(error, "No se pudo enviar la solicitud. Revisa tu conexión e intenta de nuevo."));
  }
}

// RF11: el conductor acepta (descuenta un cupo) o rechaza una solicitud.
export async function responderSolicitud(solicitudId: string, aceptar: boolean, motivo = ""): Promise<void> {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length > LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD) {
    throw new Error(`El motivo puede tener hasta ${LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD} caracteres.`);
  }

  const { error } = await supabase.rpc("respond_seat_request", {
    p_solicitud_id: solicitudId,
    p_aceptar: aceptar,
    p_motivo: aceptar ? null : motivoLimpio || null,
  });
  if (error) {
    throw new Error(traducirError(error, "No se pudo guardar tu respuesta. Intenta de nuevo."));
  }
}

// RF12: el pasajero cancela su solicitud o su reserva. Si estaba confirmada,
// el cupo vuelve a quedar libre.
export async function cancelarSolicitud(solicitudId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_seat_request", { p_solicitud_id: solicitudId });
  if (error) {
    throw new Error(traducirError(error, "No se pudo cancelar. Intenta de nuevo."));
  }
}

// Columnas de public.seat_requests que ve el pasajero (RLS: solo las suyas).
type SolicitudFila = {
  id: string;
  viaje_id: string;
  pasajero_id: string;
  estado: EstadoSolicitudCupo;
  mensaje: string | null;
  motivo_rechazo: string | null;
  cancelada_por: CanceladaPor | null;
  cancelada_con_poca_antelacion: boolean;
  distancia_proximidad_metros: number | null;
  created_at: string;
  fecha_respuesta: string | null;
};

// RF10: la última solicitud del pasajero en un viaje, o null si nunca solicitó.
export async function obtenerMiSolicitud(viajeId: string): Promise<SolicitudCupo | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error("No hay una sesión activa.");
  }

  const { data, error } = await supabase
    .from("seat_requests")
    .select(
      "id, viaje_id, pasajero_id, estado, mensaje, motivo_rechazo, cancelada_por, cancelada_con_poca_antelacion, distancia_proximidad_metros, created_at, fecha_respuesta",
    )
    .eq("viaje_id", viajeId)
    .eq("pasajero_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SolicitudFila>();

  if (error) {
    throw new Error("No se pudo consultar tu solicitud.");
  }
  if (!data) return null;

  return {
    id: data.id,
    viajeId: data.viaje_id,
    pasajeroId: data.pasajero_id,
    estado: data.estado,
    mensaje: data.mensaje ?? undefined,
    motivoRechazo: data.motivo_rechazo ?? undefined,
    canceladaPor: data.cancelada_por ?? undefined,
    canceladaConPocaAntelacion: data.cancelada_con_poca_antelacion,
    distanciaProximidadMetros: data.distancia_proximidad_metros ?? undefined,
    fechaSolicitud: data.created_at,
    fechaRespuesta: data.fecha_respuesta ?? undefined,
  };
}

// Fila de get_my_seat_requests (006_solicitudes.sql).
type ReservaFila = {
  solicitud_id: string;
  viaje_id: string;
  estado: EstadoSolicitudCupo;
  mensaje: string | null;
  motivo_rechazo: string | null;
  cancelada_por: CanceladaPor | null;
  cancelada_con_poca_antelacion: boolean;
  distancia_proximidad_metros: number | null;
  partida_latitud: number | null;
  partida_longitud: number | null;
  fecha_solicitud: string;
  origen_nombre: string | null;
  destino_nombre: string | null;
  numero_paradas: number;
  fecha_hora_salida: string;
  cupos_totales: number;
  cupos_disponibles: number;
  aporte_sugerido: number;
  distancia_metros: number;
  duracion_segundos: number;
  viaje_estado: EstadoViaje;
  conductor_id: string;
  conductor_nombre: string;
  conductor_foto: string | null;
  conductor_promedio: number | string;
  vehiculo_placa: string | null;
};

// RF7: viajes en los que el usuario participa como pasajero, con su
// solicitud o reserva en cada uno.
export async function obtenerMisReservas(): Promise<ResumenViaje[]> {
  const { data, error } = await supabase.rpc("get_my_seat_requests");
  if (error) {
    throw new Error("No se pudieron cargar tus reservas.");
  }

  return ((data ?? []) as ReservaFila[]).map((fila) => ({
    id: fila.viaje_id,
    rol: "pasajero",
    origenNombre: fila.origen_nombre ?? undefined,
    destinoNombre: fila.destino_nombre ?? undefined,
    numeroParadas: fila.numero_paradas,
    fechaHoraSalida: fila.fecha_hora_salida,
    cuposTotales: fila.cupos_totales,
    cuposDisponibles: fila.cupos_disponibles,
    aporteSugerido: fila.aporte_sugerido,
    distanciaMetros: fila.distancia_metros,
    duracionSegundos: fila.duracion_segundos,
    estado: fila.viaje_estado,
    solicitud: {
      id: fila.solicitud_id,
      viajeId: fila.viaje_id,
      estado: fila.estado,
      mensaje: fila.mensaje ?? undefined,
      motivoRechazo: fila.motivo_rechazo ?? undefined,
      canceladaPor: fila.cancelada_por ?? undefined,
      canceladaConPocaAntelacion: fila.cancelada_con_poca_antelacion,
      distanciaProximidadMetros: fila.distancia_proximidad_metros ?? undefined,
      puntoPartida:
        fila.partida_latitud !== null && fila.partida_longitud !== null
          ? { latitud: fila.partida_latitud, longitud: fila.partida_longitud }
          : undefined,
      fechaSolicitud: fila.fecha_solicitud,
    },
    conductor: {
      id: fila.conductor_id,
      nombreCompleto: fila.conductor_nombre,
      fotoPerfilUrl: urlFotoPerfil(fila.conductor_foto),
      promedioCalificacion: Number(fila.conductor_promedio),
    },
    placaVehiculo: fila.vehiculo_placa ?? undefined,
  }));
}

// Fila de get_trip_requests (006_solicitudes.sql).
type RecibidaFila = {
  solicitud_id: string;
  viaje_id: string;
  estado: EstadoSolicitudCupo;
  mensaje: string | null;
  motivo_rechazo: string | null;
  cancelada_por: CanceladaPor | null;
  distancia_proximidad_metros: number | null;
  fecha_solicitud: string;
  pasajero_id: string;
  pasajero_nombre: string;
  pasajero_programa: string;
  pasajero_foto: string | null;
  pasajero_promedio: number | string;
  pasajero_total_viajes: number;
  origen_nombre: string | null;
  destino_nombre: string | null;
  fecha_hora_salida: string;
  cupos_totales: number;
  cupos_disponibles: number;
  viaje_estado: EstadoViaje;
};

// RF11: solicitudes recibidas, agrupadas por viaje. Sin `viajeId` trae las de
// los viajes que aún no salen; con `viajeId`, solo las de ese viaje.
export async function obtenerSolicitudesRecibidas(viajeId?: string): Promise<ViajeConSolicitudes[]> {
  const { data, error } = await supabase.rpc("get_trip_requests", { p_viaje_id: viajeId ?? null });
  if (error) {
    throw new Error("No se pudieron cargar las solicitudes. Revisa tu conexión e intenta de nuevo.");
  }

  // La función ya las ordena por salida del viaje y por estado.
  const grupos = new Map<string, ViajeConSolicitudes>();
  for (const fila of (data ?? []) as RecibidaFila[]) {
    let grupo = grupos.get(fila.viaje_id);
    if (!grupo) {
      grupo = {
        viajeId: fila.viaje_id,
        origenNombre: fila.origen_nombre ?? undefined,
        destinoNombre: fila.destino_nombre ?? undefined,
        fechaHoraSalida: fila.fecha_hora_salida,
        cuposTotales: fila.cupos_totales,
        cuposDisponibles: fila.cupos_disponibles,
        estado: fila.viaje_estado,
        solicitudes: [],
      };
      grupos.set(fila.viaje_id, grupo);
    }
    grupo.solicitudes.push({
      id: fila.solicitud_id,
      viajeId: fila.viaje_id,
      pasajeroId: fila.pasajero_id,
      estado: fila.estado,
      mensaje: fila.mensaje ?? undefined,
      motivoRechazo: fila.motivo_rechazo ?? undefined,
      canceladaPor: fila.cancelada_por ?? undefined,
      distanciaProximidadMetros: fila.distancia_proximidad_metros ?? undefined,
      fechaSolicitud: fila.fecha_solicitud,
      pasajero: {
        id: fila.pasajero_id,
        nombreCompleto: fila.pasajero_nombre,
        programaAcademico: fila.pasajero_programa,
        fotoPerfilUrl: urlFotoPerfil(fila.pasajero_foto),
        promedioCalificacion: Number(fila.pasajero_promedio),
        totalViajes: fila.pasajero_total_viajes,
      },
    });
  }
  return [...grupos.values()];
}

// RF11: cuántas solicitudes pendientes tiene cada viaje del conductor.
export async function contarSolicitudesPendientes(viajeIds: string[]): Promise<Map<string, number>> {
  const conteo = new Map<string, number>();
  if (viajeIds.length === 0) return conteo;

  const { data, error } = await supabase
    .from("seat_requests")
    .select("viaje_id")
    .eq("estado", "pendiente")
    .in("viaje_id", viajeIds)
    .returns<{ viaje_id: string }[]>();
  // El conteo es un extra de la lista: si falla, la lista se muestra igual.
  if (error) return conteo;

  for (const fila of data) {
    conteo.set(fila.viaje_id, (conteo.get(fila.viaje_id) ?? 0) + 1);
  }
  return conteo;
}
