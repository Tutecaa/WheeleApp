import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { cancelarViaje, obtenerViaje } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { etiquetaEstado, nombreLugar, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import { LONGITUD_MAXIMA_MOTIVO_CANCELACION } from "@/constants/config";
import type { Viaje } from "@/types";
import { confirmar } from "@/utils/confirmar";
import {
  formatearAporte,
  formatearDistancia,
  formatearDuracion,
  formatearFechaHora,
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
      <SafeAreaView style={[styles.safeArea, styles.centrado]}>
        {error ? (
          <View style={styles.container}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="link" onPress={volver}>
              <Text style={styles.backLink}>← Volver</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color={colores.primario} />
        )}
      </SafeAreaView>
    );
  }

  const estado = etiquetaEstado(viaje);
  const esConductor = perfil?.id === viaje.conductorId;
  // RF6: solo se modifica o cancela un viaje que no ha iniciado.
  const modificable = esConductor && viaje.estado === "publicado";
  const reservas = viaje.cuposTotales - viaje.cuposDisponibles;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <Pressable accessibilityRole="link" onPress={volver}>
              <Text style={styles.backLink}>← Volver</Text>
            </Pressable>
            {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.encabezado}>
              <Text style={styles.title}>{formatearFechaHora(viaje.fechaHoraSalida)}</Text>
              <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
                {estado.texto}
              </Text>
            </View>
          </View>

          <Mapa puntos={puntosDelViaje(viaje)} style={styles.mapa} trazado={viaje.trazadoRuta} />

          <View style={styles.container}>
            <View style={styles.tarjeta}>
              <Fila etiqueta="A · Origen" valor={nombreLugar(viaje.origen.nombre)} />
              {viaje.paradasIntermedias.length > 0 ? (
                <Fila
                  etiqueta="Paradas"
                  valor={`${viaje.paradasIntermedias.length} intermedia${viaje.paradasIntermedias.length === 1 ? "" : "s"}`}
                />
              ) : null}
              <Fila etiqueta="B · Destino" valor={nombreLugar(viaje.destino.nombre)} />
              <Fila
                etiqueta="Recorrido"
                valor={`${formatearDistancia(viaje.distanciaMetros)} · unos ${formatearDuracion(viaje.duracionSegundos)}`}
              />
            </View>

            <View style={styles.tarjeta}>
              <Fila etiqueta="Cupos disponibles" valor={`${viaje.cuposDisponibles} de ${viaje.cuposTotales}`} />
              <Fila etiqueta="Aporte sugerido" valor={formatearAporte(viaje.aporteSugerido)} />
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

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  container: { paddingHorizontal: 24, paddingTop: 16 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 16 },
  mensaje: { color: colores.primario, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  encabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { color: colores.titulo, flex: 1, fontSize: 22, fontWeight: "800", lineHeight: 28 },
  subtitulo: { color: colores.titulo, fontSize: 18, fontWeight: "800" },
  estado: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapa: { height: 300 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 4,
    padding: 14,
  },
  fila: { paddingVertical: 6 },
  filaEtiqueta: { color: colores.textoSecundario, fontSize: 12, fontWeight: "700" },
  filaValor: { color: colores.texto, fontSize: 15, marginTop: 2 },
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
