import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colores } from "@/constants/colores";

type Props = TextInputProps & {
  etiqueta?: string;
  error?: string;
};

export function CampoTexto({ etiqueta, error, style, ...props }: Props) {
  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        accessibilityLabel={etiqueta ?? props.placeholder}
        placeholderTextColor={colores.placeholder}
        style={[styles.input, error ? styles.inputConError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 14 },
  // Etiquetas en mayúscula pequeña, como en el storyboard.
  etiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    color: colores.texto,
    fontSize: 15,
    height: 52,
    paddingHorizontal: 16,
  },
  inputConError: { borderColor: colores.error },
  error: { color: colores.error, fontSize: 12, marginTop: 5 },
});
