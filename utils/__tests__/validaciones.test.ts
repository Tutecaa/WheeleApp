// Pruebas unitarias de utils/validaciones.ts: reglas de los formularios de
// registro (RF1), vehículo (RF3), publicación de viajes (RF4, RF6) y
// búsqueda (RF8). No usan la red ni Supabase.

import {
  distanciaEntre,
  isInstitutionalEmail,
  normalizarPlaca,
  normalizeEmail,
  validarBusqueda,
  validarDocumento,
  validarPuntosViaje,
  validarSalidaViaje,
  validarVehiculo,
  validatePassword,
  type DatosVehiculo,
} from "@/utils/validaciones";

// La hora se fija para que las pruebas que comparan con "ahora" den siempre
// el mismo resultado: 7 de noviembre de 2026 a las 12:00 (hora local).
const AHORA = new Date(2026, 10, 7, 12, 0, 0);
const UNA_HORA = 60 * 60 * 1000;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(AHORA);
});

afterAll(() => {
  jest.useRealTimers();
});

// Puntos de Bucaramanga.
const CAMPUS_UIS = { latitud: 7.1401, longitud: -73.1212 };
const CENTRO = { latitud: 7.1193, longitud: -73.1227 };

const VEHICULO_VALIDO: DatosVehiculo = {
  placa: "ABC123",
  marca: "Chevrolet",
  linea: "Spark GT",
  modelo: "2018",
  color: "Gris",
  numeroPuestos: "4",
};

describe("isInstitutionalEmail (RF1)", () => {
  test("acepta un correo @correo.uis.edu.co", () => {
    expect(isInstitutionalEmail("estudiante@correo.uis.edu.co")).toBe(true);
  });

  test("acepta un correo @uis.edu.co con mayúsculas y espacios alrededor", () => {
    expect(isInstitutionalEmail("  Profesor@UIS.EDU.CO  ")).toBe(true);
  });

  test("rechaza un correo @gmail.com", () => {
    expect(isInstitutionalEmail("estudiante@gmail.com")).toBe(false);
  });

  test("rechaza un dominio parecido como @uis.edu.co.fake", () => {
    expect(isInstitutionalEmail("estudiante@uis.edu.co.fake")).toBe(false);
  });
});

describe("normalizeEmail (RF1)", () => {
  test("quita los espacios y pasa el correo a minúsculas", () => {
    expect(normalizeEmail("  Ana.Perez@Correo.UIS.edu.co ")).toBe(
      "ana.perez@correo.uis.edu.co",
    );
  });
});

describe("validatePassword (RF1)", () => {
  test("rechaza una contraseña de 7 caracteres", () => {
    expect(validatePassword("1234567")).toBe(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  });

  test("acepta una contraseña de 8 caracteres", () => {
    expect(validatePassword("12345678")).toBeNull();
  });
});

describe("normalizarPlaca", () => {
  test("quita espacios y guiones y pasa a mayúsculas", () => {
    expect(normalizarPlaca(" abc-123 ")).toBe("ABC123");
  });
});

describe("validarVehiculo (RF3)", () => {
  test("acepta un vehículo con datos válidos", () => {
    expect(validarVehiculo(VEHICULO_VALIDO)).toBeNull();
  });

  test("rechaza una placa de menos de 5 caracteres", () => {
    expect(validarVehiculo({ ...VEHICULO_VALIDO, placa: "AB1" })).toBe(
      "Escribe una placa válida (por ejemplo ABC123).",
    );
  });

  test("rechaza un modelo anterior a 1950", () => {
    expect(validarVehiculo({ ...VEHICULO_VALIDO, modelo: "1949" })).toBe(
      "El modelo debe ser un año entre 1950 y 2027.",
    );
  });

  test("rechaza un vehículo con 0 puestos", () => {
    expect(validarVehiculo({ ...VEHICULO_VALIDO, numeroPuestos: "0" })).toBe(
      "Escribe un número de puestos válido.",
    );
  });
});

describe("validarDocumento (RF3)", () => {
  test("indica que falta cargar el documento", () => {
    expect(validarDocumento("el SOAT", null)).toBe("Falta cargar el SOAT.");
  });

  test("rechaza un archivo GIF", () => {
    expect(
      validarDocumento("el SOAT", { mimeType: "image/gif", size: 1024 }),
    ).toBe("el SOAT: solo se admiten archivos PDF, JPG o PNG.");
  });

  test("rechaza un PDF de más de 5 MB", () => {
    expect(
      validarDocumento("el SOAT", {
        mimeType: "application/pdf",
        size: 6 * 1024 * 1024,
      }),
    ).toBe("el SOAT: el archivo supera el máximo de 5 MB.");
  });

  test("acepta un PDF de 1 MB", () => {
    expect(
      validarDocumento("el SOAT", {
        mimeType: "application/pdf",
        size: 1024 * 1024,
      }),
    ).toBeNull();
  });
});

describe("distanciaEntre (haversine)", () => {
  test("da 0 metros entre un punto y él mismo", () => {
    expect(distanciaEntre(CAMPUS_UIS, CAMPUS_UIS)).toBe(0);
  });

  test("da unos 1112 metros para 0,01 grados de latitud", () => {
    const a = { latitud: 7.0, longitud: -73.0 };
    const b = { latitud: 7.01, longitud: -73.0 };
    expect(distanciaEntre(a, b)).toBeCloseTo(1111.95, 1);
  });
});

describe("validarPuntosViaje (RF4)", () => {
  test("pide marcar el origen si falta", () => {
    expect(validarPuntosViaje(null, CENTRO)).toBe(
      "Marca el origen del viaje en el mapa.",
    );
  });

  test("rechaza un origen y un destino a unos 50 metros", () => {
    const cerca = {
      latitud: CAMPUS_UIS.latitud + 0.00045,
      longitud: CAMPUS_UIS.longitud,
    };
    expect(validarPuntosViaje(CAMPUS_UIS, cerca)).toBe(
      "El origen y el destino están en el mismo lugar. Corrige los puntos.",
    );
  });

  test("acepta un viaje del campus UIS al centro", () => {
    expect(validarPuntosViaje(CAMPUS_UIS, CENTRO)).toBeNull();
  });
});

describe("validarSalidaViaje (RF4, RF6)", () => {
  const manana = new Date(AHORA.getTime() + 24 * UNA_HORA);

  test("rechaza una salida que ya pasó", () => {
    const haceUnaHora = new Date(AHORA.getTime() - UNA_HORA);
    expect(
      validarSalidaViaje(
        { fechaHoraSalida: haceUnaHora, cupos: "3", aporte: "" },
        4,
      ),
    ).toBe("La fecha y hora de salida ya pasaron. Elige una futura.");
  });

  test("rechaza más cupos que los puestos del vehículo", () => {
    expect(
      validarSalidaViaje(
        { fechaHoraSalida: manana, cupos: "5", aporte: "" },
        4,
      ),
    ).toBe("Los cupos deben estar entre 1 y 4, los puestos del vehículo.");
  });

  test("al editar, rechaza menos cupos que las reservas confirmadas", () => {
    expect(
      validarSalidaViaje(
        { fechaHoraSalida: manana, cupos: "1", aporte: "" },
        4,
        2,
      ),
    ).toBe("No puedes dejar menos de 2 cupos: ya hay 2 reservas confirmadas.");
  });

  test("rechaza un aporte mayor a $50.000", () => {
    expect(
      validarSalidaViaje(
        { fechaHoraSalida: manana, cupos: "3", aporte: "60000" },
        4,
      ),
    ).toBe("El aporte sugerido debe ser un valor entre $0 y $50.000.");
  });

  test("acepta una salida futura con cupos válidos y sin aporte", () => {
    expect(
      validarSalidaViaje(
        { fechaHoraSalida: manana, cupos: "3", aporte: "" },
        4,
      ),
    ).toBeNull();
  });
});

describe("validarBusqueda (RF8)", () => {
  const mananaA = (hora: number) => new Date(2026, 10, 8, hora, 0, 0);

  test("rechaza una franja cuya hora final es anterior a la inicial", () => {
    expect(
      validarBusqueda({
        partida: CAMPUS_UIS,
        desde: mananaA(12),
        hasta: mananaA(6),
        radioMetros: 500,
      }),
    ).toBe("La hora final debe ser posterior a la inicial. Corrígela.");
  });

  test("rechaza una franja que ya pasó", () => {
    const ayerA = (hora: number) => new Date(2026, 10, 6, hora, 0, 0);
    expect(
      validarBusqueda({
        partida: CAMPUS_UIS,
        desde: ayerA(6),
        hasta: ayerA(12),
        radioMetros: 500,
      }),
    ).toBe("Esa fecha y franja ya pasaron. Elige una fecha u hora futura.");
  });

  test("rechaza un radio de 50 metros", () => {
    expect(
      validarBusqueda({
        partida: CAMPUS_UIS,
        desde: mananaA(6),
        hasta: mananaA(12),
        radioMetros: 50,
      }),
    ).toBe("Elige un radio de tolerancia válido.");
  });

  test("acepta una búsqueda de mañana en la mañana con radio de 500 metros", () => {
    expect(
      validarBusqueda({
        partida: CAMPUS_UIS,
        desde: mananaA(6),
        hasta: mananaA(12),
        radioMetros: 500,
      }),
    ).toBeNull();
  });
});
