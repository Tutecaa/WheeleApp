import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { requestPasswordReset } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { EncabezadoAuth } from "@/components/EncabezadoAuth";
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.pantalla}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <EncabezadoAuth />

        <View style={styles.cuerpo}>
          <Link href="/login" style={styles.backLink}>
            ← Volver a iniciar sesión
          </Link>
          <Text style={styles.title}>Recupera tu acceso</Text>
          <Text style={styles.description}>
            Escribe tu correo UIS y te enviaremos un enlace temporal para
            restablecer tu contraseña. Ábrelo en este mismo dispositivo.
          </Text>

          {!isSupabaseConfigured && (
            <Text style={styles.configurationNotice}>
              Configura las variables de Supabase antes de solicitar el enlace.
            </Text>
          )}

          <CampoTexto
            autoCapitalize="none"
            autoComplete="email"
            etiqueta="Correo universitario"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="nombre@uis.edu.co"
            value={email}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {sent ? (
            <Text style={styles.success}>
              Si la cuenta existe, recibirás el enlace en tu correo institucional.
            </Text>
          ) : null}
          <Boton
            cargando={isSubmitting}
            deshabilitado={!isSupabaseConfigured}
            onPress={handleSubmit}
            titulo="Enviar enlace"
            tituloCargando="Enviando enlace..."
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
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 18 },
  title: { color: colores.titulo, fontSize: 24, fontWeight: "800" },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
  configurationNotice: { color: colores.avisoTexto, fontSize: 13, marginTop: 18 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  success: { color: colores.primario, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
