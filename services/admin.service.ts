import { supabase } from "@/lib/supabase";
import { BUCKET_DOCUMENTOS_VEHICULOS, VIGENCIA_URL_DOCUMENTO_SEGUNDOS } from "@/constants/config";
import type { Vehiculo } from "@/types";
import { aVehiculo, type VehiculoFila } from "@/services/vehiculos.service";

// Datos del solicitante que el administrador necesita para revisar.
export type Solicitante = {
  nombreCompleto: string;
  codigoInstitucional: string;
  correoInstitucional: string;
  programaAcademico: string;
};

export type SolicitudHabilitacion = {
  vehiculo: Vehiculo;
  solicitante: Solicitante | null;
};

type SolicitanteFila = {
  nombre_completo: string;
  codigo_institucional: string;
  correo_institucional: string;
  programa_academico: string;
};

type SolicitudFila = VehiculoFila & {
  solicitante: SolicitanteFila | null;
};

const MENSAJE_YA_RESUELTA =
  "Otro administrador ya resolvió esta solicitud o el usuario la retiró. La lista se actualizó.";

async function obtenerIdAdmin(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("No hay una sesión activa.");
  }
  return data.user.id;
}

// RF16: solicitudes pendientes, de la más antigua a la más reciente.
export async function listarSolicitudesPendientes(): Promise<SolicitudHabilitacion[]> {
  // `vehicles` tiene dos llaves hacia profiles (conductor y administrador
  // revisor), por eso se indica cuál usar.
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `*,
      vehicle_documents(*),
      solicitante:profiles!vehicles_conductor_id_fkey(
        nombre_completo, codigo_institucional, correo_institucional, programa_academico
      )`,
    )
    .eq("estado_habilitacion", "pendiente")
    .order("fecha_registro", { ascending: true })
    .returns<SolicitudFila[]>();

  if (error) {
    throw new Error("No se pudieron cargar las solicitudes.");
  }

  return data.map((fila) => ({
    vehiculo: aVehiculo(fila),
    solicitante: fila.solicitante
      ? {
          nombreCompleto: fila.solicitante.nombre_completo,
          codigoInstitucional: fila.solicitante.codigo_institucional,
          correoInstitucional: fila.solicitante.correo_institucional,
          programaAcademico: fila.solicitante.programa_academico,
        }
      : null,
  }));
}

// URL temporal para ver un documento del bucket privado.
export async function obtenerUrlDocumento(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS_VEHICULOS)
    .createSignedUrl(ruta, VIGENCIA_URL_DOCUMENTO_SEGUNDOS);

  if (error || !data) {
    throw new Error("No se pudo abrir el documento.");
  }
  return data.signedUrl;
}

async function decidir(
  vehiculoId: string,
  cambios: { estado_habilitacion: "aprobado" | "rechazado"; motivo_rechazo?: string },
) {
  const adminId = await obtenerIdAdmin();

  // RLS solo deja actualizar solicitudes pendientes: si ya no lo está,
  // no se actualiza ninguna fila.
  const { data, error } = await supabase
    .from("vehicles")
    .update({
      ...cambios,
      revisado_por_admin_id: adminId,
      fecha_revision: new Date().toISOString(),
    })
    .eq("id", vehiculoId)
    .eq("estado_habilitacion", "pendiente")
    .select("id");

  if (error) {
    throw new Error("No se pudo guardar la decisión. Intenta de nuevo.");
  }
  if (data.length === 0) {
    throw new Error(MENSAJE_YA_RESUELTA);
  }
}

export async function aprobarVehiculo(vehiculoId: string): Promise<void> {
  await decidir(vehiculoId, { estado_habilitacion: "aprobado" });
}

// El rechazo exige motivo (RF16).
export async function rechazarVehiculo(vehiculoId: string, motivo: string): Promise<void> {
  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 3) {
    throw new Error("Escribe el motivo del rechazo.");
  }
  await decidir(vehiculoId, { estado_habilitacion: "rechazado", motivo_rechazo: motivoLimpio });
}
