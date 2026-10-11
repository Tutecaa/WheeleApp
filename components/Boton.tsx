import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colores } from "@/constants/colores";

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variante],
        (pressed || inactivo) && styles.inactivo,
        style,
      ]}
    >
      <Text style={[styles.texto, variante === "secundario" && styles.textoSecundario]}>
        {cargando && tituloCargando ? tituloCargando : titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  primario: { backgroundColor: colores.primario, borderColor: colores.primario },
  secundario: { backgroundColor: colores.blanco, borderColor: colores.primario },
  peligro: { backgroundColor: colores.error, borderColor: colores.error },
  inactivo: { opacity: 0.55 },
  texto: { color: colores.blanco, fontSize: 15, fontWeight: "800" },
  textoSecundario: { color: colores.primario },
});
