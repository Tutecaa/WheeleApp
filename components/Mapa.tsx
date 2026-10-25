import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { colores } from "@/constants/colores";
import { crearEstado, HTML_MAPA, manejarMensaje, type PropsMapa } from "@/components/mapaLeaflet";

export type { PuntoMapa, PropsMapa } from "@/components/mapaLeaflet";

// Mapa OSM con Leaflet dentro de un WebView. En web se usa Mapa.web.tsx.
export function Mapa(props: PropsMapa) {
  // react-native-webview declara sus props como `WebViewProps & P` con
  // P = undefined, que con los tipos de React 19.3 queda en `never`. Por eso
  // se indica P = object aquí y en el JSX.
  const webView = useRef<WebView<object>>(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Los manejadores cambian en cada render; el WebView siempre usa los últimos.
  const manejadores = useRef(props);
  const estado = JSON.stringify(crearEstado(props));
  const ultimoEstado = useRef(estado);
  useEffect(() => {
    manejadores.current = props;
    ultimoEstado.current = estado;
  });

  function enviarEstado(texto: string) {
    webView.current?.injectJavaScript(`window.recibirEstado(${texto}); true;`);
  }

  // Si la página se recarga, vuelve a avisar que está lista y recibe el estado actual.
  function alEstarListo() {
    setListo(true);
    enviarEstado(ultimoEstado.current);
  }

  useEffect(() => {
    if (listo) enviarEstado(estado);
  }, [estado, listo]);

  function alRecibirMensaje(evento: WebViewMessageEvent) {
    manejarMensaje(evento.nativeEvent.data, {
      onListo: alEstarListo,
      onError: () => setFallo(true),
      onTocar: (coordenada) => manejadores.current.onTocar?.(coordenada),
      onMoverPunto: (indice, coordenada) => manejadores.current.onMoverPunto?.(indice, coordenada),
    });
  }

  return (
    <View style={[styles.contenedor, props.style]}>
      <WebView<object>
        ref={webView}
        // baseUrl da a la página un origen https, así los mosaicos de
        // OpenStreetMap se piden con un Referer válido.
        source={{ html: HTML_MAPA, baseUrl: "https://wheel-e.app/" }}
        originWhitelist={["*"]}
        onMessage={alRecibirMensaje}
        onError={() => setFallo(true)}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        style={styles.webView}
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
  webView: { backgroundColor: "#E8EEEB", flex: 1 },
  cubierta: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "#E8EEEB",
    justifyContent: "center",
    padding: 24,
  },
  aviso: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
