import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { cancelarSolicitud, solicitarCupo } from "@/services/solicitudes.service";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import {
  HORAS_CANCELACION_POCA_ANTELACION,
  LONGITUD_MAXIMA_MENSAJE_SOLICITUD,
} from "@/constants/config";
import type { Coordenada, SolicitudCupo, Viaje } from "@/types";
import { confirmar } from "@/utils/confirmar";

type Props = {
  viaje: Viaje;
  // Última solicitud del pasajero en este viaje; null si nunca solicitó.
  solicitud: SolicitudCupo | null;
  // Punto de partida con el que encontró el viaje (RF8).
  partida?: Coordenada;
  // Se llama después de solicitar o cancelar, para recargar el viaje.
  onCambio: () => Promise<void>;
};

// Parte del detalle del viaje para el pasajero: solicitar un cupo (RF10),
// ver en qué va su solicitud y cancelarla o cancelar la reserva (RF12).
export function PanelSolicitud({ viaje, solicitud, partida, onCambio }: Props) {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const yaInicio = salidaVencida(viaje) || viaje.estado === "en_curso" || viaje.estado === "finalizado";
  const abierto = viaje.estado === "publicado" && !yaInicio;

  async function enviar() {
    setError("");
    setProcesando(true);
    try {
      await solicitarCupo(viaje.id, mensaje, partida);
      setFormularioAbierto(false);
      setMensaje("");
      setExito("¡Listo! Tu solicitud le llegó al conductor.");
      await onCambio();
    } catch (envioError) {
      setError((envioError as Error).message);
      // El viaje pudo cambiar (sin cupos, cancelado): se muestra su estado real.
      await onCambio();
    } finally {
      setProcesando(false);
    }
  }

  async function cancelar(actual: SolicitudCupo) {
    const confirmada = actual.estado === "aceptada";
    const horasParaSalir = (new Date(viaje.fechaHoraSalida).getTime() - Date.now()) / 3_600_000;
    const pocaAntelacion = confirmada && horasParaSalir < HORAS_CANCELACION_POCA_ANTELACION;
    const ok = await confirmar(
      confirmada ? "Cancelar reserva" : "Cancelar solicitud",
      confirmada
        ? pocaAntelacion
          ? `Faltan menos de ${HORAS_CANCELACION_POCA_ANTELACION} horas para la salida, así que quedará registrada como una cancelación con poca antelación. Tu cupo quedará libre para otro pasajero.`
          : "Tu cupo quedará libre para otro pasajero y el conductor lo verá."
        : "El conductor ya no verá tu solicitud. Podrás volver a solicitar si aún hay cupos.",
      confirmada ? "Cancelar reserva" : "Cancelar solicitud",
    );
    if (!ok) return;

    setError("");
    setExito("");
    setProcesando(true);
    try {
      await cancelarSolicitud(actual.id);
      setExito(confirmada ? "Cancelaste tu reserva." : "Cancelaste tu solicitud.");
    } catch (cancelarError) {
      setError((cancelarError as Error).message);
    } finally {
      setProcesando(false);
    }
    await onCambio();
  }

  const avisos = (
    <>
      {exito ? (
        <View style={styles.exito}>
          <Ionicons color={colores.primario} name="checkmark-circle" size={18} />
          <Text style={styles.exitoTexto}>{exito}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.error}>
          <Ionicons color={colores.error} name="alert-circle" size={18} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      ) : null}
    </>
  );

  // Reserva confirmada (RF11 aceptada).
  if (solicitud?.estado === "aceptada") {
    return (
      <View style={styles.contenedor}>
        {avisos}
        <Estado
          icono="checkmark-circle"
          texto={
            viaje.estado === "finalizado"
              ? "Viajaste en este recorrido."
              : yaInicio
                ? "Tu cupo estaba confirmado para este viaje."
                : "El conductor aceptó tu solicitud. Llega al punto de encuentro unos minutos antes de la salida."
          }
          tipo="exito"
          titulo="Tienes un cupo confirmado"
        />
        {abierto ? (
          <Boton
            cargando={procesando}
            onPress={() => cancelar(solicitud)}
            titulo="Cancelar reserva"
            tituloCargando="Cancelando..."
            variante="peligro"
          />
        ) : null}
      </View>
    );
  }

  if (solicitud?.estado === "pendiente") {
    return (
      <View style={styles.contenedor}>
        {avisos}
        <Estado
          icono="hourglass-outline"
          mensaje={solicitud.mensaje}
          texto={
            yaInicio
              ? "El conductor no respondió antes de la salida."
              : "Esperando la respuesta del conductor. Puedes ver cómo va aquí o en Mis viajes."
          }
          tipo="aviso"
          titulo={yaInicio ? "Solicitud sin respuesta" : "Solicitud enviada"}
        />
        {abierto ? (
          <Boton
            cargando={procesando}
            onPress={() => cancelar(solicitud)}
            titulo="Cancelar solicitud"
            tituloCargando="Cancelando..."
            variante="secundario"
          />
        ) : null}
      </View>
    );
  }

  if (solicitud?.estado === "rechazada") {
    return (
      <View style={styles.contenedor}>
        {avisos}
        <Estado
          icono="close-circle"
          texto={solicitud.motivoRechazo ? `Motivo: ${solicitud.motivoRechazo}` : "Busca otro viaje que te sirva."}
          tipo="error"
          titulo="El conductor rechazó tu solicitud"
        />
        <Boton onPress={() => router.navigate("/buscar")} titulo="Buscar otro viaje" variante="secundario" />
      </View>
    );
  }

  // Si el conductor canceló el viaje, la pantalla ya lo informa.
  if (solicitud?.estado === "cancelada" && solicitud.canceladaPor === "viaje") return null;
  // Sin solicitud viva: puede solicitar si el viaje sigue abierto.
  if (!abierto) return avisos;

  if (viaje.cuposDisponibles <= 0) {
    return (
      <View style={styles.contenedor}>
        {avisos}
        <Boton deshabilitado onPress={() => {}} titulo="Sin cupos disponibles" />
      </View>
    );
  }

  if (!formularioAbierto) {
    return (
      <View style={styles.contenedor}>
        {avisos}
        <Boton
          onPress={() => {
            setExito("");
            setError("");
            setFormularioAbierto(true);
          }}
          titulo="Solicitar cupo"
        />
        <Text style={styles.nota}>
          {solicitud?.estado === "cancelada"
            ? "Cancelaste tu solicitud anterior; puedes volver a solicitar."
            : "Tu cupo se aparta cuando el conductor acepte la solicitud."}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.contenedor, styles.formulario]}>
      <Text style={styles.formularioTitulo}>Solicitar cupo</Text>
      <Text style={styles.formularioTexto}>
        El conductor verá tu perfil público y, si lo escribes, tu mensaje.
      </Text>
      <CampoTexto
        etiqueta="Mensaje para el conductor (opcional)"
        maxLength={LONGITUD_MAXIMA_MENSAJE_SOLICITUD}
        multiline
        onChangeText={setMensaje}
        placeholder="Ej.: Te espero en la entrada de la Cra. 27 con calle 9"
        style={styles.mensajeCampo}
        value={mensaje}
      />
      <Text style={styles.contador}>
        {mensaje.length}/{LONGITUD_MAXIMA_MENSAJE_SOLICITUD}
      </Text>
      {avisos}
      <Boton cargando={procesando} onPress={enviar} titulo="Enviar solicitud" tituloCargando="Enviando..." />
      <Boton
        deshabilitado={procesando}
        onPress={() => {
          setFormularioAbierto(false);
          setError("");
        }}
        style={styles.botonSecundario}
        titulo="Volver"
        variante="secundario"
      />
    </View>
  );
}

const ESTILOS_ESTADO = {
  exito: { fondo: colores.primarioSuave, color: colores.primario },
  aviso: { fondo: colores.avisoFondo, color: colores.avisoTexto },
  error: { fondo: colores.errorSuave, color: colores.error },
} as const;

function Estado({
  titulo,
  texto,
  mensaje,
  icono,
  tipo,
}: {
  titulo: string;
  texto: string;
  mensaje?: string;
  icono: keyof typeof Ionicons.glyphMap;
  tipo: keyof typeof ESTILOS_ESTADO;
}) {
  const estilo = ESTILOS_ESTADO[tipo];
  return (
    <View style={[styles.estado, { backgroundColor: estilo.fondo }]}>
      <View style={[styles.estadoIcono, { backgroundColor: estilo.color }]}>
        <Ionicons color={colores.blanco} name={icono} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.estadoTitulo, { color: estilo.color }]}>{titulo}</Text>
        <Text style={styles.estadoTexto}>{texto}</Text>
        {mensaje ? <Text style={styles.estadoMensaje}>“{mensaje}”</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 4 },
  flex: { flex: 1 },
  estado: { alignItems: "flex-start", borderRadius: 16, flexDirection: "row", gap: 12, padding: 14 },
  estadoIcono: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  estadoTitulo: { fontSize: 16, fontWeight: "800" },
  estadoTexto: { color: colores.texto, fontSize: 13, lineHeight: 19, marginTop: 3 },
  estadoMensaje: { color: colores.textoSecundario, fontSize: 13, fontStyle: "italic", lineHeight: 19, marginTop: 6 },
  nota: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: "center" },
  formulario: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  formularioTitulo: { color: colores.titulo, fontSize: 18, fontWeight: "800" },
  formularioTexto: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 4 },
  mensajeCampo: { height: 96, paddingTop: 12, textAlignVertical: "top" },
  contador: { color: colores.placeholder, fontSize: 12, marginTop: 4, textAlign: "right" },
  botonSecundario: { marginTop: 10 },
  exito: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    padding: 12,
  },
  exitoTexto: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "800" },
  error: {
    alignItems: "center",
    backgroundColor: colores.errorSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
    marginTop: 8,
    padding: 12,
  },
  errorTexto: { color: colores.error, flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
});
