import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Tarjeta } from "@/components/CampoFechaHora";
import { colores } from "@/constants/colores";
import { fechaConMinutos, formatearDia, formatearHora } from "@/utils/formato";

export type PropsCampoFranja = {
  fecha: Date; // solo cuenta el día
  desdeMinutos: number; // minutos desde la medianoche
  hastaMinutos: number;
  onCambiarFecha: (fecha: Date) => void;
  onCambiarDesde: (minutos: number) => void;
  onCambiarHasta: (minutos: number) => void;
  minimo?: Date;
  error?: string;
};

type Campo = "fecha" | "desde" | "hasta";

// Fecha y franja horaria de la búsqueda (RF8): el día en una tarjeta y la
// hora inicial y final debajo. En web se usa CampoFranja.web.tsx.
export function CampoFranja(props: PropsCampoFranja) {
  const { fecha, desdeMinutos, hastaMinutos, minimo, error } = props;
  // En iOS el selector se muestra debajo de las tarjetas; en Android, como diálogo.
  const [abiertoIos, setAbiertoIos] = useState<Campo | null>(null);

  function valor(campo: Campo): Date {
    if (campo === "fecha") return fecha;
    return fechaConMinutos(fecha, campo === "desde" ? desdeMinutos : hastaMinutos);
  }

  function aplicar(campo: Campo, elegido: Date) {
    if (campo === "fecha") {
      props.onCambiarFecha(elegido);
      return;
    }
    const minutos = elegido.getHours() * 60 + elegido.getMinutes();
    if (campo === "desde") props.onCambiarDesde(minutos);
    else props.onCambiarHasta(minutos);
  }

  function abrir(campo: Campo) {
    if (Platform.OS !== "android") {
      setAbiertoIos((actual) => (actual === campo ? null : campo));
      return;
    }
    DateTimePickerAndroid.open({
      value: valor(campo),
      mode: campo === "fecha" ? "date" : "time",
      minimumDate: campo === "fecha" ? minimo : undefined,
      onChange: (evento: DateTimePickerEvent, elegido?: Date) => {
        if (evento.type === "set" && elegido) aplicar(campo, elegido);
      },
    });
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Tarjeta
          conError={false}
          descripcion="Fecha del viaje"
          etiqueta="Fecha"
          icono="calendar-outline"
          onPress={() => abrir("fecha")}
          vacio={false}
          valor={formatearDia(fecha)}
        />
      </View>
      <View style={[styles.fila, styles.segundaFila]}>
        <Tarjeta
          conError={Boolean(error)}
          descripcion="Desde qué hora"
          etiqueta="Desde"
          icono="time-outline"
          onPress={() => abrir("desde")}
          vacio={false}
          valor={formatearHora(valor("desde"))}
        />
        <Tarjeta
          conError={Boolean(error)}
          descripcion="Hasta qué hora"
          etiqueta="Hasta"
          icono="time-outline"
          onPress={() => abrir("hasta")}
          vacio={false}
          valor={formatearHora(valor("hasta"))}
        />
      </View>
      {Platform.OS === "ios" && abiertoIos ? (
        <View style={styles.selectorIos}>
          <DateTimePicker
            display={abiertoIos === "fecha" ? "inline" : "spinner"}
            locale="es-CO"
            minimumDate={abiertoIos === "fecha" ? minimo : undefined}
            mode={abiertoIos === "fecha" ? "date" : "time"}
            onChange={(_evento, elegido) => {
              if (elegido) aplicar(abiertoIos, elegido);
            }}
            value={valor(abiertoIos)}
          />
          <Pressable accessibilityRole="button" onPress={() => setAbiertoIos(null)}>
            <Text style={styles.listo}>Listo</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 4 },
  fila: { flexDirection: "row", gap: 10 },
  segundaFila: { marginTop: 10 },
  selectorIos: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 8,
  },
  listo: {
    color: colores.primario,
    fontSize: 15,
    fontWeight: "800",
    padding: 8,
    textAlign: "right",
  },
  error: { color: colores.error, fontSize: 12, marginTop: 5 },
});
