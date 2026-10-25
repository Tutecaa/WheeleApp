import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { signOut } from "@/services/auth.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { colores } from "@/constants/colores";

// Mi propio perfil. Reemplaza a la pantalla temporal home.tsx del Sprint 1.
export default function Perfil() {
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
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>{perfil ? perfil.nombreCompleto : "Mi perfil"}</Text>
        {perfil ? (
          <View style={styles.tarjeta}>
            <Text style={styles.dato}>{perfil.programaAcademico}</Text>
            <Text style={styles.datoSecundario}>{perfil.correoInstitucional}</Text>
            <Text style={styles.datoSecundario}>Código {perfil.codigoInstitucional}</Text>
          </View>
        ) : null}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { padding: 28 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 8 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  dato: { color: colores.texto, fontSize: 15, fontWeight: "700" },
  datoSecundario: { color: colores.textoSecundario, fontSize: 14, marginTop: 4 },
});
