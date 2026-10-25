import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSesion } from "@/hooks/useSesion";
import { colores } from "@/constants/colores";

// RF8: la búsqueda por proximidad llega en el Sprint 3 (WE-21).
export default function Buscar() {
  const { perfil } = useSesion();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>
          {perfil ? `Hola, ${perfil.nombreCompleto.split(" ")[0]}` : "Buscar viajes"}
        </Text>
        <Text style={styles.description}>
          Pronto podrás buscar los viajes que pasan cerca de tu punto de partida.
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
