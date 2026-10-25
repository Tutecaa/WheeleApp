import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, type Href } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useSesion } from "@/hooks/useSesion";
import type { TipoEnlace } from "@/services/auth.service";
import { Boton } from "@/components/Boton";
import { EncabezadoAuth } from "@/components/EncabezadoAuth";
import { colores } from "@/constants/colores";

type Resultado = {
  titulo: string;
  mensaje: string;
  boton: string;
  destino: Href;
};

// Mensajes cuando el enlace no se puede usar en este dispositivo.
function resultadoFallido(tipo: TipoEnlace | undefined, enlaceVencido: boolean): Resultado {
  if (tipo === "recuperacion") {
    return {
      titulo: "No pudimos abrir el enlace",
      mensaje: enlaceVencido
        ? "El enlace de recuperación expiró o ya se usó. Solicita uno nuevo."
        : "Abre el enlace en el mismo dispositivo donde lo pediste, o solicita uno nuevo.",
      boton: "Solicitar otro enlace",
      destino: "/recuperar",
    };
  }

  if (enlaceVencido) {
    return {
      titulo: "El enlace expiró",
      mensaje: "Inicia sesión con tu correo y te ofreceremos reenviar la confirmación.",
      boton: "Ir a iniciar sesión",
      destino: "/login",
    };
  }

  // Con PKCE, el código solo se puede canjear en el dispositivo donde se hizo
  // el registro. Si se abrió en otro, Supabase igual confirmó el correo.
  return {
    titulo: "Correo confirmado",
    mensaje: "Tu correo institucional quedó confirmado. Inicia sesión en la app para continuar.",
    boton: "Ir a iniciar sesión",
    destino: "/login",
  };
}

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    tipo?: TipoEnlace;
    error?: string;
    error_code?: string;
  }>();
  const { session, aviso } = useSesion();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [destino, setDestino] = useState<Href | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function exchangeCode() {
      if (params.error || params.error_code) {
        if (isMounted) setResultado(resultadoFallido(params.tipo, true));
        return;
      }

      if (!params.code) {
        if (isMounted) router.replace("/");
        return;
      }

      // Supabase recuerda si la solicitud fue de recuperación y emite
      // PASSWORD_RECOVERY al canjear el código; el parámetro `tipo` es respaldo.
      let esRecuperacion = params.tipo === "recuperacion";
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") esRecuperacion = true;
      });

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (exchangeError) {
          if (isMounted) setResultado(resultadoFallido(params.tipo, false));
          return;
        }
      } finally {
        listener.subscription.unsubscribe();
      }

      if (isMounted) setDestino(esRecuperacion ? "/reset-password" : "/");
    }

    exchangeCode().catch(() => {
      if (isMounted) setResultado(resultadoFallido(params.tipo, false));
    });

    return () => {
      isMounted = false;
    };
  }, [params.code, params.tipo, params.error, params.error_code]);

  // Para entrar a la app se espera a que la sesión quede verificada; si la
  // cuenta está bloqueada, la sesión se cierra y el login muestra el aviso.
  useEffect(() => {
    if (!destino) return;
    if (destino === "/reset-password" || session) {
      router.replace(destino);
    } else if (aviso) {
      router.replace("/login");
    }
  }, [destino, session, aviso]);

  if (resultado) {
    return (
      <View style={styles.safeArea}>
        <EncabezadoAuth />
        <View style={styles.content}>
          <Text style={styles.title}>{resultado.titulo}</Text>
          <Text style={styles.description}>{resultado.mensaje}</Text>
          <Boton onPress={() => router.replace(resultado.destino)} titulo={resultado.boton} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color={colores.primario} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colores.fondo, flex: 1, justifyContent: "center" },
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  content: { padding: 24 },
  title: { color: colores.titulo, fontSize: 24, fontWeight: "800", lineHeight: 31 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
});
