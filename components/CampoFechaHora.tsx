import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";
import { formatearDia, formatearHora } from "@/utils/formato";

export type PropsCampoFechaHora = {
  valor: Date | null;
  onCambiar: (fecha: Date) => void;
  minimo?: Date;
  error?: string;
};

type Parte = "fecha" | "hora";

// Punto de partida si aún no hay valor: la próxima hora en punto.
export function proximaHora(): Date {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}

// Cambia solo el día (o solo la hora) de `base`.
export function combinar(base: Date, cambio: Date, parte: Parte): Date {
  const resultado = new Date(base);
  if (parte === "fecha") {
    resultado.setFullYear(cambio.getFullYear(), cambio.getMonth(), cambio.getDate());
  } else {
    resultado.setHours(cambio.getHours(), cambio.getMinutes(), 0, 0);
  }
  return resultado;
}

// Fecha y hora de salida en dos tarjetas, como en el storyboard. Usa el
// selector nativo; en web se usa CampoFechaHora.web.tsx.
export function CampoFechaHora({ valor, onCambiar, minimo, error }: PropsCampoFechaHora) {
  // En iOS el selector se muestra debajo de las tarjetas; en Android, como diálogo.
  const [abiertoIos, setAbiertoIos] = useState<Parte | null>(null);
  const base = valor ?? proximaHora();

  function abrir(parte: Parte) {
    if (Platform.OS !== "android") {
      setAbiertoIos((actual) => (actual === parte ? null : parte));
      return;
    }
    DateTimePickerAndroid.open({
      value: base,
      mode: parte === "fecha" ? "date" : "time",
      minimumDate: parte === "fecha" ? minimo : undefined,
      onChange: (evento: DateTimePickerEvent, elegido?: Date) => {
        if (evento.type === "set" && elegido) onCambiar(combinar(base, elegido, parte));
      },
    });
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Tarjeta
          etiqueta="Fecha"
          icono="calendar-outline"
          onPress={() => abrir("fecha")}
          valor={valor ? formatearDia(valor) : "Elegir"}
          vacio={!valor}
          conError={Boolean(error)}
        />
        <Tarjeta
          etiqueta="Hora"
          icono="time-outline"
          onPress={() => abrir("hora")}
          valor={valor ? formatearHora(valor) : "Elegir"}
          vacio={!valor}
          conError={Boolean(error)}
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
              if (elegido) onCambiar(combinar(base, elegido, abiertoIos));
            }}
            value={base}
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

function Tarjeta({
  etiqueta,
  icono,
  valor,
  vacio,
  conError,
  onPress,
}: {
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  vacio: boolean;
  conError: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${etiqueta} de salida`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, conError && styles.tarjetaConError, pressed && styles.presionada]}
    >
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.valorFila}>
        <Ionicons color={colores.primario} name={icono} size={16} />
        <Text style={[styles.valor, vacio && styles.valorVacio]}>{valor}</Text>
      </View>
    </Pressable>
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
  presionada: { opacity: 0.7 },
  etiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  valorFila: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 6 },
  valor: { color: colores.titulo, fontSize: 15, fontWeight: "700" },
  valorVacio: { color: colores.placeholder, fontWeight: "600" },
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
