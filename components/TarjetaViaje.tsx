import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colores } from "@/constants/colores";
import type { EstadoViaje, ResumenViaje } from "@/types";
import {
  formatearAporte,
  formatearDia,
  formatearDistancia,
  formatearHora,
} from "@/utils/formato";

type EtiquetaEstado = { texto: string; color: string; fondo: string };

const ESTADOS: Record<EstadoViaje, EtiquetaEstado> = {
  publicado: { texto: "Publicado", color: colores.primario, fondo: colores.primarioSuave },
  en_curso: { texto: "En curso", color: colores.avisoTexto, fondo: colores.acentoSuave },
  finalizado: { texto: "Finalizado", color: colores.textoSecundario, fondo: colores.borde },
  cancelado: { texto: "Cancelado", color: colores.error, fondo: "#F8E3E1" },
};

const SALIDA_VENCIDA: EtiquetaEstado = {
  texto: "Sin realizar",
  color: colores.textoSecundario,
  fondo: colores.borde,
};

// Un viaje publicado cuya hora de salida ya pasó no se inició: ya no está vigente.
export function salidaVencida(viaje: { estado: EstadoViaje; fechaHoraSalida: string }): boolean {
  return viaje.estado === "publicado" && new Date(viaje.fechaHoraSalida).getTime() <= Date.now();
}

export function etiquetaEstado(viaje: { estado: EstadoViaje; fechaHoraSalida: string }): EtiquetaEstado {
  return salidaVencida(viaje) ? SALIDA_VENCIDA : ESTADOS[viaje.estado];
}

export function nombreLugar(nombre?: string): string {
  return nombre ?? "Punto marcado en el mapa";
}

// Chip de estado del viaje; lo usan la tarjeta y el detalle.
export function ChipEstado({ viaje }: { viaje: { estado: EstadoViaje; fechaHoraSalida: string } }) {
  const estado = etiquetaEstado(viaje);
  return (
    <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
      {estado.texto}
    </Text>
  );
}

type Props = {
  viaje: ResumenViaje;
  onPress: () => void;
};

// La tarjeta de un viaje en "Mis viajes" (RF7) y, más adelante, en los resultados de búsqueda.
export function TarjetaViaje({ viaje, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
    >
      <View style={styles.insignia}>
        <Ionicons
          color={colores.blanco}
          name={viaje.rol === "conductor" ? "car-sport" : "person"}
          size={22}
        />
      </View>

      <View style={styles.cuerpo}>
        <View style={styles.encabezado}>
          <Text numberOfLines={1} style={styles.ruta}>
            {nombreLugar(viaje.origenNombre)} → {nombreLugar(viaje.destinoNombre)}
          </Text>
          <ChipEstado viaje={viaje} />
        </View>
        <Text style={styles.subtitulo}>
          {viaje.rol === "conductor" ? "Conductor" : "Pasajero"} · {formatearDia(viaje.fechaHoraSalida)}
          {viaje.numeroParadas > 0
            ? ` · ${viaje.numeroParadas} parada${viaje.numeroParadas === 1 ? "" : "s"}`
            : ""}
        </Text>

        <View style={styles.datos}>
          <Dato icono="people-outline" texto={`${viaje.cuposDisponibles}/${viaje.cuposTotales} cupos`} />
          <Dato icono="time-outline" texto={formatearHora(viaje.fechaHoraSalida)} />
          <Text style={styles.aporte}>{formatearAporte(viaje.aporteSugerido)}</Text>
          <Text style={styles.distancia}>{formatearDistancia(viaje.distanciaMetros)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Dato({ icono, texto }: { icono: keyof typeof Ionicons.glyphMap; texto: string }) {
  return (
    <View style={styles.dato}>
      <Ionicons color={colores.primario} name={icono} size={14} />
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    padding: 14,
  },
  presionada: { opacity: 0.7 },
  insignia: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  cuerpo: { flex: 1 },
  encabezado: { alignItems: "center", flexDirection: "row", gap: 8 },
  ruta: { color: colores.titulo, flex: 1, fontSize: 15, fontWeight: "800" },
  subtitulo: { color: colores.textoSecundario, fontSize: 13, marginTop: 3 },
  estado: {
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  datos: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  dato: { alignItems: "center", flexDirection: "row", gap: 4 },
  datoTexto: { color: colores.texto, fontSize: 13, fontWeight: "600" },
  aporte: { color: colores.acento, fontSize: 13, fontWeight: "800" },
  distancia: { color: colores.textoSecundario, fontSize: 12, marginLeft: "auto" },
});
