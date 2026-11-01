import { supabase } from "@/lib/supabase";
import { urlFotoPerfil } from "@/services/perfiles.service";
import type { ResultadoBusqueda } from "@/types";
import { validarBusqueda, type CriteriosBusqueda } from "@/utils/validaciones";

export type { CriteriosBusqueda } from "@/utils/validaciones";

// Fila de search_trips (009_busqueda_proximidad.sql).
type ResultadoFila = {
  id: string;
  conductor_id: string;
  conductor_nombre: string;
  conductor_foto: string | null;
  conductor_promedio: number | string;
  origen_nombre: string | null;
  destino_nombre: string | null;
  numero_paradas: number;
  fecha_hora_salida: string;
  cupos_totales: number;
  cupos_disponibles: number;
  aporte_sugerido: number;
  distancia_metros: number;
  duracion_segundos: number;
  distancia_proximidad_metros: number;
};

// RF8: viajes que pasan a menos del radio del punto de partida, ordenados de
// menor a mayor distancia. La base de datos excluye los viajes propios, sin
// cupos, que ya salieron o de conductores suspendidos.
export async function buscarViajes(criterios: CriteriosBusqueda): Promise<ResultadoBusqueda[]> {
  const errorCriterios = validarBusqueda(criterios);
  if (errorCriterios) throw new Error(errorCriterios);

  const { data, error } = await supabase.rpc("search_trips", {
    p_latitud: criterios.partida!.latitud,
    p_longitud: criterios.partida!.longitud,
    p_desde: criterios.desde.toISOString(),
    p_hasta: criterios.hasta.toISOString(),
    p_radio_metros: criterios.radioMetros,
  });

  if (error) {
    // Mensajes de search_trips, ya escritos para el usuario.
    if (error.code === "P0001") throw new Error(error.message);
    throw new Error("No se pudo hacer la búsqueda. Revisa tu conexión e intenta de nuevo.");
  }

  const filas = (data ?? []) as ResultadoFila[];
  return filas.map((fila) => ({
    id: fila.id,
    conductor: {
      id: fila.conductor_id,
      nombreCompleto: fila.conductor_nombre,
      fotoPerfilUrl: urlFotoPerfil(fila.conductor_foto),
      promedioCalificacion: Number(fila.conductor_promedio),
    },
    origenNombre: fila.origen_nombre ?? undefined,
    destinoNombre: fila.destino_nombre ?? undefined,
    numeroParadas: fila.numero_paradas,
    fechaHoraSalida: fila.fecha_hora_salida,
    cuposTotales: fila.cupos_totales,
    cuposDisponibles: fila.cupos_disponibles,
    aporteSugerido: fila.aporte_sugerido,
    distanciaMetros: fila.distancia_metros,
    duracionSegundos: fila.duracion_segundos,
    distanciaProximidadMetros: fila.distancia_proximidad_metros,
  }));
}
