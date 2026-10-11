import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import {
  aprobarVehiculo,
  listarSolicitudesPendientes,
  obtenerUrlDocumento,
  rechazarVehiculo,
  type SolicitudHabilitacion,
} from "@/services/admin.service";
import { useSesion } from "@/hooks/useSesion";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { colores } from "@/constants/colores";
import type { DocumentosVehiculo } from "@/types";
import { confirmar } from "@/utils/confirmar";
import { formatearFecha } from "@/utils/formato";

const DOCUMENTOS: { clave: keyof DocumentosVehiculo; etiqueta: string }[] = [
  { clave: "soatPath", etiqueta: "SOAT" },
  { clave: "rtmPath", etiqueta: "Tecnomecánica" },
  { clave: "licenciaConduccionPath", etiqueta: "Licencia" },
];

export default function Habilitaciones() {
  const { perfil } = useSesion();
  const [solicitudes, setSolicitudes] = useState<SolicitudHabilitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Solicitud en la que se está escribiendo el motivo del rechazo.
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const noEsAdmin = perfil !== null && perfil.rol !== "administrador";

  const cargar = useCallback(async () => {
    try {
      setSolicitudes(await listarSolicitudesPendientes());
    } catch (cargaError) {
      setError((cargaError as Error).message);
    }
  }, []);

  useEffect(() => {
    if (noEsAdmin) return;
    let activo = true;
    listarSolicitudesPendientes()
      .then((lista) => {
        if (activo) setSolicitudes(lista);
      })
      .catch((cargaError: Error) => {
        if (activo) setError(cargaError.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [noEsAdmin]);

  async function refrescar() {
    setRefrescando(true);
    setError("");
    await cargar();
    setRefrescando(false);
  }

  async function verDocumento(ruta: string | undefined) {
    if (!ruta) return;
    setError("");
    try {
      await WebBrowser.openBrowserAsync(await obtenerUrlDocumento(ruta));
    } catch (documentoError) {
      setError((documentoError as Error).message);
    }
  }

  async function ejecutar(vehiculoId: string, accion: () => Promise<void>, exito: string) {
    setError("");
    setMensaje("");
    setProcesandoId(vehiculoId);
    try {
      await accion();
      setMensaje(exito);
      setRechazandoId(null);
      setMotivo("");
    } catch (accionError) {
      setError((accionError as Error).message);
    } finally {
      setProcesandoId(null);
    }
    // Se refresca siempre: si otro administrador la resolvió, desaparece.
    await cargar();
  }

  async function aprobar({ vehiculo, solicitante }: SolicitudHabilitacion) {
    const ok = await confirmar(
      "Aprobar vehículo",
      `¿Confirmas que revisaste los documentos de ${vehiculo.placa}? ${
        solicitante?.nombreCompleto ?? "El usuario"
      } quedará habilitado como conductor.`,
      "Aprobar",
    );
    if (!ok) return;
    await ejecutar(vehiculo.id, () => aprobarVehiculo(vehiculo.id), `Aprobaste el vehículo ${vehiculo.placa}.`);
  }

  async function rechazar({ vehiculo }: SolicitudHabilitacion) {
    await ejecutar(
      vehiculo.id,
      () => rechazarVehiculo(vehiculo.id, motivo),
      `Rechazaste el vehículo ${vehiculo.placa}.`,
    );
  }

  if (cargando && !noEsAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centrado]}>
        <ActivityIndicator color={colores.primario} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            noEsAdmin ? undefined : <RefreshControl onRefresh={refrescar} refreshing={refrescando} />
          }
        >
          <Pressable accessibilityRole="link" onPress={() => router.back()}>
            <Text style={styles.backLink}>← Volver</Text>
          </Pressable>
          <Text style={styles.brand}>WHEEL-E · ADMINISTRACIÓN</Text>
          <Text style={styles.title}>Habilitación de conductores</Text>

          {noEsAdmin ? (
            <Text style={styles.description}>No tienes permiso para ver esta sección.</Text>
          ) : (
            <>
              <Text style={styles.description}>
                Revisa la vigencia y la legibilidad de cada documento antes de decidir.
                Desliza hacia abajo para actualizar.
              </Text>

              {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {solicitudes.length === 0 ? (
                <Text style={styles.vacio}>No hay solicitudes pendientes.</Text>
              ) : null}

              {solicitudes.map((solicitud) => {
                const { vehiculo, solicitante } = solicitud;
                const procesando = procesandoId === vehiculo.id;
                const rechazando = rechazandoId === vehiculo.id;
                return (
                  <View key={vehiculo.id} style={styles.tarjeta}>
                    <Text style={styles.placa}>{vehiculo.placa}</Text>
                    <Text style={styles.detalle}>
                      {vehiculo.marca} {vehiculo.linea} {vehiculo.modelo} · {vehiculo.color} ·{" "}
                      {vehiculo.numeroPuestos} puestos
                    </Text>
                    <Text style={styles.fecha}>Recibida el {formatearFecha(vehiculo.fechaRegistro)}</Text>

                    {solicitante ? (
                      <View style={styles.solicitante}>
                        <Text style={styles.solicitanteNombre}>{solicitante.nombreCompleto}</Text>
                        <Text style={styles.detalle}>
                          Código {solicitante.codigoInstitucional} · {solicitante.programaAcademico}
                        </Text>
                        <Text style={styles.detalle}>{solicitante.correoInstitucional}</Text>
                      </View>
                    ) : null}

                    {vehiculo.documentos ? (
                      <View style={styles.documentos}>
                        {DOCUMENTOS.map(({ clave, etiqueta }) => (
                          <Pressable
                            accessibilityRole="button"
                            key={clave}
                            onPress={() => verDocumento(vehiculo.documentos?.[clave])}
                            style={styles.documentoBoton}
                          >
                            <Text style={styles.documentoTexto}>Ver {etiqueta}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.error}>Esta solicitud no tiene documentos cargados.</Text>
                    )}

                    {rechazando ? (
                      <>
                        <CampoTexto
                          etiqueta="Motivo del rechazo (obligatorio)"
                          multiline
                          onChangeText={setMotivo}
                          placeholder="Ej.: el SOAT está vencido"
                          style={styles.motivo}
                          value={motivo}
                        />
                        <Boton
                          cargando={procesando}
                          deshabilitado={motivo.trim().length < 3}
                          onPress={() => rechazar(solicitud)}
                          titulo="Confirmar rechazo"
                          tituloCargando="Guardando..."
                          variante="peligro"
                        />
                        <Boton
                          deshabilitado={procesando}
                          onPress={() => {
                            setRechazandoId(null);
                            setMotivo("");
                          }}
                          titulo="Cancelar"
                          variante="secundario"
                        />
                      </>
                    ) : (
                      <View style={styles.acciones}>
                        <Boton
                          cargando={procesando}
                          deshabilitado={!vehiculo.documentos || procesandoId !== null}
                          onPress={() => aprobar(solicitud)}
                          style={styles.accion}
                          titulo="Aprobar"
                          tituloCargando="Guardando..."
                        />
                        <Boton
                          deshabilitado={procesandoId !== null}
                          onPress={() => {
                            setRechazandoId(vehiculo.id);
                            setMotivo("");
                          }}
                          style={styles.accion}
                          titulo="Rechazar"
                          variante="secundario"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colores.fondo, flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  keyboard: { flex: 1 },
  container: { padding: 28, paddingBottom: 48 },
  backLink: { color: colores.primario, fontSize: 14, fontWeight: "700", marginBottom: 28 },
  brand: { color: colores.primario, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  title: { color: colores.titulo, fontSize: 28, fontWeight: "800", lineHeight: 35, marginTop: 10 },
  description: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9 },
  mensaje: { color: colores.primario, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 12 },
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  vacio: { color: colores.textoSecundario, fontSize: 15, marginTop: 28, textAlign: "center" },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  placa: { color: colores.titulo, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  detalle: { color: colores.texto, fontSize: 14, marginTop: 4 },
  fecha: { color: colores.textoSecundario, fontSize: 12, marginTop: 4 },
  solicitante: { borderTopColor: colores.borde, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  solicitanteNombre: { color: colores.titulo, fontSize: 15, fontWeight: "800" },
  documentos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  documentoBoton: {
    borderColor: colores.primario,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  documentoTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  motivo: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  acciones: { flexDirection: "row", gap: 10 },
  accion: { flex: 1 },
});
