import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colores, degradadoPrimario } from "@/constants/colores";

type Props = {
  titulo: string;
  onPress: () => void;
  // Mientras carga, el botón se deshabilita y muestra `tituloCargando`.
  cargando?: boolean;
  tituloCargando?: string;
  deshabilitado?: boolean;
  variante?: "primario" | "secundario" | "peligro";
  style?: StyleProp<ViewStyle>;
};

export function Boton({
  titulo,
  onPress,
  cargando = false,
  tituloCargando,
  deshabilitado = false,
  variante = "primario",
  style,
}: Props) {
  const inactivo = cargando || deshabilitado;
  const texto = (
    <Text style={[styles.texto, variante === "secundario" && styles.textoSecundario]}>
      {cargando && tituloCargando ? tituloCargando : titulo}
    </Text>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [styles.base, (pressed || inactivo) && styles.inactivo, style]}
    >
      {variante === "primario" ? (
        <LinearGradient
          colors={degradadoPrimario}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.relleno, styles.primario]}
        >
          {texto}
        </LinearGradient>
      ) : (
        <View style={[styles.relleno, styles[variante]]}>{texto}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 14, marginTop: 20, overflow: "hidden" },
  relleno: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  primario: { borderColor: "transparent" },
  secundario: { backgroundColor: colores.blanco, borderColor: colores.primario },
  peligro: { backgroundColor: colores.error, borderColor: colores.error },
  inactivo: { opacity: 0.55 },
  texto: { color: colores.blanco, fontSize: 15, fontWeight: "800" },
  textoSecundario: { color: colores.primario },
});
