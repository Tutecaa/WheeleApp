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

import { obtenerMisViajes } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
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
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl onRefresh={refrescar} refreshing={refrescando} />}
      >
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>Mis viajes</Text>

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
          <View>
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
  container: { padding: 24, paddingBottom: 40 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 8 },
  selector: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 14,
    padding: 4,
  },
  opcion: { alignItems: "center", borderRadius: 9, flex: 1, paddingVertical: 9 },
  opcionElegida: { backgroundColor: colores.primario },
  opcionTexto: { color: colores.textoSecundario, fontSize: 14, fontWeight: "700" },
  opcionTextoElegida: { color: colores.blanco },
  cargando: { marginTop: 32 },
  error: { color: colores.error, fontSize: 14, lineHeight: 20, marginTop: 20 },
  vacio: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 24 },
});
