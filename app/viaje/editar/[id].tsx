import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { obtenerMisVehiculos } from "@/services/vehiculos.service";
import { modificarViaje, obtenerViaje } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import {
  FormularioViaje,
  type DatosFormularioViaje,
  type ValoresViaje,
} from "@/components/FormularioViaje";
import { colores } from "@/constants/colores";
import type { Vehiculo, Viaje } from "@/types";

function valoresDe(viaje: Viaje): ValoresViaje {
  return {
    recorrido: {
      origen: viaje.origen.coordenadas,
      destino: viaje.destino.coordenadas,
      paradas: viaje.paradasIntermedias.map((parada) => parada.coordenadas),
    },
    nombreOrigen: viaje.origen.nombre ?? "",
    nombreDestino: viaje.destino.nombre ?? "",
    trazado: {
      coordenadas: viaje.trazadoRuta,
      distanciaMetros: viaje.distanciaMetros,
      duracionSegundos: viaje.duracionSegundos,
    },
    vehiculoId: viaje.vehiculoId,
    // Si la salida ya pasó, el conductor debe elegir una nueva.
    salida:
      new Date(viaje.fechaHoraSalida).getTime() > Date.now() ? new Date(viaje.fechaHoraSalida) : null,
    cupos: String(viaje.cuposTotales),
    aporte: viaje.aporteSugerido ? String(viaje.aporteSugerido) : "",
  };
}

// RF6: modificar un viaje publicado que aún no ha iniciado.
export default function EditarViaje() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSesion();
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerViaje(id), obtenerMisVehiculos()])
      .then(([encontrado, lista]) => {
        if (!activo) return;
        setViaje(encontrado);
        setVehiculos(lista.filter((vehiculo) => vehiculo.estadoHabilitacion === "aprobado"));
      })
      .catch((cargaError: Error) => {
        if (activo) setError(cargaError.message);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  function salir() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/viaje/[id]", params: { id } });
  }

  async function guardar(datos: DatosFormularioViaje) {
    if (!viaje) return;
    await modificarViaje(viaje, datos, datos.recorridoCambio);
    // El detalle se recarga al volver a él.
    salir();
  }

  const motivoBloqueo = error
    ? error
    : viaje && perfil && viaje.conductorId !== perfil.id
      ? "Solo el conductor que publicó el viaje puede modificarlo."
      : viaje && viaje.estado !== "publicado"
        ? "Este viaje ya inició, finalizó o fue cancelado, así que no se puede modificar."
        : viaje && vehiculos.length === 0
          ? "Necesitas un vehículo aprobado para modificar el viaje."
          : "";

  if (motivoBloqueo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable accessibilityRole="link" onPress={salir}>
            <Text style={styles.backLink}>← Volver</Text>
          </Pressable>
          <Text style={styles.error}>{motivoBloqueo}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!viaje) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centrado]}>
        <ActivityIndicator color={colores.primario} />
      </SafeAreaView>
    );
  }

  return (
    <FormularioViaje
      cuposReservados={viaje.cuposTotales - viaje.cuposDisponibles}
      inicial={valoresDe(viaje)}
      onEnviar={guardar}
      onSalir={salir}
      textoEnviando="Guardando..."
      textoEnviar="Guardar cambios"
      titulo="Editar viaje"
      vehiculos={vehiculos}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  container: { padding: 28 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 20 },
  error: { color: colores.error, fontSize: 14, lineHeight: 20 },
});
