import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores } from "@/constants/colores";

// RF7: la lista de viajes y reservas se construye en WE-20 (Sprint 2).
export default function MisViajes() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>Mis viajes</Text>
        <Text style={styles.description}>
          Aquí verás los viajes que publicas y en los que reservas un cupo.
        </Text>
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
