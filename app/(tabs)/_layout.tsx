import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useSesion } from "@/hooks/useSesion";
import { colores } from "@/constants/colores";

type NombreIcono = keyof typeof Ionicons.glyphMap;

// El ícono activo va sobre una píldora verde suave, como en el storyboard.
// Los colores son los mismos de tabBarActiveTintColor y tabBarInactiveTintColor.
function icono(nombre: NombreIcono) {
  function IconoPestana({ focused }: { focused: boolean }) {
    return (
      <View style={[styles.pildora, focused && styles.pildoraActiva]}>
        <Ionicons
          color={focused ? colores.primario : colores.textoSecundario}
          name={nombre}
          size={20}
        />
      </View>
    );
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
        tabBarLabelStyle: styles.etiqueta,
        tabBarStyle: styles.barra,
      }}
    >
      <Tabs.Screen name="buscar" options={{ title: "Buscar", tabBarIcon: icono("search") }} />
      <Tabs.Screen
        name="publicar"
        options={{ title: "Publicar", tabBarIcon: icono("car-outline"), href: esAdmin ? null : undefined }}
      />
      <Tabs.Screen name="mis-viajes" options={{ title: "Mis viajes", tabBarIcon: icono("map-outline") }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: icono("person-outline") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: { backgroundColor: colores.blanco, borderTopColor: colores.borde, paddingTop: 6 },
  etiqueta: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  pildora: { alignItems: "center", borderRadius: 12, height: 28, justifyContent: "center", width: 44 },
  pildoraActiva: { backgroundColor: colores.primarioSuave },
});
