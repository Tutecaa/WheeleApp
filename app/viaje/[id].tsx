import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { obtenerViaje } from "@/services/viajes.service";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { colores } from "@/constants/colores";
import type { EstadoViaje, Viaje } from "@/types";
import {
  formatearAporte,
  formatearDistancia,
  formatearDuracion,
  formatearFechaHora,
} from "@/utils/formato";

const ESTADOS: Record<EstadoViaje, { texto: string; color: string; fondo: string }> = {
  publicado: { texto: "Publicado", color: colores.blanco, fondo: colores.primario },
  en_curso: { texto: "En curso", color: colores.avisoTexto, fondo: colores.avisoFondo },
  finalizado: { texto: "Finalizado", color: colores.textoSecundario, fondo: colores.borde },
  cancelado: { texto: "Cancelado", color: colores.blanco, fondo: colores.error },
};

function puntosDelViaje(viaje: Viaje): PuntoMapa[] {
  return [
    { coordenadas: viaje.origen.coordenadas, tipo: "origen", etiqueta: "A" },
    ...viaje.paradasIntermedias.map((parada, indice) => ({
      coordenadas: parada.coordenadas,
      tipo: "parada" as const,
      etiqueta: String(indice + 1),
    })),
    { coordenadas: viaje.destino.coordenadas, tipo: "destino", etiqueta: "B" },
  ];
}

// Detalle de un viaje. Por ahora lo ve el conductor que lo publicó; la vista
// del pasajero (RF9) se completa en el Sprint 3.
export default function DetalleViaje() {
  const { id, publicado } = useLocalSearchParams<{ id: string; publicado?: string }>();
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    obtenerViaje(id)
      .then((encontrado) => {
        if (activo) setViaje(encontrado);
      })
      .catch((cargaError: Error) => {
        if (activo) setError(cargaError.message);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/mis-viajes");
  }

  if (!viaje) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centrado]}>
        {error ? (
          <View style={styles.container}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="link" onPress={volver}>
              <Text style={styles.backLink}>← Volver</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color={colores.primario} />
        )}
      </SafeAreaView>
    );
  }

  const estado = ESTADOS[viaje.estado];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Pressable accessibilityRole="link" onPress={volver}>
            <Text style={styles.backLink}>← Volver</Text>
          </Pressable>
          {publicado ? (
            <Text style={styles.mensaje}>¡Tu viaje quedó publicado!</Text>
          ) : null}
          <View style={styles.encabezado}>
            <Text style={styles.title}>{formatearFechaHora(viaje.fechaHoraSalida)}</Text>
            <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
              {estado.texto}
            </Text>
          </View>
        </View>

        <Mapa
          puntos={puntosDelViaje(viaje)}
          style={styles.mapa}
          trazado={viaje.trazadoRuta}
        />

        <View style={styles.container}>
          <View style={styles.tarjeta}>
            <Fila etiqueta="A · Origen" valor={viaje.origen.nombre ?? "Punto marcado en el mapa"} />
            {viaje.paradasIntermedias.length > 0 ? (
              <Fila
                etiqueta="Paradas"
                valor={`${viaje.paradasIntermedias.length} intermedia${viaje.paradasIntermedias.length === 1 ? "" : "s"}`}
              />
            ) : null}
            <Fila etiqueta="B · Destino" valor={viaje.destino.nombre ?? "Punto marcado en el mapa"} />
            <Fila
              etiqueta="Recorrido"
              valor={`${formatearDistancia(viaje.distanciaMetros)} · unos ${formatearDuracion(viaje.duracionSegundos)}`}
            />
          </View>

          <View style={styles.tarjeta}>
            <Fila etiqueta="Cupos disponibles" valor={`${viaje.cuposDisponibles} de ${viaje.cuposTotales}`} />
            <Fila etiqueta="Aporte sugerido" valor={formatearAporte(viaje.aporteSugerido)} />
            {viaje.vehiculo ? (
              <Fila
                etiqueta="Vehículo"
                valor={`${viaje.vehiculo.placa} · ${viaje.vehiculo.marca} ${viaje.vehiculo.linea} · ${viaje.vehiculo.color}`}
              />
            ) : null}
          </View>

          {viaje.estado === "cancelado" && viaje.motivoCancelacion ? (
            <Text style={styles.error}>Motivo de la cancelación: {viaje.motivoCancelacion}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 40 },
  container: { paddingHorizontal: 24, paddingTop: 16 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 16 },
  mensaje: { color: colores.primario, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  encabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { color: colores.titulo, flex: 1, fontSize: 22, fontWeight: "800", lineHeight: 28 },
  estado: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapa: { height: 300 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
  },
  fila: { paddingVertical: 6 },
  filaEtiqueta: { color: colores.textoSecundario, fontSize: 12, fontWeight: "700" },
  filaValor: { color: colores.texto, fontSize: 15, marginTop: 2 },
  error: { color: colores.error, fontSize: 14, lineHeight: 20, marginBottom: 12 },
});
