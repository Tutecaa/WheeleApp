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

import { signIn } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { colores } from "@/constants/colores";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);
    try {
      // Al iniciar sesión, el layout raíz redirige a /home.
      await signIn(email, password);
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
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Muévete con tu comunidad UIS.</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar.</Text>

          {!isSupabaseConfigured && (
            <View style={styles.configurationNotice}>
              <Text style={styles.configurationTitle}>Configuración pendiente</Text>
              <Text style={styles.configurationText}>
                Añade las variables de Supabase de `.env.example` para conectar la
                autenticación.
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Correo institucional</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nombre@uis.edu.co"
              placeholderTextColor={colores.placeholder}
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor={colores.placeholder}
              secureTextEntry
              style={styles.input}
              value={password}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || !isSupabaseConfigured}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting || !isSupabaseConfigured) &&
                  styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
              </Text>
            </Pressable>
          </View>

          <Link href="/recuperar" style={styles.link}>
            ¿Olvidaste tu contraseña?
          </Link>
          <View style={styles.registerRow}>
            <Text style={styles.secondaryText}>¿Aún no tienes una cuenta? </Text>
            <Link href="/registro" style={styles.link}>
              Regístrate
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 30, fontWeight: "800", lineHeight: 36, marginTop: 10 },
  subtitle: { color: colores.textoSecundario, fontSize: 16, marginTop: 8 },
  configurationNotice: {
    backgroundColor: colores.avisoFondo,
    borderColor: colores.avisoBorde,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 22,
    padding: 13,
  },
  configurationTitle: { color: colores.avisoTexto, fontSize: 13, fontWeight: "800" },
  configurationText: { color: colores.avisoTexto, fontSize: 12, lineHeight: 18, marginTop: 4 },
  form: { marginTop: 28 },
  label: { color: colores.texto, fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 15 },
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
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 12,
    marginTop: 20,
    padding: 16,
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: colores.blanco, fontSize: 15, fontWeight: "800" },
  link: { color: colores.primario, fontSize: 14, fontWeight: "800", textAlign: "center" },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: colores.textoSecundario, fontSize: 14 },
});
