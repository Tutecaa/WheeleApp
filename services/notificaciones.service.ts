import { supabase } from "@/lib/supabase";
import type { DatosNotificacion, Notificacion, TipoNotificacion } from "@/types";

// Fila de public.notifications (008_notificaciones.sql).
type NotificacionFila = {
  id: string;
  tipo: TipoNotificacion;
  viaje_id: string | null;
  solicitud_id: string | null;
  vehiculo_id: string | null;
  datos: DatosNotificacion;
  leida: boolean;
  created_at: string;
};

// Cuántas notificaciones mostrar en la bandeja; las más antiguas quedan guardadas.
const LIMITE_BANDEJA = 100;

// Crea, si toca, el recordatorio de los viajes que salen pronto. Si falla,
// la bandeja se muestra igual.
async function crearRecordatorios(): Promise<void> {
  await supabase.rpc("create_my_departure_reminders");
}

// RF15: notificaciones del usuario, de la más reciente a la más antigua.
export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  await crearRecordatorios();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, tipo, viaje_id, solicitud_id, vehiculo_id, datos, leida, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_BANDEJA)
    .returns<NotificacionFila[]>();

  if (error) {
    throw new Error("No se pudieron cargar tus notificaciones. Revisa tu conexión e intenta de nuevo.");
  }

  return data.map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    viajeId: fila.viaje_id ?? undefined,
    solicitudId: fila.solicitud_id ?? undefined,
    vehiculoId: fila.vehiculo_id ?? undefined,
    datos: fila.datos ?? {},
    leida: fila.leida,
    fecha: fila.created_at,
  }));
}

// Número de notificaciones sin leer, para la campana. 0 si no se pudo consultar.
export async function contarNoLeidas(): Promise<number> {
  await crearRecordatorios();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);
  return error ? 0 : (count ?? 0);
}

// Marca como leídas las notificaciones indicadas, o todas si no se indica ninguna.
export async function marcarLeidas(ids?: string[]): Promise<void> {
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids ?? null });
  if (error) {
    throw new Error("No se pudieron marcar como leídas.");
  }
}
