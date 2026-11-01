import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";

import { signOut } from "@/services/auth.service";
import { cambiarFotoPerfil, quitarFotoPerfil } from "@/services/perfiles.service";
import { useSesion } from "@/hooks/useSesion";
import { Avatar } from "@/components/Avatar";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { colores } from "@/constants/colores";
import { confirmar } from "@/utils/confirmar";

// Mi propio perfil. La foto es opcional (RF1): se agrega, cambia o quita aquí.
export default function Perfil() {
  const { perfil, recargarPerfil } = useSesion();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");
  const esAdmin = perfil?.rol === "administrador";

  async function elegirFoto() {
    setErrorFoto("");
    // Recorte cuadrado y algo de compresión: la foto se ve en círculos pequeños.
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (resultado.canceled) return;

    const foto = resultado.assets[0];
    setGuardandoFoto(true);
    try {
      await cambiarFotoPerfil({
        uri: foto.uri,
        mimeType: foto.mimeType,
        fileSize: foto.fileSize,
        file: foto.file,
      });
      await recargarPerfil();
    } catch (error) {
      setErrorFoto((error as Error).message);
    } finally {
      setGuardandoFoto(false);
    }
  }

  async function quitarFoto() {
    const ok = await confirmar("Quitar foto", "Tu perfil mostrará tus iniciales.", "Quitar");
    if (!ok) return;
    setErrorFoto("");
    setGuardandoFoto(true);
    try {
      await quitarFotoPerfil();
      await recargarPerfil();
    } catch (error) {
      setErrorFoto((error as Error).message);
    } finally {
      setGuardandoFoto(false);
    }
  }

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
            <Pressable
              accessibilityHint="Elige una foto de tu galería"
              accessibilityLabel={perfil.fotoPerfilUrl ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
              accessibilityRole="button"
              disabled={guardandoFoto}
              onPress={elegirFoto}
              style={({ pressed }) => pressed && styles.presionado}
            >
              <Avatar fotoUrl={perfil.fotoPerfilUrl} nombre={perfil.nombreCompleto} tamano={72} />
              <View style={styles.camara}>
                {guardandoFoto ? (
                  <ActivityIndicator color={colores.blanco} size="small" />
                ) : (
                  <Ionicons color={colores.blanco} name="camera" size={14} />
                )}
              </View>
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.nombre}>{perfil.nombreCompleto}</Text>
              <Text style={styles.programa}>{perfil.programaAcademico}</Text>
              {esAdmin ? <Text style={styles.rol}>Administrador</Text> : null}
              <View style={styles.accionesFoto}>
                <Pressable accessibilityRole="button" disabled={guardandoFoto} hitSlop={6} onPress={elegirFoto}>
                  <Text style={styles.accionFoto}>
                    {perfil.fotoPerfilUrl ? "Cambiar foto" : "Agregar foto"}
                  </Text>
                </Pressable>
                {perfil.fotoPerfilUrl ? (
                  <Pressable accessibilityRole="button" disabled={guardandoFoto} hitSlop={6} onPress={quitarFoto}>
                    <Text style={[styles.accionFoto, styles.accionQuitar]}>Quitar</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        {errorFoto ? <Text style={styles.error}>{errorFoto}</Text> : null}

        {perfil ? (
          <View style={styles.datos}>
            <Dato icono="mail-outline" texto={perfil.correoInstitucional} />
            <Dato icono="card-outline" texto={`Código ${perfil.codigoInstitucional}`} />
          </View>
        ) : null}

        {perfil ? (
          <Boton
            onPress={() => router.push({ pathname: "/usuario/[id]", params: { id: perfil.id } })}
            titulo="Ver mi perfil público"
            variante="secundario"
          />
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
  presionado: { opacity: 0.7 },
  camara: {
    alignItems: "center",
    backgroundColor: colores.acento,
    borderColor: colores.blanco,
    borderRadius: 14,
    borderWidth: 2,
    bottom: -2,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 28,
  },
  accionesFoto: { flexDirection: "row", gap: 16, marginTop: 8 },
  accionFoto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  accionQuitar: { color: colores.error },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 10 },
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
