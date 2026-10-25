import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

import { colores, degradadoPrimario } from "@/constants/colores";

type Pestana = "login" | "registro";

type Props = {
  // Pestaña activa del selector. Sin ella (recuperar contraseña) no se muestra el selector.
  pestana?: Pestana;
};

// Insignia dorada con el carro, como en el storyboard.
export function Logo({ tamano = 46 }: { tamano?: number }) {
  return (
    <View style={[styles.logo, { borderRadius: tamano * 0.26, height: tamano, width: tamano }]}>
      <Ionicons color={colores.titulo} name="car-sport" size={tamano * 0.56} />
    </View>
  );
}

// Encabezado verde de las pantallas de acceso: logo, nombre y el selector
// entre iniciar sesión y registrarse.
export function EncabezadoAuth({ pestana }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={degradadoPrimario}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.encabezado, { paddingTop: insets.top + 28 }]}
    >
      <View style={styles.marca}>
        <Logo />
        <Text style={styles.nombre}>WHEEL-E</Text>
      </View>
      <Text style={styles.universidad}>Universidad Industrial de Santander</Text>

      {pestana ? (
        <View style={styles.selector}>
          <Opcion activa={pestana === "login"} destino="/login" texto="Iniciar sesión" />
          <Opcion activa={pestana === "registro"} destino="/registro" texto="Registrarse" />
        </View>
      ) : null}
    </LinearGradient>
  );
}

function Opcion({ activa, destino, texto }: { activa: boolean; destino: "/login" | "/registro"; texto: string }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      // replace: cambiar de pestaña no apila pantallas.
      onPress={() => {
        if (!activa) router.replace(destino);
      }}
      style={[styles.opcion, activa && styles.opcionActiva]}
    >
      <Text style={[styles.opcionTexto, activa && styles.opcionTextoActiva]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  encabezado: { paddingBottom: 22, paddingHorizontal: 24 },
  marca: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "center" },
  logo: { alignItems: "center", backgroundColor: colores.acento, justifyContent: "center" },
  nombre: { color: colores.blanco, fontSize: 30, fontWeight: "700", letterSpacing: 0.5 },
  universidad: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  selector: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    flexDirection: "row",
    marginTop: 22,
    padding: 4,
  },
  opcion: { alignItems: "center", borderRadius: 11, flex: 1, paddingVertical: 11 },
  opcionActiva: { backgroundColor: colores.blanco },
  opcionTexto: { color: colores.blanco, fontSize: 14, fontWeight: "700" },
  opcionTextoActiva: { color: colores.primario },
});
