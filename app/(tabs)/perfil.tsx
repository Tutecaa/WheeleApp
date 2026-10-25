import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { signOut } from "@/services/auth.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { colores } from "@/constants/colores";

// "Daniela Morales Torres" → "DM".
function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

// Mi propio perfil.
export default function Perfil() {
  const { perfil } = useSesion();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const esAdmin = perfil?.rol === "administrador";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      // Al cerrar sesión, el layout raíz redirige a /login.
      await signOut();
    } catch (error) {
      Alert.alert("No se pudo cerrar la sesión", (error as Error).message);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado titulo="Mi perfil" />
      <ScrollView contentContainerStyle={styles.container}>
        {perfil ? (
          <View style={styles.tarjeta}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales(perfil.nombreCompleto)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.nombre}>{perfil.nombreCompleto}</Text>
              <Text style={styles.programa}>{perfil.programaAcademico}</Text>
              {esAdmin ? <Text style={styles.rol}>Administrador</Text> : null}
            </View>
          </View>
        ) : null}

        {perfil ? (
          <View style={styles.datos}>
            <Dato icono="mail-outline" texto={perfil.correoInstitucional} />
            <Dato icono="card-outline" texto={`Código ${perfil.codigoInstitucional}`} />
          </View>
        ) : null}

        {/* El administrador no publica ni solicita viajes. */}
        {esAdmin ? (
          <Boton
            onPress={() => router.push("/admin/habilitaciones")}
            titulo="Revisar habilitaciones"
          />
        ) : (
          <Boton
            onPress={() => router.push("/conductor/vehiculo")}
            titulo="Mi vehículo y habilitación"
          />
        )}

        <Boton
          cargando={isSigningOut}
          onPress={handleSignOut}
          titulo="Cerrar sesión"
          tituloCargando="Cerrando sesión..."
          variante="secundario"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Dato({ icono, texto }: { icono: keyof typeof Ionicons.glyphMap; texto: string }) {
  return (
    <View style={styles.dato}>
      <Ionicons color={colores.primario} name={icono} size={18} />
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  flex: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  tarjeta: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 16,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  avatarTexto: { color: colores.blanco, fontSize: 22, fontWeight: "800" },
  nombre: { color: colores.titulo, fontSize: 18, fontWeight: "800" },
  programa: { color: colores.textoSecundario, fontSize: 14, marginTop: 3 },
  rol: { color: colores.acento, fontSize: 12, fontWeight: "800", marginTop: 4 },
  datos: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dato: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 10 },
  datoTexto: { color: colores.texto, flex: 1, fontSize: 14 },
});
