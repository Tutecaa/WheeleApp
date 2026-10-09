export const INSTITUTIONAL_EMAIL_PATTERN =
  /^[^\s@]+@(uis\.edu\.co|correo\.uis\.edu\.co)$/i;

export function isInstitutionalEmail(email: string): boolean {
  return INSTITUTIONAL_EMAIL_PATTERN.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
