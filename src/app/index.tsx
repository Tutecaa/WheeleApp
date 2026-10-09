import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";

import {
  getCurrentSession,
  signIn,
  subscribeToAuthChanges,
} from "@/services/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (isSupabaseConfigured) {
      getCurrentSession()
        .then((session) => {
          if (isMounted && session) router.replace("/home");
        })
        .catch(() => {
          if (isMounted) setError("No se pudo comprobar la sesión actual.");
        })
        .finally(() => {
          if (isMounted) setIsCheckingSession(false);
        });
    } else {
      setIsCheckingSession(false);
    }

    const { data } = subscribeToAuthChanges((session) => {
      if (isMounted && session) router.replace("/home");
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/home");
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color="#197B62" size="large" />
      </SafeAreaView>
    );
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
              placeholderTextColor="#929C97"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#929C97"
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

          <Link href="/forgot-password" style={styles.link}>
            ¿Olvidaste tu contraseña?
          </Link>
          <View style={styles.registerRow}>
            <Text style={styles.secondaryText}>¿Aún no tienes una cuenta? </Text>
            <Link href="/register" style={styles.link}>
              Regístrate
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F7F9F8", flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { color: "#197B62", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: "#17211E", fontSize: 30, fontWeight: "800", lineHeight: 36, marginTop: 10 },
  subtitle: { color: "#68736E", fontSize: 16, marginTop: 8 },
  configurationNotice: {
    backgroundColor: "#FFF4DE",
    borderColor: "#F1D296",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 22,
    padding: 13,
  },
  configurationTitle: { color: "#815B15", fontSize: 13, fontWeight: "800" },
  configurationText: { color: "#815B15", fontSize: 12, lineHeight: 18, marginTop: 4 },
  form: { marginTop: 28 },
  label: { color: "#26312D", fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 15 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE4E0",
    borderRadius: 12,
    borderWidth: 1,
    color: "#26312D",
    fontSize: 15,
    height: 52,
    paddingHorizontal: 15,
  },
  error: { color: "#B33D32", fontSize: 13, lineHeight: 18, marginTop: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#197B62",
    borderRadius: 12,
    marginTop: 20,
    padding: 16,
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  link: { color: "#197B62", fontSize: 14, fontWeight: "800", textAlign: "center" },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: "#68736E", fontSize: 14 },
});
