import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { obtenerSolicitudesRecibidas, responderSolicitud } from "@/services/solicitudes.service";
import { Encabezado } from "@/components/Encabezado";
import { TarjetaSolicitud } from "@/components/TarjetaSolicitud";
import { ChipEstado, nombreLugar, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import type { SolicitudRecibida, ViajeConSolicitudes } from "@/types";
import { confirmar } from "@/utils/confirmar";
import { formatearDia, formatearHora } from "@/utils/formato";

type Filtro = "pendientes" | "confirmadas" | "todas";

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "pendientes", texto: "Pendientes" },
  { valor: "confirmadas", texto: "Confirmadas" },
  { valor: "todas", texto: "Todas" },
];

function pasaFiltro(solicitud: SolicitudRecibida, filtro: Filtro): boolean {
  if (filtro === "pendientes") return solicitud.estado === "pendiente";
  if (filtro === "confirmadas") return solicitud.estado === "aceptada";
  return true;
}

// RF11: solicitudes recibidas por el conductor, agrupadas por viaje. Con
// `viajeId` muestra solo las de ese viaje; si no, las de sus viajes próximos.
export default function Solicitudes() {
  const { viajeId } = useLocalSearchParams<{ viajeId?: string }>();
  const [grupos, setGrupos] = useState<ViajeConSolicitudes[] | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [refrescando, setRefrescando] = useState(false);
  // Solicitud que se está guardando, para bloquear solo sus botones.
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setGrupos(await obtenerSolicitudesRecibidas(viajeId));
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, [viajeId]);

  // Se recarga al volver: el pasajero pudo cancelar mientras tanto.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function responder(solicitud: SolicitudRecibida, aceptar: boolean, motivo = "") {
    const nombre = solicitud.pasajero.nombreCompleto.split(" ")[0];
    if (aceptar) {
      const ok = await confirmar(
        "Aceptar solicitud",
        `${solicitud.pasajero.nombreCompleto} tendrá un cupo confirmado y se descontará un cupo del viaje.`,
        "Aceptar",
      );
      if (!ok) return;
    }

    setMensaje("");
    setError("");
    setProcesando(solicitud.id);
    try {
      await responderSolicitud(solicitud.id, aceptar, motivo);
      setMensaje(aceptar ? `Aceptaste a ${nombre}. Ya tiene su cupo.` : `Rechazaste la solicitud de ${nombre}.`);
    } catch (respuestaError) {
      setError((respuestaError as Error).message);
    } finally {
      setProcesando(null);
    }
    await cargar();
  }

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/mis-viajes");
  }

  const todas = grupos?.flatMap((grupo) => grupo.solicitudes) ?? [];
  const conteo: Record<Filtro, number> = {
    pendientes: todas.filter((solicitud) => solicitud.estado === "pendiente").length,
    confirmadas: todas.filter((solicitud) => solicitud.estado === "aceptada").length,
    todas: todas.length,
  };
  const visibles = (grupos ?? [])
    .map((grupo) => ({ ...grupo, solicitudes: grupo.solicitudes.filter((s) => pasaFiltro(s, filtro)) }))
    .filter((grupo) => grupo.solicitudes.length > 0);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado onVolver={volver} titulo="Solicitudes" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl colors={[colores.primario]} onRefresh={refrescar} refreshing={refrescando} />
        }
      >
        <View style={styles.filtros}>
          {FILTROS.map((opcion) => {
            const elegido = opcion.valor === filtro;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: elegido }}
                key={opcion.valor}
                onPress={() => setFiltro(opcion.valor)}
                style={[styles.filtro, elegido && styles.filtroElegido]}
              >
                <Text style={[styles.filtroTexto, elegido && styles.filtroTextoElegido]}>{opcion.texto}</Text>
                {conteo[opcion.valor] > 0 ? (
                  <View style={[styles.conteo, elegido && styles.conteoElegido]}>
                    <Text style={[styles.conteoTexto, elegido && styles.conteoTextoElegido]}>
                      {conteo[opcion.valor]}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {mensaje ? (
          <View style={styles.exito}>
            <Ionicons color={colores.primario} name="checkmark-circle" size={18} />
            <Text style={styles.exitoTexto}>{mensaje}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.error}>
            <Ionicons color={colores.error} name="alert-circle" size={18} />
            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        ) : null}

        {grupos === null ? (
          error ? null : <ActivityIndicator color={colores.primario} style={styles.cargando} />
        ) : visibles.length === 0 ? (
          <View style={styles.vacio}>
            <View style={styles.vacioIcono}>
              <Ionicons color={colores.primario} name="people-outline" size={30} />
            </View>
            <Text style={styles.vacioTitulo}>
              {filtro === "pendientes"
                ? "No tienes solicitudes por responder"
                : filtro === "confirmadas"
                  ? "Aún no tienes pasajeros confirmados"
                  : "Aún no tienes solicitudes"}
            </Text>
            <Text style={styles.vacioTexto}>
              {viajeId
                ? "Cuando un pasajero solicite un cupo en este viaje, aparecerá aquí."
                : "Cuando un pasajero solicite un cupo en tus próximos viajes, aparecerá aquí."}
            </Text>
          </View>
        ) : (
          visibles.map((grupo) => {
            const abierto = grupo.estado === "publicado" && !salidaVencida(grupo);
            return (
              <View key={grupo.viajeId} style={styles.grupo}>
                <Pressable
                  accessibilityHint="Abre el detalle del viaje"
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/viaje/[id]", params: { id: grupo.viajeId } })}
                  style={({ pressed }) => [styles.viaje, pressed && styles.presionado]}
                >
                  <View style={styles.viajeIcono}>
                    <Ionicons color={colores.blanco} name="car-sport" size={18} />
                  </View>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={styles.viajeRuta}>
                      {nombreLugar(grupo.origenNombre)} → {nombreLugar(grupo.destinoNombre)}
                    </Text>
                    <Text style={styles.viajeDetalle}>
                      {formatearDia(grupo.fechaHoraSalida)} · {formatearHora(grupo.fechaHoraSalida)}
                    </Text>
                  </View>
                  {abierto ? (
                    <View style={[styles.cupos, grupo.cuposDisponibles === 0 && styles.cuposAgotados]}>
                      <Text style={[styles.cuposValor, grupo.cuposDisponibles === 0 && styles.cuposAgotadosTexto]}>
                        {grupo.cuposDisponibles}/{grupo.cuposTotales}
                      </Text>
                      <Text style={[styles.cuposTexto, grupo.cuposDisponibles === 0 && styles.cuposAgotadosTexto]}>
                        libres
                      </Text>
                    </View>
                  ) : (
                    <ChipEstado viaje={{ estado: grupo.estado, fechaHoraSalida: grupo.fechaHoraSalida }} />
                  )}
                </Pressable>

                {grupo.solicitudes.map((solicitud) => (
                  <TarjetaSolicitud
                    key={solicitud.id}
                    onAceptar={() => responder(solicitud, true)}
                    onRechazar={(motivo) => responder(solicitud, false, motivo)}
                    procesando={procesando === solicitud.id}
                    puedeResponder={abierto}
                    sinCupos={grupo.cuposDisponibles === 0}
                    solicitud={solicitud}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  flex: { flex: 1 },
  presionado: { opacity: 0.7 },
  filtros: { backgroundColor: colores.primarioSuave, borderRadius: 14, flexDirection: "row", padding: 4 },
  filtro: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
  },
  filtroElegido: { backgroundColor: colores.blanco },
  filtroTexto: { color: colores.textoSecundario, fontSize: 13, fontWeight: "700" },
  filtroTextoElegido: { color: colores.primario },
  conteo: {
    alignItems: "center",
    backgroundColor: colores.borde,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
  },
  conteoElegido: { backgroundColor: colores.primario },
  conteoTexto: { color: colores.textoSecundario, fontSize: 11, fontWeight: "800" },
  conteoTextoElegido: { color: colores.blanco },
  exito: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  exitoTexto: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "800" },
  error: {
    alignItems: "center",
    backgroundColor: colores.errorSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  errorTexto: { color: colores.error, flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  cargando: { marginTop: 32 },
  vacio: { alignItems: "center", marginTop: 40, paddingHorizontal: 12 },
  vacioIcono: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 22,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  vacioTitulo: { color: colores.titulo, fontSize: 16, fontWeight: "800", marginTop: 14, textAlign: "center" },
  vacioTexto: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: "center" },
  grupo: { marginTop: 18 },
  viaje: { alignItems: "center", flexDirection: "row", gap: 10 },
  viajeIcono: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  viajeRuta: { color: colores.titulo, fontSize: 15, fontWeight: "800" },
  viajeDetalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  cupos: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cuposAgotados: { backgroundColor: colores.avisoFondo },
  cuposValor: { color: colores.primario, fontSize: 15, fontWeight: "800" },
  cuposTexto: { color: colores.primario, fontSize: 10, fontWeight: "700" },
  cuposAgotadosTexto: { color: colores.avisoTexto },
});
