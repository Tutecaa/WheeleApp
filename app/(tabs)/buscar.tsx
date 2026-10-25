import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useSesion } from "@/hooks/useSesion";
import { ChipEncabezado, Encabezado } from "@/components/Encabezado";
import { colores } from "@/constants/colores";

// RF8: la búsqueda por proximidad llega en el Sprint 3 (WE-21). Mientras
// tanto, la pantalla anticipa su aspecto: el punto de partida y el radio.
export default function Buscar() {
  const { perfil } = useSesion();
  const nombre = perfil?.nombreCompleto.split(" ")[0];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado derecha={<ChipEncabezado icono="time-outline" texto="Pronto" />} titulo="Buscar viaje" />

      <View style={styles.zonaMapa}>
        <View style={styles.radio}>
          <View style={styles.centro}>
            <View style={styles.punto} />
          </View>
        </View>
      </View>

      <View style={styles.contenido}>
        <Text style={styles.saludo}>{nombre ? `Hola, ${nombre}` : "Hola"}</Text>
        <View style={styles.tarjeta}>
          <Ionicons color={colores.primario} name="search" size={22} />
          <Text style={styles.tarjetaTexto}>
            Pronto podrás marcar tu punto de partida y ver los viajes que pasan cerca de ti,
            ordenados por distancia.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  zonaMapa: {
    alignItems: "center",
    backgroundColor: colores.menta,
    height: 240,
    justifyContent: "center",
  },
  radio: {
    alignItems: "center",
    backgroundColor: "rgba(27,138,76,0.10)",
    borderColor: colores.primario,
    borderRadius: 90,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: 180,
    justifyContent: "center",
    width: 180,
  },
  centro: {
    alignItems: "center",
    backgroundColor: "rgba(27,138,76,0.18)",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  punto: {
    backgroundColor: colores.blanco,
    borderColor: colores.primario,
    borderRadius: 11,
    borderWidth: 5,
    height: 22,
    width: 22,
  },
  contenido: { padding: 20 },
  saludo: { color: colores.titulo, fontSize: 24, fontWeight: "800" },
  tarjeta: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 16,
  },
  tarjetaTexto: { color: colores.textoSecundario, flex: 1, fontSize: 14, lineHeight: 21 },
});
