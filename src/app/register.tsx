import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";

import { signUp } from "@/services/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [institutionalCode, setInstitutionalCode] = useState("");
  const [email, setEmail] = useState("");
  const [academicProgram, setAcademicProgram] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signUp({
        fullName,
        institutionalCode,
        email,
        academicProgram,
        password,
      });
      setConfirmationSent(result.requiresEmailConfirmation);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Revisa tu correo institucional</Text>
          <Text style={styles.description}>
            Te enviamos un enlace de confirmación. Confírmalo antes de iniciar
            sesión.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ir a iniciar sesión</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Link href="/" style={styles.backLink}>
            ← Volver
          </Link>
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Crea tu cuenta UIS</Text>
          <Text style={styles.description}>
            Regístrate con tu correo institucional para formar parte de la
            comunidad verificada.
          </Text>

          {!isSupabaseConfigured && (
            <Text style={styles.configurationNotice}>
              Configura las variables de Supabase antes de registrarte.
            </Text>
          )}

          <TextInput
            onChangeText={setFullName}
            placeholder="Nombre completo"
            placeholderTextColor="#929C97"
            style={styles.input}
            value={fullName}
          />
          <TextInput
            onChangeText={setInstitutionalCode}
            placeholder="Código institucional"
            placeholderTextColor="#929C97"
            style={styles.input}
            value={institutionalCode}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Correo institucional"
            placeholderTextColor="#929C97"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setAcademicProgram}
            placeholder="Programa académico"
            placeholderTextColor="#929C97"
            style={styles.input}
            value={academicProgram}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Contraseña (mínimo 8 caracteres)"
            placeholderTextColor="#929C97"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting || !isSupabaseConfigured}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSubmitting || !isSupabaseConfigured) && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F7F9F8", flex: 1 },
  keyboard: { flex: 1 },
  container: { padding: 28, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", padding: 28 },
  backLink: { color: "#197B62", fontSize: 14, fontWeight: "700", marginBottom: 34 },
  brand: { color: "#197B62", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: "#17211E", fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 10 },
  description: { color: "#68736E", fontSize: 15, lineHeight: 22, marginTop: 9 },
  configurationNotice: { color: "#815B15", fontSize: 13, marginTop: 18 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE4E0",
    borderRadius: 12,
    borderWidth: 1,
    color: "#26312D",
    fontSize: 15,
    height: 52,
    marginTop: 13,
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
});
