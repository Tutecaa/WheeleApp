import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentSession, subscribeToAuthChanges } from "@/services/auth.service";

type EstadoSesion = {
  session: Session | null;
  cargando: boolean;
};

const SesionContext = createContext<EstadoSesion>({ session: null, cargando: true });

// Carga la sesión una sola vez y la comparte con todas las pantallas.
export function SesionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    getCurrentSession()
      .then((actual) => {
        if (isMounted) setSession(actual);
      })
      .catch(() => {
        if (isMounted) setSession(null);
      })
      .finally(() => {
        if (isMounted) setCargando(false);
      });

    const { data } = subscribeToAuthChanges((nueva) => {
      if (isMounted) setSession(nueva);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return createElement(SesionContext.Provider, { value: { session, cargando } }, children);
}

export function useSesion(): EstadoSesion {
  return useContext(SesionContext);
}
