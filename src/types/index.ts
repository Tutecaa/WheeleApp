// --- TIPOS Y ENUMS AUXILIARES ---

export type RolUsuario = 'pasajero' | 'conductor' | 'administrador';

export type EstadoUsuario = 'pendiente_confirmacion' | 'activo' | 'sancionado' | 'inactivo';

export type EstadoHabilitacionVehiculo = 'pendiente' | 'aprobado' | 'rechazado';

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

export interface DocumentosVehiculo {
  soatUrl: string;
  rtmUrl: string; // Revisión Tecnomecánica
  licenciaConduccionUrl: string;
}

// --- ENTIDADES PRINCIPALES ---

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
  promedioCalificacion: number; // 1.0 a 5.0
  totalViajes: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

/**
 * RF3, RF16: Registro de Vehículos y Habilitación de Conductores
 */
export interface Vehiculo {
  id: string;
  conductorId: string; // ID del Usuario con rol Conductor
  placa: string;
  marca: string;
  linea: string;
  modelo: number;
  color: string;
  numeroPuestos: number;
  documentos: DocumentosVehiculo;
  estadoHabilitacion: EstadoHabilitacionVehiculo;
  motivoRechazo?: string;
  revisadoPorAdminId?: string; // ID del Administrador que aprueba/rechaza
  fechaRegistro: Date;
  fechaRevision?: Date;
}

/**
 * RF4, RF5, RF6, RF7, RF8, RF9: Publicación, Rutas y Búsqueda de Viajes
 */
export interface Viaje {
  id: string;
  conductorId: string;
  vehiculoId: string;
  origen: Ubicacion;
  destino: Ubicacion;
  paradasIntermedias?: Ubicacion[];
  trazadoRuta: Coordenada[]; // Secuencia de coordenadas devueltas por la API externa de rutas
  fechaHoraSalida: Date;
  franjaHoraria: {
    inicio: Date;
    fin: Date;
  };
  cuposTotales: number;
  cuposDisponibles: number;
  aporteSugerido: number;
  estado: EstadoViaje;
  motivoCancelacion?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
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
  fechaSolicitud: Date;
  fechaRespuesta?: Date;
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
  fechaCreacion: Date;
}
