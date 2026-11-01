import type { StyleProp, ViewStyle } from "react-native";

import { colores } from "@/constants/colores";
import { CENTRO_MAPA } from "@/constants/config";
import type { Coordenada } from "@/types";

// Parte común de Mapa.tsx (WebView en el celular) y Mapa.web.tsx (iframe en
// web): la página de Leaflet + OpenStreetMap y los mensajes que intercambia.

// "partida" es el punto del pasajero (RF8) y "cercano", el punto de la ruta
// que pasa más cerca de él (RF9).
export type TipoPuntoMapa = "origen" | "parada" | "destino" | "partida" | "cercano";

export type PuntoMapa = {
  coordenadas: Coordenada;
  tipo: TipoPuntoMapa;
  etiqueta: string; // texto dentro del marcador: "A", "1", "B"...
};

export type PropsMapa = {
  puntos: PuntoMapa[];
  trazado?: Coordenada[];
  // Si es editable, tocar el mapa llama a `onTocar` y los marcadores se arrastran.
  editable?: boolean;
  onTocar?: (coordenada: Coordenada) => void;
  onMoverPunto?: (indice: number, coordenada: Coordenada) => void;
  // Radio de tolerancia alrededor del punto de partida, en metros.
  radioMetros?: number;
  style?: StyleProp<ViewStyle>;
};

// Lo que la app envía a la página cada vez que cambia algo.
export type EstadoMapa = {
  tipo: "estado";
  puntos: PuntoMapa[];
  trazado: Coordenada[];
  editable: boolean;
  radioMetros: number;
};

// Lo que la página envía a la app.
type MensajeMapa =
  | { tipo: "listo" }
  | { tipo: "error" }
  | { tipo: "toque"; latitud: number; longitud: number }
  | { tipo: "mover"; indice: number; latitud: number; longitud: number };

export function crearEstado(props: PropsMapa): EstadoMapa {
  return {
    tipo: "estado",
    puntos: props.puntos,
    trazado: props.trazado ?? [],
    editable: Boolean(props.editable),
    radioMetros: props.radioMetros ?? 0,
  };
}

type Manejadores = {
  onListo: () => void;
  onError: () => void;
  onTocar?: PropsMapa["onTocar"];
  onMoverPunto?: PropsMapa["onMoverPunto"];
};

export function manejarMensaje(datos: unknown, manejadores: Manejadores) {
  if (typeof datos !== "string") return;
  let mensaje: MensajeMapa;
  try {
    mensaje = JSON.parse(datos) as MensajeMapa;
  } catch {
    return;
  }

  switch (mensaje.tipo) {
    case "listo":
      manejadores.onListo();
      break;
    case "error":
      manejadores.onError();
      break;
    case "toque":
      manejadores.onTocar?.({ latitud: mensaje.latitud, longitud: mensaje.longitud });
      break;
    case "mover":
      manejadores.onMoverPunto?.(mensaje.indice, {
        latitud: mensaje.latitud,
        longitud: mensaje.longitud,
      });
      break;
  }
}

// Los mismos colores de las tarjetas de puntos del formulario.
const COLORES_PUNTO: Record<TipoPuntoMapa, string> = {
  origen: colores.primario,
  parada: colores.acento,
  destino: colores.primarioOscuro,
  partida: colores.info,
  cercano: colores.primario,
};

// Página del mapa. En el celular habla con la app por
// window.ReactNativeWebView.postMessage; en web, con window.parent.postMessage.
export const HTML_MAPA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html, body, #mapa { height: 100%; margin: 0; padding: 0; background: #E8EEEB; }
  .marca {
    align-items: center; border: 2px solid #FFFFFF; border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,.35); color: #FFFFFF; display: flex;
    font: 800 12px/1 -apple-system, system-ui, sans-serif; height: 24px;
    justify-content: center; width: 24px;
  }
  .marca-partida {
    box-shadow: 0 0 0 6px rgba(47,111,184,.22), 0 1px 4px rgba(0,0,0,.35);
    font-size: 11px; height: 28px; width: 28px;
  }
  .marca-cercano {
    background: #FFFFFF; border: 4px solid ${colores.primario}; border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,.35); height: 10px; width: 10px;
  }
</style>
</head>
<body>
<div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  "use strict";
  var COLORES = ${JSON.stringify(COLORES_PUNTO)};

  function enviar(mensaje) {
    var texto = JSON.stringify(mensaje);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(texto);
    else if (window.parent !== window) window.parent.postMessage(texto, "*");
  }

  if (typeof L === "undefined") {
    enviar({ tipo: "error" });
    return;
  }

  var mapa = L.map("mapa").setView([${CENTRO_MAPA.latitud}, ${CENTRO_MAPA.longitud}], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; colaboradores de OpenStreetMap"
  }).addTo(mapa);

  var capaExtras = L.layerGroup().addTo(mapa);
  var capaPuntos = L.layerGroup().addTo(mapa);
  var capaRuta = null;
  var ultimoRadio = 0;
  var habiaPartida = false;
  var ultimoTrazado = "";
  var primerEstado = true;
  var editable = false;

  mapa.on("click", function (e) {
    if (editable) enviar({ tipo: "toque", latitud: e.latlng.lat, longitud: e.latlng.lng });
  });

  function icono(punto) {
    if (punto.tipo === "cercano") {
      return L.divIcon({ className: "", html: '<div class="marca-cercano"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    }
    if (punto.tipo === "partida") {
      return L.divIcon({
        className: "",
        html: '<div class="marca marca-partida" style="background:' + COLORES.partida + '">' + punto.etiqueta + "</div>",
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }
    return L.divIcon({
      className: "",
      html: '<div class="marca" style="background:' + COLORES[punto.tipo] + '">' + punto.etiqueta + "</div>",
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  function dibujar(estado) {
    editable = estado.editable;
    capaPuntos.clearLayers();
    estado.puntos.forEach(function (punto, indice) {
      var marca = L.marker([punto.coordenadas.latitud, punto.coordenadas.longitud], {
        icon: icono(punto),
        draggable: editable && punto.tipo !== "cercano",
        keyboard: false
      });
      if (editable) {
        marca.on("dragend", function () {
          var posicion = marca.getLatLng();
          enviar({ tipo: "mover", indice: indice, latitud: posicion.lat, longitud: posicion.lng });
        });
      }
      marca.addTo(capaPuntos);
    });

    var partida = null;
    var cercano = null;
    estado.puntos.forEach(function (punto) {
      var posicion = [punto.coordenadas.latitud, punto.coordenadas.longitud];
      if (punto.tipo === "partida") partida = posicion;
      if (punto.tipo === "cercano") cercano = posicion;
    });

    // Radio de tolerancia y línea punteada hasta el punto más cercano de la ruta.
    capaExtras.clearLayers();
    var circulo = null;
    if (partida && estado.radioMetros > 0) {
      circulo = L.circle(partida, {
        radius: estado.radioMetros,
        color: "${colores.primario}",
        weight: 1.5,
        dashArray: "6 6",
        fillColor: "${colores.primario}",
        fillOpacity: 0.08,
        interactive: false
      }).addTo(capaExtras);
    }
    if (partida && cercano) {
      L.polyline([partida, cercano], {
        color: COLORES.partida,
        weight: 3,
        dashArray: "2 7",
        lineCap: "round",
        interactive: false
      }).addTo(capaExtras);
    }

    // La ruta solo se redibuja (y se encuadra) cuando cambia.
    var clave = JSON.stringify(estado.trazado);
    if (clave !== ultimoTrazado) {
      ultimoTrazado = clave;
      if (capaRuta) {
        mapa.removeLayer(capaRuta);
        capaRuta = null;
      }
      if (estado.trazado.length > 1) {
        capaRuta = L.polyline(
          estado.trazado.map(function (c) { return [c.latitud, c.longitud]; }),
          { color: "${colores.primario}", weight: 5, opacity: 0.85 }
        ).addTo(mapa);
        capaPuntos.eachLayer(function (capa) { capa.setZIndexOffset(1000); });
        var limites = capaRuta.getBounds();
        if (partida) limites.extend(partida);
        mapa.fitBounds(limites, { padding: [36, 36] });
      }
    }

    if (primerEstado && !capaRuta && estado.puntos.length > 0) {
      mapa.fitBounds(
        L.latLngBounds(estado.puntos.map(function (p) { return [p.coordenadas.latitud, p.coordenadas.longitud]; })),
        { padding: [48, 48], maxZoom: 15 }
      );
    }
    // Sin ruta, se encuadra el radio al marcar el punto o al cambiar el radio,
    // pero no al arrastrar el punto.
    if (!capaRuta && circulo && (!habiaPartida || estado.radioMetros !== ultimoRadio)) {
      mapa.fitBounds(circulo.getBounds(), { padding: [20, 20] });
    }
    ultimoRadio = estado.radioMetros;
    habiaPartida = Boolean(partida);
    primerEstado = false;
  }

  window.recibirEstado = dibujar;
  window.addEventListener("message", function (e) {
    try {
      var datos = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (datos && datos.tipo === "estado") dibujar(datos);
    } catch (error) {}
  });

  enviar({ tipo: "listo" });
})();
</script>
</body>
</html>`;
