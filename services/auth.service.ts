import * as Linking from "expo-linking";
import type { AuthError, Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import {
  isInstitutionalEmail,
  normalizeEmail,
  validatePassword,
} from "@/utils/validaciones";

type SignUpInput = {
  fullName: string;
  institutionalCode: string;
  email: string;
  academicProgram: string;
  password: string;
};

// Tipo de enlace que llega por correo; `auth/callback` lo usa para saber
// qué mensaje mostrar si no puede canjear el código.
export type TipoEnlace = "confirmacion" | "recuperacion";

// Se lanza cuando la cuenta existe pero no ha confirmado el correo, para que
// la pantalla ofrezca reenviar la confirmación.
export class CorreoSinConfirmarError extends Error {
  constructor() {
    super("Confirma tu correo institucional antes de iniciar sesión.");
    this.name = "CorreoSinConfirmarError";
  }
}

function getAuthRedirectUrl(tipo: TipoEnlace): string {
  return Linking.createURL("auth/callback", { queryParams: { tipo } });
}

// Convierte los errores de Supabase Auth en mensajes en español.
function traducirError(error: AuthError): string {
  const mensaje = error.message.toLowerCase();

  if (error.code === "user_already_exists" || mensaje.includes("already registered")) {
    return "Este correo ya está registrado. Si olvidaste tu contraseña, recupérala desde el inicio de sesión.";
  }
  if (error.code === "unexpected_failure" || mensaje.includes("database error saving new user")) {
    return "No se pudo crear la cuenta. Revisa que tu código institucional no esté registrado en otra cuenta.";
  }
  if (error.name === "AuthSessionMissingError" || mensaje.includes("session missing")) {
    return "El enlace expiró. Solicita uno nuevo.";
  }
  if (error.code === "same_password") {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }
  if (error.code === "weak_password") {
    return "La contraseña es muy débil. Usa una más larga o con más variedad de caracteres.";
  }
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    mensaje.includes("rate limit")
  ) {
    return "Hiciste demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  }

  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

function assertRegistrationInput(input: SignUpInput): string | null {
  if (input.fullName.trim().length < 3) {
    return "Escribe tu nombre completo.";
  }

  if (!input.institutionalCode.trim()) {
    return "Escribe tu código institucional.";
  }

  if (!isInstitutionalEmail(input.email)) {
    return "Solo se admiten correos de la UIS (@uis.edu.co o @correo.uis.edu.co).";
  }

  if (!input.academicProgram.trim()) {
    return "Escribe tu programa académico.";
  }

  return validatePassword(input.password);
}

export async function signUp(input: SignUpInput) {
  const validationError = assertRegistrationInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(input.email),
    password: input.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl("confirmacion"),
      data: {
        nombre_completo: input.fullName.trim(),
        codigo_institucional: input.institutionalCode.trim(),
        programa_academico: input.academicProgram.trim(),
      },
    },
  });

  if (error) {
    throw new Error(traducirError(error));
  }

  // Con la confirmación por correo activa, Supabase no devuelve error si el
  // correo ya tiene una cuenta confirmada: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(
      "Este correo ya está registrado. Si olvidaste tu contraseña, recupérala desde el inicio de sesión.",
    );
  }

  return {
    session: data.session,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (!isInstitutionalEmail(email)) {
    throw new Error("Usa el correo institucional con el que te registraste.");
  }

  if (!password) {
    throw new Error("Escribe tu contraseña.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) {
    if (
      error.code === "email_not_confirmed" ||
      error.message.toLowerCase().includes("email not confirmed")
    ) {
      throw new CorreoSinConfirmarError();
    }
    if (error.status === 429) {
      throw new Error(traducirError(error));
    }
    // Mensaje genérico: no se dice cuál de los dos datos falló (RF2).
    throw new Error("No pudimos iniciar sesión. Revisa tus credenciales.");
  }

  if (!data.session) {
    throw new Error("No se pudo iniciar la sesión.");
  }

  return data.session;
}

export async function reenviarConfirmacion(email: string): Promise<void> {
  if (!isInstitutionalEmail(email)) {
    throw new Error("Escribe tu correo institucional.");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizeEmail(email),
    options: { emailRedirectTo: getAuthRedirectUrl("confirmacion") },
  });

  if (error) {
    throw new Error(traducirError(error));
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isInstitutionalEmail(email)) {
    throw new Error("Escribe un correo @uis.edu.co o @correo.uis.edu.co.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: getAuthRedirectUrl("recuperacion"),
  });

  if (error) {
    throw new Error(traducirError(error));
  }
}

export async function updatePassword(password: string): Promise<void> {
  const validationError = validatePassword(password);
  if (validationError) {
    throw new Error(validationError);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(traducirError(error));
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error("No se pudo recuperar la sesión.");
  }
  return data.session;
}

export function subscribeToAuthChanges(
  callback: (session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("No se pudo cerrar la sesión.");
  }
}
