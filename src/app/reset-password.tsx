import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { updatePassword } from "@/services/auth";

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
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Nueva contraseña"
          placeholderTextColor="#929C97"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setConfirmation}
          placeholder="Repite la contraseña"
          placeholderTextColor="#929C97"
          secureTextEntry
          style={styles.input}
          value={confirmation}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={isSubmitting} onPress={handleSubmit} style={styles.button}>
          <Text style={styles.buttonText}>
            {isSubmitting ? "Guardando..." : "Guardar contraseña"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F7F9F8", flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: "#197B62", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: "#17211E", fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 10 },
  description: { color: "#68736E", fontSize: 15, marginTop: 9 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE4E0",
    borderRadius: 12,
    borderWidth: 1,
    color: "#26312D",
    fontSize: 15,
    height: 52,
    marginTop: 14,
    paddingHorizontal: 15,
  },
  error: { color: "#B33D32", fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { alignItems: "center", backgroundColor: "#197B62", borderRadius: 12, marginTop: 20, padding: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
