import { StyleSheet, Text, View } from "react-native";

import { colores } from "@/constants/colores";
import type { PropsCampoFechaHora } from "@/components/CampoFechaHora";

// "2026-10-25T06:30" en la hora local, el formato de <input type="datetime-local">.
function aValorInput(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  );
}

// Versión web de CampoFechaHora.tsx: el selector nativo no existe en el navegador.
export function CampoFechaHora({ etiqueta, valor, onCambiar, minimo, error }: PropsCampoFechaHora) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <input
        aria-label={etiqueta}
        min={minimo ? aValorInput(minimo) : undefined}
        onChange={(evento) => {
          // Sin zona horaria, el navegador interpreta el texto en la hora local.
          const fecha = new Date(evento.target.value);
          if (!Number.isNaN(fecha.getTime())) onCambiar(fecha);
        }}
        style={{
          backgroundColor: colores.blanco,
          border: `1px solid ${error ? colores.error : colores.borde}`,
          borderRadius: 12,
          boxSizing: "border-box",
          color: colores.texto,
          fontFamily: "inherit",
          fontSize: 15,
          height: 52,
          padding: "0 15px",
          width: "100%",
        }}
        type="datetime-local"
        value={valor ? aValorInput(valor) : ""}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 13 },
  etiqueta: { color: colores.texto, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  error: { color: colores.error, fontSize: 12, marginTop: 5 },
});
