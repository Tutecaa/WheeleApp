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
