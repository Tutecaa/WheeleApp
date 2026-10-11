import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { BUCKET_DOCUMENTOS_VEHICULOS } from "@/constants/config";
import type { DocumentosVehiculo, EstadoHabilitacionVehiculo, Vehiculo } from "@/types";
import {
  normalizarPlaca,
  validarDocumento,
  validarVehiculo,
  type DatosVehiculo,
} from "@/utils/validaciones";

// Archivo elegido con expo-document-picker. En web llega además el `File`.
export type ArchivoDocumento = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  file?: File;
};

export type TipoDocumento = "soat" | "rtm" | "licencia";

export type ArchivosVehiculo = Record<TipoDocumento, ArchivoDocumento | null>;

export const NOMBRES_DOCUMENTO: Record<TipoDocumento, string> = {
  soat: "el SOAT",
  rtm: "la revisión tecnomecánica",
  licencia: "la licencia de conducción",
};

const TIPOS_DOCUMENTO: TipoDocumento[] = ["soat", "rtm", "licencia"];

const EXTENSIONES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Filas de public.vehicles y public.vehicle_documents.
export type DocumentosFila = {
  soat_path: string;
  rtm_path: string;
  licencia_conduccion_path: string;
};

export type VehiculoFila = {
  id: string;
  conductor_id: string;
  placa: string;
  marca: string;
  linea: string;
  modelo: number;
  color: string;
  numero_puestos: number;
  estado_habilitacion: EstadoHabilitacionVehiculo;
  motivo_rechazo: string | null;
  revisado_por_admin_id: string | null;
  fecha_registro: string;
  fecha_revision: string | null;
  // Relación uno a uno: PostgREST la devuelve como objeto (o null).
  vehicle_documents?: DocumentosFila | DocumentosFila[] | null;
};

function aDocumentos(fila: VehiculoFila["vehicle_documents"]): DocumentosVehiculo | undefined {
  const documentos = Array.isArray(fila) ? fila[0] : fila;
  if (!documentos) return undefined;
  return {
    soatPath: documentos.soat_path,
    rtmPath: documentos.rtm_path,
    licenciaConduccionPath: documentos.licencia_conduccion_path,
  };
}

export function aVehiculo(fila: VehiculoFila): Vehiculo {
  return {
    id: fila.id,
    conductorId: fila.conductor_id,
    placa: fila.placa,
    marca: fila.marca,
    linea: fila.linea,
    modelo: fila.modelo,
    color: fila.color,
    numeroPuestos: fila.numero_puestos,
    documentos: aDocumentos(fila.vehicle_documents),
    estadoHabilitacion: fila.estado_habilitacion,
    motivoRechazo: fila.motivo_rechazo ?? undefined,
    revisadoPorAdminId: fila.revisado_por_admin_id ?? undefined,
    fechaRegistro: fila.fecha_registro,
    fechaRevision: fila.fecha_revision ?? undefined,
  };
}

function aFilaDatos(datos: DatosVehiculo) {
  return {
    placa: normalizarPlaca(datos.placa),
    marca: datos.marca.trim(),
    linea: datos.linea.trim(),
    modelo: Number(datos.modelo),
    color: datos.color.trim(),
    numero_puestos: Number(datos.numeroPuestos),
  };
}

function traducirError(error: PostgrestError, porDefecto: string): string {
  if (error.code === "23505") {
    if (error.message.includes("vehicles_placa_key")) {
      return "Esta placa ya está registrada en WHEEL-E.";
    }
    if (error.message.includes("vehicles_one_pending_per_user_idx")) {
      return "Ya tienes una solicitud pendiente. Espera la decisión del administrador o retírala.";
    }
  }
  return porDefecto;
}

async function obtenerIdUsuario(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("No hay una sesión activa.");
  }
  return data.user.id;
}

async function leerArchivo(archivo: ArchivoDocumento): Promise<Blob | ArrayBuffer> {
  if (archivo.file) return archivo.file;
  const respuesta = await fetch(archivo.uri);
  return respuesta.arrayBuffer();
}

// Sube los archivos indicados y devuelve la ruta de cada uno. Si alguno
// falla, borra los que alcanzó a subir.
async function subirDocumentos(
  usuarioId: string,
  vehiculoId: string,
  archivos: Partial<ArchivosVehiculo>,
): Promise<Partial<Record<TipoDocumento, string>>> {
  const storage = supabase.storage.from(BUCKET_DOCUMENTOS_VEHICULOS);
  const rutas: Partial<Record<TipoDocumento, string>> = {};

  try {
    for (const tipo of TIPOS_DOCUMENTO) {
      const archivo = archivos[tipo];
      if (!archivo) continue;

      const extension = EXTENSIONES[archivo.mimeType ?? ""] ?? "bin";
      const ruta = `${usuarioId}/${vehiculoId}/${tipo}.${extension}`;
      const { error } = await storage.upload(ruta, await leerArchivo(archivo), {
        contentType: archivo.mimeType,
        upsert: true,
      });
      if (error) throw error;
      rutas[tipo] = ruta;
    }
  } catch {
    const subidas = Object.values(rutas);
    if (subidas.length > 0) await storage.remove(subidas);
    throw new Error("No se pudieron subir los documentos. Revisa tu conexión e intenta de nuevo.");
  }

  return rutas;
}

function validarFormulario(
  datos: DatosVehiculo,
  archivos: Partial<ArchivosVehiculo>,
  documentosObligatorios: boolean,
) {
  const errorDatos = validarVehiculo(datos);
  if (errorDatos) throw new Error(errorDatos);

  for (const tipo of TIPOS_DOCUMENTO) {
    const archivo = archivos[tipo] ?? null;
    if (!archivo && !documentosObligatorios) continue;
    const errorArchivo = validarDocumento(NOMBRES_DOCUMENTO[tipo], archivo);
    if (errorArchivo) throw new Error(errorArchivo);
  }
}

export async function obtenerMisVehiculos(): Promise<Vehiculo[]> {
  const usuarioId = await obtenerIdUsuario();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_documents(*)")
    .eq("conductor_id", usuarioId)
    .order("fecha_registro", { ascending: false })
    .returns<VehiculoFila[]>();

  if (error) {
    throw new Error("No se pudieron cargar tus vehículos.");
  }
  return data.map(aVehiculo);
}

// RF3: crea el vehículo en estado pendiente con sus tres documentos.
export async function registrarVehiculo(
  datos: DatosVehiculo,
  archivos: ArchivosVehiculo,
): Promise<void> {
  validarFormulario(datos, archivos, true);
  const usuarioId = await obtenerIdUsuario();

  const { data: vehiculo, error } = await supabase
    .from("vehicles")
    .insert({ ...aFilaDatos(datos), conductor_id: usuarioId })
    .select("id")
    .single<{ id: string }>();

  if (error || !vehiculo) {
    throw new Error(
      error ? traducirError(error, "No se pudo registrar el vehículo.") : "No se pudo registrar el vehículo.",
    );
  }

  // Sin documentos no hay solicitud: si algo falla, se deshace el registro.
  async function deshacer(rutas: string[]) {
    if (rutas.length > 0) {
      await supabase.storage.from(BUCKET_DOCUMENTOS_VEHICULOS).remove(rutas);
    }
    await supabase.from("vehicles").delete().eq("id", vehiculo!.id);
  }

  let rutas: Partial<Record<TipoDocumento, string>>;
  try {
    rutas = await subirDocumentos(usuarioId, vehiculo.id, archivos);
  } catch (subidaError) {
    await deshacer([]);
    throw subidaError;
  }

  const { error: documentosError } = await supabase.from("vehicle_documents").insert({
    vehiculo_id: vehiculo.id,
    soat_path: rutas.soat,
    rtm_path: rutas.rtm,
    licencia_conduccion_path: rutas.licencia,
  });

  if (documentosError) {
    await deshacer(Object.values(rutas));
    throw new Error("No se pudieron guardar los documentos. Intenta de nuevo.");
  }
}

// RF3: corrige un vehículo rechazado o cancelado y lo vuelve a enviar.
// Solo se suben los documentos que el usuario reemplazó.
export async function reenviarSolicitud(
  vehiculo: Vehiculo,
  datos: DatosVehiculo,
  archivosNuevos: Partial<ArchivosVehiculo>,
): Promise<void> {
  validarFormulario(datos, archivosNuevos, !vehiculo.documentos);
  const usuarioId = await obtenerIdUsuario();

  const rutasNuevas = await subirDocumentos(usuarioId, vehiculo.id, archivosNuevos);
  const anteriores = vehiculo.documentos;
  const rutas = {
    soat: rutasNuevas.soat ?? anteriores?.soatPath,
    rtm: rutasNuevas.rtm ?? anteriores?.rtmPath,
    licencia: rutasNuevas.licencia ?? anteriores?.licenciaConduccionPath,
  };

  const { error: documentosError } = await supabase.from("vehicle_documents").upsert(
    {
      vehiculo_id: vehiculo.id,
      soat_path: rutas.soat,
      rtm_path: rutas.rtm,
      licencia_conduccion_path: rutas.licencia,
    },
    { onConflict: "vehiculo_id" },
  );
  if (documentosError) {
    throw new Error("No se pudieron guardar los documentos. Intenta de nuevo.");
  }

  // Si un documento cambió de formato (por ejemplo de PDF a JPG), el archivo
  // anterior queda con otro nombre: se borra.
  const reemplazadas = [
    anteriores?.soatPath !== rutas.soat ? anteriores?.soatPath : undefined,
    anteriores?.rtmPath !== rutas.rtm ? anteriores?.rtmPath : undefined,
    anteriores?.licenciaConduccionPath !== rutas.licencia
      ? anteriores?.licenciaConduccionPath
      : undefined,
  ].filter((ruta): ruta is string => Boolean(ruta));
  if (reemplazadas.length > 0) {
    await supabase.storage.from(BUCKET_DOCUMENTOS_VEHICULOS).remove(reemplazadas);
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ ...aFilaDatos(datos), estado_habilitacion: "pendiente" })
    .eq("id", vehiculo.id);

  if (error) {
    throw new Error(traducirError(error, "No se pudo reenviar la solicitud."));
  }
}

// RF3: el usuario retira su solicitud pendiente; queda cancelada.
export async function retirarSolicitud(vehiculoId: string): Promise<void> {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ estado_habilitacion: "cancelado" })
    .eq("id", vehiculoId)
    .eq("estado_habilitacion", "pendiente")
    .select("id");

  if (error) {
    throw new Error("No se pudo retirar la solicitud.");
  }
  if (data.length === 0) {
    throw new Error("La solicitud ya fue revisada por un administrador. Actualiza la pantalla.");
  }
}
