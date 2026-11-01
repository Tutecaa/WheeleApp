import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Avatar } from "@/components/Avatar";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Estrellas } from "@/components/Estrellas";
import { ChipSolicitud } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import { LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD } from "@/constants/config";
import type { SolicitudRecibida } from "@/types";
import { formatearDistancia, formatearFechaHora } from "@/utils/formato";

type Props = {
  solicitud: SolicitudRecibida;
  // Falso si el viaje ya salió o se canceló.
  puedeResponder: boolean;
  sinCupos: boolean;
  procesando: boolean;
  onAceptar: () => void;
  onRechazar: (motivo: string) => void;
};

// Una solicitud recibida por el conductor (RF11): el perfil público del
// pasajero, su mensaje y, si está pendiente, aceptar o rechazar.
export function TarjetaSolicitud({ solicitud, puedeResponder, sinCupos, procesando, onAceptar, onRechazar }: Props) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { pasajero } = solicitud;
  const pendiente = solicitud.estado === "pendiente";
  const cerrada = solicitud.estado === "cancelada" || solicitud.estado === "rechazada";

  return (
    <View style={[styles.tarjeta, cerrada && styles.cerrada]}>
      <Pressable
        accessibilityHint="Abre su perfil público"
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/usuario/[id]", params: { id: pasajero.id } })}
        style={({ pressed }) => [styles.persona, pressed && styles.presionado]}
      >
        <Avatar fotoUrl={pasajero.fotoPerfilUrl} nombre={pasajero.nombreCompleto} tamano={46} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.nombre}>
            {pasajero.nombreCompleto}
          </Text>
          {pasajero.programaAcademico ? (
            <Text numberOfLines={1} style={styles.programa}>
              {pasajero.programaAcademico}
            </Text>
          ) : null}
          <View style={styles.calificacion}>
            <Estrellas conNumero tamano={13} valor={pasajero.promedioCalificacion} />
          </View>
        </View>
        <ChipSolicitud solicitud={solicitud} />
      </Pressable>

      {solicitud.distanciaProximidadMetros !== undefined ? (
        <View style={styles.dato}>
          <Ionicons color={colores.info} name="walk" size={15} />
          <Text style={styles.datoTexto}>
            Sale a {formatearDistancia(solicitud.distanciaProximidadMetros)} de tu ruta
          </Text>
        </View>
      ) : null}

      {solicitud.mensaje ? (
        <View style={styles.mensaje}>
          <Ionicons color={colores.primario} name="chatbubble-ellipses-outline" size={16} />
          <Text style={styles.mensajeTexto}>{solicitud.mensaje}</Text>
        </View>
      ) : null}

      {solicitud.estado === "rechazada" && solicitud.motivoRechazo ? (
        <Text style={styles.nota}>Motivo del rechazo: {solicitud.motivoRechazo}</Text>
      ) : null}
      {solicitud.estado === "cancelada" ? (
        <Text style={styles.nota}>
          {solicitud.canceladaPor === "viaje"
            ? "Se cerró al cancelar el viaje."
            : "El pasajero canceló su solicitud."}
        </Text>
      ) : null}

      <Text style={styles.fecha}>Solicitó el {formatearFechaHora(solicitud.fechaSolicitud)}</Text>

      {pendiente && puedeResponder && !rechazando ? (
        <>
          <View style={styles.acciones}>
            <Boton
              deshabilitado={procesando}
              onPress={() => setRechazando(true)}
              style={styles.accion}
              titulo="Rechazar"
              variante="secundario"
            />
            <Boton
              cargando={procesando}
              deshabilitado={sinCupos}
              onPress={onAceptar}
              style={styles.accion}
              titulo="Aceptar"
              tituloCargando="Guardando..."
            />
          </View>
          {sinCupos ? (
            <Text style={styles.sinCupos}>No quedan cupos libres. Para aceptar, aumenta los cupos del viaje.</Text>
          ) : null}
        </>
      ) : null}

      {pendiente && puedeResponder && rechazando ? (
        <View style={styles.rechazo}>
          <CampoTexto
            etiqueta="Motivo (opcional)"
            maxLength={LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD}
            multiline
            onChangeText={setMotivo}
            placeholder="Ej.: no paso por ese sector"
            style={styles.motivo}
            value={motivo}
          />
          <View style={styles.acciones}>
            <Boton
              deshabilitado={procesando}
              onPress={() => {
                setRechazando(false);
                setMotivo("");
              }}
              style={styles.accion}
              titulo="Volver"
              variante="secundario"
            />
            <Boton
              cargando={procesando}
              onPress={() => onRechazar(motivo)}
              style={styles.accion}
              titulo="Rechazar"
              tituloCargando="Guardando..."
              variante="peligro"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  cerrada: { opacity: 0.72 },
  flex: { flex: 1 },
  persona: { alignItems: "center", flexDirection: "row", gap: 12 },
  presionado: { opacity: 0.7 },
  nombre: { color: colores.titulo, fontSize: 15, fontWeight: "800" },
  programa: { color: colores.textoSecundario, fontSize: 12, marginTop: 1 },
  calificacion: { marginTop: 4 },
  dato: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 12 },
  datoTexto: { color: colores.info, fontSize: 13, fontWeight: "700" },
  mensaje: {
    backgroundColor: colores.fondo,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    padding: 12,
  },
  mensajeTexto: { color: colores.texto, flex: 1, fontSize: 14, lineHeight: 20 },
  nota: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 10 },
  fecha: { color: colores.placeholder, fontSize: 12, marginTop: 10 },
  acciones: { flexDirection: "row", gap: 10 },
  accion: { flex: 1, marginTop: 12 },
  sinCupos: { color: colores.avisoTexto, fontSize: 12, fontWeight: "600", marginTop: 8, textAlign: "center" },
  rechazo: { marginTop: 2 },
  motivo: { height: 80, paddingTop: 12, textAlignVertical: "top" },
});
