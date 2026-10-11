import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { CorreoSinConfirmarError, reenviarConfirmacion, signIn } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { colores } from "@/constants/colores";

export default function Login() {
  const { aviso, limpiarAviso } = useSesion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [mensajeReenvio, setMensajeReenvio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function handleSubmit() {
    setError("");
    setSinConfirmar(false);
    setMensajeReenvio("");
    limpiarAviso();
    setIsSubmitting(true);
    try {
      // Al iniciar sesión, el layout raíz redirige a /home.
      await signIn(email, password);
    } catch (submitError) {
      setSinConfirmar(submitError instanceof CorreoSinConfirmarError);
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    try {
      await reenviarConfirmacion(email);
      setMensajeReenvio("Te enviamos un nuevo enlace de confirmación.");
    } catch (reenvioError) {
      setMensajeReenvio((reenvioError as Error).message);
    } finally {
      setReenviando(false);
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

          {aviso ? (
            <View style={styles.configurationNotice}>
              <Text style={styles.configurationText}>{aviso}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <CampoTexto
              autoCapitalize="none"
              autoComplete="email"
              etiqueta="Correo institucional"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nombre@uis.edu.co"
              value={email}
            />

            <CampoTexto
              autoCapitalize="none"
              etiqueta="Contraseña"
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry
              value={password}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {sinConfirmar ? (
              <Pressable accessibilityRole="button" disabled={reenviando} onPress={handleReenviar}>
                <Text style={styles.resendLink}>
                  {reenviando ? "Reenviando..." : "Reenviar correo de confirmación"}
                </Text>
              </Pressable>
            ) : null}
            {mensajeReenvio ? <Text style={styles.mensaje}>{mensajeReenvio}</Text> : null}

            <Boton
              cargando={isSubmitting}
              deshabilitado={!isSupabaseConfigured}
              onPress={handleSubmit}
              titulo="Iniciar sesión"
              tituloCargando="Iniciando sesión..."
            />
          </View>

          <Link href="/recuperar" style={[styles.link, styles.forgotLink]}>
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
  form: { marginTop: 15 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  resendLink: { color: colores.primario, fontSize: 13, fontWeight: "800", marginTop: 8 },
  link: { color: colores.primario, fontSize: 14, fontWeight: "800", textAlign: "center" },
  forgotLink: { marginTop: 20 },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: colores.textoSecundario, fontSize: 14 },
  mensaje: { color: colores.textoSecundario, fontSize: 13, marginTop: 6 },
});
