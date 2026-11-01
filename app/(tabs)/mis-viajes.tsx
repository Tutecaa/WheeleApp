import { useCallback, useRef, useState } from "react";
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
// finalizados, cancelados y los publicados cuya salida ya pasó. Como
// pasajero, además, la solicitud debe seguir pendiente o confirmada.
function esProximo(viaje: ResumenViaje): boolean {
  const vigente = viaje.estado === "en_curso" || (viaje.estado === "publicado" && !salidaVencida(viaje));
  if (viaje.rol === "conductor") return vigente;
  return vigente && (viaje.solicitud?.estado === "pendiente" || viaje.solicitud?.estado === "aceptada");
}

// Pestaña de rol con la que se abre la lista: la de pasajero si solo tiene
// viajes próximos como pasajero o si nunca ha publicado un viaje.
function rolInicial(lista: ResumenViaje[]): RolEnViaje {
  const proximos = lista.filter(esProximo);
  if (proximos.some((viaje) => viaje.rol === "conductor")) return "conductor";
  if (proximos.some((viaje) => viaje.rol === "pasajero")) return "pasajero";
  return lista.some((viaje) => viaje.rol === "conductor") ? "conductor" : "pasajero";
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
  // La primera vez se abre la pestaña de rol que tiene viajes próximos; luego
  // se respeta la que elija el usuario.
  const rolDecidido = useRef(false);

  function cambiarRol(nuevo: RolEnViaje) {
    rolDecidido.current = true;
    setRol(nuevo);
  }

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
          if (!rolDecidido.current) {
            rolDecidido.current = true;
            setRol(rolInicial(lista));
          }
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

  const pendientes = viajes.reduce(
    (total, viaje) => total + (viaje.rol === "conductor" && esProximo(viaje) ? (viaje.solicitudesPendientes ?? 0) : 0),
    0,
  );
  const esConductor = viajes.some((viaje) => viaje.rol === "conductor");

  function abrir(viaje: ResumenViaje) {
    const partida = viaje.solicitud?.puntoPartida;
    router.push({
      pathname: "/viaje/[id]",
      params: partida
        ? { id: viaje.id, lat: String(partida.latitud), lng: String(partida.longitud) }
        : { id: viaje.id },
    });
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
      <Encabezado
        derecha={
          esConductor ? (
            <Pressable
              accessibilityLabel={`Solicitudes recibidas${pendientes > 0 ? `, ${pendientes} por responder` : ""}`}
              accessibilityRole="button"
              onPress={() => router.push("/solicitudes")}
              style={({ pressed }) => [styles.solicitudes, pressed && styles.presionado]}
            >
              <Ionicons color={colores.primario} name="people-outline" size={16} />
              <Text style={styles.solicitudesTexto}>Solicitudes</Text>
              {pendientes > 0 ? (
                <View style={styles.insignia}>
                  <Text style={styles.insigniaTexto}>{pendientes > 9 ? "9+" : pendientes}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : undefined
        }
        titulo="Mis viajes"
      />
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
          onCambiar={cambiarRol}
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
            {rol === "pasajero" && periodo === "proximos" && !esAdmin ? (
              <Boton onPress={() => router.push("/buscar")} titulo="Buscar un viaje" variante="secundario" />
            ) : null}
          </View>
        ) : (
          filtrados.map((viaje) => (
            <TarjetaViaje key={`${viaje.rol}-${viaje.id}`} onPress={() => abrir(viaje)} viaje={viaje} />
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
  solicitudes: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 16,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  solicitudesTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  insignia: {
    alignItems: "center",
    backgroundColor: colores.acento,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
  },
  insigniaTexto: { color: colores.blanco, fontSize: 11, fontWeight: "800" },
  presionado: { opacity: 0.7 },
});
