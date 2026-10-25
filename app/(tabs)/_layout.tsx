import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useSesion } from "@/hooks/useSesion";
import { colores } from "@/constants/colores";

type NombreIcono = keyof typeof Ionicons.glyphMap;

function icono(nombre: NombreIcono) {
  function IconoPestana({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons color={color} name={nombre} size={size} />;
  }
  return IconoPestana;
}

export default function TabsLayout() {
  const { perfil } = useSesion();
  // El administrador no publica viajes.
  const esAdmin = perfil?.rol === "administrador";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarStyle: { backgroundColor: colores.blanco, borderTopColor: colores.borde },
      }}
    >
      <Tabs.Screen name="buscar" options={{ title: "Buscar", tabBarIcon: icono("search") }} />
      <Tabs.Screen
        name="publicar"
        options={{ title: "Publicar", tabBarIcon: icono("add-circle-outline"), href: esAdmin ? null : undefined }}
      />
      <Tabs.Screen name="mis-viajes" options={{ title: "Mis viajes", tabBarIcon: icono("car-outline") }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: icono("person-outline") }} />
    </Tabs>
  );
}
