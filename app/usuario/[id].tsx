import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { obtenerPerfilPublico } from "@/services/perfiles.service";
import { useSesion } from "@/hooks/useSesion";
import { Avatar } from "@/components/Avatar";
import { Encabezado } from "@/components/Encabezado";
import { Estrellas } from "@/components/Estrellas";
import { colores, degradadoPrimario } from "@/constants/colores";
import type { PerfilPublico } from "@/types";

// "octubre de 2026".
function formatearMesAnio(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

// RF14: perfil público de otro usuario. Solo muestra datos públicos: nunca el
// correo, el código institucional ni datos de contacto.
export default function PerfilUsuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil: miPerfil } = useSesion();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    obtenerPerfilPublico(id)
      .then((encontrado) => {
        if (activo) setPerfil(encontrado);
      })
      .catch((cargaError: Error) => {
        if (activo) setError(cargaError.message);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/buscar");
  }

  const esMiPerfil = miPerfil?.id === id;

  if (!perfil) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Encabezado onVolver={volver} titulo="Perfil" />
        <View style={styles.centrado}>
          {error ? (
            <>
              <View style={styles.noDisponibleIcono}>
                <Ionicons color={colores.textoSecundario} name="person-remove-outline" size={30} />
              </View>
              <Text style={styles.noDisponibleTitulo}>{error}</Text>
              <Text style={styles.noDisponibleTexto}>
                Puede que la cuenta esté suspendida o ya no exista.
              </Text>
            </>
          ) : (
            <ActivityIndicator color={colores.primario} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const primerNombre = perfil.nombreCompleto.split(" ")[0];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado onVolver={volver} titulo={esMiPerfil ? "Mi perfil público" : "Perfil"} />
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={degradadoPrimario}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.portada}
        >
          <Avatar fotoUrl={perfil.fotoPerfilUrl} nombre={perfil.nombreCompleto} style={styles.avatar} tamano={96} />
          <Text style={styles.nombre}>{perfil.nombreCompleto}</Text>
          <Text style={styles.programa}>{perfil.programaAcademico}</Text>
          <View style={styles.insignias}>
            <Insignia icono="school" texto="Comunidad UIS" />
            {perfil.esConductor ? <Insignia icono="shield-checkmark" texto="Conductor verificado" /> : null}
          </View>
        </LinearGradient>

        <View style={styles.estadisticas}>
          <View style={[styles.estadistica, styles.estadisticaAncha]}>
            <Text style={styles.estadisticaEtiqueta}>Calificación</Text>
            {perfil.promedioCalificacion > 0 ? (
              <>
                <Text style={styles.estadisticaValor}>
                  {perfil.promedioCalificacion.toLocaleString("es-CO", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </Text>
                <Estrellas tamano={14} valor={perfil.promedioCalificacion} />
              </>
            ) : (
              <>
                <Text style={[styles.estadisticaValor, styles.estadisticaVacia]}>—</Text>
                <Estrellas tamano={14} valor={0} />
              </>
            )}
          </View>
          <View style={styles.estadistica}>
            <Text style={styles.estadisticaEtiqueta}>Viajes</Text>
            <Text style={styles.estadisticaValor}>{perfil.totalViajes}</Text>
            <Text style={styles.estadisticaDetalle}>realizados</Text>
          </View>
          {perfil.esConductor ? (
            <View style={styles.estadistica}>
              <Text style={styles.estadisticaEtiqueta}>Publicados</Text>
              <Text style={styles.estadisticaValor}>{perfil.viajesPublicados}</Text>
              <Text style={styles.estadisticaDetalle}>como conductor</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.miembro}>
          <Ionicons color={colores.primario} name="calendar-outline" size={16} />
          <Text style={styles.miembroTexto}>En WHEEL-E desde {formatearMesAnio(perfil.miembroDesde)}</Text>
        </View>

        <Text style={styles.seccion}>Comentarios</Text>
        <View style={styles.vacio}>
          <Ionicons color={colores.primario} name="chatbubbles-outline" size={26} />
          <Text style={styles.vacioTitulo}>Aún sin comentarios</Text>
          <Text style={styles.vacioTexto}>
            {esMiPerfil
              ? "Cuando otros usuarios te califiquen después de un viaje, sus comentarios aparecerán aquí."
              : `Cuando otros usuarios califiquen a ${primerNombre} después de un viaje, sus comentarios aparecerán aquí.`}
          </Text>
        </View>

        <View style={styles.privacidad}>
          <Ionicons color={colores.textoSecundario} name="lock-closed-outline" size={14} />
          <Text style={styles.privacidadTexto}>
            Por seguridad, WHEEL-E no muestra el correo ni los datos de contacto de nadie.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Insignia({ icono, texto }: { icono: keyof typeof Ionicons.glyphMap; texto: string }) {
  return (
    <View style={styles.insignia}>
      <Ionicons color={colores.acento} name={icono} size={13} />
      <Text style={styles.insigniaTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  container: { padding: 18, paddingBottom: 40 },
  portada: { alignItems: "center", borderRadius: 22, paddingBottom: 22, paddingHorizontal: 18, paddingTop: 26 },
  avatar: { borderColor: "rgba(255,255,255,0.9)", borderWidth: 4 },
  nombre: { color: colores.blanco, fontSize: 22, fontWeight: "800", marginTop: 14, textAlign: "center" },
  programa: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4, textAlign: "center" },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 },
  insignia: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderRadius: 14,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  insigniaTexto: { color: colores.primarioOscuro, fontSize: 12, fontWeight: "800" },
  estadisticas: { flexDirection: "row", gap: 10, marginTop: 14 },
  estadistica: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  estadisticaAncha: { flex: 1.4 },
  estadisticaEtiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  estadisticaValor: { color: colores.titulo, fontSize: 26, fontWeight: "800", marginVertical: 2 },
  estadisticaVacia: { color: colores.placeholder },
  estadisticaDetalle: { color: colores.textoSecundario, fontSize: 12 },
  miembro: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 14 },
  miembroTexto: { color: colores.textoSecundario, fontSize: 13, fontWeight: "600" },
  seccion: { color: colores.titulo, fontSize: 18, fontWeight: "800", marginTop: 24 },
  vacio: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1.5,
    marginTop: 10,
    padding: 20,
  },
  vacioTitulo: { color: colores.titulo, fontSize: 15, fontWeight: "800", marginTop: 8 },
  vacioTexto: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: "center" },
  privacidad: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 18 },
  privacidadTexto: { color: colores.textoSecundario, flexShrink: 1, fontSize: 12, textAlign: "center" },
  noDisponibleIcono: {
    alignItems: "center",
    backgroundColor: colores.borde,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  noDisponibleTitulo: { color: colores.titulo, fontSize: 17, fontWeight: "800", marginTop: 14, textAlign: "center" },
  noDisponibleTexto: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: "center" },
});
