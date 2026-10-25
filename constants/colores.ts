// Paleta del storyboard de WHEEL-E: verde UIS, dorado de acento y fondos menta.
export const colores = {
  primario: "#1B8A4C",
  primarioOscuro: "#0F6634",
  // Fondos suaves: zona del mapa, chips sin elegir, botones de volver.
  primarioSuave: "#E3F1E8",
  menta: "#D6EBDD",
  acento: "#D9A21B", // insignia del logo, paradas, montos
  acentoSuave: "#FBF1D9",
  fondo: "#F3F6F4",
  blanco: "#FFFFFF",
  titulo: "#16261D",
  texto: "#24332A",
  textoSecundario: "#66756C",
  placeholder: "#9AA59F",
  borde: "#DCE6E0",
  error: "#B33D32",
  avisoFondo: "#FFF4DE",
  avisoBorde: "#F1D296",
  avisoTexto: "#815B15",
} as const;

// Degradado del encabezado y del botón principal (de claro a oscuro).
export const degradadoPrimario = ["#2BA061", "#13703D"] as const;
