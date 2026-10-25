import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { cancelarViaje, obtenerViaje } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Encabezado } from "@/components/Encabezado";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { ChipEstado, nombreLugar, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import { LONGITUD_MAXIMA_MOTIVO_CANCELACION } from "@/constants/config";
import type { Viaje } from "@/types";
import { confirmar } from "@/utils/confirmar";
import {
  formatearAporte,
  formatearDia,
  formatearDistancia,
  formatearDuracion,
  formatearHora,
} from "@/utils/formato";

function puntosDelViaje(viaje: Viaje): PuntoMapa[] {
  return [
    { coordenadas: viaje.origen.coordenadas, tipo: "origen", etiqueta: "A" },
    ...viaje.paradasIntermedias.map((parada, indice) => ({
      coordenadas: parada.coordenadas,
      tipo: "parada" as const,
      etiqueta: String(indice + 1),
    })),
    { coordenadas: viaje.destino.coordenadas, tipo: "destino", etiqueta: "B" },
  ];
}

// Detalle de un viaje. El conductor que lo publicó puede modificarlo o
// cancelarlo mientras no haya iniciado (RF6). La vista del pasajero (RF9)
// se completa en el Sprint 3.
export default function DetalleViaje() {
  const { id, aviso } = useLocalSearchParams<{ id: string; aviso?: string }>();
  const { perfil } = useSesion();
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(aviso === "publicado" ? "¡Tu viaje quedó publicado!" : "");

  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorCancelar, setErrorCancelar] = useState("");
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setViaje(await obtenerViaje(id));
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, [id]);

  // Se recarga al volver de editar.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/mis-viajes");
  }

  async function confirmarCancelacion() {
    if (!viaje) return;
    setErrorCancelar("");
    if (motivo.trim().length < 3) {
      setErrorCancelar("Escribe el motivo de la cancelación.");
      return;
    }
    const ok = await confirmar(
      "Cancelar viaje",
      "El viaje dejará de aparecer en las búsquedas y no podrás reactivarlo.",
      "Cancelar viaje",
    );
    if (!ok) return;

    setProcesando(true);
    try {
      await cancelarViaje(viaje.id, motivo);
      setCancelando(false);
      setMotivo("");
      setMensaje("Cancelaste el viaje.");
    } catch (cancelarError) {
      setErrorCancelar((cancelarError as Error).message);
    } finally {
      setProcesando(false);
    }
    await cargar();
  }

  if (!viaje) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Encabezado onVolver={volver} titulo="Detalle del viaje" />
        <View style={[styles.flex, styles.centrado]}>
          {error ? (
            <Text style={[styles.error, styles.container]}>{error}</Text>
          ) : (
            <ActivityIndicator color={colores.primario} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const esConductor = perfil?.id === viaje.conductorId;
  // RF6: solo se modifica o cancela un viaje que no ha iniciado.
  const modificable = esConductor && viaje.estado === "publicado";
  const reservas = viaje.cuposTotales - viaje.cuposDisponibles;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado derecha={<ChipEstado viaje={viaje} />} onVolver={volver} titulo="Detalle del viaje" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Mapa puntos={puntosDelViaje(viaje)} style={styles.mapa} trazado={viaje.trazadoRuta} />

          <View style={styles.container}>
            {mensaje ? (
              <View style={styles.mensajeCaja}>
                <Ionicons color={colores.primario} name="checkmark-circle" size={18} />
                <Text style={styles.mensaje}>{mensaje}</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.fechaFila}>
              <View style={styles.fechaTarjeta}>
                <Text style={styles.filaEtiqueta}>Fecha</Text>
                <Text style={styles.fechaValor}>{formatearDia(viaje.fechaHoraSalida)}</Text>
              </View>
              <View style={styles.fechaTarjeta}>
                <Text style={styles.filaEtiqueta}>Hora</Text>
                <Text style={styles.fechaValor}>{formatearHora(viaje.fechaHoraSalida)}</Text>
              </View>
            </View>

            <View style={styles.tarjeta}>
              <Fila color={colores.primario} etiqueta="Origen" valor={nombreLugar(viaje.origen.nombre)} />
              {viaje.paradasIntermedias.length > 0 ? (
                <Fila
                  color={colores.acento}
                  etiqueta="Paradas"
                  valor={`${viaje.paradasIntermedias.length} intermedia${viaje.paradasIntermedias.length === 1 ? "" : "s"}`}
                />
              ) : null}
              <Fila color={colores.primarioOscuro} etiqueta="Destino" valor={nombreLugar(viaje.destino.nombre)} />
              <Fila
                etiqueta="Recorrido"
                valor={`${formatearDistancia(viaje.distanciaMetros)} · unos ${formatearDuracion(viaje.duracionSegundos)}`}
              />
            </View>

            <View style={styles.tarjeta}>
              <View style={styles.resumenFila}>
                <View>
                  <Text style={styles.filaEtiqueta}>Cupos disponibles</Text>
                  <Text style={styles.cupos}>
                    {viaje.cuposDisponibles} <Text style={styles.cuposTotal}>de {viaje.cuposTotales}</Text>
                  </Text>
                </View>
                <View style={styles.alinearDerecha}>
                  <Text style={styles.filaEtiqueta}>Aporte sugerido</Text>
                  <Text style={styles.aporte}>{formatearAporte(viaje.aporteSugerido)}</Text>
                </View>
              </View>
              {viaje.vehiculo ? (
                <Fila
                  etiqueta="Vehículo"
                  valor={`${viaje.vehiculo.placa} · ${viaje.vehiculo.marca} ${viaje.vehiculo.linea} · ${viaje.vehiculo.color}`}
                />
              ) : null}
            </View>

            {viaje.estado === "cancelado" && viaje.motivoCancelacion ? (
              <Text style={styles.nota}>Motivo de la cancelación: {viaje.motivoCancelacion}</Text>
            ) : null}
            {esConductor && (viaje.estado === "en_curso" || viaje.estado === "finalizado") ? (
              <Text style={styles.nota}>Este viaje ya inició, así que no se puede modificar ni cancelar.</Text>
            ) : null}
            {modificable && salidaVencida(viaje) ? (
              <Text style={styles.nota}>
                La hora de salida ya pasó. Edita el viaje para elegir una nueva fecha o cancélalo.
              </Text>
            ) : null}

            {modificable && !cancelando ? (
              <>
                <Boton
                  onPress={() => router.push({ pathname: "/viaje/editar/[id]", params: { id: viaje.id } })}
                  titulo="Editar viaje"
                  variante="secundario"
                />
                <Boton
                  onPress={() => {
                    setMensaje("");
                    setCancelando(true);
                  }}
                  titulo="Cancelar viaje"
                  variante="peligro"
                />
              </>
            ) : null}

            {modificable && cancelando ? (
              <View style={styles.cancelacion}>
                <Text style={styles.subtitulo}>Cancelar viaje</Text>
                {reservas > 0 ? (
                  <Text style={styles.nota}>
                    Este viaje tiene {reservas} reserva{reservas === 1 ? "" : "s"} confirmada
                    {reservas === 1 ? "" : "s"}. Tus pasajeros verán el motivo.
                  </Text>
                ) : null}
                <CampoTexto
                  etiqueta="Motivo de la cancelación"
                  maxLength={LONGITUD_MAXIMA_MOTIVO_CANCELACION}
                  multiline
                  onChangeText={setMotivo}
                  placeholder="Ej.: se me presentó un imprevisto con el carro"
                  style={styles.motivo}
                  value={motivo}
                />
                {errorCancelar ? <Text style={styles.error}>{errorCancelar}</Text> : null}
                <Boton
                  cargando={procesando}
                  onPress={confirmarCancelacion}
                  titulo="Confirmar cancelación"
                  tituloCargando="Cancelando..."
                  variante="peligro"
                />
                <Boton
                  deshabilitado={procesando}
                  onPress={() => {
                    setCancelando(false);
                    setMotivo("");
                    setErrorCancelar("");
                  }}
                  titulo="No cancelar"
                  variante="secundario"
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Fila de datos; con `color` muestra el punto del recorrido, como en el formulario.
function Fila({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View style={styles.fila}>
      {color ? <View style={[styles.punto, { backgroundColor: color }]} /> : null}
      <View style={styles.flex}>
        <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
        <Text style={styles.filaValor}>{valor}</Text>
      </View>
    </View>
  );
}

const etiquetaMayuscula = {
  color: colores.textoSecundario,
  fontSize: 11,
  fontWeight: "800",
  letterSpacing: 0.8,
  textTransform: "uppercase",
} as const;

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  container: { paddingHorizontal: 18, paddingTop: 14 },
  mensajeCaja: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  mensaje: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "800" },
  subtitulo: { color: colores.titulo, fontSize: 18, fontWeight: "800" },
  mapa: { backgroundColor: colores.menta, height: 280 },
  fechaFila: { flexDirection: "row", gap: 10, marginBottom: 12 },
  fechaTarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  fechaValor: { color: colores.titulo, fontSize: 16, fontWeight: "800", marginTop: 4 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  resumenFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  alinearDerecha: { alignItems: "flex-end" },
  cupos: { color: colores.primario, fontSize: 22, fontWeight: "800", marginTop: 2 },
  cuposTotal: { color: colores.textoSecundario, fontSize: 14, fontWeight: "600" },
  aporte: { color: colores.acento, fontSize: 22, fontWeight: "800", marginTop: 2 },
  fila: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 7 },
  punto: { borderRadius: 5, height: 10, width: 10 },
  filaEtiqueta: etiquetaMayuscula,
  filaValor: { color: colores.titulo, fontSize: 15, fontWeight: "600", marginTop: 2 },
  nota: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 6 },
  cancelacion: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  motivo: { height: 96, paddingTop: 12, textAlignVertical: "top" },
  error: { color: colores.error, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
