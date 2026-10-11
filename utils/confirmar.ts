import { Alert, Platform } from "react-native";

// Pide confirmación antes de una acción. En web, Alert.alert no muestra
// botones, así que se usa window.confirm.
export function confirmar(titulo: string, mensaje: string, textoAceptar = "Aceptar"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: textoAceptar, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
