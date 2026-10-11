import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { SesionProvider, useSesion } from "@/hooks/useSesion";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SesionProvider>
      <RootNavigator />
    </SesionProvider>
  );
}

function RootNavigator() {
  const { session, cargando } = useSesion();
  const haySesion = Boolean(session);

  useEffect(() => {
    if (!cargando) SplashScreen.hide();
  }, [cargando]);

  // Cuando cambia la sesión, Expo Router saca al usuario de las pantallas
  // que ya no puede ver y lo envía a `index`, que decide a dónde ir.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!haySesion}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={haySesion}>
        <Stack.Screen name="home" />
      </Stack.Protected>

      {/* Accesibles siempre: llegan desde enlaces del correo. */}
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
