import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";

type Props = {
  valor: number; // 0 a 5; 0 significa que aún no tiene calificaciones
  tamano?: number;
  // Muestra el número junto a las estrellas, por ejemplo "4,5".
  conNumero?: boolean;
};

// Calificación de 1 a 5 con medias estrellas. Solo lectura por ahora; calificar
// a los participantes llega con RF13 (Sprint 4).
export function Estrellas({ valor, tamano = 16, conNumero = false }: Props) {
  if (valor <= 0) {
    return <Text style={[styles.sinValoraciones, { fontSize: Math.max(12, tamano - 3) }]}>Aún sin valoraciones</Text>;
  }

  const redondeado = Math.round(valor * 2) / 2;
  return (
    <View
      accessibilityLabel={`Calificación ${valor.toLocaleString("es-CO")} de 5`}
      style={styles.fila}
    >
      {[1, 2, 3, 4, 5].map((posicion) => (
        <Ionicons
          color={colores.acento}
          key={posicion}
          name={
            redondeado >= posicion ? "star" : redondeado >= posicion - 0.5 ? "star-half" : "star-outline"
          }
          size={tamano}
        />
      ))}
      {conNumero ? (
        <Text style={[styles.numero, { fontSize: tamano - 2 }]}>
          {valor.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { alignItems: "center", flexDirection: "row", gap: 2 },
  numero: { color: colores.titulo, fontWeight: "800", marginLeft: 4 },
  sinValoraciones: { color: colores.textoSecundario, fontStyle: "italic", fontWeight: "600" },
});
