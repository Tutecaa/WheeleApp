import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colores } from "@/constants/colores";
import { crearEstado, HTML_MAPA, manejarMensaje, type PropsMapa } from "@/components/mapaLeaflet";

export type { PuntoMapa, PropsMapa } from "@/components/mapaLeaflet";

// Versión web de Mapa.tsx: react-native-webview no funciona en el navegador,
// así que la misma página de Leaflet se carga en un iframe.
export function Mapa(props: PropsMapa) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);

  const manejadores = useRef(props);
  const estado = JSON.stringify(crearEstado(props));
  const ultimoEstado = useRef(estado);
  useEffect(() => {
    manejadores.current = props;
    ultimoEstado.current = estado;
  });

  function enviarEstado(texto: string) {
    iframe.current?.contentWindow?.postMessage(texto, "*");
  }

  useEffect(() => {
    function alRecibirMensaje(evento: MessageEvent) {
      // Solo mensajes de este mapa (puede haber más de uno en pantalla).
      if (evento.source !== iframe.current?.contentWindow) return;
      manejarMensaje(evento.data, {
        // Si la página se recarga, vuelve a avisar que está lista y recibe el estado actual.
        onListo: () => {
          setListo(true);
          iframe.current?.contentWindow?.postMessage(ultimoEstado.current, "*");
        },
        onError: () => setFallo(true),
        onTocar: (coordenada) => manejadores.current.onTocar?.(coordenada),
        onMoverPunto: (indice, coordenada) => manejadores.current.onMoverPunto?.(indice, coordenada),
      });
    }
    window.addEventListener("message", alRecibirMensaje);
    return () => window.removeEventListener("message", alRecibirMensaje);
  }, []);

  useEffect(() => {
    if (listo) enviarEstado(estado);
  }, [estado, listo]);

  return (
    <View style={[styles.contenedor, props.style]}>
      <iframe
        ref={iframe}
        srcDoc={HTML_MAPA}
        style={{ border: 0, height: "100%", width: "100%" }}
        title="Mapa"
      />
      {!listo || fallo ? (
        <View style={styles.cubierta}>
          {fallo ? (
            <Text style={styles.aviso}>No se pudo cargar el mapa. Revisa tu conexión a internet.</Text>
          ) : (
            <ActivityIndicator color={colores.primario} />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { backgroundColor: "#E8EEEB", overflow: "hidden" },
  cubierta: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "#E8EEEB",
    justifyContent: "center",
    padding: 24,
  },
  aviso: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
