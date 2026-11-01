import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";

// Cómo se lee cada nota al calificar (RF13).
export const NOMBRES_NOTA = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"] as const;

type Props = {
  valor: number; // 0 a 5; 0 significa que aún no tiene calificaciones
  tamano?: number;
  // Muestra el número junto a las estrellas, por ejemplo "4,5".
  conNumero?: boolean;
  // Si existe, las estrellas se pueden tocar para elegir una nota de 1 a 5.
  onCambiar?: (valor: number) => void;
};

// Calificación de 1 a 5 con medias estrellas. Con `onCambiar` sirve para
// calificar (RF13); sin él, solo muestra el promedio.
export function Estrellas({ valor, tamano = 16, conNumero = false, onCambiar }: Props) {
  if (onCambiar) {
    return (
      <View accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: valor }} style={styles.fila}>
        {[1, 2, 3, 4, 5].map((posicion) => (
          <Pressable
            accessibilityLabel={`${posicion} estrella${posicion === 1 ? "" : "s"}: ${NOMBRES_NOTA[posicion]}`}
            accessibilityRole="button"
            hitSlop={4}
            key={posicion}
            onPress={() => onCambiar(posicion)}
            style={({ pressed }) => [styles.estrellaTocable, pressed && styles.presionada]}
          >
            <Ionicons
              color={valor >= posicion ? colores.acento : colores.borde}
              name={valor >= posicion ? "star" : "star-outline"}
              size={tamano}
            />
          </Pressable>
        ))}
      </View>
    );
  }

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
  estrellaTocable: { padding: 3 },
  presionada: { opacity: 0.6, transform: [{ scale: 0.92 }] },
  numero: { color: colores.titulo, fontWeight: "800", marginLeft: 4 },
  sinValoraciones: { color: colores.textoSecundario, fontStyle: "italic", fontWeight: "600" },
});
