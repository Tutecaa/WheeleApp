import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { signUp } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { EncabezadoAuth } from "@/components/EncabezadoAuth";
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
      <View style={styles.pantalla}>
        <EncabezadoAuth />
        <View style={styles.cuerpo}>
          <Text style={styles.title}>Revisa tu correo institucional</Text>
          <Text style={styles.description}>
            Te enviamos un enlace de confirmación. Confírmalo antes de iniciar
            sesión.
          </Text>
          <Boton onPress={() => router.replace("/login")} titulo="Ir a iniciar sesión" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.pantalla}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <EncabezadoAuth pestana="registro" />

        <View style={styles.cuerpo}>
          {!isSupabaseConfigured && (
            <Text style={styles.configurationNotice}>
              Configura las variables de Supabase antes de registrarte.
            </Text>
          )}

          <CampoTexto
            autoComplete="name"
            etiqueta="Nombre completo"
            onChangeText={setFullName}
            placeholder="Como aparece en tu carné"
            value={fullName}
          />
          <CampoTexto
            autoCapitalize="none"
            autoComplete="email"
            etiqueta="Correo universitario"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="nombre@correo.uis.edu.co"
            value={email}
          />
          <CampoTexto
            etiqueta="Código institucional"
            keyboardType="number-pad"
            onChangeText={setInstitutionalCode}
            placeholder="2230000"
            value={institutionalCode}
          />
          <CampoTexto
            etiqueta="Programa académico"
            onChangeText={setAcademicProgram}
            placeholder="Ingeniería de Sistemas"
            value={academicProgram}
          />
          <CampoTexto
            autoCapitalize="none"
            etiqueta="Contraseña"
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
            deshabilitado={!isSupabaseConfigured}
            onPress={handleSubmit}
            titulo="Crear cuenta"
            tituloCargando="Creando cuenta..."
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { backgroundColor: colores.fondo, flex: 1 },
  scroll: { flexGrow: 1 },
  cuerpo: { padding: 24, paddingBottom: 40 },
  title: { color: colores.titulo, fontSize: 24, fontWeight: "800", lineHeight: 31 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
  configurationNotice: { color: colores.avisoTexto, fontSize: 13, marginTop: 8 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
