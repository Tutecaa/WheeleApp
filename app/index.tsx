import { Redirect } from "expo-router";

import { useSesion } from "@/hooks/useSesion";

export default function Index() {
  const { session, cargando } = useSesion();

  // Mientras se carga la sesión sigue visible el splash.
  if (cargando) return null;

  return <Redirect href={session ? "/home" : "/login"} />;
}
