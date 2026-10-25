// Fecha corta en español, por ejemplo "11 oct 2026".
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Fecha y hora, por ejemplo "sáb, 25 oct · 6:30 a. m.".
export function formatearFechaHora(fecha: Date | string): string {
  const valor = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dia = valor.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
  const hora = valor.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

// "850 m" o "12,4 km".
export function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km`;
}

// "25 min" o "1 h 5 min".
export function formatearDuracion(segundos: number): string {
  const minutos = Math.max(1, Math.round(segundos / 60));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// "$5.000" o "Sin aporte".
export function formatearAporte(pesos: number): string {
  if (pesos === 0) return "Sin aporte";
  return `$${pesos.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
