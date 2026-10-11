import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentSession, signOut, subscribeToAuthChanges } from "@/services/auth.service";
import { obtenerMiPerfil } from "@/services/perfiles.service";
import type { EstadoUsuario, Usuario } from "@/types";

type EstadoSesion = {
  session: Session | null;
  perfil: Usuario | null;
  cargando: boolean;
  // Mensaje para el login cuando se cerró la sesión de una cuenta bloqueada.
  aviso: string;
  limpiarAviso: () => void;
  recargarPerfil: () => Promise<void>;
};

// Solo una cuenta activa puede usar la app (RF2).
const MENSAJES_CUENTA_BLOQUEADA: Partial<Record<EstadoUsuario, string>> = {
  sancionado: "Tu cuenta está suspendida. Comunícate con la administración de WHEEL-E.",
  inactivo: "Tu cuenta está inactiva. Comunícate con la administración de WHEEL-E.",
};

const SesionContext = createContext<EstadoSesion>({
  session: null,
  perfil: null,
  cargando: true,
  aviso: "",
  limpiarAviso: () => {},
  recargarPerfil: async () => {},
});

// Carga la sesión una sola vez, verifica el estado del perfil y la comparte
// con todas las pantallas. La sesión solo se expone cuando el perfil está
// activo, así el layout raíz nunca muestra pantallas protegidas a una
// cuenta suspendida.
export function SesionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(isSupabaseConfigured);
  const [aviso, setAviso] = useState("");
  const usuarioVerificado = useRef<string | null>(null);

  async function recargarPerfil() {
    try {
      setPerfil(await obtenerMiPerfil());
    } catch {
      // Se conserva el perfil anterior; la pantalla puede reintentar.
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    // Los cambios de sesión se procesan en orden, uno a la vez.
    let cola = Promise.resolve();

    async function aplicarSesion(nueva: Session | null) {
      if (!isMounted) return;

      if (!nueva) {
        usuarioVerificado.current = null;
        setPerfil(null);
        setSession(null);
        return;
      }

      // Renovación del token del mismo usuario: no hace falta verificar otra vez.
      if (usuarioVerificado.current === nueva.user.id) {
        setSession(nueva);
        return;
      }

      let perfilActual: Usuario | null = null;
      try {
        perfilActual = await obtenerMiPerfil();
      } catch {
        // Sin perfil (por ejemplo, sin red) se deja entrar; las pantallas
        // que lo necesitan lo vuelven a pedir y RLS protege los datos.
      }

      const mensajeBloqueo = perfilActual ? MENSAJES_CUENTA_BLOQUEADA[perfilActual.estado] : undefined;
      if (mensajeBloqueo) {
        if (isMounted) setAviso(mensajeBloqueo);
        // Al cerrar la sesión llega SIGNED_OUT y se limpia el estado.
        await signOut().catch(() => {});
        return;
      }

      if (!isMounted) return;
      usuarioVerificado.current = nueva.user.id;
      setPerfil(perfilActual);
      setSession(nueva);
    }

    function encolar(nueva: Session | null) {
      cola = cola.then(() => aplicarSesion(nueva));
      return cola;
    }

    getCurrentSession()
      .catch(() => null)
      .then((actual) => encolar(actual))
      .finally(() => {
        if (isMounted) setCargando(false);
      });

    const { data } = subscribeToAuthChanges((nueva) => {
      // Supabase recomienda no llamar a la API dentro de este callback:
      // se difiere para no bloquear su candado interno.
      setTimeout(() => encolar(nueva), 0);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return createElement(
    SesionContext.Provider,
    {
      value: {
        session,
        perfil,
        cargando,
        aviso,
        limpiarAviso: () => setAviso(""),
        recargarPerfil,
      },
    },
    children,
  );
}

export function useSesion(): EstadoSesion {
  return useContext(SesionContext);
}
