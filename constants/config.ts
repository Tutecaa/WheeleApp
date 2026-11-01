// Valores de configuración de la app. Los que no fijan los requerimientos
// son provisionales: acordarlos con el equipo (contexto-proyecto.md, sección 17).

export const DOMINIOS_PERMITIDOS = ["uis.edu.co", "correo.uis.edu.co"] as const;

export const LONGITUD_MINIMA_CONTRASENA = 8;

// Documentos del vehículo. Deben coincidir con el bucket de 002_vehiculos_y_habilitacion.sql.
export const BUCKET_DOCUMENTOS_VEHICULOS = "documentos-vehiculos";
export const TAMANO_MAXIMO_DOCUMENTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const TIPOS_DOCUMENTO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];

// Rangos del vehículo (iguales a los checks de la tabla vehicles).
export const MODELO_VEHICULO_MINIMO = 1950;
export const PUESTOS_VEHICULO_MAXIMO = 50;

// Vigencia de los enlaces firmados para que el administrador vea un documento.
export const VIGENCIA_URL_DOCUMENTO_SEGUNDOS = 5 * 60;

// --- Viajes, mapa y rutas (RF4, RF5) ---

// Centro inicial del mapa: Bucaramanga.
export const CENTRO_MAPA = { latitud: 7.1193, longitud: -73.1227 } as const;

// Atajo para marcar el campus como origen o destino. Es el centro aproximado
// de la sede principal: el conductor puede arrastrar el punto si lo necesita.
export const CAMPUS_UIS = {
  nombre: "UIS · Campus principal",
  coordenadas: { latitud: 7.1401, longitud: -73.1212 },
} as const;

export const ORS_URL_DIRECCIONES =
  "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
export const ORS_TIEMPO_MAXIMO_MS = 15000;
// Espera antes de recalcular el trazado tras mover un punto, para no gastar
// la cuota de OpenRouteService con cada toque.
export const ESPERA_RECALCULO_TRAZADO_MS = 800;

// Provisionales: acordarlos con el equipo (contexto-proyecto.md, sección 17).
export const PARADAS_MAXIMAS = 5;
export const APORTE_SUGERIDO_MAXIMO = 50000; // pesos por pasajero
export const LONGITUD_MAXIMA_NOMBRE_LUGAR = 80; // igual que en 004_viajes.sql
export const LONGITUD_MAXIMA_MOTIVO_CANCELACION = 300; // igual que en 005_ajustes_viajes.sql

// Igual que en validate_trip (004_viajes.sql).
export const DISTANCIA_MINIMA_ORIGEN_DESTINO_METROS = 100;

// --- Búsqueda por proximidad (RF8) ---

// Radios de tolerancia que puede elegir el pasajero. Deben quedar dentro de
// los límites de search_trips (009_busqueda_proximidad.sql).
export const RADIOS_BUSQUEDA_METROS = [250, 500, 1000, 2000] as const;
export const RADIO_BUSQUEDA_POR_DEFECTO_METROS = 500;
export const RADIO_BUSQUEDA_MINIMO_METROS = 100;
export const RADIO_BUSQUEDA_MAXIMO_METROS = 5000;

// Franjas horarias rápidas, en minutos desde la medianoche. El pasajero
// también puede elegir la hora inicial y final a mano.
export const FRANJAS_HORARIAS = [
  { nombre: "Todo el día", desde: 0, hasta: 23 * 60 + 59 },
  { nombre: "Mañana", desde: 5 * 60, hasta: 12 * 60 },
  { nombre: "Tarde", desde: 12 * 60, hasta: 18 * 60 },
  { nombre: "Noche", desde: 18 * 60, hasta: 23 * 60 + 59 },
] as const;

// --- Foto de perfil (RF1, RF14) ---

// Debe coincidir con el bucket de 009_busqueda_proximidad.sql.
export const BUCKET_FOTOS_PERFIL = "fotos-perfil";
export const TAMANO_MAXIMO_FOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const TIPOS_FOTO_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

// --- Solicitudes de cupo (RF10, RF11, RF12) ---

// Deben coincidir con los checks de 006_solicitudes.sql.
export const LONGITUD_MAXIMA_MENSAJE_SOLICITUD = 200;
export const LONGITUD_MAXIMA_MOTIVO_RECHAZO_SOLICITUD = 200;
// Provisional: cancelar una reserva confirmada menos de estas horas antes de
// la salida queda registrado como "con poca antelación" (igual que en 006).
export const HORAS_CANCELACION_POCA_ANTELACION = 2;

// --- Iniciar y finalizar un viaje; calificaciones (RF13) ---

// Provisionales (contexto-proyecto.md, sección 17). Iguales que en 007_calificaciones.sql.
export const MINUTOS_ANTES_PARA_INICIAR_VIAJE = 30;
export const HORAS_DESPUES_PARA_INICIAR_VIAJE = 12;
export const DIAS_PLAZO_CALIFICAR = 7;
export const LONGITUD_MAXIMA_COMENTARIO_CALIFICACION = 300;

// --- Notificaciones (RF15) ---

// Provisional: el recordatorio llega esta cantidad de minutos antes de la
// salida (igual que en 008_notificaciones.sql).
export const MINUTOS_RECORDATORIO_SALIDA = 60;
// Cada cuánto se revisa si hay notificaciones nuevas con la app abierta.
export const INTERVALO_REVISAR_NOTIFICACIONES_MS = 45 * 1000;
