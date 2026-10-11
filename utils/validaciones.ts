import {
  DOMINIOS_PERMITIDOS,
  LONGITUD_MINIMA_CONTRASENA,
  MODELO_VEHICULO_MINIMO,
  PUESTOS_VEHICULO_MAXIMO,
  TAMANO_MAXIMO_DOCUMENTO_BYTES,
  TIPOS_DOCUMENTO_PERMITIDOS,
} from "@/constants/config";

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
