import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { buscarViajes } from "@/services/busqueda.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampanaNotificaciones } from "@/components/CampanaNotificaciones";
import { CampoFranja } from "@/components/CampoFranja";
import { ChipEncabezado, Encabezado } from "@/components/Encabezado";
import { Mapa } from "@/components/Mapa";
import { TarjetaResultado } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import {
  CAMPUS_UIS,
  FRANJAS_HORARIAS,
  RADIO_BUSQUEDA_POR_DEFECTO_METROS,
  RADIOS_BUSQUEDA_METROS,
} from "@/constants/config";
import type { Coordenada, ResultadoBusqueda } from "@/types";
import { fechaConMinutos, formatearDia, formatearDistancia, formatearHora } from "@/utils/formato";
import { distanciaEntre, type CriteriosBusqueda } from "@/utils/validaciones";

// Espera tras cambiar un criterio antes de repetir la búsqueda, para no
// consultar con cada toque mientras el pasajero ajusta el punto o la hora.
const ESPERA_ACTUALIZAR_MS = 400;

function hoy(): Date {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

const TODO_EL_DIA = FRANJAS_HORARIAS[0];

// RF8: el pasajero marca su punto de partida, elige la fecha, la franja y el
// radio, y ve los viajes que pasan cerca ordenados de menor a mayor distancia.
export default function Buscar() {
  const { perfil } = useSesion();
  const nombre = perfil?.nombreCompleto.split(" ")[0];

  const [partida, setPartida] = useState<Coordenada | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [desdeMinutos, setDesdeMinutos] = useState<number>(TODO_EL_DIA.desde);
  const [hastaMinutos, setHastaMinutos] = useState<number>(TODO_EL_DIA.hasta);
  const [radio, setRadio] = useState(RADIO_BUSQUEDA_POR_DEFECTO_METROS);

  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  // Tras la primera búsqueda, los filtros se resumen para dar espacio a los resultados.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);

  // Después de la primera búsqueda, cada cambio de criterio la repite (RF8:
  // al cambiar el radio, los resultados se actualizan).
  const yaBusco = useRef(false);
  // Solo se muestra la respuesta de la última consulta.
  const consulta = useRef(0);

  const criterios: CriteriosBusqueda = {
    partida,
    desde: fechaConMinutos(fecha, desdeMinutos),
    hasta: fechaConMinutos(fecha, hastaMinutos),
    radioMetros: radio,
  };
  const franjaInvertida = hastaMinutos <= desdeMinutos;

  async function buscar(actuales: CriteriosBusqueda) {
    const numero = ++consulta.current;
    setBuscando(true);
    setError("");
    try {
      const lista = await buscarViajes(actuales);
      if (numero !== consulta.current) return;
      setResultados(lista);
      setFiltrosAbiertos(false);
    } catch (busquedaError) {
      if (numero !== consulta.current) return;
      setResultados(null);
      setError((busquedaError as Error).message);
    } finally {
      if (numero === consulta.current) setBuscando(false);
    }
  }

  const actualizar = useEffectEvent(() => {
    if (yaBusco.current) buscar(criterios);
  });

  useEffect(() => {
    const espera = setTimeout(actualizar, ESPERA_ACTUALIZAR_MS);
    return () => clearTimeout(espera);
  }, [partida, fecha, desdeMinutos, hastaMinutos, radio]);

  function presionarBuscar() {
    yaBusco.current = true;
    buscar(criterios);
  }

  function elegirFranja(desde: number, hasta: number) {
    setDesdeMinutos(desde);
    setHastaMinutos(hasta);
  }

  function abrirViaje(id: string) {
    if (!partida) return;
    router.push({
      pathname: "/viaje/[id]",
      params: { id, lat: String(partida.latitud), lng: String(partida.longitud) },
    });
  }

  const enCampus =
    partida !== null && distanciaEntre(partida, CAMPUS_UIS.coordenadas) < 30;
  const radioMayor = RADIOS_BUSQUEDA_METROS.find((opcion) => opcion > radio);
  const esTodoElDia = desdeMinutos === TODO_EL_DIA.desde && hastaMinutos === TODO_EL_DIA.hasta;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado
        derecha={
          <View style={styles.encabezadoDerecha}>
            <ChipEncabezado icono="walk-outline" texto={formatearDistancia(radio)} />
            <CampanaNotificaciones />
          </View>
        }
        titulo="Buscar viaje"
      />

      <View style={styles.zonaMapa}>
        <Mapa
          editable
          onMoverPunto={(_indice, coordenada) => setPartida(coordenada)}
          onTocar={setPartida}
          puntos={partida ? [{ coordenadas: partida, tipo: "partida", etiqueta: "Tú" }] : []}
          radioMetros={partida ? radio : undefined}
          style={styles.mapa}
        />
        <View pointerEvents="none" style={styles.pista}>
          <Ionicons color={colores.info} name={partida ? "hand-left-outline" : "location"} size={14} />
          <Text style={styles.pistaTexto}>
            {partida ? "Arrastra el punto para ajustarlo" : "Toca el mapa para marcar tu punto de partida"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.panelContenido}
        keyboardShouldPersistTaps="handled"
        style={styles.panel}
      >
        {resultados === null ? (
          <>
            <Text style={styles.saludo}>{nombre ? `Hola, ${nombre}` : "Hola"}</Text>
            <Text style={styles.intro}>Encuentra viajes que pasen cerca de ti, ordenados por distancia.</Text>
          </>
        ) : null}

        <View style={styles.atajos}>
          <Chip
            activo={enCampus}
            icono="school-outline"
            onPress={() => setPartida(CAMPUS_UIS.coordenadas)}
            texto="Salgo de la UIS"
          />
          {partida && !enCampus ? (
            <Chip icono="close" onPress={() => setPartida(null)} texto="Quitar punto" />
          ) : null}
        </View>

        {filtrosAbiertos ? (
          <View style={styles.seccion}>
            <Text style={styles.etiqueta}>¿Cuándo viajas?</Text>
            <CampoFranja
              desdeMinutos={desdeMinutos}
              error={franjaInvertida ? "La hora final debe ser posterior a la inicial. Corrígela." : undefined}
              fecha={fecha}
              hastaMinutos={hastaMinutos}
              minimo={hoy()}
              onCambiarDesde={setDesdeMinutos}
              onCambiarFecha={setFecha}
              onCambiarHasta={setHastaMinutos}
            />
            <View style={styles.chips}>
              {FRANJAS_HORARIAS.map((franja) => (
                <Chip
                  activo={franja.desde === desdeMinutos && franja.hasta === hastaMinutos}
                  key={franja.nombre}
                  onPress={() => elegirFranja(franja.desde, franja.hasta)}
                  texto={franja.nombre}
                />
              ))}
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityHint="Muestra la fecha y la franja horaria"
            accessibilityRole="button"
            onPress={() => setFiltrosAbiertos(true)}
            style={({ pressed }) => [styles.resumen, pressed && styles.presionado]}
          >
            <Ionicons color={colores.primario} name="calendar-outline" size={18} />
            <Text numberOfLines={1} style={styles.resumenTexto}>
              {formatearDia(fecha)} ·{" "}
              {esTodoElDia
                ? "todo el día"
                : `${formatearHora(criterios.desde)} – ${formatearHora(criterios.hasta)}`}
            </Text>
            <Text style={styles.resumenAccion}>Cambiar</Text>
          </Pressable>
        )}

        <View style={styles.seccion}>
          <Text style={styles.etiqueta}>¿Cuánto puedes caminar?</Text>
          <View style={styles.chips}>
            {RADIOS_BUSQUEDA_METROS.map((opcion) => (
              <Chip
                activo={opcion === radio}
                key={opcion}
                onPress={() => setRadio(opcion)}
                texto={formatearDistancia(opcion)}
              />
            ))}
          </View>
        </View>

        {error ? (
          <View style={styles.errorCaja}>
            <Ionicons color={colores.error} name="alert-circle" size={18} />
            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        ) : null}

        {resultados === null || filtrosAbiertos ? (
          <Boton
            cargando={buscando}
            deshabilitado={!partida || franjaInvertida}
            onPress={presionarBuscar}
            titulo={partida ? "Buscar viajes" : "Marca tu punto en el mapa"}
            tituloCargando="Buscando..."
          />
        ) : null}

        {resultados !== null ? (
          <View style={styles.resultados}>
            <View style={styles.resultadosEncabezado}>
              <Text style={styles.resultadosTitulo}>
                {resultados.length === 0
                  ? "Sin viajes cerca"
                  : `${resultados.length} viaje${resultados.length === 1 ? "" : "s"} cerca de ti`}
              </Text>
              {buscando ? <ActivityIndicator color={colores.primario} size="small" /> : null}
            </View>
            {resultados.length > 0 ? (
              <Text style={styles.resultadosSubtitulo}>
                Ordenados de menor a mayor distancia a tu punto, en línea recta.
              </Text>
            ) : null}

            {resultados.map((resultado) => (
              <TarjetaResultado key={resultado.id} onPress={() => abrirViaje(resultado.id)} resultado={resultado} />
            ))}

            {resultados.length === 0 ? (
              <View style={styles.vacio}>
                <View style={styles.vacioIcono}>
                  <Ionicons color={colores.primario} name="car-outline" size={28} />
                </View>
                <Text style={styles.vacioTitulo}>No hay viajes en este radio</Text>
                <Text style={styles.vacioTexto}>
                  Ningún viaje pasa a menos de {formatearDistancia(radio)} de tu punto en esa franja. Prueba
                  ampliando el radio o cambiando la franja horaria.
                </Text>
                <View style={[styles.chips, styles.vacioAcciones]}>
                  {radioMayor ? (
                    <Chip
                      icono="expand-outline"
                      onPress={() => setRadio(radioMayor)}
                      texto={`Ampliar a ${formatearDistancia(radioMayor)}`}
                    />
                  ) : null}
                  {!esTodoElDia ? (
                    <Chip
                      icono="time-outline"
                      onPress={() => elegirFranja(TODO_EL_DIA.desde, TODO_EL_DIA.hasta)}
                      texto="Todo el día"
                    />
                  ) : null}
                  <Chip icono="calendar-outline" onPress={() => setFiltrosAbiertos(true)} texto="Otra fecha" />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  texto,
  onPress,
  activo = false,
  icono,
}: {
  texto: string;
  onPress: () => void;
  activo?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && styles.presionado]}
    >
      {icono ? <Ionicons color={activo ? colores.blanco : colores.primario} name={icono} size={14} /> : null}
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  encabezadoDerecha: { alignItems: "center", flexDirection: "row", gap: 10 },
  zonaMapa: { height: 250 },
  mapa: { backgroundColor: colores.menta, flex: 1 },
  pista: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    elevation: 3,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    top: 10,
  },
  pistaTexto: { color: colores.titulo, fontSize: 12, fontWeight: "700" },
  panel: { borderTopColor: colores.borde, borderTopWidth: 1, flex: 1 },
  panelContenido: { padding: 18, paddingBottom: 40 },
  saludo: { color: colores.titulo, fontSize: 22, fontWeight: "800" },
  intro: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 4 },
  atajos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  seccion: { marginTop: 18 },
  etiqueta: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderColor: colores.primarioSuave,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipTexto: { color: colores.primario, fontSize: 13, fontWeight: "700" },
  chipTextoActivo: { color: colores.blanco },
  presionado: { opacity: 0.7 },
  resumen: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resumenTexto: { color: colores.titulo, flex: 1, fontSize: 14, fontWeight: "700" },
  resumenAccion: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  errorCaja: {
    alignItems: "center",
    backgroundColor: colores.errorSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  errorTexto: { color: colores.error, flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  resultados: { marginTop: 22 },
  resultadosEncabezado: { alignItems: "center", flexDirection: "row", gap: 8 },
  resultadosTitulo: { color: colores.titulo, flex: 1, fontSize: 18, fontWeight: "800" },
  resultadosSubtitulo: { color: colores.textoSecundario, fontSize: 12, marginTop: 2 },
  vacio: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 20,
  },
  vacioIcono: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  vacioTitulo: { color: colores.titulo, fontSize: 16, fontWeight: "800", marginTop: 12 },
  vacioTexto: {
    color: colores.textoSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  vacioAcciones: { justifyContent: "center" },
});
