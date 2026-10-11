import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { signOut } from "@/services/auth.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { colores } from "@/constants/colores";

export default function Home() {
  const { perfil } = useSesion();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const esAdmin = perfil?.rol === "administrador";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      // Al cerrar sesión, el layout raíz redirige a /login.
      await signOut();
    } catch (error) {
      Alert.alert("No se pudo cerrar la sesión", (error as Error).message);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>
          {perfil ? `Hola, ${perfil.nombreCompleto.split(" ")[0]}` : "Sesión iniciada"}
        </Text>
        <Text style={styles.description}>
          Tu identidad UIS está verificada. Las funciones de viajes se incorporarán
          en los siguientes sprints.
        </Text>

        {/* El administrador no publica ni solicita viajes. */}
        {esAdmin ? (
          <Boton
            onPress={() => router.push("/admin/habilitaciones")}
            titulo="Revisar habilitaciones"
          />
        ) : (
          <Boton
            onPress={() => router.push("/conductor/vehiculo")}
            titulo="Mi vehículo y habilitación"
          />
        )}

        <Boton
          cargando={isSigningOut}
          onPress={handleSignOut}
          titulo="Cerrar sesión"
          tituloCargando="Cerrando sesión..."
          variante="secundario"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 30, fontWeight: "800", marginTop: 8 },
  description: { color: colores.textoSecundario, fontSize: 16, lineHeight: 24, marginTop: 12 },
});
