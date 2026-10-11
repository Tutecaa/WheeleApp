import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { updatePassword } from "@/services/auth.service";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { colores } from "@/constants/colores";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      // El enlace de recuperación ya inició sesión; `index` decide el destino.
      router.replace("/");
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>WHEEL-E</Text>
        <Text style={styles.title}>Define una nueva contraseña</Text>
        <Text style={styles.description}>Usa al menos 8 caracteres.</Text>
        <CampoTexto
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Nueva contraseña"
          secureTextEntry
          value={password}
        />
        <CampoTexto
          autoCapitalize="none"
          onChangeText={setConfirmation}
          placeholder="Repite la contraseña"
          secureTextEntry
          value={confirmation}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Boton
          cargando={isSubmitting}
          onPress={handleSubmit}
          titulo="Guardar contraseña"
          tituloCargando="Guardando..."
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 10 },
  description: { color: colores.textoSecundario, fontSize: 15, marginTop: 9 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
