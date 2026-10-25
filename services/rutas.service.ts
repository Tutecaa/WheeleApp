import { supabase } from "@/lib/supabase";
import { ORS_TIEMPO_MAXIMO_MS, ORS_URL_DIRECCIONES } from "@/constants/config";
import type { Coordenada, TrazadoRuta } from "@/types";

// RF5: trazado del recorrido por las calles con OpenRouteService.
// La llave va en `.env` (EXPO_PUBLIC_ORS_API_KEY).
const llave = process.env.EXPO_PUBLIC_ORS_API_KEY;

// Códigos de error de la API de direcciones de OpenRouteService.
const ORS_PUNTO_SIN_VIA = 2010;
const ORS_RUTA_NO_ENCONTRADA = 2009;
const ORS_LIMITE_EXCEDIDO = 2004;

type RespuestaOrs = {
  features?: {
    geometry?: { type?: string; coordinates?: unknown };
    properties?: { summary?: { distance?: unknown; duration?: unknown } };
  }[];
};

type ErrorOrs = { error?: { code?: number; message?: string } | string };

// Nombre del punto según su posición: 0 es el origen y el último el destino.
function nombrePunto(indice: number, total: number): string {
  if (indice === 0) return "El origen";
  if (indice === total - 1) return "El destino";
  return `La parada ${indice}`;
}

// Cuota agotada: se registra para avisar al administrador (RF5).
async function registrarErrorCuota(codigoHttp: number, mensaje: string) {
  try {
    await supabase.from("route_service_errors").insert({
      codigo_http: codigoHttp,
      mensaje: mensaje.slice(0, 300),
    });
  } catch {
    // Si tampoco se puede registrar, el usuario igual recibe el aviso.
  }
}

async function mensajeDeError(respuesta: Response, total: number): Promise<string> {
  let codigo: number | undefined;
  let detalle = "";
  try {
    const cuerpo = (await respuesta.json()) as ErrorOrs;
    if (typeof cuerpo.error === "string") {
      detalle = cuerpo.error;
    } else {
      codigo = cuerpo.error?.code;
      detalle = cuerpo.error?.message ?? "";
    }
  } catch {
    // Respuesta sin JSON: se decide solo por el código HTTP.
  }

  if (respuesta.status === 401 || respuesta.status === 403) {
    return "El servicio de rutas rechazó la llave de acceso. Avisa al equipo de WHEEL-E.";
  }
  if (respuesta.status === 429) {
    await registrarErrorCuota(respuesta.status, detalle || "Cuota de OpenRouteService agotada.");
    return "Se agotó por ahora la cuota del servicio de rutas. Ya quedó registrado para el administrador; intenta más tarde.";
  }
  if (codigo === ORS_PUNTO_SIN_VIA) {
    // El mensaje dice "... of specified coordinate N: ...", con N desde 0.
    const indice = Number(/coordinate (\d+)/.exec(detalle)?.[1]);
    const punto = Number.isInteger(indice) ? nombrePunto(indice, total) : "Uno de los puntos";
    return `${punto} no está sobre una vía por la que se pueda conducir. Muévelo a una calle cercana.`;
  }
  if (codigo === ORS_RUTA_NO_ENCONTRADA) {
    return "No se encontró una ruta en carro entre los puntos. Ajústalos e intenta de nuevo.";
  }
  if (codigo === ORS_LIMITE_EXCEDIDO) {
    return "El recorrido es demasiado largo para el servicio de rutas. Acorta el viaje.";
  }
  return "El servicio de rutas no respondió bien. Intenta de nuevo en un momento.";
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

// Se descarta cualquier respuesta incompleta o con formato inesperado (RF5).
function leerTrazado(datos: RespuestaOrs): TrazadoRuta | null {
  const ruta = datos.features?.[0];
  const coordenadas = ruta?.geometry?.coordinates;
  const resumen = ruta?.properties?.summary;
  if (ruta?.geometry?.type !== "LineString" || !Array.isArray(coordenadas) || coordenadas.length < 2) {
    return null;
  }
  if (!esNumero(resumen?.distance) || !esNumero(resumen?.duration) || resumen.distance <= 0) {
    return null;
  }

  const puntos: Coordenada[] = [];
  for (const par of coordenadas) {
    if (!Array.isArray(par) || !esNumero(par[0]) || !esNumero(par[1])) return null;
    // GeoJSON usa [longitud, latitud].
    puntos.push({ latitud: par[1], longitud: par[0] });
  }

  return {
    coordenadas: puntos,
    distanciaMetros: Math.round(resumen.distance),
    duracionSegundos: Math.round(resumen.duration),
  };
}

// Pide el trazado para los puntos en orden: origen, paradas y destino.
export async function obtenerTrazado(puntos: Coordenada[]): Promise<TrazadoRuta> {
  if (!llave) {
    throw new Error("Falta configurar la llave de OpenRouteService (EXPO_PUBLIC_ORS_API_KEY).");
  }
  if (puntos.length < 2) {
    throw new Error("Marca el origen y el destino para trazar la ruta.");
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), ORS_TIEMPO_MAXIMO_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(ORS_URL_DIRECCIONES, {
      method: "POST",
      headers: {
        Accept: "application/geo+json, application/json",
        Authorization: llave,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: puntos.map((punto) => [punto.longitud, punto.latitud]),
        // Solo se necesita la geometría y el resumen, no las indicaciones.
        instructions: false,
      }),
      signal: control.signal,
    });
  } catch {
    throw new Error(
      control.signal.aborted
        ? "El servicio de rutas tardó demasiado en responder. Intenta de nuevo."
        : "No se pudo contactar el servicio de rutas. Revisa tu conexión e intenta de nuevo.",
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    throw new Error(await mensajeDeError(respuesta, puntos.length));
  }

  let trazado: TrazadoRuta | null = null;
  try {
    trazado = leerTrazado((await respuesta.json()) as RespuestaOrs);
  } catch {
    // JSON inválido: se trata igual que una respuesta incompleta.
  }
  if (!trazado) {
    throw new Error("La respuesta del servicio de rutas llegó incompleta. Intenta de nuevo.");
  }
  return trazado;
}

// Clave de un recorrido: si no cambia, no hace falta volver a pedir el trazado (RF5).
export function claveRecorrido(puntos: Coordenada[]): string {
  return puntos.map((punto) => `${punto.latitud.toFixed(6)},${punto.longitud.toFixed(6)}`).join(";");
}
