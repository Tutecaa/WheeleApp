import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";

type Props = {
  titulo: string;
  // Si existe, muestra el botón de volver a la izquierda.
  onVolver?: () => void;
  // Contenido a la derecha: un chip con la fecha, el estado, etc.
  derecha?: ReactNode;
};

// Barra superior de las pantallas internas: volver, título y un chip opcional.
export function Encabezado({ titulo, onVolver, derecha }: Props) {
  return (
    <View style={styles.barra}>
      {onVolver ? (
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onVolver}
          style={({ pressed }) => [styles.volver, pressed && styles.presionado]}
        >
          <Ionicons color={colores.primario} name="arrow-back" size={20} />
        </Pressable>
      ) : null}
      <Text numberOfLines={1} style={styles.titulo}>
        {titulo}
      </Text>
      {derecha}
    </View>
  );
}

// Chip dorado para la derecha del encabezado, por ejemplo la fecha del viaje.
export function ChipEncabezado({ texto, icono }: { texto: string; icono?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.chip}>
      {icono ? <Ionicons color={colores.acento} name={icono} size={14} /> : null}
      <Text style={styles.chipTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderBottomColor: colores.borde,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  volver: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  presionado: { opacity: 0.6 },
  titulo: { color: colores.titulo, flex: 1, fontSize: 19, fontWeight: "800" },
  chip: {
    alignItems: "center",
    backgroundColor: colores.acentoSuave,
    borderRadius: 16,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTexto: { color: colores.acento, fontSize: 13, fontWeight: "800" },
});
