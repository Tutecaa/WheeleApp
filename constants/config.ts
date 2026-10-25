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

// Igual que en validate_trip (004_viajes.sql).
export const DISTANCIA_MINIMA_ORIGEN_DESTINO_METROS = 100;
