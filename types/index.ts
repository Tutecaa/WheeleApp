// --- TIPOS Y ENUMS AUXILIARES ---

// Es conductor quien tenga al menos un vehículo aprobado; no es un rol aparte.
export type RolUsuario = 'pasajero' | 'administrador';

export type EstadoUsuario = 'pendiente_confirmacion' | 'activo' | 'sancionado' | 'inactivo';

export type EstadoHabilitacionVehiculo = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

export type EstadoViaje = 'publicado' | 'en_curso' | 'finalizado' | 'cancelado';

export type EstadoSolicitudCupo = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';

export interface Coordenada {
  latitud: number;
  longitud: number;
}

export interface Ubicacion {
  nombre?: string;
  direccion?: string;
  coordenadas: Coordenada;
}

// Rutas de los archivos dentro del bucket privado `documentos-vehiculos`
// (<id_usuario>/<id_vehiculo>/<archivo>). Para verlos se pide una URL firmada.
export interface DocumentosVehiculo {
  soatPath: string;
  rtmPath: string; // Revisión Tecnomecánica
  licenciaConduccionPath: string;
}

// --- ENTIDADES PRINCIPALES ---
// Las fechas son cadenas ISO 8601, tal como las devuelve Supabase (timestamptz).

/**
 * RF1, RF2, RF14: Gestión de Usuarios e Identidad UIS
 */
export interface Usuario {
  id: string;
  nombreCompleto: string;
  codigoInstitucional: string;
  correoInstitucional: string; // @uis.edu.co o @correo.uis.edu.co
  programaAcademico: string;
  fotoPerfilUrl?: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  correoVerificado: boolean;
  promedioCalificacion: number; // 1.0 a 5.0; es 0 mientras no tenga calificaciones
  totalViajes: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * RF3, RF16: Registro de Vehículos y Habilitación de Conductores
 */
export interface Vehiculo {
  id: string;
  conductorId: string; // ID del usuario dueño del vehículo
  placa: string;
  marca: string;
  linea: string;
  modelo: number;
  color: string;
  numeroPuestos: number;
  documentos?: DocumentosVehiculo; // ausente si aún no se cargaron
  estadoHabilitacion: EstadoHabilitacionVehiculo;
  motivoRechazo?: string;
  revisadoPorAdminId?: string; // ID del Administrador que aprueba/rechaza
  fechaRegistro: string;
  fechaRevision?: string;
}

/**
 * RF5: Trazado del recorrido por las calles, tal como lo devuelve OpenRouteService.
 */
export interface TrazadoRuta {
  coordenadas: Coordenada[];
  distanciaMetros: number;
  duracionSegundos: number;
}

/**
 * RF4, RF5, RF6, RF7, RF8, RF9: Publicación, Rutas y Búsqueda de Viajes
 */
export interface Viaje {
  id: string;
  conductorId: string;
  vehiculoId: string;
  // Solo llega si quien consulta puede ver el vehículo (RLS).
  vehiculo?: Pick<Vehiculo, 'placa' | 'marca' | 'linea' | 'color'>;
  origen: Ubicacion;
  destino: Ubicacion;
  paradasIntermedias: Ubicacion[];
  trazadoRuta: Coordenada[]; // Secuencia de coordenadas devueltas por la API externa de rutas
  distanciaMetros: number;
  duracionSegundos: number;
  fechaHoraSalida: string;
  cuposTotales: number;
  cuposDisponibles: number;
  aporteSugerido: number;
  estado: EstadoViaje;
  motivoCancelacion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * RF10, RF11, RF12: Reserva, Solicitud y Cancelación de Cupos
 */
export interface SolicitudCupo {
  id: string;
  viajeId: string;
  pasajeroId: string;
  puntoPartidaPasajero: Ubicacion;
  distanciaProximidadMetros?: number; // Calculada respecto al trazado de la ruta
  mensajeOpcional?: string;
  estado: EstadoSolicitudCupo;
  fechaSolicitud: string;
  fechaRespuesta?: string;
}

/**
 * RF13: Calificaciones entre usuarios al finalizar un viaje
 */
export interface Calificacion {
  id: string;
  viajeId: string;
  evaluadorId: string; // ID del usuario que califica
  evaluadoId: string;   // ID del usuario calificado
  puntuacion: number;    // 1 a 5
  comentario?: string;
  fechaCreacion: string;
}
