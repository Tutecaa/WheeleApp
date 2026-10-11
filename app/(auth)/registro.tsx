import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";

import { signUp } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { colores } from "@/constants/colores";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [institutionalCode, setInstitutionalCode] = useState("");
  const [email, setEmail] = useState("");
  const [academicProgram, setAcademicProgram] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit() {
    setError("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

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
          <Boton onPress={() => router.replace("/login")} titulo="Ir a iniciar sesión" />
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Link href="/login" style={styles.backLink}>
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

          <CampoTexto
            autoComplete="name"
            onChangeText={setFullName}
            placeholder="Nombre completo"
            value={fullName}
          />
          <CampoTexto
            onChangeText={setInstitutionalCode}
            placeholder="Código institucional"
            value={institutionalCode}
          />
          <CampoTexto
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Correo institucional"
            value={email}
          />
          <CampoTexto
            onChangeText={setAcademicProgram}
            placeholder="Programa académico"
            value={academicProgram}
          />
          <CampoTexto
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Contraseña (mínimo 8 caracteres)"
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
            deshabilitado={!isSupabaseConfigured}
            onPress={handleSubmit}
            titulo="Crear cuenta"
            tituloCargando="Creando cuenta..."
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  keyboard: { flex: 1 },
  container: { padding: 28, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", padding: 28 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 34 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 10 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
  configurationNotice: { color: colores.avisoTexto, fontSize: 13, marginTop: 18 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
