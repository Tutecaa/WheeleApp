import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { colores } from "@/constants/colores";
import { formatearFechaHora } from "@/utils/formato";

export type PropsCampoFechaHora = {
  etiqueta: string;
  valor: Date | null;
  onCambiar: (fecha: Date) => void;
  minimo?: Date;
  error?: string;
};

// Fecha y hora con el selector nativo. En web se usa CampoFechaHora.web.tsx.
export function CampoFechaHora({ etiqueta, valor, onCambiar, minimo, error }: PropsCampoFechaHora) {
  // En iOS el selector se muestra debajo del campo; en Android, como diálogo.
  const [abiertoIos, setAbiertoIos] = useState(false);
  const inicial = valor ?? minimo ?? new Date();

  function abrir() {
    if (Platform.OS !== "android") {
      setAbiertoIos((abierto) => !abierto);
      return;
    }

    // Android no tiene modo fecha y hora a la vez: primero la fecha, luego la hora.
    DateTimePickerAndroid.open({
      value: inicial,
      mode: "date",
      minimumDate: minimo,
      onChange: (evento: DateTimePickerEvent, fecha?: Date) => {
        if (evento.type !== "set" || !fecha) return;
        DateTimePickerAndroid.open({
          value: fecha,
          mode: "time",
          onChange: (eventoHora: DateTimePickerEvent, hora?: Date) => {
            if (eventoHora.type === "set" && hora) onCambiar(hora);
          },
        });
      },
    });
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable
        accessibilityLabel={etiqueta}
        accessibilityRole="button"
        onPress={abrir}
        style={[styles.campo, error ? styles.campoConError : null]}
      >
        <Text style={valor ? styles.valor : styles.placeholder}>
          {valor ? formatearFechaHora(valor) : "Elige la fecha y la hora"}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && abiertoIos ? (
        <View style={styles.selectorIos}>
          <DateTimePicker
            display="inline"
            locale="es-CO"
            minimumDate={minimo}
            mode="datetime"
            onChange={(_evento, fecha) => {
              if (fecha) onCambiar(fecha);
            }}
            value={inicial}
          />
          <Pressable accessibilityRole="button" onPress={() => setAbiertoIos(false)}>
            <Text style={styles.listo}>Listo</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 13 },
  etiqueta: { color: colores.texto, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  campo: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  campoConError: { borderColor: colores.error },
  valor: { color: colores.texto, fontSize: 15 },
  placeholder: { color: colores.placeholder, fontSize: 15 },
  selectorIos: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
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
