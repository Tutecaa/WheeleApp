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

import {
  cancelarViaje,
  finalizarViaje,
  iniciarViaje,
  obtenerDetalleViaje,
} from "@/services/viajes.service";
import { obtenerMiSolicitud, obtenerSolicitudesRecibidas } from "@/services/solicitudes.service";
import { useSesion } from "@/hooks/useSesion";
import { Avatar } from "@/components/Avatar";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Encabezado } from "@/components/Encabezado";
import { Estrellas } from "@/components/Estrellas";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { PanelSolicitud } from "@/components/PanelSolicitud";
import { ChipEstado, nombreLugar, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import {
  HORAS_DESPUES_PARA_INICIAR_VIAJE,
  LONGITUD_MAXIMA_MOTIVO_CANCELACION,
  MINUTOS_ANTES_PARA_INICIAR_VIAJE,
} from "@/constants/config";
import type { Coordenada, SolicitudCupo, SolicitudRecibida, Viaje } from "@/types";
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

// Cuándo puede el conductor iniciar el viaje: desde unos minutos antes de la
// salida y hasta unas horas después (iguales que en start_trip, 007).
function ventanaInicio(viaje: Viaje): "antes" | "abierta" | "cerrada" {
  const salida = new Date(viaje.fechaHoraSalida).getTime();
  const ahora = Date.now();
  if (ahora < salida - MINUTOS_ANTES_PARA_INICIAR_VIAJE * 60_000) return "antes";
  if (ahora > salida + HORAS_DESPUES_PARA_INICIAR_VIAJE * 3_600_000) return "cerrada";
  return "abierta";
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
// cancelarlo mientras no haya iniciado (RF6) y ve sus pasajeros y solicitudes
// (RF11). El pasajero ve la ruta, qué tan cerca pasa de su punto de partida y
// los datos públicos del conductor (RF9), y solicita o cancela su cupo (RF10, RF12).
export default function DetalleViaje() {
  const { id, aviso, lat, lng } = useLocalSearchParams<{
    id: string;
    aviso?: string;
    lat?: string;
    lng?: string;
  }>();
  const partida = aPunto(lat, lng);
  const { perfil } = useSesion();
  const perfilId = perfil?.id;
  const esAdmin = perfil?.rol === "administrador";
  const [viaje, setViaje] = useState<Viaje | null>(null);
  // Del pasajero: su última solicitud en el viaje. Del conductor: las recibidas.
  const [miSolicitud, setMiSolicitud] = useState<SolicitudCupo | null>(null);
  const [recibidas, setRecibidas] = useState<SolicitudRecibida[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(aviso === "publicado" ? "¡Tu viaje quedó publicado!" : "");

  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorCancelar, setErrorCancelar] = useState("");
  const [procesando, setProcesando] = useState(false);
  // Iniciar o finalizar el viaje.
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState("");

  const cargar = useCallback(async () => {
    try {
      const detalle = await obtenerDetalleViaje(id, aPunto(lat, lng));
      // Las solicitudes completan el detalle: si fallan, el viaje se muestra igual.
      if (detalle.conductorId === perfilId) {
        const grupos = await obtenerSolicitudesRecibidas(id).catch(() => []);
        setRecibidas(grupos[0]?.solicitudes ?? []);
      } else if (!esAdmin) {
        setMiSolicitud(await obtenerMiSolicitud(id).catch(() => null));
      }
      setViaje(detalle);
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, [id, lat, lng, perfilId, esAdmin]);

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

  async function cambiarEstado(accion: "iniciar" | "finalizar") {
    if (!viaje) return;
    const iniciar = accion === "iniciar";
    const ok = await confirmar(
      iniciar ? "Iniciar viaje" : "Finalizar viaje",
      iniciar
        ? "El viaje quedará en curso: ya no podrás editarlo ni cancelarlo, ni aceptar solicitudes pendientes."
        : "El viaje quedará finalizado y tú y tus pasajeros podrán calificarse.",
      iniciar ? "Iniciar" : "Finalizar",
    );
    if (!ok) return;

    setErrorEstado("");
    setMensaje("");
    setCambiandoEstado(true);
    try {
      if (iniciar) {
        await iniciarViaje(viaje.id);
        setMensaje("¡Buen viaje! El viaje está en curso.");
      } else {
        await finalizarViaje(viaje.id);
        setMensaje("Finalizaste el viaje. Ya puedes calificar a tus pasajeros.");
      }
    } catch (estadoError) {
      setErrorEstado((estadoError as Error).message);
    } finally {
      setCambiandoEstado(false);
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
  const tieneCupo = miSolicitud?.estado === "aceptada" || miSolicitud?.estado === "pendiente";
  const confirmados = recibidas.filter((solicitud) => solicitud.estado === "aceptada");
  const porResponder = recibidas.filter((solicitud) => solicitud.estado === "pendiente").length;
  const ventana = ventanaInicio(viaje);
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
            {esPasajero && viaje.estado === "en_curso" ? (
              <Aviso icono="navigate" tipo="info" titulo="El viaje está en curso" />
            ) : null}
            {esPasajero && viaje.estado === "finalizado" ? (
              <Aviso icono="flag" tipo="neutro" titulo="Este viaje finalizó" />
            ) : null}
            {esPasajero && viaje.estado === "publicado" && vencido ? (
              <Aviso icono="time" tipo="neutro" titulo="Este viaje ya salió" />
            ) : null}
            {esPasajero && sinCupos && !tieneCupo ? (
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
              <PanelSolicitud onCambio={cargar} partida={partida} solicitud={miSolicitud} viaje={viaje} />
            ) : null}

            {esConductor && viaje.estado !== "cancelado" ? (
              <View style={styles.tarjeta}>
                <View style={styles.pasajerosEncabezado}>
                  <Text style={styles.filaEtiqueta}>Pasajeros confirmados</Text>
                  <Text style={styles.pasajerosConteo}>
                    {confirmados.length} de {viaje.cuposTotales}
                  </Text>
                </View>
                {confirmados.length === 0 ? (
                  <Text style={styles.pasajerosVacio}>Aún no tienes pasajeros confirmados.</Text>
                ) : (
                  confirmados.map((solicitud) => (
                    <Pressable
                      accessibilityHint="Abre su perfil público"
                      accessibilityRole="button"
                      key={solicitud.id}
                      onPress={() =>
                        router.push({ pathname: "/usuario/[id]", params: { id: solicitud.pasajero.id } })
                      }
                      style={({ pressed }) => [styles.pasajero, pressed && styles.presionado]}
                    >
                      <Avatar
                        fotoUrl={solicitud.pasajero.fotoPerfilUrl}
                        nombre={solicitud.pasajero.nombreCompleto}
                        tamano={36}
                      />
                      <View style={styles.flex}>
                        <Text numberOfLines={1} style={styles.pasajeroNombre}>
                          {solicitud.pasajero.nombreCompleto}
                        </Text>
                        {solicitud.distanciaProximidadMetros !== undefined ? (
                          <Text style={styles.pasajeroDetalle}>
                            Sale a {formatearDistancia(solicitud.distanciaProximidadMetros)} de tu ruta
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons color={colores.placeholder} name="chevron-forward" size={18} />
                    </Pressable>
                  ))
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/solicitudes", params: { viajeId: viaje.id } })}
                  style={({ pressed }) => [
                    styles.verSolicitudes,
                    porResponder > 0 && styles.verSolicitudesDestacado,
                    pressed && styles.presionado,
                  ]}
                >
                  <Ionicons
                    color={porResponder > 0 ? colores.avisoTexto : colores.primario}
                    name={porResponder > 0 ? "notifications" : "people-outline"}
                    size={16}
                  />
                  <Text style={[styles.verSolicitudesTexto, porResponder > 0 && styles.verSolicitudesTextoDestacado]}>
                    {porResponder > 0
                      ? `${porResponder} solicitud${porResponder === 1 ? "" : "es"} por responder`
                      : "Ver solicitudes"}
                  </Text>
                  <Ionicons
                    color={porResponder > 0 ? colores.avisoTexto : colores.primario}
                    name="chevron-forward"
                    size={16}
                  />
                </Pressable>
              </View>
            ) : null}

            {esConductor && viaje.estado === "cancelado" && viaje.motivoCancelacion ? (
              <Text style={styles.nota}>Motivo de la cancelación: {viaje.motivoCancelacion}</Text>
            ) : null}
            {esConductor && viaje.estado === "en_curso" ? (
              <>
                <Aviso
                  icono="navigate"
                  texto="Cuando lleguen al destino, finaliza el viaje para que tú y tus pasajeros puedan calificarse."
                  tipo="info"
                  titulo="Viaje en curso"
                />
                <Boton
                  cargando={cambiandoEstado}
                  onPress={() => cambiarEstado("finalizar")}
                  titulo="Finalizar viaje"
                  tituloCargando="Finalizando..."
                />
              </>
            ) : null}
            {esConductor && viaje.estado === "finalizado" ? (
              <>
                <Aviso
                  icono="flag"
                  texto={
                    confirmados.length > 0
                      ? "Califica a tus pasajeros: tu opinión ayuda a construir la confianza de la comunidad."
                      : "Este viaje no tuvo pasajeros confirmados."
                  }
                  tipo="exito"
                  titulo="Viaje finalizado"
                />
                {confirmados.length > 0 ? (
                  <Boton
                    onPress={() => router.push({ pathname: "/calificar/[id]", params: { id: viaje.id } })}
                    titulo="Calificar a tus pasajeros"
                  />
                ) : null}
              </>
            ) : null}
            {modificable && ventana === "antes" ? (
              <Text style={styles.nota}>
                Podrás iniciar el viaje desde {MINUTOS_ANTES_PARA_INICIAR_VIAJE} minutos antes de la salida.
              </Text>
            ) : null}
            {modificable && salidaVencida(viaje) ? (
              <Text style={styles.nota}>
                {ventana === "abierta"
                  ? "La hora de salida ya pasó. Inicia el viaje si ya vas en camino, o edítalo o cancélalo."
                  : "La hora de salida ya pasó. Edita el viaje para elegir una nueva fecha o cancélalo."}
              </Text>
            ) : null}
            {errorEstado ? <Text style={styles.error}>{errorEstado}</Text> : null}

            {modificable && ventana === "abierta" && !cancelando ? (
              <Boton
                cargando={cambiandoEstado}
                onPress={() => cambiarEstado("iniciar")}
                titulo="Iniciar viaje"
                tituloCargando="Iniciando..."
              />
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
  exito: { fondo: colores.primarioSuave, color: colores.primario },
  info: { fondo: colores.infoSuave, color: colores.info },
  error: { fondo: colores.errorSuave, color: colores.error },
  aviso: { fondo: colores.avisoFondo, color: colores.avisoTexto },
  neutro: { fondo: colores.borde, color: colores.texto },
} as const;

// Aviso destacado: viaje cancelado, vencido, sin cupos, en curso o finalizado.
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
  pasajerosEncabezado: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
    paddingTop: 8,
  },
  pasajerosConteo: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  pasajerosVacio: { color: colores.textoSecundario, fontSize: 14, paddingVertical: 8 },
  pasajero: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 8 },
  pasajeroNombre: { color: colores.titulo, fontSize: 15, fontWeight: "700" },
  pasajeroDetalle: { color: colores.info, fontSize: 12, fontWeight: "600", marginTop: 1 },
  verSolicitudes: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  verSolicitudesDestacado: { backgroundColor: colores.avisoFondo },
  verSolicitudesTexto: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "800" },
  verSolicitudesTextoDestacado: { color: colores.avisoTexto },
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
