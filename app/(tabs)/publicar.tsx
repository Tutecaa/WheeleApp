import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { obtenerMisVehiculos } from "@/services/vehiculos.service";
import { publicarViaje } from "@/services/viajes.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { FormularioViaje, type DatosFormularioViaje } from "@/components/FormularioViaje";
import { colores } from "@/constants/colores";
import type { Vehiculo } from "@/types";

// RF4: publicar un viaje.
export default function Publicar() {
  const { perfil } = useSesion();
  const esAdmin = perfil?.rol === "administrador";

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  // Cambiarla monta un formulario nuevo y vacío después de publicar.
  const [formulario, setFormulario] = useState(0);

  // Se recarga al volver a la pestaña: el vehículo pudo aprobarse mientras tanto.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      obtenerMisVehiculos()
        .then((lista) => {
          if (!activo) return;
          setVehiculos(lista);
          setErrorCarga("");
        })
        .catch((error: Error) => {
          if (activo) setErrorCarga(error.message);
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
      return () => {
        activo = false;
      };
    }, []),
  );

  const aprobados = vehiculos.filter((vehiculo) => vehiculo.estadoHabilitacion === "aprobado");
  const enRevision = vehiculos.some((vehiculo) => vehiculo.estadoHabilitacion === "pendiente");

  async function publicar(datos: DatosFormularioViaje) {
    const id = await publicarViaje(datos);
    setFormulario((n) => n + 1);
    router.push({ pathname: "/viaje/[id]", params: { id, aviso: "publicado" } });
  }

  if (cargando) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centrado]}>
        <ActivityIndicator color={colores.primario} />
      </SafeAreaView>
    );
  }

  // El administrador no publica viajes; la pestaña está oculta para él.
  if (esAdmin || aprobados.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.bloqueo}>
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Publicar viaje</Text>
          {errorCarga ? (
            <Text style={styles.error}>{errorCarga}</Text>
          ) : esAdmin ? (
            <Text style={styles.description}>Los administradores no publican viajes.</Text>
          ) : (
            <>
              {/* RF4: un usuario no habilitado va al registro de vehículo (RF3). */}
              <Text style={styles.description}>
                {enRevision
                  ? "Tu solicitud de habilitación está en revisión. Podrás publicar viajes cuando un administrador apruebe tu vehículo."
                  : "Para publicar viajes necesitas registrar tu vehículo y que un administrador lo apruebe."}
              </Text>
              <Boton onPress={() => router.push("/conductor/vehiculo")} titulo="Ir a Mi vehículo" />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <FormularioViaje
      key={formulario}
      onEnviar={publicar}
      textoEnviando="Publicando..."
      textoEnviar="Publicar viaje"
      titulo="PUBLICAR VIAJE"
      vehiculos={aprobados}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  bloqueo: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: colores.primario, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 8 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 10 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
