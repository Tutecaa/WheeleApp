import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import {
  LONGITUD_MAXIMA_MOTIVO_CANCELACION,
  LONGITUD_MAXIMA_NOMBRE_LUGAR,
  PARADAS_MAXIMAS,
} from "@/constants/config";
import type {
  Coordenada,
  EstadoViaje,
  ResumenViaje,
  TrazadoRuta,
  Ubicacion,
  Vehiculo,
  Viaje,
} from "@/types";
import { validarPuntosViaje, validarSalidaViaje, type DatosSalidaViaje } from "@/utils/validaciones";

export type DatosPublicacion = DatosSalidaViaje & {
  vehiculo: Vehiculo;
  origen: Ubicacion;
  destino: Ubicacion;
  paradas: Coordenada[];
  trazado: TrazadoRuta;
};

// Fila de la vista public.trip_details (004_viajes.sql).
type ViajeFila = {
  id: string;
  conductor_id: string;
  vehiculo_id: string;
  origen_latitud: number;
  origen_longitud: number;
  origen_nombre: string | null;
  destino_latitud: number;
  destino_longitud: number;
  destino_nombre: string | null;
  paradas: Coordenada[];
  trazado_geojson: { type: "LineString"; coordinates: [number, number][] };
  distancia_metros: number;
  duracion_segundos: number;
  fecha_hora_salida: string;
  cupos_totales: number;
  cupos_disponibles: number;
  aporte_sugerido: number;
  estado: EstadoViaje;
  motivo_cancelacion: string | null;
  created_at: string;
  updated_at: string;
  vehiculo_placa: string | null;
  vehiculo_marca: string | null;
  vehiculo_linea: string | null;
  vehiculo_color: string | null;
};

function aViaje(fila: ViajeFila): Viaje {
  return {
    id: fila.id,
    conductorId: fila.conductor_id,
    vehiculoId: fila.vehiculo_id,
    vehiculo: fila.vehiculo_placa
      ? {
          placa: fila.vehiculo_placa,
          marca: fila.vehiculo_marca ?? "",
          linea: fila.vehiculo_linea ?? "",
          color: fila.vehiculo_color ?? "",
        }
      : undefined,
    origen: {
      nombre: fila.origen_nombre ?? undefined,
      coordenadas: { latitud: fila.origen_latitud, longitud: fila.origen_longitud },
    },
    destino: {
      nombre: fila.destino_nombre ?? undefined,
      coordenadas: { latitud: fila.destino_latitud, longitud: fila.destino_longitud },
    },
    paradasIntermedias: fila.paradas.map((parada) => ({ coordenadas: parada })),
    trazadoRuta: fila.trazado_geojson.coordinates.map(([longitud, latitud]) => ({ latitud, longitud })),
    distanciaMetros: fila.distancia_metros,
    duracionSegundos: fila.duracion_segundos,
    fechaHoraSalida: fila.fecha_hora_salida,
    cuposTotales: fila.cupos_totales,
    cuposDisponibles: fila.cupos_disponibles,
    aporteSugerido: fila.aporte_sugerido,
    estado: fila.estado,
    motivoCancelacion: fila.motivo_cancelacion ?? undefined,
    fechaCreacion: fila.created_at,
    fechaActualizacion: fila.updated_at,
  };
}

// PostGIS recibe la geografía como texto EWKT. El orden es longitud latitud.
function puntoEwkt(punto: Coordenada): string {
  return `SRID=4326;POINT(${punto.longitud} ${punto.latitud})`;
}

function lineaEwkt(puntos: Coordenada[]): string {
  return `SRID=4326;LINESTRING(${puntos.map((p) => `${p.longitud} ${p.latitud}`).join(",")})`;
}

function limpiarNombre(nombre?: string): string | null {
  const limpio = nombre?.trim().slice(0, LONGITUD_MAXIMA_NOMBRE_LUGAR);
  return limpio ? limpio : null;
}

function traducirError(error: PostgrestError, porDefecto: string): string {
  // Mensajes de validate_trip (004_viajes.sql), ya escritos para el usuario.
  if (error.code === "P0001") return error.message;
  // RLS: el usuario no es un conductor habilitado.
  if (error.code === "42501") {
    return "Para publicar viajes necesitas un vehículo aprobado por un administrador.";
  }
  return porDefecto;
}

// Validaciones de RF4 que comparten publicar y modificar (RF6).
function validarDatos(datos: DatosPublicacion, cuposReservados = 0) {
  const errorPuntos = validarPuntosViaje(datos.origen.coordenadas, datos.destino.coordenadas);
  if (errorPuntos) throw new Error(errorPuntos);
  if (datos.paradas.length > PARADAS_MAXIMAS) {
    throw new Error(`Puedes agregar hasta ${PARADAS_MAXIMAS} paradas.`);
  }
  if (datos.vehiculo.estadoHabilitacion !== "aprobado") {
    throw new Error("El vehículo elegido aún no está aprobado.");
  }
  const errorSalida = validarSalidaViaje(datos, datos.vehiculo.numeroPuestos, cuposReservados);
  if (errorSalida) throw new Error(errorSalida);
  // No se publica un viaje sin trazado (RF5).
  if (datos.trazado.coordenadas.length < 2) {
    throw new Error("Falta el trazado de la ruta. Vuelve al mapa para calcularlo.");
  }
}

// Columnas del recorrido: se envían al publicar, o al modificar si el recorrido cambió.
function columnasRecorrido(datos: DatosPublicacion) {
  return {
    origen: puntoEwkt(datos.origen.coordenadas),
    destino: puntoEwkt(datos.destino.coordenadas),
    paradas: datos.paradas.map(({ latitud, longitud }) => ({ latitud, longitud })),
    trazado: lineaEwkt(datos.trazado.coordenadas),
    distancia_metros: datos.trazado.distanciaMetros,
    duracion_segundos: datos.trazado.duracionSegundos,
  };
}

function columnasSalida(datos: DatosPublicacion) {
  return {
    vehiculo_id: datos.vehiculo.id,
    origen_nombre: limpiarNombre(datos.origen.nombre),
    destino_nombre: limpiarNombre(datos.destino.nombre),
    fecha_hora_salida: datos.fechaHoraSalida!.toISOString(),
    cupos_totales: Number(datos.cupos),
    aporte_sugerido: datos.aporte.trim() ? Number(datos.aporte) : 0,
  };
}

// RF4: publica el viaje con su trazado. Devuelve el id del viaje.
export async function publicarViaje(datos: DatosPublicacion): Promise<string> {
  validarDatos(datos);

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error("No hay una sesión activa.");
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({
      conductor_id: auth.user.id,
      ...columnasSalida(datos),
      ...columnasRecorrido(datos),
      // El trigger lo iguala a cupos_totales; se envía porque la columna es obligatoria.
      cupos_disponibles: Number(datos.cupos),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(
      error ? traducirError(error, "No se pudo publicar el viaje. Intenta de nuevo.") : "No se pudo publicar el viaje.",
    );
  }
  return data.id;
}

// Viaje con su trazado. RLS decide si el usuario puede verlo.
export async function obtenerViaje(id: string): Promise<Viaje> {
  const { data, error } = await supabase
    .from("trip_details")
    .select("*")
    .eq("id", id)
    .maybeSingle<ViajeFila>();

  if (error) {
    throw new Error("No se pudo cargar el viaje.");
  }
  if (!data) {
    throw new Error("Este viaje no existe o no tienes acceso a él.");
  }
  return aViaje(data);
}

const MENSAJE_YA_NO_EDITABLE =
  "Este viaje ya inició, finalizó o fue cancelado, así que no se puede modificar. Actualiza la pantalla.";

// RF6: modifica un viaje que no ha iniciado. Si el recorrido no cambió, se
// conserva el trazado guardado y no se envía de nuevo (RF5).
export async function modificarViaje(
  viaje: Viaje,
  datos: DatosPublicacion,
  recorridoCambio: boolean,
): Promise<void> {
  validarDatos(datos, viaje.cuposTotales - viaje.cuposDisponibles);

  const { data, error } = await supabase
    .from("trips")
    .update({
      ...columnasSalida(datos),
      ...(recorridoCambio ? columnasRecorrido(datos) : {}),
    })
    .eq("id", viaje.id)
    .eq("estado", "publicado")
    .select("id");

  if (error) {
    throw new Error(traducirError(error, "No se pudieron guardar los cambios. Intenta de nuevo."));
  }
  if (data.length === 0) {
    throw new Error(MENSAJE_YA_NO_EDITABLE);
  }
}

// RF6: cancela un viaje que no ha iniciado. Deja de aparecer en las búsquedas,
// que solo incluyen viajes publicados.
export async function cancelarViaje(viajeId: string, motivo: string): Promise<void> {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 3) {
    throw new Error("Escribe el motivo de la cancelación.");
  }
  if (motivoLimpio.length > LONGITUD_MAXIMA_MOTIVO_CANCELACION) {
    throw new Error(`El motivo puede tener hasta ${LONGITUD_MAXIMA_MOTIVO_CANCELACION} caracteres.`);
  }

  const { data, error } = await supabase
    .from("trips")
    .update({ estado: "cancelado", motivo_cancelacion: motivoLimpio })
    .eq("id", viajeId)
    .eq("estado", "publicado")
    .select("id");

  if (error) {
    throw new Error(traducirError(error, "No se pudo cancelar el viaje. Intenta de nuevo."));
  }
  if (data.length === 0) {
    throw new Error(MENSAJE_YA_NO_EDITABLE);
  }
}

// Columnas de public.trips que necesita la lista; el trazado no hace falta.
type ResumenFila = {
  id: string;
  origen_nombre: string | null;
  destino_nombre: string | null;
  paradas: Coordenada[];
  fecha_hora_salida: string;
  cupos_totales: number;
  cupos_disponibles: number;
  aporte_sugerido: number;
  distancia_metros: number;
  duracion_segundos: number;
  estado: EstadoViaje;
};

// RF7: viajes en los que participa el usuario. Por ahora solo como conductor;
// los viajes como pasajero se agregan con las reservas de cupo (Sprint 4).
export async function obtenerMisViajes(): Promise<ResumenViaje[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error("No hay una sesión activa.");
  }

  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, origen_nombre, destino_nombre, paradas, fecha_hora_salida, cupos_totales, cupos_disponibles, aporte_sugerido, distancia_metros, duracion_segundos, estado",
    )
    .eq("conductor_id", auth.user.id)
    .order("fecha_hora_salida", { ascending: true })
    .returns<ResumenFila[]>();

  if (error) {
    throw new Error("No se pudieron cargar tus viajes.");
  }

  return data.map((fila) => ({
    id: fila.id,
    rol: "conductor",
    origenNombre: fila.origen_nombre ?? undefined,
    destinoNombre: fila.destino_nombre ?? undefined,
    numeroParadas: fila.paradas.length,
    fechaHoraSalida: fila.fecha_hora_salida,
    cuposTotales: fila.cupos_totales,
    cuposDisponibles: fila.cupos_disponibles,
    aporteSugerido: fila.aporte_sugerido,
    distanciaMetros: fila.distancia_metros,
    duracionSegundos: fila.duracion_segundos,
    estado: fila.estado,
  }));
}
