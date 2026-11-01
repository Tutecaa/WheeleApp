import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

import { colores } from "@/constants/colores";

// "Daniela Morales Torres" → "DM".
export function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

type Props = {
  nombre: string;
  fotoUrl?: string;
  tamano?: number;
  style?: StyleProp<ViewStyle>;
};

// Foto de perfil redonda; sin foto muestra las iniciales sobre verde.
export function Avatar({ nombre, fotoUrl, tamano = 48, style }: Props) {
  const forma = { borderRadius: tamano / 2, height: tamano, width: tamano };

  return (
    <View style={[styles.base, forma, style]}>
      {fotoUrl ? (
        <Image
          accessibilityLabel={`Foto de ${nombre}`}
          contentFit="cover"
          source={{ uri: fotoUrl }}
          style={styles.foto}
          transition={150}
        />
      ) : (
        <Text style={[styles.iniciales, { fontSize: Math.round(tamano * 0.38) }]}>{iniciales(nombre)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    backgroundColor: colores.primario,
    justifyContent: "center",
    overflow: "hidden",
  },
  foto: { height: "100%", width: "100%" },
  iniciales: { color: colores.blanco, fontWeight: "800" },
});
