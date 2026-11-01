import { supabase } from "@/lib/supabase";
import {
  BUCKET_FOTOS_PERFIL,
  TAMANO_MAXIMO_FOTO_BYTES,
  TIPOS_FOTO_PERMITIDOS,
} from "@/constants/config";
import type { EstadoUsuario, PerfilPublico, RolUsuario, Usuario } from "@/types";

// foto_perfil_url guarda la ruta dentro del bucket público (<id_usuario>/<archivo>);
// aquí se arma la URL para mostrarla (009_busqueda_proximidad.sql).
export function urlFotoPerfil(ruta: string | null | undefined): string | undefined {
  if (!ruta) return undefined;
  return supabase.storage.from(BUCKET_FOTOS_PERFIL).getPublicUrl(ruta).data.publicUrl;
}

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
    fotoPerfilUrl: urlFotoPerfil(fila.foto_perfil_url),
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

// Fila de get_public_profile (009_busqueda_proximidad.sql).
type PerfilPublicoFila = {
  id: string;
  nombre_completo: string;
  programa_academico: string;
  foto_perfil_url: string | null;
  promedio_calificacion: number | string;
  total_viajes: number;
  viajes_publicados: number;
  es_conductor: boolean;
  miembro_desde: string;
};

// RF14: perfil público de un usuario. Si la cuenta está suspendida o no
// existe, la función no devuelve nada.
export async function obtenerPerfilPublico(usuarioId: string): Promise<PerfilPublico> {
  const { data, error } = await supabase
    .rpc("get_public_profile", { p_usuario_id: usuarioId })
    .maybeSingle<PerfilPublicoFila>();

  if (error) {
    throw new Error("No se pudo cargar el perfil. Revisa tu conexión e intenta de nuevo.");
  }
  if (!data) {
    throw new Error("Este perfil no está disponible.");
  }

  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    programaAcademico: data.programa_academico,
    fotoPerfilUrl: urlFotoPerfil(data.foto_perfil_url),
    promedioCalificacion: Number(data.promedio_calificacion),
    totalViajes: data.total_viajes,
    viajesPublicados: data.viajes_publicados,
    esConductor: data.es_conductor,
    miembroDesde: data.miembro_desde,
  };
}

// Foto elegida con expo-image-picker. En web llega además el `File`.
export type FotoElegida = {
  uri: string;
  mimeType?: string;
  fileSize?: number;
  file?: File;
};

const EXTENSIONES_FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// En el celular el selector no siempre informa el tipo; se deduce de la extensión.
function tipoDeFoto(foto: FotoElegida): string | undefined {
  if (foto.mimeType) return foto.mimeType.toLowerCase();
  const extension = foto.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return undefined;
}

export function validarFoto(foto: FotoElegida): string | null {
  const tipo = tipoDeFoto(foto);
  if (!tipo || !TIPOS_FOTO_PERMITIDOS.includes(tipo)) {
    return "Elige una foto en formato JPG, PNG o WEBP.";
  }
  if (foto.fileSize !== undefined && foto.fileSize > TAMANO_MAXIMO_FOTO_BYTES) {
    const megas = TAMANO_MAXIMO_FOTO_BYTES / (1024 * 1024);
    return `La foto supera el máximo de ${megas} MB. Elige una más liviana.`;
  }
  return null;
}

async function leerFoto(foto: FotoElegida): Promise<Blob | ArrayBuffer> {
  if (foto.file) return foto.file;
  const respuesta = await fetch(foto.uri);
  return respuesta.arrayBuffer();
}

async function rutaFotoActual(usuarioId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("foto_perfil_url")
    .eq("id", usuarioId)
    .maybeSingle<{ foto_perfil_url: string | null }>();
  return data?.foto_perfil_url ?? null;
}

async function obtenerIdUsuario(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("No hay una sesión activa.");
  }
  return data.user.id;
}

// RF1: sube una foto de perfil nueva y borra la anterior. Cada foto tiene un
// nombre distinto para que ninguna pantalla muestre la vieja desde la caché.
export async function cambiarFotoPerfil(foto: FotoElegida): Promise<void> {
  const errorFoto = validarFoto(foto);
  if (errorFoto) throw new Error(errorFoto);

  const usuarioId = await obtenerIdUsuario();
  const tipo = tipoDeFoto(foto)!;
  const ruta = `${usuarioId}/${Date.now()}.${EXTENSIONES_FOTO[tipo]}`;
  const storage = supabase.storage.from(BUCKET_FOTOS_PERFIL);
  const anterior = await rutaFotoActual(usuarioId);

  const { error: errorSubida } = await storage.upload(ruta, await leerFoto(foto), {
    contentType: tipo,
  });
  if (errorSubida) {
    throw new Error("No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ foto_perfil_url: ruta })
    .eq("id", usuarioId);
  if (error) {
    await storage.remove([ruta]);
    throw new Error("No se pudo guardar la foto. Intenta de nuevo.");
  }

  // Si falla, solo queda un archivo sin usar; la foto nueva ya está guardada.
  if (anterior) await storage.remove([anterior]).catch(() => {});
}

export async function quitarFotoPerfil(): Promise<void> {
  const usuarioId = await obtenerIdUsuario();
  const anterior = await rutaFotoActual(usuarioId);

  const { error } = await supabase
    .from("profiles")
    .update({ foto_perfil_url: null })
    .eq("id", usuarioId);
  if (error) {
    throw new Error("No se pudo quitar la foto. Intenta de nuevo.");
  }

  if (anterior) {
    await supabase.storage.from(BUCKET_FOTOS_PERFIL).remove([anterior]).catch(() => {});
  }
}
