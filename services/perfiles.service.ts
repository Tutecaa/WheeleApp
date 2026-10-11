import { supabase } from "@/lib/supabase";
import type { EstadoUsuario, RolUsuario, Usuario } from "@/types";

// Fila de public.profiles tal como la devuelve Supabase.
type PerfilFila = {
  id: string;
  nombre_completo: string;
  codigo_institucional: string;
  correo_institucional: string;
  programa_academico: string;
  foto_perfil_url: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  correo_verificado: boolean;
  promedio_calificacion: number;
  total_viajes: number;
  created_at: string;
  updated_at: string;
};

function aUsuario(fila: PerfilFila): Usuario {
  return {
    id: fila.id,
    nombreCompleto: fila.nombre_completo,
    codigoInstitucional: fila.codigo_institucional,
    correoInstitucional: fila.correo_institucional,
    programaAcademico: fila.programa_academico,
    fotoPerfilUrl: fila.foto_perfil_url ?? undefined,
    rol: fila.rol,
    estado: fila.estado,
    correoVerificado: fila.correo_verificado,
    promedioCalificacion: Number(fila.promedio_calificacion),
    totalViajes: fila.total_viajes,
    fechaCreacion: fila.created_at,
    fechaActualizacion: fila.updated_at,
  };
}

// Perfil del usuario con sesión iniciada.
export async function obtenerMiPerfil(): Promise<Usuario> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error("No hay una sesión activa.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single<PerfilFila>();

  if (error || !data) {
    throw new Error("No se pudo cargar tu perfil.");
  }

  return aUsuario(data);
}
