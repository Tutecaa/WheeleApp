import type { CSSProperties } from "react";
import { StyleSheet, Text, View } from "react-native";

import { aFechaInput, aHoraInput } from "@/components/CampoFechaHora.web";
import type { PropsCampoFranja } from "@/components/CampoFranja";
import { colores } from "@/constants/colores";
import { fechaConMinutos } from "@/utils/formato";

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

// "06:30" → 390 minutos; null si el valor está incompleto.
function aMinutos(texto: string): number | null {
  const [horas, minutos] = texto.split(":").map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  return horas * 60 + minutos;
}

// Versión web de CampoFranja.tsx: el selector nativo no existe en el navegador.
export function CampoFranja(props: PropsCampoFranja) {
  const { fecha, desdeMinutos, hastaMinutos, minimo, error } = props;

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Fecha</Text>
          <input
            aria-label="Fecha del viaje"
            min={minimo ? aFechaInput(minimo) : undefined}
            onChange={(evento) => {
              const [anio, mes, dia] = evento.target.value.split("-").map(Number);
              if (!anio || !mes || !dia) return;
              const nueva = new Date(fecha);
              nueva.setFullYear(anio, mes - 1, dia);
              props.onCambiarFecha(nueva);
            }}
            style={estiloInput}
            type="date"
            value={aFechaInput(fecha)}
          />
        </View>
      </View>
      <View style={[styles.fila, styles.segundaFila]}>
        <TarjetaHora
          conError={Boolean(error)}
          etiqueta="Desde"
          fecha={fecha}
          minutos={desdeMinutos}
          onCambiar={props.onCambiarDesde}
        />
        <TarjetaHora
          conError={Boolean(error)}
          etiqueta="Hasta"
          fecha={fecha}
          minutos={hastaMinutos}
          onCambiar={props.onCambiarHasta}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TarjetaHora({
  etiqueta,
  fecha,
  minutos,
  conError,
  onCambiar,
}: {
  etiqueta: string;
  fecha: Date;
  minutos: number;
  conError: boolean;
  onCambiar: (minutos: number) => void;
}) {
  return (
    <View style={[styles.tarjeta, conError ? styles.tarjetaConError : null]}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <input
        aria-label={`${etiqueta} qué hora`}
        onChange={(evento) => {
          const valor = aMinutos(evento.target.value);
          if (valor !== null) onCambiar(valor);
        }}
        style={estiloInput}
        type="time"
        value={aHoraInput(fechaConMinutos(fecha, minutos))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 4 },
  fila: { flexDirection: "row", gap: 10 },
  segundaFila: { marginTop: 10 },
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
