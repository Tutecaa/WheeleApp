// Pruebas unitarias de utils/formato.ts: cómo se muestran distancias,
// duraciones, aportes y fechas en la app.

import {
  fechaConMinutos,
  formatearAporte,
  formatearDistancia,
  formatearDuracion,
  formatearTiempoRelativo,
} from "@/utils/formato";

// Hora fija para formatearTiempoRelativo: 7 de noviembre de 2026 a las 12:00.
const AHORA = new Date(2026, 10, 7, 12, 0, 0);
const UN_MINUTO = 60 * 1000;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(AHORA);
});

afterAll(() => {
  jest.useRealTimers();
});

function haceMinutos(minutos: number): string {
  return new Date(AHORA.getTime() - minutos * UN_MINUTO).toISOString();
}

describe("formatearDistancia", () => {
  test('muestra 850 metros como "850 m"', () => {
    expect(formatearDistancia(850)).toBe("850 m");
  });

  test('muestra 12400 metros como "12,4 km"', () => {
    expect(formatearDistancia(12400)).toBe("12,4 km");
  });
});

describe("formatearDuracion", () => {
  test('muestra 1500 segundos como "25 min"', () => {
    expect(formatearDuracion(1500)).toBe("25 min");
  });

  test('muestra 3900 segundos como "1 h 5 min"', () => {
    expect(formatearDuracion(3900)).toBe("1 h 5 min");
  });

  test('muestra 3600 segundos como "1 h"', () => {
    expect(formatearDuracion(3600)).toBe("1 h");
  });

  test('muestra como mínimo "1 min" para 10 segundos', () => {
    expect(formatearDuracion(10)).toBe("1 min");
  });
});

describe("formatearAporte", () => {
  test('muestra un aporte de 0 como "Sin aporte"', () => {
    expect(formatearAporte(0)).toBe("Sin aporte");
  });

  test('muestra 5000 pesos como "$5.000"', () => {
    expect(formatearAporte(5000)).toBe("$5.000");
  });
});

describe("fechaConMinutos", () => {
  test("convierte 390 minutos en las 6:30 del mismo día", () => {
    const resultado = fechaConMinutos(new Date(2026, 10, 8, 15, 45, 20), 390);
    expect([
      resultado.getDate(),
      resultado.getHours(),
      resultado.getMinutes(),
      resultado.getSeconds(),
    ]).toEqual([8, 6, 30, 0]);
  });
});

describe("formatearTiempoRelativo", () => {
  test('muestra "Ahora" para hace 30 segundos', () => {
    expect(formatearTiempoRelativo(haceMinutos(0.5))).toBe("Ahora");
  });

  test('muestra "hace 5 min" para hace 5 minutos', () => {
    expect(formatearTiempoRelativo(haceMinutos(5))).toBe("hace 5 min");
  });

  test('muestra "hace 3 h" para hace 3 horas', () => {
    expect(formatearTiempoRelativo(haceMinutos(180))).toBe("hace 3 h");
  });

  test('muestra "ayer" para hace 30 horas', () => {
    expect(formatearTiempoRelativo(haceMinutos(30 * 60))).toBe("ayer");
  });
});
