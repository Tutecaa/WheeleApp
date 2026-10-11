import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { requestPasswordReset } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colores } from "@/constants/colores";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.container}>
          <Link href="/login" style={styles.backLink}>
            ← Volver
          </Link>
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Recupera tu acceso</Text>
          <Text style={styles.description}>
            Escribe tu correo UIS y te enviaremos un enlace temporal para
            restablecer tu contraseña.
          </Text>

          {!isSupabaseConfigured && (
            <Text style={styles.configurationNotice}>
              Configura las variables de Supabase antes de solicitar el enlace.
            </Text>
          )}

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="nombre@uis.edu.co"
            placeholderTextColor={colores.placeholder}
            style={styles.input}
            value={email}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {sent ? (
            <Text style={styles.success}>
              Si la cuenta existe, recibirás el enlace en tu correo institucional.
            </Text>
          ) : null}
          <Pressable
            disabled={isSubmitting || !isSupabaseConfigured}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSubmitting || !isSupabaseConfigured) && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Enviando enlace..." : "Enviar enlace"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 34 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", marginTop: 10 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
  configurationNotice: { color: colores.avisoTexto, fontSize: 13, marginTop: 18 },
  input: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    color: colores.texto,
    fontSize: 15,
    height: 52,
    marginTop: 22,
    paddingHorizontal: 15,
  },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  success: { color: colores.primario, fontSize: 13, lineHeight: 18, marginTop: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 12,
    marginTop: 20,
    padding: 16,
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: colores.blanco, fontSize: 15, fontWeight: "800" },
});
