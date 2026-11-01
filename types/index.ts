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
  fotoPerfilUrl?: string; // URL pública de la foto, si el usuario subió una
  rol: RolUsuario;
  estado: EstadoUsuario;
  correoVerificado: boolean;
  promedioCalificacion: number; // 1.0 a 5.0; es 0 mientras no tenga calificaciones
  totalViajes: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * RF14: Lo que cualquier usuario puede ver de otro. Nunca incluye el correo,
 * el código institucional ni datos de contacto.
 */
export interface PerfilPublico {
  id: string;
  nombreCompleto: string;
  programaAcademico: string;
  fotoPerfilUrl?: string;
  promedioCalificacion: number; // 0 mientras no tenga calificaciones
  totalViajes: number;
  viajesPublicados: number;
  esConductor: boolean; // tiene un vehículo aprobado
  miembroDesde: string;
}

// Una persona tal como se muestra en una tarjeta: el conductor en un resultado
// o en el detalle de un viaje, o el pasajero en una solicitud.
export type ResumenPersona = Pick<
  PerfilPublico,
  'id' | 'nombreCompleto' | 'fotoPerfilUrl' | 'promedioCalificacion'
> &
  Partial<Pick<PerfilPublico, 'programaAcademico' | 'totalViajes'>>;

export type ConductorViaje = ResumenPersona;

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
  // La placa solo llega al conductor y al administrador; el pasajero ve la
  // marca, la línea y el color para reconocer el carro.
  vehiculo?: Pick<Vehiculo, 'marca' | 'linea' | 'color'> & { placa?: string };
  // Datos públicos del conductor (RF9). Llegan en el detalle del viaje.
  conductor?: ConductorViaje;
  // Qué tan cerca pasa la ruta del punto de partida del pasajero (RF9).
  proximidad?: Proximidad;
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
 * RF8, RF9: Distancia en línea recta entre el punto de partida del pasajero
 * y el trazado, y el punto de la ruta donde se da.
 */
export interface Proximidad {
  distanciaMetros: number;
  puntoCercano: Coordenada;
}

/**
 * RF8: Un viaje que pasa cerca del punto de partida del pasajero.
 */
export interface ResultadoBusqueda {
  id: string;
  conductor: ConductorViaje;
  origenNombre?: string;
  destinoNombre?: string;
  numeroParadas: number;
  fechaHoraSalida: string;
  cuposTotales: number;
  cuposDisponibles: number;
  aporteSugerido: number;
  distanciaMetros: number;
  duracionSegundos: number;
  distanciaProximidadMetros: number;
}

/**
 * RF7: Un viaje en la lista de "Mis viajes", sin el trazado.
 */
export type RolEnViaje = 'conductor' | 'pasajero';

export interface ResumenViaje {
  id: string;
  rol: RolEnViaje;
  origenNombre?: string;
  destinoNombre?: string;
  numeroParadas: number;
  fechaHoraSalida: string;
  cuposTotales: number;
  cuposDisponibles: number;
  aporteSugerido: number;
  distanciaMetros: number;
  duracionSegundos: number;
  estado: EstadoViaje;
  // Como conductor: solicitudes que esperan respuesta (RF11).
  solicitudesPendientes?: number;
  // Como pasajero: la solicitud o reserva en ese viaje y su conductor (RF10, RF12).
  solicitud?: SolicitudCupo;
  conductor?: ResumenPersona;
  // Solo con la reserva confirmada, para reconocer el carro.
  placaVehiculo?: string;
}

/**
 * RF10, RF11, RF12: Reserva, Solicitud y Cancelación de Cupos
 */
// 'viaje' si se cerró porque el conductor canceló el viaje.
export type CanceladaPor = 'pasajero' | 'viaje';

export interface SolicitudCupo {
  id: string;
  viajeId: string;
  pasajeroId?: string;
  puntoPartida?: Coordenada; // Con el que el pasajero encontró el viaje
  distanciaProximidadMetros?: number; // Calculada respecto al trazado de la ruta
  mensaje?: string;
  estado: EstadoSolicitudCupo;
  motivoRechazo?: string;
  canceladaPor?: CanceladaPor;
  canceladaConPocaAntelacion?: boolean;
  fechaSolicitud: string;
  fechaRespuesta?: string;
}

// RF11: una solicitud recibida por el conductor, con el perfil público del pasajero.
export interface SolicitudRecibida extends SolicitudCupo {
  pasajero: ResumenPersona;
}

// RF11: las solicitudes agrupadas por viaje.
export interface ViajeConSolicitudes {
  viajeId: string;
  origenNombre?: string;
  destinoNombre?: string;
  fechaHoraSalida: string;
  cuposTotales: number;
  cuposDisponibles: number;
  estado: EstadoViaje;
  solicitudes: SolicitudRecibida[];
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

/**
 * RF13: Una persona que el usuario puede calificar en un viaje finalizado.
 */
export interface PersonaPorCalificar {
  persona: ResumenPersona;
  rol: RolEnViaje; // el rol que tuvo esa persona en el viaje
  // La calificación que ya le dio el usuario, si existe.
  puntuacion?: number;
  comentario?: string;
}

export interface ViajePorCalificar {
  viajeId: string;
  origenNombre?: string;
  destinoNombre?: string;
  fechaHoraSalida: string;
  estado: EstadoViaje;
  // Hasta cuándo se puede calificar (fecha de finalización + plazo).
  plazoHasta?: string;
  personas: PersonaPorCalificar[];
}

/**
 * RF14: Un comentario recibido, como se ve en el perfil público.
 */
export interface Resena {
  id: string;
  puntuacion: number;
  comentario?: string;
  fecha: string;
  evaluador: Pick<ResumenPersona, 'id' | 'nombreCompleto' | 'fotoPerfilUrl'>;
  rolEvaluador: RolEnViaje;
}

/**
 * RF15: Notificaciones dentro de la app.
 */
export type TipoNotificacion =
  | 'solicitud_nueva'
  | 'solicitud_aceptada'
  | 'solicitud_rechazada'
  | 'solicitud_retirada'
  | 'reserva_cancelada'
  | 'viaje_cancelado'
  | 'viaje_modificado'
  | 'recordatorio_salida'
  | 'calificacion_disponible'
  | 'habilitacion_aprobada'
  | 'habilitacion_rechazada';

// Datos del evento con los que la app arma el texto.
export interface DatosNotificacion {
  origen?: string | null;
  destino?: string | null;
  salida?: string;
  salida_anterior?: string;
  pasajero?: string;
  mensaje?: string | null;
  motivo?: string | null;
  poca_antelacion?: boolean;
  placa?: string;
  rol?: RolEnViaje;
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  viajeId?: string;
  solicitudId?: string;
  vehiculoId?: string;
  datos: DatosNotificacion;
  leida: boolean;
  fecha: string;
}
