import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores } from "@/constants/colores";
import type { EstadoViaje, ResumenViaje } from "@/types";
import {
  formatearAporte,
  formatearDistancia,
  formatearDuracion,
  formatearFechaHora,
} from "@/utils/formato";

type EtiquetaEstado = { texto: string; color: string; fondo: string };

const ESTADOS: Record<EstadoViaje, EtiquetaEstado> = {
  publicado: { texto: "Publicado", color: colores.blanco, fondo: colores.primario },
  en_curso: { texto: "En curso", color: colores.avisoTexto, fondo: colores.avisoFondo },
  finalizado: { texto: "Finalizado", color: colores.textoSecundario, fondo: colores.borde },
  cancelado: { texto: "Cancelado", color: colores.blanco, fondo: colores.error },
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

type Props = {
  viaje: ResumenViaje;
  onPress: () => void;
};

// La tarjeta de un viaje en "Mis viajes" (RF7) y, más adelante, en los resultados de búsqueda.
export function TarjetaViaje({ viaje, onPress }: Props) {
  const estado = etiquetaEstado(viaje);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
    >
      <View style={styles.encabezado}>
        <Text style={styles.fecha}>{formatearFechaHora(viaje.fechaHoraSalida)}</Text>
        <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
          {estado.texto}
        </Text>
      </View>

      <View style={styles.lugar}>
        <Text style={[styles.marca, styles.marcaOrigen]}>A</Text>
        <Text numberOfLines={1} style={styles.lugarTexto}>
          {nombreLugar(viaje.origenNombre)}
        </Text>
      </View>
      <View style={styles.lugar}>
        <Text style={[styles.marca, styles.marcaDestino]}>B</Text>
        <Text numberOfLines={1} style={styles.lugarTexto}>
          {nombreLugar(viaje.destinoNombre)}
        </Text>
      </View>

      <Text style={styles.detalle}>
        {formatearDistancia(viaje.distanciaMetros)} · {formatearDuracion(viaje.duracionSegundos)}
        {viaje.numeroParadas > 0
          ? ` · ${viaje.numeroParadas} parada${viaje.numeroParadas === 1 ? "" : "s"}`
          : ""}
      </Text>
      <View style={styles.pie}>
        <Text style={styles.detalle}>
          {viaje.cuposDisponibles} de {viaje.cuposTotales} cupos libres · {formatearAporte(viaje.aporteSugerido)}
        </Text>
        <Text style={styles.rol}>{viaje.rol === "conductor" ? "Conductor" : "Pasajero"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  presionada: { opacity: 0.7 },
  encabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fecha: { color: colores.titulo, flex: 1, fontSize: 16, fontWeight: "800" },
  estado: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lugar: { alignItems: "center", flexDirection: "row", marginTop: 6 },
  marca: {
    borderRadius: 10,
    color: colores.blanco,
    fontSize: 11,
    fontWeight: "800",
    height: 20,
    lineHeight: 20,
    overflow: "hidden",
    textAlign: "center",
    width: 20,
  },
  marcaOrigen: { backgroundColor: colores.primario },
  marcaDestino: { backgroundColor: colores.titulo },
  lugarTexto: { color: colores.texto, flex: 1, fontSize: 14, marginLeft: 8 },
  detalle: { color: colores.textoSecundario, flexShrink: 1, fontSize: 13, marginTop: 8 },
  pie: { alignItems: "flex-end", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  rol: { color: colores.primario, fontSize: 12, fontWeight: "800" },
});
