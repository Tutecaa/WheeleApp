import type { CSSProperties } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colores } from "@/constants/colores";
import type { PropsCampoFechaHora } from "@/components/CampoFechaHora";

const dos = (n: number) => String(n).padStart(2, "0");

// "2026-10-25" y "06:30" en la hora local, los formatos de <input type="date|time">.
function aFechaInput(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function aHoraInput(fecha: Date): string {
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

// Punto de partida si aún no hay valor: la próxima hora en punto.
function proximaHora(): Date {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}

// Versión web de CampoFechaHora.tsx: el selector nativo no existe en el navegador.
export function CampoFechaHora({ valor, onCambiar, minimo, error }: PropsCampoFechaHora) {
  const base = valor ?? proximaHora();
  const estiloInput: CSSProperties = {
    backgroundColor: "transparent",
    border: 0,
    color: colores.titulo,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 700,
    marginTop: 6,
    outline: "none",
    padding: 0,
    width: "100%",
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <View style={[styles.tarjeta, error ? styles.tarjetaConError : null]}>
          <Text style={styles.etiqueta}>Fecha</Text>
          <input
            aria-label="Fecha de salida"
            min={minimo ? aFechaInput(minimo) : undefined}
            onChange={(evento) => {
              const [anio, mes, dia] = evento.target.value.split("-").map(Number);
              if (!anio || !mes || !dia) return;
              const fecha = new Date(base);
              fecha.setFullYear(anio, mes - 1, dia);
              onCambiar(fecha);
            }}
            style={estiloInput}
            type="date"
            value={valor ? aFechaInput(valor) : ""}
          />
        </View>
        <View style={[styles.tarjeta, error ? styles.tarjetaConError : null]}>
          <Text style={styles.etiqueta}>Hora</Text>
          <input
            aria-label="Hora de salida"
            onChange={(evento) => {
              const [horas, minutos] = evento.target.value.split(":").map(Number);
              if (Number.isNaN(horas) || Number.isNaN(minutos)) return;
              const fecha = new Date(base);
              fecha.setHours(horas, minutos, 0, 0);
              onCambiar(fecha);
            }}
            style={estiloInput}
            type="time"
            value={valor ? aHoraInput(valor) : ""}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 14 },
  fila: { flexDirection: "row", gap: 10 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  tarjetaConError: { borderColor: colores.error },
  etiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  error: { color: colores.error, fontSize: 12, marginTop: 5 },
});
