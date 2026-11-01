import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Avatar } from "@/components/Avatar";
import { Estrellas } from "@/components/Estrellas";
import { colores } from "@/constants/colores";
import type {
  CanceladaPor,
  EstadoSolicitudCupo,
  EstadoViaje,
  ResultadoBusqueda,
  ResumenViaje,
} from "@/types";
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
  cancelado: { texto: "Cancelado", color: colores.error, fondo: colores.errorSuave },
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

const ESTADOS_SOLICITUD: Record<EstadoSolicitudCupo, EtiquetaEstado> = {
  pendiente: { texto: "Pendiente", color: colores.avisoTexto, fondo: colores.avisoFondo },
  aceptada: { texto: "Confirmada", color: colores.primario, fondo: colores.primarioSuave },
  rechazada: { texto: "Rechazada", color: colores.error, fondo: colores.errorSuave },
  cancelada: { texto: "Cancelada", color: colores.textoSecundario, fondo: colores.borde },
};

// Estado de una solicitud de cupo (RF10 a RF12). Si se cerró porque el
// conductor canceló el viaje, se dice así.
export function etiquetaSolicitud(solicitud: {
  estado: EstadoSolicitudCupo;
  canceladaPor?: CanceladaPor;
}): EtiquetaEstado {
  if (solicitud.estado === "cancelada" && solicitud.canceladaPor === "viaje") return ESTADOS.cancelado;
  return ESTADOS_SOLICITUD[solicitud.estado];
}

export function ChipSolicitud({
  solicitud,
}: {
  solicitud: { estado: EstadoSolicitudCupo; canceladaPor?: CanceladaPor };
}) {
  const estado = etiquetaSolicitud(solicitud);
  return (
    <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
      {estado.texto}
    </Text>
  );
}

// Para el pasajero cuenta su solicitud; si ya está confirmada y el viaje
// avanzó (en curso, finalizado, vencido), cuenta el estado del viaje.
function ChipPasajero({ viaje }: { viaje: ResumenViaje }) {
  const solicitud = viaje.solicitud;
  if (!solicitud) return <ChipEstado viaje={viaje} />;
  if (solicitud.estado === "aceptada" && (viaje.estado !== "publicado" || salidaVencida(viaje))) {
    return <ChipEstado viaje={viaje} />;
  }
  if (solicitud.estado === "pendiente" && salidaVencida(viaje)) {
    return (
      <Text style={[styles.estado, { backgroundColor: SALIDA_VENCIDA.fondo, color: SALIDA_VENCIDA.color }]}>
        Sin respuesta
      </Text>
    );
  }
  return <ChipSolicitud solicitud={solicitud} />;
}

type Props = {
  viaje: ResumenViaje;
  onPress: () => void;
};

// La tarjeta de un viaje en "Mis viajes" (RF7). Como conductor muestra las
// solicitudes por responder; como pasajero, el estado de su solicitud y quién conduce.
export function TarjetaViaje({ viaje, onPress }: Props) {
  const pendientes = viaje.solicitudesPendientes ?? 0;
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
          {viaje.rol === "pasajero" ? <ChipPasajero viaje={viaje} /> : <ChipEstado viaje={viaje} />}
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

        {viaje.rol === "conductor" && pendientes > 0 ? (
          <View style={styles.pendientes}>
            <Ionicons color={colores.avisoTexto} name="notifications" size={14} />
            <Text style={styles.pendientesTexto}>
              {pendientes} solicitud{pendientes === 1 ? "" : "es"} por responder
            </Text>
          </View>
        ) : null}

        {viaje.rol === "pasajero" && viaje.conductor ? (
          <View style={styles.conduce}>
            <Avatar fotoUrl={viaje.conductor.fotoPerfilUrl} nombre={viaje.conductor.nombreCompleto} tamano={22} />
            <Text numberOfLines={1} style={styles.conduceTexto}>
              Conduce {viaje.conductor.nombreCompleto}
              {viaje.placaVehiculo ? ` · ${viaje.placaVehiculo}` : ""}
            </Text>
          </View>
        ) : null}
        {viaje.solicitud?.canceladaConPocaAntelacion ? (
          <Text style={styles.pocaAntelacion}>Cancelaste con poca antelación</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// Un resultado de la búsqueda (RF8): la distancia a tu punto resalta a la
// izquierda porque es el orden de la lista; abajo, el conductor.
export function TarjetaResultado({
  resultado,
  onPress,
}: {
  resultado: ResultadoBusqueda;
  onPress: () => void;
}) {
  const cupos = resultado.cuposDisponibles;
  return (
    <Pressable
      accessibilityHint="Abre el detalle del viaje"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, styles.resultado, pressed && styles.presionada]}
    >
      <View style={styles.resultadoArriba}>
        <View style={styles.cercania}>
          <Ionicons color={colores.primario} name="walk" size={18} />
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.cercaniaValor}>
            {formatearDistancia(resultado.distanciaProximidadMetros)}
          </Text>
          <Text style={styles.cercaniaTexto}>de tu punto</Text>
        </View>

        <View style={styles.cuerpo}>
          <Text numberOfLines={2} style={styles.ruta}>
            {nombreLugar(resultado.origenNombre)} → {nombreLugar(resultado.destinoNombre)}
          </Text>
          <Text style={styles.subtitulo}>
            {formatearDia(resultado.fechaHoraSalida)} · {formatearHora(resultado.fechaHoraSalida)}
          </Text>
          <View style={styles.datos}>
            <Dato icono="people-outline" texto={`${cupos} cupo${cupos === 1 ? "" : "s"}`} />
            {resultado.numeroParadas > 0 ? (
              <Dato
                icono="flag-outline"
                texto={`${resultado.numeroParadas} parada${resultado.numeroParadas === 1 ? "" : "s"}`}
              />
            ) : null}
            <Text style={styles.aporte}>{formatearAporte(resultado.aporteSugerido)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.conductor}>
        <Avatar fotoUrl={resultado.conductor.fotoPerfilUrl} nombre={resultado.conductor.nombreCompleto} tamano={30} />
        <Text numberOfLines={1} style={styles.conductorNombre}>
          {resultado.conductor.nombreCompleto}
        </Text>
        <Estrellas conNumero tamano={13} valor={resultado.conductor.promedioCalificacion} />
        <Ionicons color={colores.placeholder} name="chevron-forward" size={18} />
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
  pendientes: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colores.avisoFondo,
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pendientesTexto: { color: colores.avisoTexto, fontSize: 12, fontWeight: "800" },
  conduce: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 10 },
  conduceTexto: { color: colores.textoSecundario, flex: 1, fontSize: 12, fontWeight: "600" },
  pocaAntelacion: { color: colores.avisoTexto, fontSize: 12, fontWeight: "700", marginTop: 6 },
  resultado: { flexDirection: "column", gap: 0, padding: 0 },
  resultadoArriba: { flexDirection: "row", gap: 12, padding: 14 },
  cercania: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    width: 78,
  },
  cercaniaValor: { color: colores.primario, fontSize: 17, fontWeight: "800", marginTop: 2 },
  cercaniaTexto: { color: colores.primario, fontSize: 10, fontWeight: "700" },
  conductor: {
    alignItems: "center",
    borderTopColor: colores.borde,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  conductorNombre: { color: colores.texto, flex: 1, fontSize: 13, fontWeight: "700" },
});
