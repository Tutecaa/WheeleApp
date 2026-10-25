import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { claveRecorrido, obtenerTrazado } from "@/services/rutas.service";
import { Boton } from "@/components/Boton";
import { CampoFechaHora } from "@/components/CampoFechaHora";
import { CampoTexto } from "@/components/CampoTexto";
import { Mapa, type PuntoMapa } from "@/components/Mapa";
import { colores } from "@/constants/colores";
import {
  APORTE_SUGERIDO_MAXIMO,
  CAMPUS_UIS,
  ESPERA_RECALCULO_TRAZADO_MS,
  LONGITUD_MAXIMA_NOMBRE_LUGAR,
  PARADAS_MAXIMAS,
} from "@/constants/config";
import type { Coordenada, TrazadoRuta, Ubicacion, Vehiculo } from "@/types";
import { formatearDistancia, formatearDuracion } from "@/utils/formato";
import { validarPuntosViaje } from "@/utils/validaciones";

// Formulario de dos pasos de un viaje: el recorrido en el mapa y los datos de
// la salida. Lo usan publicar (RF4) y modificar (RF6).

export type Recorrido = {
  origen: Coordenada | null;
  destino: Coordenada | null;
  paradas: Coordenada[];
};

export type ValoresViaje = {
  recorrido: Recorrido;
  nombreOrigen: string;
  nombreDestino: string;
  // Trazado ya guardado para `recorrido`: si los puntos no cambian, no se pide otro.
  trazado: TrazadoRuta | null;
  vehiculoId: string | null;
  salida: Date | null;
  cupos: string;
  aporte: string;
};

export type DatosFormularioViaje = {
  vehiculo: Vehiculo;
  origen: Ubicacion;
  destino: Ubicacion;
  paradas: Coordenada[];
  trazado: TrazadoRuta;
  fechaHoraSalida: Date | null;
  cupos: string;
  aporte: string;
  // Si es false, el recorrido es el mismo de `inicial` y se conserva su trazado.
  recorridoCambio: boolean;
};

type Props = {
  titulo: string; // "PUBLICAR VIAJE", "EDITAR VIAJE"
  textoEnviar: string;
  textoEnviando: string;
  vehiculos: Vehiculo[]; // solo los aprobados
  inicial?: ValoresViaje;
  // Al editar no se pueden dejar menos cupos que las reservas confirmadas.
  cuposReservados?: number;
  // Lanza un Error con el mensaje para el usuario si no se pudo guardar.
  onEnviar: (datos: DatosFormularioViaje) => Promise<void>;
  // Si existe, el paso 1 muestra un enlace para salir sin guardar.
  onSalir?: () => void;
};

type Paso = "ruta" | "datos";

// Qué punto del recorrido representa cada marcador del mapa.
type PosicionPunto = { tipo: "origen" } | { tipo: "destino" } | { tipo: "parada"; indice: number };

const RECORRIDO_VACIO: Recorrido = { origen: null, destino: null, paradas: [] };

// Puntos en el orden en que se recorren: origen, paradas y destino.
function puntosEnOrden(recorrido: Recorrido): Coordenada[] | null {
  if (!recorrido.origen || !recorrido.destino) return null;
  return [recorrido.origen, ...recorrido.paradas, recorrido.destino];
}

function claveDe(recorrido: Recorrido): string {
  const puntos = puntosEnOrden(recorrido);
  return puntos ? claveRecorrido(puntos) : "";
}

function marcadores(recorrido: Recorrido): { punto: PuntoMapa; posicion: PosicionPunto }[] {
  const lista: { punto: PuntoMapa; posicion: PosicionPunto }[] = [];
  if (recorrido.origen) {
    lista.push({
      punto: { coordenadas: recorrido.origen, tipo: "origen", etiqueta: "A" },
      posicion: { tipo: "origen" },
    });
  }
  recorrido.paradas.forEach((parada, indice) => {
    lista.push({
      punto: { coordenadas: parada, tipo: "parada", etiqueta: String(indice + 1) },
      posicion: { tipo: "parada", indice },
    });
  });
  if (recorrido.destino) {
    lista.push({
      punto: { coordenadas: recorrido.destino, tipo: "destino", etiqueta: "B" },
      posicion: { tipo: "destino" },
    });
  }
  return lista;
}

export function FormularioViaje({
  titulo,
  textoEnviar,
  textoEnviando,
  vehiculos,
  inicial,
  cuposReservados = 0,
  onEnviar,
  onSalir,
}: Props) {
  const [paso, setPaso] = useState<Paso>("ruta");
  const [recorrido, setRecorrido] = useState<Recorrido>(inicial?.recorrido ?? RECORRIDO_VACIO);
  const [nombreOrigen, setNombreOrigen] = useState(inicial?.nombreOrigen ?? "");
  const [nombreDestino, setNombreDestino] = useState(inicial?.nombreDestino ?? "");
  const [avisoMapa, setAvisoMapa] = useState("");

  // Último trazado obtenido y último fallo, cada uno con el recorrido al que
  // corresponde. Si el recorrido cambia, dejan de valer y se pide otro (RF4).
  const [resultado, setResultado] = useState<{ clave: string; trazado: TrazadoRuta } | null>(null);
  const [fallo, setFallo] = useState<{ clave: string; mensaje: string } | null>(null);
  const [intento, setIntento] = useState(0);

  const [vehiculoId, setVehiculoId] = useState<string | null>(inicial?.vehiculoId ?? null);
  const [salida, setSalida] = useState<Date | null>(inicial?.salida ?? null);
  const [cupos, setCupos] = useState(inicial?.cupos ?? "");
  const [aporte, setAporte] = useState(inicial?.aporte ?? "");
  const [errorDatos, setErrorDatos] = useState("");
  const [enviando, setEnviando] = useState(false);

  const vehiculo =
    vehiculos.find((v) => v.id === vehiculoId) ?? (vehiculos.length === 1 ? vehiculos[0] : null);

  const enOrden = puntosEnOrden(recorrido);
  const errorPuntos = enOrden ? validarPuntosViaje(recorrido.origen, recorrido.destino) : null;
  const clave = enOrden && !errorPuntos ? claveRecorrido(enOrden) : "";

  // Al editar, si el recorrido es el guardado (o se restaura), se usa su
  // trazado sin volver a consultar el servicio (RF5).
  const claveInicial = inicial ? claveDe(inicial.recorrido) : "";
  const recorridoCambio = !inicial || clave !== claveInicial;
  const trazadoGuardado = !recorridoCambio && inicial?.trazado ? inicial.trazado : null;

  const trazado = trazadoGuardado ?? (resultado && resultado.clave === clave ? resultado.trazado : null);
  const errorRuta = fallo && fallo.clave === clave ? fallo.mensaje : "";
  const calculando = Boolean(clave) && !trazado && !errorRuta;

  // RF5: se pide el trazado cuando el recorrido cambia. Si los puntos no
  // cambiaron, la clave es la misma y no se vuelve a consultar el servicio.
  useEffect(() => {
    if (!clave || !enOrden || trazadoGuardado || resultado?.clave === clave) return;
    let vigente = true;
    const temporizador = setTimeout(() => {
      obtenerTrazado(enOrden)
        .then((nuevo) => {
          if (vigente) setResultado({ clave, trazado: nuevo });
        })
        .catch((error: Error) => {
          if (vigente) setFallo({ clave, mensaje: error.message });
        });
    }, ESPERA_RECALCULO_TRAZADO_MS);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
    // `enOrden` cambia con `clave`; `intento` permite reintentar tras un fallo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, intento]);

  function reintentar() {
    setFallo(null);
    setIntento((n) => n + 1);
  }

  function tocarMapa(coordenada: Coordenada) {
    setAvisoMapa("");
    if (!recorrido.origen) {
      setRecorrido({ ...recorrido, origen: coordenada });
      setNombreOrigen("");
    } else if (!recorrido.destino) {
      setRecorrido({ ...recorrido, destino: coordenada });
      setNombreDestino("");
    } else if (recorrido.paradas.length >= PARADAS_MAXIMAS) {
      setAvisoMapa(`Puedes agregar hasta ${PARADAS_MAXIMAS} paradas.`);
    } else {
      setRecorrido({ ...recorrido, paradas: [...recorrido.paradas, coordenada] });
    }
  }

  function moverPunto(posicion: PosicionPunto, coordenada: Coordenada | null) {
    setAvisoMapa("");
    if (posicion.tipo === "origen") {
      setRecorrido({ ...recorrido, origen: coordenada });
      if (!coordenada) setNombreOrigen("");
    } else if (posicion.tipo === "destino") {
      setRecorrido({ ...recorrido, destino: coordenada });
      if (!coordenada) setNombreDestino("");
    } else {
      const paradas = [...recorrido.paradas];
      if (coordenada) paradas[posicion.indice] = coordenada;
      else paradas.splice(posicion.indice, 1);
      setRecorrido({ ...recorrido, paradas });
    }
  }

  function usarCampus(tipo: "origen" | "destino") {
    setAvisoMapa("");
    setRecorrido({ ...recorrido, [tipo]: { ...CAMPUS_UIS.coordenadas } });
    if (tipo === "origen") setNombreOrigen(CAMPUS_UIS.nombre);
    else setNombreDestino(CAMPUS_UIS.nombre);
  }

  // Para el viaje de regreso: el destino pasa a ser el origen y las paradas se invierten.
  function invertir() {
    setRecorrido({
      origen: recorrido.destino,
      destino: recorrido.origen,
      paradas: [...recorrido.paradas].reverse(),
    });
    setNombreOrigen(nombreDestino);
    setNombreDestino(nombreOrigen);
  }

  function limpiar() {
    setRecorrido(RECORRIDO_VACIO);
    setNombreOrigen("");
    setNombreDestino("");
    setAvisoMapa("");
  }

  // RF6: si falla el recálculo, el conductor puede volver al recorrido guardado.
  function restaurarRecorrido() {
    if (!inicial) return;
    setRecorrido(inicial.recorrido);
    setNombreOrigen(inicial.nombreOrigen);
    setNombreDestino(inicial.nombreDestino);
    setAvisoMapa("");
  }

  async function enviar() {
    if (!vehiculo) {
      setErrorDatos("Elige el vehículo del viaje.");
      return;
    }
    if (!trazado || !recorrido.origen || !recorrido.destino) {
      setErrorDatos("Falta el trazado de la ruta. Vuelve al mapa para calcularlo.");
      return;
    }

    setErrorDatos("");
    setEnviando(true);
    try {
      await onEnviar({
        vehiculo,
        origen: { nombre: nombreOrigen, coordenadas: recorrido.origen },
        destino: { nombre: nombreDestino, coordenadas: recorrido.destino },
        paradas: recorrido.paradas,
        trazado,
        fechaHoraSalida: salida,
        cupos,
        aporte,
        recorridoCambio,
      });
    } catch (error) {
      setErrorDatos((error as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (paso === "ruta") {
    const lista = marcadores(recorrido);
    const instruccion = !recorrido.origen
      ? "Toca el mapa para marcar el origen (A)."
      : !recorrido.destino
        ? "Ahora toca el mapa para marcar el destino (B)."
        : `Toca el mapa para agregar paradas (hasta ${PARADAS_MAXIMAS}). Arrastra un punto para moverlo.`;

    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.encabezado}>
          {onSalir ? (
            <Pressable accessibilityRole="link" onPress={onSalir}>
              <Text style={styles.enlaceSalir}>← Salir sin guardar</Text>
            </Pressable>
          ) : null}
          <Text style={styles.brand}>{titulo} · PASO 1 DE 2</Text>
          <Text style={styles.subtitulo}>Marca el recorrido</Text>
        </View>

        <Mapa
          editable
          onMoverPunto={(indice, coordenada) => {
            const marcador = lista[indice];
            if (marcador) moverPunto(marcador.posicion, coordenada);
          }}
          onTocar={tocarMapa}
          puntos={lista.map((marcador) => marcador.punto)}
          style={styles.mapa}
          trazado={trazado?.coordenadas}
        />

        <ScrollView contentContainerStyle={styles.panelContenido} style={styles.panel}>
          <Text style={styles.instruccion}>{instruccion}</Text>

          <View style={styles.atajos}>
            <Atajo onPress={() => usarCampus("origen")} texto="Salgo de la UIS" />
            <Atajo onPress={() => usarCampus("destino")} texto="Voy a la UIS" />
            {recorrido.origen || recorrido.destino ? <Atajo onPress={invertir} texto="Invertir" /> : null}
            {lista.length > 0 ? <Atajo onPress={limpiar} texto="Borrar todo" /> : null}
            {inicial && recorridoCambio ? (
              <Atajo onPress={restaurarRecorrido} texto="Restaurar recorrido guardado" />
            ) : null}
          </View>

          {lista.map(({ punto, posicion }) => (
            <View key={`${posicion.tipo}-${punto.etiqueta}`} style={styles.punto}>
              <Text style={[styles.puntoEtiqueta, ESTILO_MARCA[punto.tipo]]}>{punto.etiqueta}</Text>
              <Text numberOfLines={1} style={styles.puntoTexto}>
                {posicion.tipo === "origen"
                  ? `Origen${nombreOrigen ? ` · ${nombreOrigen}` : ""}`
                  : posicion.tipo === "destino"
                    ? `Destino${nombreDestino ? ` · ${nombreDestino}` : ""}`
                    : `Parada ${posicion.indice + 1}`}
              </Text>
              <Pressable
                accessibilityLabel="Quitar punto"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => moverPunto(posicion, null)}
              >
                <Text style={styles.quitar}>Quitar</Text>
              </Pressable>
            </View>
          ))}

          {avisoMapa ? <Text style={styles.error}>{avisoMapa}</Text> : null}
          {errorPuntos ? <Text style={styles.error}>{errorPuntos}</Text> : null}
          {calculando ? (
            <View style={styles.estadoRuta}>
              <ActivityIndicator color={colores.primario} size="small" />
              <Text style={styles.estadoRutaTexto}>Calculando la ruta por las calles…</Text>
            </View>
          ) : null}
          {errorRuta ? (
            <View>
              <Text style={styles.error}>{errorRuta}</Text>
              <Boton onPress={reintentar} titulo="Reintentar" variante="secundario" />
            </View>
          ) : null}
          {trazado ? (
            <Text style={styles.resumenRuta}>
              Ruta de {formatearDistancia(trazado.distanciaMetros)} · unos{" "}
              {formatearDuracion(trazado.duracionSegundos)} en carro
            </Text>
          ) : null}

          <Boton deshabilitado={!trazado} onPress={() => setPaso("datos")} titulo="Continuar" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="link" onPress={() => setPaso("ruta")}>
            <Text style={styles.backLink}>← Volver al mapa</Text>
          </Pressable>
          <Text style={styles.brand}>{titulo} · PASO 2 DE 2</Text>
          <Text style={styles.title}>Datos de la salida</Text>

          {trazado ? (
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaTexto}>
                {recorrido.paradas.length === 0
                  ? "Sin paradas intermedias"
                  : `${recorrido.paradas.length} parada${recorrido.paradas.length === 1 ? "" : "s"} intermedia${recorrido.paradas.length === 1 ? "" : "s"}`}
              </Text>
              <Text style={styles.tarjetaTexto}>
                {formatearDistancia(trazado.distanciaMetros)} · unos {formatearDuracion(trazado.duracionSegundos)}
              </Text>
            </View>
          ) : null}

          <CampoTexto
            etiqueta="Referencia del origen (opcional)"
            maxLength={LONGITUD_MAXIMA_NOMBRE_LUGAR}
            onChangeText={setNombreOrigen}
            placeholder="Ej.: Cañaveral, frente al centro comercial"
            value={nombreOrigen}
          />
          <CampoTexto
            etiqueta="Referencia del destino (opcional)"
            maxLength={LONGITUD_MAXIMA_NOMBRE_LUGAR}
            onChangeText={setNombreDestino}
            placeholder="Ej.: UIS, entrada de la carrera 27"
            value={nombreDestino}
          />

          <CampoFechaHora
            etiqueta="Fecha y hora de salida"
            minimo={new Date()}
            onCambiar={setSalida}
            valor={salida}
          />

          <Text style={styles.etiqueta}>Vehículo</Text>
          {vehiculos.map((opcion) => {
            const elegido = vehiculo?.id === opcion.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido }}
                key={opcion.id}
                onPress={() => setVehiculoId(opcion.id)}
                style={[styles.vehiculo, elegido && styles.vehiculoElegido]}
              >
                <Text style={styles.vehiculoPlaca}>{opcion.placa}</Text>
                <Text style={styles.vehiculoDetalle}>
                  {opcion.marca} {opcion.linea} · {opcion.color} · {opcion.numeroPuestos} puestos
                </Text>
              </Pressable>
            );
          })}

          <CampoTexto
            etiqueta="Cupos para pasajeros"
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={setCupos}
            placeholder={vehiculo ? `De 1 a ${vehiculo.numeroPuestos}` : "Elige primero el vehículo"}
            value={cupos}
          />
          {cuposReservados > 0 ? (
            <Text style={styles.ayuda}>
              Hay {cuposReservados} reserva{cuposReservados === 1 ? "" : "s"} confirmada
              {cuposReservados === 1 ? "" : "s"}: no puedes dejar menos cupos que eso.
            </Text>
          ) : null}
          <CampoTexto
            etiqueta="Aporte sugerido por pasajero (opcional)"
            keyboardType="number-pad"
            maxLength={String(APORTE_SUGERIDO_MAXIMO).length}
            onChangeText={setAporte}
            placeholder="Ej.: 4000"
            value={aporte}
          />
          <Text style={styles.ayuda}>
            Es solo una referencia en pesos. WHEEL-E no procesa pagos: el aporte se acuerda
            directamente entre ustedes.
          </Text>

          {errorDatos ? <Text style={styles.error}>{errorDatos}</Text> : null}

          <Boton
            cargando={enviando}
            onPress={enviar}
            titulo={textoEnviar}
            tituloCargando={textoEnviando}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Atajo({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.atajo}>
      <Text style={styles.atajoTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  flex: { flex: 1 },
  container: { padding: 28, paddingBottom: 48 },
  encabezado: { paddingBottom: 10, paddingHorizontal: 20, paddingTop: 12 },
  enlaceSalir: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 20 },
  brand: { color: colores.primario, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 8 },
  subtitulo: { color: colores.titulo, fontSize: 20, fontWeight: "800", marginTop: 4 },
  mapa: { flex: 1 },
  panel: {
    backgroundColor: colores.blanco,
    borderTopColor: colores.borde,
    borderTopWidth: 1,
    flexGrow: 0,
    maxHeight: "48%",
  },
  panelContenido: { padding: 16, paddingBottom: 20 },
  instruccion: { color: colores.texto, fontSize: 14, lineHeight: 20 },
  atajos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  atajo: {
    borderColor: colores.primario,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  atajoTexto: { color: colores.primario, fontSize: 13, fontWeight: "700" },
  punto: { alignItems: "center", flexDirection: "row", marginTop: 10 },
  puntoEtiqueta: {
    borderRadius: 12,
    color: colores.blanco,
    fontSize: 12,
    fontWeight: "800",
    height: 24,
    lineHeight: 24,
    overflow: "hidden",
    textAlign: "center",
    width: 24,
  },
  marcaOrigen: { backgroundColor: colores.primario },
  marcaParada: { backgroundColor: "#4C5FA8" },
  marcaDestino: { backgroundColor: colores.titulo },
  puntoTexto: { color: colores.texto, flex: 1, fontSize: 14, marginHorizontal: 10 },
  quitar: { color: colores.error, fontSize: 13, fontWeight: "700" },
  estadoRuta: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  estadoRutaTexto: { color: colores.textoSecundario, fontSize: 13 },
  resumenRuta: { color: colores.primario, fontSize: 14, fontWeight: "700", marginTop: 12 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  tarjetaTexto: { color: colores.texto, fontSize: 14, lineHeight: 21 },
  etiqueta: { color: colores.texto, fontSize: 13, fontWeight: "700", marginBottom: 2, marginTop: 13 },
  vehiculo: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
  },
  vehiculoElegido: { borderColor: colores.primario, borderWidth: 2 },
  vehiculoPlaca: { color: colores.titulo, fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  vehiculoDetalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 3 },
  ayuda: { color: colores.textoSecundario, fontSize: 12, lineHeight: 17, marginTop: 6 },
});

const ESTILO_MARCA = {
  origen: styles.marcaOrigen,
  parada: styles.marcaParada,
  destino: styles.marcaDestino,
};
