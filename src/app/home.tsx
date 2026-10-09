import { useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { signOut } from "@/services/auth";

export default function Home() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
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
  safeArea: { backgroundColor: "#F7F9F8", flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: "#197B62", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: "#17211E", fontSize: 30, fontWeight: "800", marginTop: 8 },
  description: { color: "#68736E", fontSize: 16, lineHeight: 24, marginTop: 12 },
  button: {
    alignItems: "center",
    backgroundColor: "#197B62",
    borderRadius: 12,
    marginTop: 28,
    padding: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
