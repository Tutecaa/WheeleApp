import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { claveRecorrido, obtenerTrazado } from "@/services/rutas.service";
import { Boton } from "@/components/Boton";
import { CampoFechaHora } from "@/components/CampoFechaHora";
import { CampoTexto } from "@/components/CampoTexto";
import { ChipEncabezado, Encabezado } from "@/components/Encabezado";
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
import { formatearDia, formatearDistancia, formatearDuracion } from "@/utils/formato";
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
  titulo: string; // "Publicar viaje", "Editar viaje"
  textoEnviar: string;
  textoEnviando: string;
  vehiculos: Vehiculo[]; // solo los aprobados
  inicial?: ValoresViaje;
  // Al editar no se pueden dejar menos cupos que las reservas confirmadas.
  cuposReservados?: number;
  // Lanza un Error con el mensaje para el usuario si no se pudo guardar.
  onEnviar: (datos: DatosFormularioViaje) => Promise<void>;
  // Si existe, el paso 1 muestra el botón de volver para salir sin guardar.
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
      ? "Toca el mapa para marcar el origen."
      : !recorrido.destino
        ? "Ahora toca el mapa para marcar el destino."
        : "Arrastra un punto en el mapa para moverlo.";
    const puedeAgregarParada =
      Boolean(recorrido.origen && recorrido.destino) && recorrido.paradas.length < PARADAS_MAXIMAS;

    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Encabezado
          derecha={<ChipEncabezado texto="Paso 1 de 2" />}
          onVolver={onSalir}
          titulo={titulo}
        />

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
            <Atajo icono="school-outline" onPress={() => usarCampus("origen")} texto="Salgo de la UIS" />
            <Atajo icono="school-outline" onPress={() => usarCampus("destino")} texto="Voy a la UIS" />
            {recorrido.origen || recorrido.destino ? (
              <Atajo icono="swap-vertical" onPress={invertir} texto="Invertir" />
            ) : null}
            {lista.length > 0 ? <Atajo icono="trash-outline" onPress={limpiar} texto="Borrar todo" /> : null}
            {inicial && recorridoCambio ? (
              <Atajo icono="arrow-undo" onPress={restaurarRecorrido} texto="Restaurar recorrido guardado" />
            ) : null}
          </View>

          <TarjetaPunto
            color={COLOR_PUNTO.origen}
            etiqueta="Origen"
            onQuitar={recorrido.origen ? () => moverPunto({ tipo: "origen" }, null) : undefined}
            valor={
              recorrido.origen ? nombreOrigen || "Punto marcado en el mapa" : "Toca el mapa para marcarlo"
            }
            vacio={!recorrido.origen}
          />
          {recorrido.paradas.map((_parada, indice) => (
            <TarjetaPunto
              color={COLOR_PUNTO.parada}
              etiqueta={`Parada ${indice + 1}`}
              key={`parada-${indice}`}
              onQuitar={() => moverPunto({ tipo: "parada", indice }, null)}
              valor="Punto marcado en el mapa"
            />
          ))}
          {puedeAgregarParada ? (
            <TarjetaPunto
              color={COLOR_PUNTO.parada}
              etiqueta="Parada intermedia"
              onAgregar={() => setAvisoMapa("Toca el mapa donde quieras agregar la parada.")}
              valor="Añadir parada…"
              vacio
            />
          ) : null}
          <TarjetaPunto
            color={COLOR_PUNTO.destino}
            etiqueta="Destino"
            onQuitar={recorrido.destino ? () => moverPunto({ tipo: "destino" }, null) : undefined}
            valor={
              recorrido.destino ? nombreDestino || "Punto marcado en el mapa" : "Toca el mapa para marcarlo"
            }
            vacio={!recorrido.destino}
          />

          {avisoMapa ? <Text style={styles.aviso}>{avisoMapa}</Text> : null}
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
            <View style={styles.resumenRuta}>
              <Ionicons color={colores.primario} name="navigate" size={16} />
              <Text style={styles.resumenRutaTexto}>
                Ruta de {formatearDistancia(trazado.distanciaMetros)} · unos{" "}
                {formatearDuracion(trazado.duracionSegundos)} en carro
              </Text>
            </View>
          ) : null}

          <Boton deshabilitado={!trazado} onPress={() => setPaso("datos")} titulo="Continuar" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const maximoCupos = vehiculo?.numeroPuestos ?? 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado
        derecha={
          <ChipEncabezado icono="calendar-outline" texto={salida ? formatearDia(salida) : "Paso 2 de 2"} />
        }
        onVolver={() => setPaso("ruta")}
        titulo={titulo}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {trazado ? (
            <View style={styles.resumenTarjeta}>
              <Ionicons color={colores.primario} name="navigate" size={18} />
              <View style={styles.flex}>
                <Text numberOfLines={2} style={styles.resumenTitulo}>
                  {nombreOrigen || "Origen"} → {nombreDestino || "Destino"}
                </Text>
                <Text style={styles.resumenDetalle}>
                  {formatearDistancia(trazado.distanciaMetros)} · unos{" "}
                  {formatearDuracion(trazado.duracionSegundos)}
                  {recorrido.paradas.length > 0
                    ? ` · ${recorrido.paradas.length} parada${recorrido.paradas.length === 1 ? "" : "s"}`
                    : ""}
                </Text>
              </View>
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

          <CampoFechaHora minimo={new Date()} onCambiar={setSalida} valor={salida} />

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
                <Ionicons
                  color={elegido ? colores.primario : colores.textoSecundario}
                  name="car-sport-outline"
                  size={22}
                />
                <View style={styles.flex}>
                  <Text style={styles.vehiculoPlaca}>{opcion.placa}</Text>
                  <Text style={styles.vehiculoDetalle}>
                    {opcion.marca} {opcion.linea} · {opcion.color} · {opcion.numeroPuestos} puestos
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionEtiqueta}>Asientos disponibles</Text>
              <Text style={styles.seccionValor}>{cupos || "–"}</Text>
            </View>
            {vehiculo ? (
              <View style={styles.asientos}>
                {Array.from({ length: maximoCupos }, (_, i) => String(i + 1)).map((numero) => {
                  const elegido = cupos === numero;
                  const bloqueado = Number(numero) < cuposReservados;
                  return (
                    <Pressable
                      accessibilityLabel={`${numero} asientos`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: elegido, disabled: bloqueado }}
                      disabled={bloqueado}
                      key={numero}
                      onPress={() => setCupos(numero)}
                      style={[
                        styles.asiento,
                        elegido && styles.asientoElegido,
                        bloqueado && styles.asientoBloqueado,
                      ]}
                    >
                      <Text style={[styles.asientoTexto, elegido && styles.asientoTextoElegido]}>
                        {numero}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.ayuda}>Elige primero el vehículo.</Text>
            )}
            {cuposReservados > 0 ? (
              <Text style={styles.ayuda}>
                Hay {cuposReservados} reserva{cuposReservados === 1 ? "" : "s"} confirmada
                {cuposReservados === 1 ? "" : "s"}: no puedes dejar menos cupos que eso.
              </Text>
            ) : null}
          </View>

          <View style={styles.seccion}>
            <View style={styles.seccionEncabezado}>
              <Text style={styles.seccionEtiqueta}>Contribución sugerida</Text>
              <View style={styles.aporteFila}>
                <Text style={styles.aporteSimbolo}>$</Text>
                <TextInput
                  accessibilityLabel="Contribución sugerida por pasajero"
                  keyboardType="number-pad"
                  maxLength={String(APORTE_SUGERIDO_MAXIMO).length}
                  onChangeText={setAporte}
                  placeholder="0"
                  placeholderTextColor={colores.placeholder}
                  style={styles.aporteInput}
                  value={aporte}
                />
              </View>
            </View>
            <Text style={styles.ayuda}>
              Por pasajero, en pesos. Es solo una referencia: WHEEL-E no procesa pagos y el
              aporte se acuerda directamente entre ustedes.
            </Text>
          </View>

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

// Los mismos colores de los marcadores del mapa (mapaLeaflet.ts).
const COLOR_PUNTO = {
  origen: colores.primario,
  parada: colores.acento,
  destino: colores.primarioOscuro,
};

// Fila de un punto del recorrido: punto de color, etiqueta y lugar.
function TarjetaPunto({
  color,
  etiqueta,
  valor,
  vacio = false,
  onQuitar,
  onAgregar,
}: {
  color: string;
  etiqueta: string;
  valor: string;
  vacio?: boolean;
  onQuitar?: () => void;
  onAgregar?: () => void;
}) {
  return (
    <Pressable disabled={!onAgregar} onPress={onAgregar} style={styles.puntoTarjeta}>
      <View style={[styles.puntoColor, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <Text style={styles.puntoEtiqueta}>{etiqueta}</Text>
        <Text numberOfLines={1} style={[styles.puntoValor, vacio && styles.puntoValorVacio]}>
          {valor}
        </Text>
      </View>
      {onQuitar ? (
        <Pressable
          accessibilityLabel={`Quitar ${etiqueta.toLowerCase()}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onQuitar}
        >
          <Ionicons color={colores.textoSecundario} name="close-circle" size={22} />
        </Pressable>
      ) : null}
      {onAgregar ? (
        <View style={styles.agregar}>
          <Ionicons color={colores.primario} name="add" size={18} />
        </View>
      ) : null}
    </Pressable>
  );
}

function Atajo({
  texto,
  icono,
  onPress,
}: {
  texto: string;
  icono: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.atajo}>
      <Ionicons color={colores.primario} name={icono} size={14} />
      <Text style={styles.atajoTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  flex: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  mapa: { backgroundColor: colores.menta, flex: 1 },
  panel: {
    backgroundColor: colores.fondo,
    borderTopColor: colores.borde,
    borderTopWidth: 1,
    flexGrow: 0,
    maxHeight: "52%",
  },
  panelContenido: { padding: 16, paddingBottom: 20 },
  instruccion: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  atajos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, marginTop: 10 },
  atajo: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 18,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  atajoTexto: { color: colores.primario, fontSize: 13, fontWeight: "700" },
  puntoTarjeta: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  puntoColor: { borderRadius: 5, height: 10, width: 10 },
  puntoEtiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  puntoValor: { color: colores.titulo, fontSize: 15, fontWeight: "700", marginTop: 2 },
  puntoValorVacio: { color: colores.placeholder, fontWeight: "600" },
  agregar: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  estadoRuta: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  estadoRutaTexto: { color: colores.textoSecundario, fontSize: 13 },
  resumenRuta: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 12 },
  resumenRutaTexto: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "700" },
  aviso: { color: colores.primario, fontSize: 13, fontWeight: "600", lineHeight: 18, marginTop: 10 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  resumenTarjeta: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  resumenTitulo: { color: colores.titulo, fontSize: 15, fontWeight: "800" },
  resumenDetalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  etiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 18,
    textTransform: "uppercase",
  },
  vehiculo: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    padding: 14,
  },
  vehiculoElegido: { borderColor: colores.primario, borderWidth: 2 },
  vehiculoPlaca: { color: colores.titulo, fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  vehiculoDetalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  seccion: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  seccionEncabezado: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  seccionEtiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  seccionValor: { color: colores.primario, fontSize: 20, fontWeight: "800" },
  asientos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  asiento: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 10,
    flexBasis: "22%",
    flexGrow: 1,
    paddingVertical: 11,
  },
  asientoElegido: { backgroundColor: colores.primario },
  asientoBloqueado: { opacity: 0.35 },
  asientoTexto: { color: colores.texto, fontSize: 15, fontWeight: "700" },
  asientoTextoElegido: { color: colores.blanco },
  aporteFila: { alignItems: "center", flexDirection: "row" },
  aporteSimbolo: { color: colores.acento, fontSize: 20, fontWeight: "800" },
  aporteInput: {
    color: colores.acento,
    fontSize: 20,
    fontWeight: "800",
    minWidth: 70,
    paddingVertical: 0,
    textAlign: "right",
  },
  ayuda: { color: colores.textoSecundario, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
