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
  contenedor: { marginTop: 13 },
  etiqueta: { color: colores.texto, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    color: colores.texto,
    fontSize: 15,
    height: 52,
    paddingHorizontal: 15,
  },
  inputConError: { borderColor: colores.error },
  error: { color: colores.error, fontSize: 12, marginTop: 5 },
});
