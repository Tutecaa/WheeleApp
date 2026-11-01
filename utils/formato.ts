// Fecha corta en español, por ejemplo "11 oct 2026".
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Día corto, por ejemplo "sáb, 25 oct".
export function formatearDia(fecha: Date | string): string {
  const valor = typeof fecha === "string" ? new Date(fecha) : fecha;
  return valor.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

// Hora, por ejemplo "6:30 a. m.".
export function formatearHora(fecha: Date | string): string {
  const valor = typeof fecha === "string" ? new Date(fecha) : fecha;
  return valor.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

// Fecha y hora, por ejemplo "sáb, 25 oct · 6:30 a. m.".
export function formatearFechaHora(fecha: Date | string): string {
  return `${formatearDia(fecha)} · ${formatearHora(fecha)}`;
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

// "Ahora", "hace 5 min", "hace 3 h", "ayer" o la fecha corta.
export function formatearTiempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  if (horas < 48) return "ayer";
  return formatearFecha(iso);
}

// El día de `fecha` a la hora indicada en minutos desde la medianoche
// (por ejemplo 390 → 6:30 a. m.). Lo usa la franja horaria de la búsqueda.
export function fechaConMinutos(fecha: Date, minutos: number): Date {
  const resultado = new Date(fecha);
  resultado.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return resultado;
}
