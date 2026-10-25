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
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { obtenerMisViajes } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { TarjetaViaje, salidaVencida } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import type { ResumenViaje, RolEnViaje } from "@/types";

type Periodo = "proximos" | "historial";

// Próximos: los que aún se van a realizar o están en curso. Historial: los
// finalizados, cancelados y los publicados cuya salida ya pasó.
function esProximo(viaje: ResumenViaje): boolean {
  return viaje.estado === "en_curso" || (viaje.estado === "publicado" && !salidaVencida(viaje));
}

const VACIO: Record<Periodo, Record<RolEnViaje, string>> = {
  proximos: {
    conductor: "No tienes viajes próximos como conductor.",
    pasajero: "No tienes reservas próximas como pasajero.",
  },
  historial: {
    conductor: "Aún no tienes viajes anteriores como conductor.",
    pasajero: "Aún no tienes viajes anteriores como pasajero.",
  },
};

// RF7: viajes en los que participa el usuario, con su rol en cada uno.
export default function MisViajes() {
  const { perfil } = useSesion();
  const esAdmin = perfil?.rol === "administrador";

  const [viajes, setViajes] = useState<ResumenViaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("proximos");
  const [rol, setRol] = useState<RolEnViaje>("conductor");

  const cargar = useCallback(async () => {
    try {
      setViajes(await obtenerMisViajes());
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, []);

  // Se recarga cada vez que se abre la pestaña: el usuario pudo publicar,
  // editar o cancelar un viaje en otra pantalla.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      obtenerMisViajes()
        .then((lista) => {
          if (!activo) return;
          setViajes(lista);
          setError("");
        })
        .catch((cargaError: Error) => {
          if (activo) setError(cargaError.message);
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
      return () => {
        activo = false;
      };
    }, []),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const filtrados = viajes
    .filter((viaje) => viaje.rol === rol && esProximo(viaje) === (periodo === "proximos"))
    .sort((a, b) => {
      const diferencia = new Date(a.fechaHoraSalida).getTime() - new Date(b.fechaHoraSalida).getTime();
      // Los próximos, del más cercano al más lejano; el historial, del más reciente al más antiguo.
      return periodo === "proximos" ? diferencia : -diferencia;
    });

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado titulo="Mis viajes" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl colors={[colores.primario]} onRefresh={refrescar} refreshing={refrescando} />
        }
      >
        <Selector
          onCambiar={setPeriodo}
          opciones={[
            { valor: "proximos", texto: "Próximos" },
            { valor: "historial", texto: "Historial" },
          ]}
          valor={periodo}
        />
        <Selector
          onCambiar={setRol}
          opciones={[
            { valor: "conductor", texto: "Como conductor" },
            { valor: "pasajero", texto: "Como pasajero" },
          ]}
          valor={rol}
        />

        {cargando ? (
          <ActivityIndicator color={colores.primario} style={styles.cargando} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : filtrados.length === 0 ? (
          <View style={styles.vacioCaja}>
            <View style={styles.vacioIcono}>
              <Ionicons color={colores.primario} name="map-outline" size={30} />
            </View>
            <Text style={styles.vacio}>{VACIO[periodo][rol]}</Text>
            {rol === "conductor" && periodo === "proximos" && !esAdmin ? (
              <Boton onPress={() => router.push("/publicar")} titulo="Publicar un viaje" variante="secundario" />
            ) : null}
          </View>
        ) : (
          filtrados.map((viaje) => (
            <TarjetaViaje
              key={viaje.id}
              onPress={() => router.push({ pathname: "/viaje/[id]", params: { id: viaje.id } })}
              viaje={viaje}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Selector<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <View style={styles.selector}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: elegida }}
            key={opcion.valor}
            onPress={() => onCambiar(opcion.valor)}
            style={[styles.opcion, elegida && styles.opcionElegida]}
          >
            <Text style={[styles.opcionTexto, elegida && styles.opcionTextoElegida]}>{opcion.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  selector: {
    backgroundColor: colores.primarioSuave,
    borderRadius: 14,
    flexDirection: "row",
    marginTop: 10,
    padding: 4,
  },
  opcion: { alignItems: "center", borderRadius: 11, flex: 1, paddingVertical: 10 },
  opcionElegida: { backgroundColor: colores.blanco },
  opcionTexto: { color: colores.textoSecundario, fontSize: 14, fontWeight: "700" },
  opcionTextoElegida: { color: colores.primario },
  cargando: { marginTop: 32 },
  error: { color: colores.error, fontSize: 14, lineHeight: 20, marginTop: 20 },
  vacioCaja: { alignItems: "center", marginTop: 36 },
  vacioIcono: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 22,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  vacio: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 14, textAlign: "center" },
});
