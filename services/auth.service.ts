import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";

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

function getAuthRedirectUrl(): string {
  return Linking.createURL("auth/callback");
}

function assertRegistrationInput(input: SignUpInput): string | null {
  if (input.fullName.trim().length < 3) {
    return "Escribe tu nombre completo.";
  }

  if (!input.institutionalCode.trim()) {
    return "Escribe tu código institucional.";
  }

  if (!isInstitutionalEmail(input.email)) {
    return "Usa un correo @uis.edu.co o @correo.uis.edu.co.";
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
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        nombre_completo: input.fullName.trim(),
        codigo_institucional: input.institutionalCode.trim(),
        programa_academico: input.academicProgram.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
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
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error("Confirma tu correo institucional antes de iniciar sesión.");
    }
    throw new Error("No pudimos iniciar sesión. Revisa tus credenciales.");
  }

  if (!data.session) {
    throw new Error("No se pudo iniciar la sesión.");
  }

  return data.session;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isInstitutionalEmail(email)) {
    throw new Error("Escribe un correo @uis.edu.co o @correo.uis.edu.co.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: getAuthRedirectUrl(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(password: string): Promise<void> {
  const validationError = validatePassword(password);
  if (validationError) {
    throw new Error(validationError);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
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
