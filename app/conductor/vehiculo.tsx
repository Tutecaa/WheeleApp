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
import * as DocumentPicker from "expo-document-picker";

import {
  NOMBRES_DOCUMENTO,
  obtenerMisVehiculos,
  reenviarSolicitud,
  registrarVehiculo,
  retirarSolicitud,
  type ArchivoDocumento,
  type ArchivosVehiculo,
  type TipoDocumento,
} from "@/services/vehiculos.service";
import { Boton } from "@/components/Boton";
import { CampoTexto } from "@/components/CampoTexto";
import { colores } from "@/constants/colores";
import { TIPOS_DOCUMENTO_PERMITIDOS } from "@/constants/config";
import type { EstadoHabilitacionVehiculo, Vehiculo } from "@/types";
import { confirmar } from "@/utils/confirmar";
import { formatearFecha } from "@/utils/formato";
import type { DatosVehiculo } from "@/utils/validaciones";

const DATOS_VACIOS: DatosVehiculo = {
  placa: "",
  marca: "",
  linea: "",
  modelo: "",
  color: "",
  numeroPuestos: "",
};

const ARCHIVOS_VACIOS: ArchivosVehiculo = { soat: null, rtm: null, licencia: null };

const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  soat: "SOAT",
  rtm: "Revisión tecnomecánica",
  licencia: "Licencia de conducción",
};

const ESTADOS: Record<EstadoHabilitacionVehiculo, { texto: string; color: string; fondo: string }> = {
  pendiente: { texto: "Pendiente de revisión", color: colores.avisoTexto, fondo: colores.avisoFondo },
  aprobado: { texto: "Aprobado", color: colores.blanco, fondo: colores.primario },
  rechazado: { texto: "Rechazado", color: colores.blanco, fondo: colores.error },
  cancelado: { texto: "Retirada", color: colores.textoSecundario, fondo: colores.borde },
};

export default function MiVehiculo() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  // Formulario: `editando` es el vehículo que se corrige; null si es nuevo.
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Vehiculo | null>(null);
  const [datos, setDatos] = useState<DatosVehiculo>(DATOS_VACIOS);
  const [archivos, setArchivos] = useState<ArchivosVehiculo>(ARCHIVOS_VACIOS);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerMisVehiculos());
      setErrorCarga("");
    } catch (error) {
      setErrorCarga((error as Error).message);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    obtenerMisVehiculos()
      .then((lista) => {
        if (activo) setVehiculos(lista);
      })
      .catch((error: Error) => {
        if (activo) setErrorCarga(error.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const pendiente = vehiculos.find((v) => v.estadoHabilitacion === "pendiente");
  // Sin vehículos se muestra el formulario directamente; con alguno, a pedido.
  const mostrarFormulario = !pendiente && (formularioAbierto || vehiculos.length === 0);

  function abrirFormulario(vehiculo: Vehiculo | null) {
    setEditando(vehiculo);
    setDatos(
      vehiculo
        ? {
            placa: vehiculo.placa,
            marca: vehiculo.marca,
            linea: vehiculo.linea,
            modelo: String(vehiculo.modelo),
            color: vehiculo.color,
            numeroPuestos: String(vehiculo.numeroPuestos),
          }
        : DATOS_VACIOS,
    );
    setArchivos(ARCHIVOS_VACIOS);
    setErrorFormulario("");
    setMensaje("");
    setFormularioAbierto(true);
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setEditando(null);
    setDatos(DATOS_VACIOS);
    setArchivos(ARCHIVOS_VACIOS);
    setErrorFormulario("");
  }

  function cambiarDato(campo: keyof DatosVehiculo) {
    return (valor: string) => setDatos((actuales) => ({ ...actuales, [campo]: valor }));
  }

  async function elegirArchivo(tipo: TipoDocumento) {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: TIPOS_DOCUMENTO_PERMITIDOS,
      copyToCacheDirectory: true,
    });
    if (resultado.canceled) return;

    const asset = resultado.assets[0];
    const archivo: ArchivoDocumento = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
      file: asset.file,
    };
    setArchivos((actuales) => ({ ...actuales, [tipo]: archivo }));
  }

  async function enviar() {
    setErrorFormulario("");
    setEnviando(true);
    try {
      if (editando) {
        await reenviarSolicitud(editando, datos, archivos);
      } else {
        await registrarVehiculo(datos, archivos);
      }
      cerrarFormulario();
      setMensaje("Tu solicitud quedó pendiente. Un administrador revisará tus documentos.");
      await cargar();
    } catch (error) {
      setErrorFormulario((error as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function retirar(vehiculo: Vehiculo) {
    const ok = await confirmar(
      "Retirar solicitud",
      `¿Quieres retirar la solicitud del vehículo ${vehiculo.placa}? Podrás reenviarla después.`,
      "Retirar",
    );
    if (!ok) return;

    setMensaje("");
    try {
      await retirarSolicitud(vehiculo.id);
      setMensaje("Retiraste la solicitud.");
    } catch (error) {
      setMensaje((error as Error).message);
    }
    await cargar();
  }

  if (cargando) {
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
          refreshControl={<RefreshControl onRefresh={refrescar} refreshing={refrescando} />}
        >
          <Pressable accessibilityRole="link" onPress={() => router.back()}>
            <Text style={styles.backLink}>← Volver</Text>
          </Pressable>
          <Text style={styles.brand}>WHEEL-E</Text>
          <Text style={styles.title}>Mi vehículo</Text>
          <Text style={styles.description}>
            Registra tu vehículo y carga tus documentos para que un administrador te
            habilite como conductor.
          </Text>

          {errorCarga ? <Text style={styles.error}>{errorCarga}</Text> : null}
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}

          {vehiculos.map((vehiculo) => {
            const estado = ESTADOS[vehiculo.estadoHabilitacion];
            const corregible =
              vehiculo.estadoHabilitacion === "rechazado" || vehiculo.estadoHabilitacion === "cancelado";
            return (
              <View key={vehiculo.id} style={styles.tarjeta}>
                <View style={styles.tarjetaEncabezado}>
                  <Text style={styles.placa}>{vehiculo.placa}</Text>
                  <Text style={[styles.estado, { backgroundColor: estado.fondo, color: estado.color }]}>
                    {estado.texto}
                  </Text>
                </View>
                <Text style={styles.detalle}>
                  {vehiculo.marca} {vehiculo.linea} {vehiculo.modelo} · {vehiculo.color}
                </Text>
                <Text style={styles.detalle}>
                  {vehiculo.numeroPuestos} puestos · registrado el {formatearFecha(vehiculo.fechaRegistro)}
                </Text>
                {vehiculo.estadoHabilitacion === "rechazado" && vehiculo.motivoRechazo ? (
                  <Text style={styles.motivo}>Motivo: {vehiculo.motivoRechazo}</Text>
                ) : null}

                {vehiculo.estadoHabilitacion === "pendiente" ? (
                  <Boton onPress={() => retirar(vehiculo)} titulo="Retirar solicitud" variante="secundario" />
                ) : null}
                {corregible && !pendiente ? (
                  <Boton
                    onPress={() => abrirFormulario(vehiculo)}
                    titulo="Corregir y reenviar"
                    variante="secundario"
                  />
                ) : null}
              </View>
            );
          })}

          {pendiente ? (
            <Text style={styles.nota}>
              Tienes una solicitud pendiente. Podrás registrar otro vehículo cuando el
              administrador la resuelva.
            </Text>
          ) : null}

          {!pendiente && !mostrarFormulario ? (
            <Boton onPress={() => abrirFormulario(null)} titulo="Registrar otro vehículo" />
          ) : null}

          {mostrarFormulario ? (
            <View style={styles.formulario}>
              <Text style={styles.subtitulo}>
                {editando ? `Corregir ${editando.placa}` : "Registrar vehículo"}
              </Text>

              <CampoTexto
                autoCapitalize="characters"
                etiqueta="Placa"
                onChangeText={cambiarDato("placa")}
                placeholder="ABC123"
                value={datos.placa}
              />
              <CampoTexto
                etiqueta="Marca"
                onChangeText={cambiarDato("marca")}
                placeholder="Chevrolet"
                value={datos.marca}
              />
              <CampoTexto
                etiqueta="Línea"
                onChangeText={cambiarDato("linea")}
                placeholder="Spark GT"
                value={datos.linea}
              />
              <CampoTexto
                etiqueta="Modelo (año)"
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={cambiarDato("modelo")}
                placeholder="2018"
                value={datos.modelo}
              />
              <CampoTexto
                etiqueta="Color"
                onChangeText={cambiarDato("color")}
                placeholder="Gris"
                value={datos.color}
              />
              <CampoTexto
                etiqueta="Número de puestos para pasajeros"
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={cambiarDato("numeroPuestos")}
                placeholder="4"
                value={datos.numeroPuestos}
              />

              <Text style={styles.subtitulo}>Documentos</Text>
              <Text style={styles.ayuda}>PDF, JPG o PNG de máximo 5 MB.</Text>
              {(Object.keys(ETIQUETAS_DOCUMENTO) as TipoDocumento[]).map((tipo) => {
                const archivo = archivos[tipo];
                const yaCargado = Boolean(editando?.documentos);
                return (
                  <View key={tipo} style={styles.documento}>
                    <View style={styles.documentoTexto}>
                      <Text style={styles.documentoNombre}>{ETIQUETAS_DOCUMENTO[tipo]}</Text>
                      <Text numberOfLines={1} style={styles.documentoArchivo}>
                        {archivo
                          ? archivo.name
                          : yaCargado
                            ? "Se conserva el archivo anterior"
                            : `Falta cargar ${NOMBRES_DOCUMENTO[tipo]}`}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => elegirArchivo(tipo)}
                      style={styles.documentoBoton}
                    >
                      <Text style={styles.documentoBotonTexto}>{archivo ? "Cambiar" : "Elegir"}</Text>
                    </Pressable>
                  </View>
                );
              })}

              {errorFormulario ? <Text style={styles.error}>{errorFormulario}</Text> : null}

              <Boton
                cargando={enviando}
                onPress={enviar}
                titulo={editando ? "Reenviar solicitud" : "Enviar solicitud"}
                tituloCargando="Enviando..."
              />
              {vehiculos.length > 0 ? (
                <Boton
                  deshabilitado={enviando}
                  onPress={cerrarFormulario}
                  titulo="Cancelar"
                  variante="secundario"
                />
              ) : null}
            </View>
          ) : null}
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
  error: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 12 },
  mensaje: { color: colores.primario, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 12 },
  nota: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 16 },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  tarjetaEncabezado: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  placa: { color: colores.titulo, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  estado: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detalle: { color: colores.texto, fontSize: 14, marginTop: 6 },
  motivo: { color: colores.error, fontSize: 13, lineHeight: 18, marginTop: 8 },
  formulario: { marginTop: 16 },
  subtitulo: { color: colores.titulo, fontSize: 18, fontWeight: "800", marginTop: 18 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, marginTop: 4 },
  documento: {
    alignItems: "center",
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    padding: 12,
  },
  documentoTexto: { flex: 1, marginRight: 10 },
  documentoNombre: { color: colores.texto, fontSize: 14, fontWeight: "700" },
  documentoArchivo: { color: colores.textoSecundario, fontSize: 12, marginTop: 3 },
  documentoBoton: {
    borderColor: colores.primario,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  documentoBotonTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
});
