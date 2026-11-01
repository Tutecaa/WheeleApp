import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useNotificaciones } from "@/hooks/useNotificaciones";
import { colores } from "@/constants/colores";

// Campana del encabezado con el número de notificaciones sin leer (RF15).
export function CampanaNotificaciones() {
  const { noLeidas } = useNotificaciones();

  return (
    <Pressable
      accessibilityLabel={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
      accessibilityRole="button"
      hitSlop={6}
      onPress={() => router.push("/notificaciones")}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
    >
      <Ionicons
        color={colores.primario}
        name={noLeidas > 0 ? "notifications" : "notifications-outline"}
        size={20}
      />
      {noLeidas > 0 ? (
        <View style={styles.insignia}>
          <Text style={styles.insigniaTexto}>{noLeidas > 9 ? "9+" : noLeidas}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  presionado: { opacity: 0.6 },
  insignia: {
    alignItems: "center",
    backgroundColor: colores.error,
    borderColor: colores.blanco,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -6,
    top: -6,
  },
  insigniaTexto: { color: colores.blanco, fontSize: 10, fontWeight: "800" },
});
