import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";
import type { Notificacion } from "@/types";
import { formatearFechaHora, formatearHora, formatearTiempoRelativo } from "@/utils/formato";

type Descripcion = {
  titulo: string;
  cuerpo: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondo: string;
};

function ruta(notificacion: Notificacion): string {
  const { origen, destino } = notificacion.datos;
  return `${origen ?? "Punto en el mapa"} → ${destino ?? "Punto en el mapa"}`;
}

function cuando(notificacion: Notificacion): string {
  return notificacion.datos.salida ? formatearFechaHora(notificacion.datos.salida) : "";
}

// Texto, ícono y color de cada tipo de notificación (RF15). La hora se arma
// aquí para mostrarla en la zona horaria del celular.
export function describirNotificacion(notificacion: Notificacion): Descripcion {
  const { datos } = notificacion;
  const motivo = datos.motivo ? ` Motivo: ${datos.motivo}` : "";

  switch (notificacion.tipo) {
    case "solicitud_nueva":
      return {
        titulo: "Nueva solicitud de cupo",
        cuerpo: `${datos.pasajero ?? "Un pasajero"} quiere un cupo en ${ruta(notificacion)}, ${cuando(notificacion)}.${datos.mensaje ? ` “${datos.mensaje}”` : ""}`,
        icono: "person-add",
        color: colores.avisoTexto,
        fondo: colores.avisoFondo,
      };
    case "solicitud_aceptada":
      return {
        titulo: "¡Tu cupo está confirmado!",
        cuerpo: `El conductor aceptó tu solicitud para ${ruta(notificacion)}, ${cuando(notificacion)}.`,
        icono: "checkmark-circle",
        color: colores.primario,
        fondo: colores.primarioSuave,
      };
    case "solicitud_rechazada":
      return {
        titulo: "Solicitud rechazada",
        cuerpo: `El conductor no aceptó tu solicitud para ${ruta(notificacion)}.${motivo}`,
        icono: "close-circle",
        color: colores.error,
        fondo: colores.errorSuave,
      };
    case "solicitud_retirada":
      return {
        titulo: "Un pasajero retiró su solicitud",
        cuerpo: `${datos.pasajero ?? "Un pasajero"} canceló su solicitud para ${ruta(notificacion)}, ${cuando(notificacion)}.`,
        icono: "arrow-undo",
        color: colores.textoSecundario,
        fondo: colores.borde,
      };
    case "reserva_cancelada":
      return {
        titulo: "Un pasajero canceló su reserva",
        cuerpo: `${datos.pasajero ?? "Un pasajero"} canceló su cupo en ${ruta(notificacion)}, ${cuando(notificacion)}. El cupo volvió a quedar libre.${datos.poca_antelacion ? " Lo hizo con poca antelación." : ""}`,
        icono: "person-remove",
        color: colores.error,
        fondo: colores.errorSuave,
      };
    case "viaje_cancelado":
      return {
        titulo: "El conductor canceló el viaje",
        cuerpo: `Se canceló el viaje ${ruta(notificacion)}, ${cuando(notificacion)}.${motivo}`,
        icono: "ban",
        color: colores.error,
        fondo: colores.errorSuave,
      };
    case "viaje_modificado":
      return {
        titulo: "Tu viaje cambió",
        cuerpo:
          datos.salida_anterior && datos.salida && datos.salida_anterior !== datos.salida
            ? `El conductor cambió ${ruta(notificacion)}. Ahora sale el ${cuando(notificacion)}.`
            : `El conductor cambió ${ruta(notificacion)}. Revisa los detalles del viaje.`,
        icono: "create",
        color: colores.info,
        fondo: colores.infoSuave,
      };
    case "recordatorio_salida":
      return {
        titulo: "Tu viaje sale pronto",
        cuerpo:
          datos.rol === "conductor"
            ? `Sales a las ${datos.salida ? formatearHora(datos.salida) : ""} hacia ${datos.destino ?? "tu destino"}. Revisa tus pasajeros confirmados.`
            : `${ruta(notificacion)} sale a las ${datos.salida ? formatearHora(datos.salida) : ""}. Llega con tiempo al punto de encuentro.`,
        icono: "alarm",
        color: colores.acento,
        fondo: colores.acentoSuave,
      };
    case "calificacion_disponible":
      return {
        titulo: "Califica tu viaje",
        cuerpo:
          datos.rol === "conductor"
            ? `¿Cómo te fue con tus pasajeros en ${ruta(notificacion)}? Tu calificación ayuda a la comunidad.`
            : `¿Cómo te fue con el conductor en ${ruta(notificacion)}? Tu calificación ayuda a la comunidad.`,
        icono: "star",
        color: colores.acento,
        fondo: colores.acentoSuave,
      };
    case "habilitacion_aprobada":
      return {
        titulo: "¡Ya eres conductor!",
        cuerpo: `Aprobamos tu vehículo ${datos.placa ?? ""}. Ya puedes publicar viajes.`,
        icono: "shield-checkmark",
        color: colores.primario,
        fondo: colores.primarioSuave,
      };
    case "habilitacion_rechazada":
      return {
        titulo: "Revisa tu solicitud de conductor",
        cuerpo: `No aprobamos el vehículo ${datos.placa ?? ""}.${motivo} Puedes corregirla y reenviarla.`,
        icono: "shield",
        color: colores.error,
        fondo: colores.errorSuave,
      };
  }
}

// A dónde lleva cada notificación al abrirla (RF15).
export function destinoNotificacion(notificacion: Notificacion): Href | null {
  const { viajeId } = notificacion;
  switch (notificacion.tipo) {
    case "habilitacion_aprobada":
    case "habilitacion_rechazada":
      return "/conductor/vehiculo";
    case "solicitud_nueva":
    case "solicitud_retirada":
    case "reserva_cancelada":
      return viajeId ? { pathname: "/solicitudes", params: { viajeId } } : "/solicitudes";
    case "calificacion_disponible":
      return viajeId ? { pathname: "/calificar/[id]", params: { id: viajeId } } : null;
    default:
      return viajeId ? { pathname: "/viaje/[id]", params: { id: viajeId } } : null;
  }
}

type Props = {
  notificacion: Notificacion;
  onPress: () => void;
};

export function TarjetaNotificacion({ notificacion, onPress }: Props) {
  const descripcion = describirNotificacion(notificacion);
  const sinLeer = !notificacion.leida;

  return (
    <Pressable
      accessibilityHint="Abre el viaje o la solicitud"
      accessibilityLabel={`${sinLeer ? "Sin leer. " : ""}${descripcion.titulo}. ${descripcion.cuerpo}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, sinLeer && styles.sinLeer, pressed && styles.presionada]}
    >
      <View style={[styles.icono, { backgroundColor: descripcion.fondo }]}>
        <Ionicons color={descripcion.color} name={descripcion.icono} size={20} />
      </View>
      <View style={styles.cuerpo}>
        <View style={styles.encabezado}>
          <Text numberOfLines={1} style={[styles.titulo, sinLeer && styles.tituloSinLeer]}>
            {descripcion.titulo}
          </Text>
          <Text style={styles.tiempo}>{formatearTiempoRelativo(notificacion.fecha)}</Text>
        </View>
        <Text style={styles.texto}>{descripcion.cuerpo}</Text>
      </View>
      {sinLeer ? <View style={styles.punto} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    alignItems: "flex-start",
    borderColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    padding: 14,
  },
  sinLeer: { backgroundColor: colores.blanco, borderColor: colores.borde },
  presionada: { opacity: 0.7 },
  icono: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  cuerpo: { flex: 1 },
  encabezado: { alignItems: "center", flexDirection: "row", gap: 8 },
  titulo: { color: colores.texto, flex: 1, fontSize: 14, fontWeight: "700" },
  tituloSinLeer: { color: colores.titulo, fontWeight: "800" },
  tiempo: { color: colores.placeholder, fontSize: 12 },
  texto: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 3 },
  punto: { backgroundColor: colores.primario, borderRadius: 5, height: 10, marginTop: 6, width: 10 },
});
