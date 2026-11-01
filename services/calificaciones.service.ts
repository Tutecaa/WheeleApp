import { supabase } from "@/lib/supabase";
import { urlFotoPerfil } from "@/services/perfiles.service";
import { DIAS_PLAZO_CALIFICAR, LONGITUD_MAXIMA_COMENTARIO_CALIFICACION } from "@/constants/config";
import type { EstadoViaje, Resena, RolEnViaje, ViajePorCalificar } from "@/types";

// Fila de get_rating_targets (007_calificaciones.sql).
type PorCalificarFila = {
  persona_id: string;
  rol: RolEnViaje;
  nombre_completo: string;
  programa_academico: string;
  foto_perfil_url: string | null;
  promedio_calificacion: number | string;
  puntuacion: number | null;
  comentario: string | null;
  viaje_estado: EstadoViaje;
  fecha_finalizacion: string | null;
  origen_nombre: string | null;
  destino_nombre: string | null;
  fecha_hora_salida: string;
};

// RF13: a quién puede calificar el usuario en un viaje y lo que ya calificó.
// Devuelve null si el usuario no participó en el viaje.
export async function obtenerPorCalificar(viajeId: string): Promise<ViajePorCalificar | null> {
  const { data, error } = await supabase.rpc("get_rating_targets", { p_viaje_id: viajeId });
  if (error) {
    throw new Error("No se pudo cargar el viaje para calificar. Revisa tu conexión e intenta de nuevo.");
  }

  const filas = (data ?? []) as PorCalificarFila[];
  if (filas.length === 0) return null;

  const primera = filas[0];
  let plazoHasta: string | undefined;
  if (primera.fecha_finalizacion) {
    const plazo = new Date(primera.fecha_finalizacion);
    plazo.setDate(plazo.getDate() + DIAS_PLAZO_CALIFICAR);
    plazoHasta = plazo.toISOString();
  }

  return {
    viajeId,
    origenNombre: primera.origen_nombre ?? undefined,
    destinoNombre: primera.destino_nombre ?? undefined,
    fechaHoraSalida: primera.fecha_hora_salida,
    estado: primera.viaje_estado,
    plazoHasta,
    personas: filas.map((fila) => ({
      rol: fila.rol,
      persona: {
        id: fila.persona_id,
        nombreCompleto: fila.nombre_completo,
        programaAcademico: fila.programa_academico,
        fotoPerfilUrl: urlFotoPerfil(fila.foto_perfil_url),
        promedioCalificacion: Number(fila.promedio_calificacion),
      },
      puntuacion: fila.puntuacion ?? undefined,
      comentario: fila.comentario ?? undefined,
    })),
  };
}

// RF13: califica a un participante de un viaje finalizado, una sola vez.
export async function calificar(
  viajeId: string,
  evaluadoId: string,
  puntuacion: number,
  comentario: string,
): Promise<void> {
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    throw new Error("Elige una nota de 1 a 5 estrellas.");
  }
  const comentarioLimpio = comentario.trim();
  if (comentarioLimpio.length > LONGITUD_MAXIMA_COMENTARIO_CALIFICACION) {
    throw new Error(`El comentario puede tener hasta ${LONGITUD_MAXIMA_COMENTARIO_CALIFICACION} caracteres.`);
  }

  const { error } = await supabase.rpc("rate_participant", {
    p_viaje_id: viajeId,
    p_evaluado_id: evaluadoId,
    p_puntuacion: puntuacion,
    p_comentario: comentarioLimpio || null,
  });
  if (error) {
    // Mensajes de rate_participant, ya escritos para el usuario.
    if (error.code === "P0001") throw new Error(error.message);
    throw new Error("No se pudo guardar la calificación. Intenta de nuevo.");
  }
}

// Fila de get_profile_reviews (007_calificaciones.sql).
type ResenaFila = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  created_at: string;
  evaluador_id: string;
  evaluador_nombre: string;
  evaluador_foto: string | null;
  evaluador_rol: RolEnViaje;
};

// RF14: comentarios que recibió un usuario, del más reciente al más antiguo.
export async function obtenerResenas(usuarioId: string): Promise<Resena[]> {
  const { data, error } = await supabase.rpc("get_profile_reviews", { p_usuario_id: usuarioId });
  if (error) {
    throw new Error("No se pudieron cargar los comentarios.");
  }

  return ((data ?? []) as ResenaFila[]).map((fila) => ({
    id: fila.id,
    puntuacion: fila.puntuacion,
    comentario: fila.comentario ?? undefined,
    fecha: fila.created_at,
    evaluador: {
      id: fila.evaluador_id,
      nombreCompleto: fila.evaluador_nombre,
      fotoPerfilUrl: urlFotoPerfil(fila.evaluador_foto),
    },
    rolEvaluador: fila.evaluador_rol,
  }));
}
