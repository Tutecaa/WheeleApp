import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { useSesion } from "@/hooks/useSesion";
import { contarNoLeidas } from "@/services/notificaciones.service";
import { INTERVALO_REVISAR_NOTIFICACIONES_MS } from "@/constants/config";

type EstadoNotificaciones = {
  noLeidas: number;
  // Vuelve a contar; se llama al leer notificaciones o al abrir la bandeja.
  recargar: () => Promise<void>;
};

const NotificacionesContext = createContext<EstadoNotificaciones>({
  noLeidas: 0,
  recargar: async () => {},
});

// Cuenta las notificaciones sin leer (RF15) y la comparte con la campana de
// cada pantalla. Revisa al iniciar sesión, al volver a la app y cada poco
// tiempo mientras está abierta.
export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const { session } = useSesion();
  const usuarioId = session?.user.id;
  const [conteo, setConteo] = useState<{ usuarioId?: string; noLeidas: number }>({ noLeidas: 0 });

  const recargar = useCallback(async () => {
    if (!usuarioId) return;
    const noLeidas = await contarNoLeidas();
    setConteo({ usuarioId, noLeidas });
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;

    function revisar() {
      contarNoLeidas().then((noLeidas) => {
        if (activo) setConteo({ usuarioId, noLeidas });
      });
    }

    revisar();
    const intervalo = setInterval(() => {
      if (AppState.currentState === "active") revisar();
    }, INTERVALO_REVISAR_NOTIFICACIONES_MS);
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") revisar();
    });

    return () => {
      activo = false;
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [usuarioId]);

  // El conteo de otra sesión (por ejemplo, tras cerrar sesión) no se muestra.
  const noLeidas = conteo.usuarioId === usuarioId ? conteo.noLeidas : 0;

  return createElement(NotificacionesContext.Provider, { value: { noLeidas, recargar } }, children);
}

export function useNotificaciones(): EstadoNotificaciones {
  return useContext(NotificacionesContext);
}
