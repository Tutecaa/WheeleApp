import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { updatePassword } from "@/services/auth.service";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { EncabezadoAuth } from "@/components/EncabezadoAuth";
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.pantalla}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <EncabezadoAuth />
        <View style={styles.container}>
          <Text style={styles.title}>Define una nueva contraseña</Text>
          <Text style={styles.description}>Usa al menos 8 caracteres.</Text>
          <CampoTexto
            autoCapitalize="none"
            etiqueta="Nueva contraseña"
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={password}
          />
          <CampoTexto
            autoCapitalize="none"
            etiqueta="Confirmar contraseña"
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { backgroundColor: colores.fondo, flex: 1 },
  scroll: { flexGrow: 1 },
  container: { padding: 24, paddingBottom: 40 },
  title: { color: colores.titulo, fontSize: 24, fontWeight: "800", lineHeight: 31 },
  description: { color: colores.textoSecundario, fontSize: 15, marginTop: 9 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
