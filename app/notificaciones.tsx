import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { marcarLeidas, obtenerNotificaciones } from "@/services/notificaciones.service";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import { Encabezado } from "@/components/Encabezado";
import { TarjetaNotificacion, destinoNotificacion } from "@/components/TarjetaNotificacion";
import { colores } from "@/constants/colores";
import type { Notificacion } from "@/types";

// Las de las últimas 24 horas van en "Recientes"; el resto, en "Anteriores".
function esReciente(notificacion: Notificacion): boolean {
  return Date.now() - new Date(notificacion.fecha).getTime() < 24 * 60 * 60 * 1000;
}

// RF15: bandeja de notificaciones, de la más reciente a la más antigua, con
// las no leídas resaltadas. Al abrir una se marca como leída y lleva al
// viaje o a la solicitud.
export default function Notificaciones() {
  const { recargar } = useNotificaciones();
  const [notificaciones, setNotificaciones] = useState<Notificacion[] | null>(null);
  const [error, setError] = useState("");
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setNotificaciones(await obtenerNotificaciones());
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
    recargar();
  }, [recargar]);

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

  async function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) {
      // Se marca en pantalla de una vez; si falla, la próxima carga la corrige.
      setNotificaciones((actuales) =>
        actuales?.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n)) ?? null,
      );
      marcarLeidas([notificacion.id])
        .then(recargar)
        .catch(() => {});
    }
    const destino = destinoNotificacion(notificacion);
    if (destino) router.push(destino);
  }

  async function leerTodas() {
    setNotificaciones((actuales) => actuales?.map((n) => ({ ...n, leida: true })) ?? null);
    try {
      await marcarLeidas();
    } catch (marcarError) {
      setError((marcarError as Error).message);
    }
    await cargar();
  }

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/buscar");
  }

  const noLeidas = notificaciones?.filter((n) => !n.leida).length ?? 0;
  const recientes = notificaciones?.filter(esReciente) ?? [];
  const anteriores = notificaciones?.filter((n) => !esReciente(n)) ?? [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado
        derecha={
          noLeidas > 0 ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={leerTodas}
              style={({ pressed }) => [styles.leerTodas, pressed && styles.presionado]}
            >
              <Ionicons color={colores.primario} name="checkmark-done" size={16} />
              <Text style={styles.leerTodasTexto}>Leer todas</Text>
            </Pressable>
          ) : undefined
        }
        onVolver={volver}
        titulo="Notificaciones"
      />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl colors={[colores.primario]} onRefresh={refrescar} refreshing={refrescando} />
        }
      >
        {error ? (
          <View style={styles.error}>
            <Ionicons color={colores.error} name="alert-circle" size={18} />
            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        ) : null}

        {notificaciones === null ? (
          error ? null : <ActivityIndicator color={colores.primario} style={styles.cargando} />
        ) : notificaciones.length === 0 ? (
          <View style={styles.vacio}>
            <View style={styles.vacioIcono}>
              <Ionicons color={colores.primario} name="notifications-outline" size={30} />
            </View>
            <Text style={styles.vacioTitulo}>No tienes notificaciones</Text>
            <Text style={styles.vacioTexto}>
              Aquí te avisaremos de tus solicitudes, reservas, cambios en tus viajes y más.
            </Text>
          </View>
        ) : (
          <>
            {noLeidas > 0 ? (
              <Text style={styles.resumen}>
                Tienes {noLeidas} notificaci{noLeidas === 1 ? "ón" : "ones"} sin leer
              </Text>
            ) : null}
            {recientes.length > 0 ? <Text style={styles.seccion}>Recientes</Text> : null}
            {recientes.map((notificacion) => (
              <TarjetaNotificacion key={notificacion.id} notificacion={notificacion} onPress={() => abrir(notificacion)} />
            ))}
            {anteriores.length > 0 ? <Text style={styles.seccion}>Anteriores</Text> : null}
            {anteriores.map((notificacion) => (
              <TarjetaNotificacion key={notificacion.id} notificacion={notificacion} onPress={() => abrir(notificacion)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  presionado: { opacity: 0.6 },
  leerTodas: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 16,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  leerTodasTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  resumen: { color: colores.textoSecundario, fontSize: 13, fontWeight: "600" },
  seccion: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
    marginTop: 16,
    textTransform: "uppercase",
  },
  error: {
    alignItems: "center",
    backgroundColor: colores.errorSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    padding: 12,
  },
  errorTexto: { color: colores.error, flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  cargando: { marginTop: 32 },
  vacio: { alignItems: "center", marginTop: 48, paddingHorizontal: 12 },
  vacioIcono: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 22,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  vacioTitulo: { color: colores.titulo, fontSize: 16, fontWeight: "800", marginTop: 14 },
  vacioTexto: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: "center" },
});
