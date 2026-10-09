import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; type?: string }>();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function exchangeCode() {
      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (exchangeError) {
          if (isMounted) setError("El enlace no es válido o ya expiró.");
          return;
        }
      }

      if (isMounted) router.replace(params.type === "recovery" ? "/reset-password" : "/");
    }

    exchangeCode().catch(() => {
      if (isMounted) setError("No se pudo completar la confirmación.");
    });

    return () => {
      isMounted = false;
    };
  }, [params.code, params.type]);

  return (
    <SafeAreaView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color="#197B62" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: "#F7F9F8", flex: 1, justifyContent: "center" },
  error: { color: "#B33D32", fontSize: 15, padding: 28, textAlign: "center" },
});
