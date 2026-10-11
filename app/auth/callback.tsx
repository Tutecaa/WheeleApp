import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { supabase } from "@/lib/supabase";
import { colores } from "@/constants/colores";

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function exchangeCode() {
      if (!params.code) {
        if (isMounted) router.replace("/");
        return;
      }

      // Con PKCE el enlace solo trae `code`; Supabase recuerda si la solicitud
      // fue de recuperación y emite PASSWORD_RECOVERY al canjear el código.
      let esRecuperacion = false;
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") esRecuperacion = true;
      });

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (exchangeError) {
          if (isMounted) setError("El enlace no es válido o ya expiró.");
          return;
        }
      } finally {
        listener.subscription.unsubscribe();
      }

      if (isMounted) router.replace(esRecuperacion ? "/reset-password" : "/");
    }

    exchangeCode().catch(() => {
      if (isMounted) setError("No se pudo completar la confirmación.");
    });

    return () => {
      isMounted = false;
    };
  }, [params.code]);

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colores.primario} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colores.fondo, flex: 1, justifyContent: "center" },
  error: { color: colores.error, fontSize: 15, padding: 28, textAlign: "center" },
});
