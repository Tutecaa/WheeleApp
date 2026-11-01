import { useCallback, useState } from "react";
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { calificar, obtenerPorCalificar } from "@/services/calificaciones.service";
import { Avatar } from "@/components/Avatar";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { Encabezado } from "@/components/Encabezado";
import { Estrellas, NOMBRES_NOTA } from "@/components/Estrellas";
import { nombreLugar } from "@/components/TarjetaViaje";
import { colores } from "@/constants/colores";
import { LONGITUD_MAXIMA_COMENTARIO_CALIFICACION } from "@/constants/config";
import type { PersonaPorCalificar, ViajePorCalificar } from "@/types";
import { formatearDia, formatearFechaHora, formatearHora } from "@/utils/formato";

// RF13: venció el plazo para calificar (DIAS_PLAZO_CALIFICAR tras finalizar).
function plazoVencido(viaje: ViajePorCalificar): boolean {
  return viaje.plazoHasta ? new Date(viaje.plazoHasta).getTime() < Date.now() : false;
}

// RF13: calificar a los participantes de un viaje finalizado. El conductor
// califica uno por uno a sus pasajeros; el pasajero, al conductor.
export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [viaje, setViaje] = useState<ViajePorCalificar | null>(null);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    try {
      setViaje(await obtenerPorCalificar(id));
      setError("");
    } catch (cargaError) {
      setError((cargaError as Error).message);
    } finally {
      setCargado(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/mis-viajes");
  }

  async function alCalificar(nombre: string) {
    setMensaje(`¡Gracias! Calificaste a ${nombre.split(" ")[0]}.`);
    await cargar();
  }

  if (!cargado || !viaje) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Encabezado onVolver={volver} titulo="Calificar viaje" />
        <View style={styles.centrado}>
          {!cargado ? (
            <ActivityIndicator color={colores.primario} />
          ) : (
            <>
              <View style={styles.centradoIcono}>
                <Ionicons color={colores.textoSecundario} name="star-outline" size={30} />
              </View>
              <Text style={styles.centradoTitulo}>{error || "No hay a quién calificar en este viaje"}</Text>
              {!error ? (
                <Text style={styles.centradoTexto}>
                  Solo el conductor y los pasajeros confirmados de un viaje pueden calificarse entre sí.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const finalizado = viaje.estado === "finalizado";
  const vencido = plazoVencido(viaje);
  const pendientes = viaje.personas.filter((persona) => persona.puntuacion === undefined).length;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Encabezado onVolver={volver} titulo="Calificar viaje" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityHint="Abre el detalle del viaje"
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/viaje/[id]", params: { id: viaje.viajeId } })}
            style={({ pressed }) => [styles.viaje, pressed && styles.presionado]}
          >
            <View style={styles.viajeIcono}>
              <Ionicons color={colores.blanco} name="flag" size={18} />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.viajeRuta}>
                {nombreLugar(viaje.origenNombre)} → {nombreLugar(viaje.destinoNombre)}
              </Text>
              <Text style={styles.viajeDetalle}>
                {formatearDia(viaje.fechaHoraSalida)} · {formatearHora(viaje.fechaHoraSalida)}
              </Text>
            </View>
            <Ionicons color={colores.placeholder} name="chevron-forward" size={18} />
          </Pressable>

          {!finalizado ? (
            <Aviso icono="time-outline" texto="Podrás calificar cuando el conductor finalice el viaje." />
          ) : vencido ? (
            <Aviso icono="lock-closed-outline" texto="Venció el plazo para calificar este viaje." />
          ) : pendientes > 0 && viaje.plazoHasta ? (
            <Aviso icono="hourglass-outline" texto={`Puedes calificar hasta el ${formatearFechaHora(viaje.plazoHasta)}.`} />
          ) : pendientes === 0 ? (
            <Aviso exito icono="checkmark-done" texto="Ya calificaste a todos. ¡Gracias por cuidar la comunidad!" />
          ) : null}

          {mensaje ? (
            <View style={styles.exito}>
              <Ionicons color={colores.primario} name="checkmark-circle" size={18} />
              <Text style={styles.exitoTexto}>{mensaje}</Text>
            </View>
          ) : null}

          {viaje.personas.map((persona) => (
            <TarjetaCalificar
              abierto={finalizado && !vencido}
              key={persona.persona.id}
              onCalificado={() => alCalificar(persona.persona.nombreCompleto)}
              persona={persona}
              viajeId={viaje.viajeId}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Aviso({ icono, texto, exito = false }: { icono: keyof typeof Ionicons.glyphMap; texto: string; exito?: boolean }) {
  return (
    <View style={[styles.aviso, exito && styles.avisoExito]}>
      <Ionicons color={exito ? colores.primario : colores.avisoTexto} name={icono} size={18} />
      <Text style={[styles.avisoTexto, exito && styles.avisoTextoExito]}>{texto}</Text>
    </View>
  );
}

// Una persona por calificar: elegir la nota, comentar y enviar. Si ya la
// calificó, muestra lo que envió.
function TarjetaCalificar({
  persona,
  viajeId,
  abierto,
  onCalificado,
}: {
  persona: PersonaPorCalificar;
  viajeId: string;
  abierto: boolean;
  onCalificado: () => Promise<void>;
}) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const yaCalificada = persona.puntuacion !== undefined;

  async function enviar() {
    setError("");
    if (nota === 0) {
      setError("Elige una nota de 1 a 5 estrellas.");
      return;
    }
    setEnviando(true);
    try {
      await calificar(viajeId, persona.persona.id, nota, comentario);
      await onCalificado();
    } catch (envioError) {
      setError((envioError as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={[styles.tarjeta, yaCalificada && styles.tarjetaHecha]}>
      <Pressable
        accessibilityHint="Abre su perfil público"
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/usuario/[id]", params: { id: persona.persona.id } })}
        style={({ pressed }) => [styles.persona, pressed && styles.presionado]}
      >
        <Avatar fotoUrl={persona.persona.fotoPerfilUrl} nombre={persona.persona.nombreCompleto} tamano={50} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.nombre}>
            {persona.persona.nombreCompleto}
          </Text>
          <Text style={styles.rol}>{persona.rol === "conductor" ? "Conductor del viaje" : "Pasajero"}</Text>
        </View>
        {yaCalificada ? (
          <View style={styles.hecho}>
            <Ionicons color={colores.primario} name="checkmark-circle" size={16} />
            <Text style={styles.hechoTexto}>Enviada</Text>
          </View>
        ) : null}
      </Pressable>

      {yaCalificada ? (
        <View style={styles.resultado}>
          <Estrellas tamano={20} valor={persona.puntuacion ?? 0} />
          {persona.comentario ? <Text style={styles.comentarioEnviado}>“{persona.comentario}”</Text> : null}
        </View>
      ) : abierto ? (
        <>
          <View style={styles.selector}>
            <Estrellas onCambiar={setNota} tamano={34} valor={nota} />
            <Text style={[styles.notaTexto, nota === 0 && styles.notaVacia]}>
              {nota === 0 ? "Toca una estrella" : NOMBRES_NOTA[nota]}
            </Text>
          </View>
          <CampoTexto
            etiqueta="Comentario (opcional)"
            maxLength={LONGITUD_MAXIMA_COMENTARIO_CALIFICACION}
            multiline
            onChangeText={setComentario}
            placeholder={
              persona.rol === "conductor"
                ? "Ej.: puntual y maneja con cuidado"
                : "Ej.: llegó a tiempo al punto de encuentro"
            }
            style={styles.comentario}
            value={comentario}
          />
          <Text style={styles.contador}>
            {comentario.length}/{LONGITUD_MAXIMA_COMENTARIO_CALIFICACION}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Boton
            cargando={enviando}
            onPress={enviar}
            style={styles.enviar}
            titulo="Enviar calificación"
            tituloCargando="Enviando..."
          />
        </>
      ) : (
        <Text style={styles.cerrado}>No la calificaste a tiempo.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  flex: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  presionado: { opacity: 0.7 },
  centrado: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  centradoIcono: {
    alignItems: "center",
    backgroundColor: colores.borde,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  centradoTitulo: { color: colores.titulo, fontSize: 17, fontWeight: "800", marginTop: 14, textAlign: "center" },
  centradoTexto: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: "center" },
  viaje: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  viajeIcono: {
    alignItems: "center",
    backgroundColor: colores.primarioOscuro,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  viajeRuta: { color: colores.titulo, fontSize: 15, fontWeight: "800" },
  viajeDetalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  aviso: {
    alignItems: "center",
    backgroundColor: colores.avisoFondo,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  avisoExito: { backgroundColor: colores.primarioSuave },
  avisoTexto: { color: colores.avisoTexto, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  avisoTextoExito: { color: colores.primario },
  exito: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  exitoTexto: { color: colores.primario, flex: 1, fontSize: 14, fontWeight: "800" },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  tarjetaHecha: { backgroundColor: colores.fondo },
  persona: { alignItems: "center", flexDirection: "row", gap: 12 },
  nombre: { color: colores.titulo, fontSize: 16, fontWeight: "800" },
  rol: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  hecho: {
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hechoTexto: { color: colores.primario, fontSize: 12, fontWeight: "800" },
  resultado: { marginTop: 12 },
  comentarioEnviado: { color: colores.texto, fontSize: 14, fontStyle: "italic", lineHeight: 20, marginTop: 8 },
  selector: { alignItems: "center", marginTop: 16 },
  notaTexto: { color: colores.acento, fontSize: 15, fontWeight: "800", marginTop: 6 },
  notaVacia: { color: colores.placeholder, fontWeight: "600" },
  comentario: { height: 88, paddingTop: 12, textAlignVertical: "top" },
  contador: { color: colores.placeholder, fontSize: 12, marginTop: 4, textAlign: "right" },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 8 },
  enviar: { marginTop: 14 },
  cerrado: { color: colores.textoSecundario, fontSize: 13, marginTop: 10 },
});
