import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "@/services/auth.service";
import { colores } from "@/constants/colores";

export default function Home() {
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        <Text style={styles.title}>Sesión iniciada</Text>
        <Text style={styles.description}>
          Tu identidad UIS está verificada. Las funciones de viajes se incorporarán
          en los siguientes sprints.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Text>
        </Pressable>
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
  button: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 12,
    marginTop: 28,
    padding: 16,
  },
  buttonText: { color: colores.blanco, fontSize: 15, fontWeight: "800" },
});
