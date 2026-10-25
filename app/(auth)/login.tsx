import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { CorreoSinConfirmarError, reenviarConfirmacion, signIn } from "@/services/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { EncabezadoAuth } from "@/components/EncabezadoAuth";
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
      // Al iniciar sesión, el layout raíz redirige a /buscar.
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.pantalla}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <EncabezadoAuth pestana="login" />

        <View style={styles.cuerpo}>
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

          <CampoTexto
            autoCapitalize="none"
            autoComplete="email"
            etiqueta="Correo universitario"
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

          <Link href="/recuperar" style={styles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </Link>

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
            titulo="Ingresar"
            tituloCargando="Ingresando..."
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
  configurationNotice: {
    backgroundColor: colores.avisoFondo,
    borderColor: colores.avisoBorde,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    padding: 13,
  },
  configurationTitle: { color: colores.avisoTexto, fontSize: 13, fontWeight: "800" },
  configurationText: { color: colores.avisoTexto, fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  resendLink: { color: colores.primario, fontSize: 13, fontWeight: "800", marginTop: 8 },
  forgotLink: {
    alignSelf: "flex-end",
    color: colores.primario,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  mensaje: { color: colores.textoSecundario, fontSize: 13, marginTop: 6 },
});
