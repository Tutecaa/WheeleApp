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
import Ionicons from "@expo/vector-icons/Ionicons";

import { cancelarViaje, obtenerDetalleViaje } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Avatar } from "@/components/Avatar";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Encabezado } from "@/components/Encabezado";
import { Estrellas } from "@/components/Estrellas";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { ChipEstado, nombreLugar, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import { LONGITUD_MAXIMA_MOTIVO_CANCELACION } from "@/constants/config";
import type { Coordenada, Viaje } from "@/types";
import { confirmar } from "@/utils/confirmar";
import {
  formatearAporte,
  formatearDia,
  formatearDistancia,
  formatearDuracion,
  formatearHora,
} from "@/utils/formato";

// Con el punto de partida del pasajero se marcan él y el punto de la ruta que
// le pasa más cerca (RF9).
function puntosDelViaje(viaje: Viaje, partida?: Coordenada): PuntoMapa[] {
  const puntos: PuntoMapa[] = [
    { coordenadas: viaje.origen.coordenadas, tipo: "origen", etiqueta: "A" },
    ...viaje.paradasIntermedias.map((parada, indice) => ({
      coordenadas: parada.coordenadas,
      tipo: "parada" as const,
      etiqueta: String(indice + 1),
    })),
    { coordenadas: viaje.destino.coordenadas, tipo: "destino", etiqueta: "B" },
  ];
  if (partida && viaje.proximidad) {
    puntos.push(
      { coordenadas: viaje.proximidad.puntoCercano, tipo: "cercano", etiqueta: "" },
      { coordenadas: partida, tipo: "partida", etiqueta: "Tú" },
    );
  }
  return puntos;
}

// Punto de partida que llega de la búsqueda como texto; undefined si falta
// o no es un número.
function aPunto(lat?: string, lng?: string): Coordenada | undefined {
  if (!lat || !lng) return undefined;
  const latitud = Number(lat);
  const longitud = Number(lng);
  return Number.isFinite(latitud) && Number.isFinite(longitud) ? { latitud, longitud } : undefined;
}

// Detalle de un viaje. El conductor que lo publicó puede modificarlo o
// cancelarlo mientras no haya iniciado (RF6). El pasajero ve la ruta, qué
// tan cerca pasa de su punto de partida y los datos públicos del conductor (RF9).
export default function DetalleViaje() {
  const { id, aviso, lat, lng } = useLocalSearchParams<{
    id: string;
    aviso?: string;
    lat?: string;
    lng?: string;
  }>();
  const partida = aPunto(lat, lng);
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
      setViaje(await obtenerDetalleViaje(id, aPunto(lat, lng)));
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, [id, lat, lng]);

  // Se recarga al volver de editar.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace(partida ? "/buscar" : "/mis-viajes");
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
  const esPasajero = !esConductor && perfil?.rol !== "administrador";
  // RF6: solo se modifica o cancela un viaje que no ha iniciado.
  const modificable = esConductor && viaje.estado === "publicado";
  const reservas = viaje.cuposTotales - viaje.cuposDisponibles;
  // RF9: si el viaje se canceló, ya salió o se quedó sin cupos, se informa
  // y no se puede solicitar.
  const vencido = salidaVencida(viaje) || viaje.estado === "en_curso" || viaje.estado === "finalizado";
  const sinCupos = viaje.estado === "publicado" && !vencido && viaje.cuposDisponibles === 0;
  const vehiculo = viaje.vehiculo
    ? [viaje.vehiculo.placa, `${viaje.vehiculo.marca} ${viaje.vehiculo.linea}`.trim(), viaje.vehiculo.color]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado derecha={<ChipEstado viaje={viaje} />} onVolver={volver} titulo="Detalle del viaje" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Mapa
            puntos={puntosDelViaje(viaje, esPasajero ? partida : undefined)}
            style={styles.mapa}
            trazado={viaje.trazadoRuta}
          />

          <View style={styles.container}>
            {mensaje ? (
              <View style={styles.mensajeCaja}>
                <Ionicons color={colores.primario} name="checkmark-circle" size={18} />
                <Text style={styles.mensaje}>{mensaje}</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {esPasajero && viaje.estado === "cancelado" ? (
              <Aviso
                icono="close-circle"
                texto={viaje.motivoCancelacion ? `Motivo: ${viaje.motivoCancelacion}` : undefined}
                tipo="error"
                titulo="El conductor canceló este viaje"
              />
            ) : null}
            {esPasajero && viaje.estado !== "cancelado" && vencido ? (
              <Aviso icono="time" tipo="neutro" titulo="Este viaje ya salió" />
            ) : null}
            {esPasajero && sinCupos ? (
              <Aviso
                icono="people"
                texto="Busca otro viaje o vuelve más tarde por si se libera un cupo."
                tipo="aviso"
                titulo="Este viaje ya no tiene cupos"
              />
            ) : null}

            {esPasajero && viaje.proximidad ? (
              <View style={styles.proximidad}>
                <View style={styles.proximidadIcono}>
                  <Ionicons color={colores.blanco} name="walk" size={22} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.proximidadTitulo}>
                    Pasa a {formatearDistancia(viaje.proximidad.distanciaMetros)} de tu punto
                  </Text>
                  <Text style={styles.proximidadTexto}>
                    Es la distancia en línea recta hasta el punto verde de la ruta. Revisa en el mapa si
                    te sirve para encontrarte con el conductor.
                  </Text>
                </View>
              </View>
            ) : null}

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
              {vehiculo ? <Fila etiqueta="Vehículo" valor={vehiculo} /> : null}
            </View>

            {!esConductor && viaje.conductor ? (
              <Pressable
                accessibilityHint="Abre el perfil público del conductor"
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: "/usuario/[id]", params: { id: viaje.conductorId } })
                }
                style={({ pressed }) => [styles.tarjeta, styles.conductor, pressed && styles.presionado]}
              >
                <Avatar
                  fotoUrl={viaje.conductor.fotoPerfilUrl}
                  nombre={viaje.conductor.nombreCompleto}
                  tamano={54}
                />
                <View style={styles.flex}>
                  <Text style={styles.filaEtiqueta}>Conductor</Text>
                  <Text numberOfLines={1} style={styles.conductorNombre}>
                    {viaje.conductor.nombreCompleto}
                  </Text>
                  {viaje.conductor.programaAcademico ? (
                    <Text numberOfLines={1} style={styles.conductorPrograma}>
                      {viaje.conductor.programaAcademico}
                    </Text>
                  ) : null}
                  <View style={styles.conductorCalificacion}>
                    <Estrellas conNumero tamano={14} valor={viaje.conductor.promedioCalificacion} />
                  </View>
                </View>
                <Ionicons color={colores.placeholder} name="chevron-forward" size={20} />
              </Pressable>
            ) : null}

            {esPasajero ? (
              <>
                <Boton
                  deshabilitado
                  onPress={() => {}}
                  titulo={sinCupos ? "Sin cupos disponibles" : "Solicitar cupo"}
                />
                {viaje.estado === "publicado" && !vencido && !sinCupos ? (
                  <Text style={[styles.nota, styles.notaCentrada]}>
                    Muy pronto podrás solicitar tu cupo desde aquí.
                  </Text>
                ) : null}
              </>
            ) : null}

            {esConductor && viaje.estado === "cancelado" && viaje.motivoCancelacion ? (
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

const ESTILOS_AVISO = {
  error: { fondo: colores.errorSuave, color: colores.error },
  aviso: { fondo: colores.avisoFondo, color: colores.avisoTexto },
  neutro: { fondo: colores.borde, color: colores.texto },
} as const;

// Aviso destacado para el pasajero: viaje cancelado, vencido o sin cupos.
function Aviso({
  titulo,
  texto,
  icono,
  tipo,
}: {
  titulo: string;
  texto?: string;
  icono: keyof typeof Ionicons.glyphMap;
  tipo: keyof typeof ESTILOS_AVISO;
}) {
  const estilo = ESTILOS_AVISO[tipo];
  return (
    <View style={[styles.aviso, { backgroundColor: estilo.fondo }]}>
      <Ionicons color={estilo.color} name={icono} size={20} />
      <View style={styles.flex}>
        <Text style={[styles.avisoTitulo, { color: estilo.color }]}>{titulo}</Text>
        {texto ? <Text style={[styles.avisoTexto, { color: estilo.color }]}>{texto}</Text> : null}
      </View>
    </View>
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
  notaCentrada: { marginTop: 10, textAlign: "center" },
  presionado: { opacity: 0.7 },
  aviso: {
    alignItems: "flex-start",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    padding: 14,
  },
  avisoTitulo: { fontSize: 15, fontWeight: "800" },
  avisoTexto: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  proximidad: {
    alignItems: "center",
    backgroundColor: colores.infoSuave,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  proximidadIcono: {
    alignItems: "center",
    backgroundColor: colores.info,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  proximidadTitulo: { color: colores.info, fontSize: 16, fontWeight: "800" },
  proximidadTexto: { color: colores.texto, fontSize: 12, lineHeight: 17, marginTop: 3 },
  conductor: { alignItems: "center", flexDirection: "row", gap: 14, paddingVertical: 14 },
  conductorNombre: { color: colores.titulo, fontSize: 16, fontWeight: "800", marginTop: 2 },
  conductorPrograma: { color: colores.textoSecundario, fontSize: 13, marginTop: 1 },
  conductorCalificacion: { marginTop: 6 },
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
