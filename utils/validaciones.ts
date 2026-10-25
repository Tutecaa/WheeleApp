import {
  APORTE_SUGERIDO_MAXIMO,
  DISTANCIA_MINIMA_ORIGEN_DESTINO_METROS,
  DOMINIOS_PERMITIDOS,
  LONGITUD_MINIMA_CONTRASENA,
  MODELO_VEHICULO_MINIMO,
  PUESTOS_VEHICULO_MAXIMO,
  TAMANO_MAXIMO_DOCUMENTO_BYTES,
  TIPOS_DOCUMENTO_PERMITIDOS,
} from "@/constants/config";
import type { Coordenada } from "@/types";

const dominios = DOMINIOS_PERMITIDOS.map((dominio) => dominio.replace(/\./g, "\\.")).join("|");

export const INSTITUTIONAL_EMAIL_PATTERN = new RegExp(`^[^\\s@]+@(${dominios})$`, "i");

export function isInstitutionalEmail(email: string): boolean {
  return INSTITUTIONAL_EMAIL_PATTERN.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (password.length < LONGITUD_MINIMA_CONTRASENA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`;
  }

  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type DatosVehiculo = {
  placa: string;
  marca: string;
  linea: string;
  modelo: string;
  color: string;
  numeroPuestos: string;
};

export function normalizarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

export function validarVehiculo(datos: DatosVehiculo): string | null {
  const placa = normalizarPlaca(datos.placa);
  if (placa.length < 5 || placa.length > 8) {
    return "Escribe una placa válida (por ejemplo ABC123).";
  }

  if (!datos.marca.trim()) return "Escribe la marca del vehículo.";
  if (!datos.linea.trim()) return "Escribe la línea del vehículo.";

  const modelo = Number(datos.modelo);
  const modeloMaximo = new Date().getFullYear() + 1;
  if (!Number.isInteger(modelo) || modelo < MODELO_VEHICULO_MINIMO || modelo > modeloMaximo) {
    return `El modelo debe ser un año entre ${MODELO_VEHICULO_MINIMO} y ${modeloMaximo}.`;
  }

  if (!datos.color.trim()) return "Escribe el color del vehículo.";

  const puestos = Number(datos.numeroPuestos);
  if (!Number.isInteger(puestos) || puestos < 1 || puestos > PUESTOS_VEHICULO_MAXIMO) {
    return "Escribe un número de puestos válido.";
  }

  return null;
}

export function validarDocumento(
  nombre: string,
  archivo: { mimeType?: string; size?: number } | null,
): string | null {
  if (!archivo) {
    return `Falta cargar ${nombre}.`;
  }

  if (!archivo.mimeType || !TIPOS_DOCUMENTO_PERMITIDOS.includes(archivo.mimeType)) {
    return `${nombre}: solo se admiten archivos PDF, JPG o PNG.`;
  }

  if (archivo.size !== undefined && archivo.size > TAMANO_MAXIMO_DOCUMENTO_BYTES) {
    const megas = TAMANO_MAXIMO_DOCUMENTO_BYTES / (1024 * 1024);
    return `${nombre}: el archivo supera el máximo de ${megas} MB.`;
  }

  return null;
}

// Distancia en línea recta entre dos puntos (fórmula del haversine), en metros.
export function distanciaEntre(a: Coordenada, b: Coordenada): number {
  const radioTierra = 6371000;
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * radioTierra * Math.asin(Math.sqrt(h));
}

// RF4: origen y destino marcados y en lugares distintos.
export function validarPuntosViaje(origen: Coordenada | null, destino: Coordenada | null): string | null {
  if (!origen) return "Marca el origen del viaje en el mapa.";
  if (!destino) return "Marca el destino del viaje en el mapa.";
  if (distanciaEntre(origen, destino) < DISTANCIA_MINIMA_ORIGEN_DESTINO_METROS) {
    return "El origen y el destino están en el mismo lugar. Corrige los puntos.";
  }
  return null;
}

export type DatosSalidaViaje = {
  fechaHoraSalida: Date | null;
  cupos: string;
  aporte: string;
};

// RF4: fecha futura, cupos dentro de la capacidad del vehículo y aporte válido.
export function validarSalidaViaje(datos: DatosSalidaViaje, puestosVehiculo: number): string | null {
  if (!datos.fechaHoraSalida) return "Elige la fecha y la hora de salida.";
  if (datos.fechaHoraSalida.getTime() <= Date.now()) {
    return "La fecha y hora de salida ya pasaron. Elige una futura.";
  }

  const cupos = Number(datos.cupos);
  if (!datos.cupos.trim() || !Number.isInteger(cupos) || cupos < 1 || cupos > puestosVehiculo) {
    return `Los cupos deben estar entre 1 y ${puestosVehiculo}, los puestos del vehículo.`;
  }

  const aporte = datos.aporte.trim() ? Number(datos.aporte) : 0;
  if (!Number.isInteger(aporte) || aporte < 0 || aporte > APORTE_SUGERIDO_MAXIMO) {
    return `El aporte sugerido debe ser un valor entre $0 y $${APORTE_SUGERIDO_MAXIMO.toLocaleString("es-CO")}.`;
  }

  return null;
}
