This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` (project root, there is no `src/`) — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# Reglas y Estructura del Proyecto Wheel-e

## Arquitectura de Carpetas

Cada vez que crees o sugieras archivos nuevos, respeta estrictamente esta estructura:

```text
wheel-e/
├── app/                          ← PANTALLAS (cada archivo es una pantalla)
│   ├── _layout.tsx               ← layout raíz: carga la sesión y protege rutas
│   ├── index.tsx                 ← entrada: con sesión → /buscar ; sin sesión → /login
│   │
│   ├── (auth)/                   ← pantallas sin sesión iniciada
│   │   ├── _layout.tsx           ← navegación entre login, registro y recuperar
│   │   ├── login.tsx
│   │   ├── registro.tsx
│   │   └── recuperar.tsx
│   │
│   ├── (tabs)/                   ← pantallas con barra inferior (ya logueado)
│   │   ├── _layout.tsx           ← define la barra inferior y sus pestañas
│   │   ├── buscar.tsx
│   │   ├── publicar.tsx
│   │   ├── mis-viajes.tsx
│   │   └── perfil.tsx            ← mi propio perfil
│   │
│   ├── viaje/[id].tsx            ← detalle de un viaje (el [id] cambia por viaje)
│   ├── usuario/[id].tsx          ← perfil público de otro usuario (RF14)
│   ├── solicitudes.tsx           ← solicitudes recibidas (conductor)
│   ├── calificar/[id].tsx        ← calificar participantes de un viaje
│   ├── notificaciones.tsx        ← bandeja de notificaciones (RF15)
│   ├── conductor/vehiculo.tsx    ← registrar vehículo y documentos
│   ├── admin/habilitaciones.tsx  ← revisar y aprobar conductores
│   ├── auth/callback.tsx         ← recibe los enlaces del correo (confirmación y recuperación)
│   ├── reset-password.tsx        ← definir nueva contraseña tras el enlace de recuperación
│   └── home.tsx                  ← temporal (Sprint 1); se reemplaza por (tabs)/buscar
│
├── services/                     ← FUNCIONES QUE HABLAN CON SUPABASE (una por módulo)
│   ├── auth.service.ts           ← registrar, iniciar sesión, recuperar clave
│   ├── perfiles.service.ts
│   ├── vehiculos.service.ts      ← registrar vehículo, subir documentos
│   ├── viajes.service.ts         ← publicar, editar, cancelar, iniciar/finalizar, mis viajes
│   ├── rutas.service.ts          ← pedir el trazado a OpenRouteService
│   ├── busqueda.service.ts       ← búsqueda por proximidad
│   ├── solicitudes.service.ts    ← solicitar, aceptar, rechazar, cancelar cupo
│   ├── calificaciones.service.ts
│   ├── notificaciones.service.ts
│   └── admin.service.ts
│
├── components/                   ← PIEZAS REUTILIZABLES DE INTERFAZ
│   ├── Boton.tsx
│   ├── CampoTexto.tsx
│   ├── Mapa.tsx                  ← mapa OSM para marcar puntos y dibujar rutas
│   ├── TarjetaViaje.tsx          ← la tarjeta que aparece en resultados
│   └── Estrellas.tsx             ← calificación 1 a 5
│
├── lib/
│   └── supabase.ts               ← conexión a Supabase (se crea UNA sola vez)
│
├── utils/                        ← funciones de ayuda sin pantalla
│   ├── validaciones.ts           ← ¿es correo UIS?, ¿fecha futura?, etc.
│   └── formato.ts                ← formato de fechas, metros, etc.
│
├── constants/
│   ├── colores.ts                ← colores de la app (los del Figma)
│   └── config.ts                 ← dominios permitidos, radio por defecto, plazos, etc.
│
├── hooks/
│   └── useSesion.ts              ← saber en cualquier pantalla quién está logueado
│
├── types/
│   └── index.ts                  ← tipos del dominio (Usuario, Vehiculo, Viaje, etc.)
│
├── supabase/                     ← TODO LO DE LA BASE DE DATOS (en SQL)
│   └── migrations/
│       ├── 001_perfiles.sql
│       ├── 002_vehiculos_y_habilitacion.sql
│       ├── 003_viajes.sql
│       ├── 004_solicitudes.sql
│       ├── 005_calificaciones.sql
│       ├── 006_notificaciones.sql
│       └── 007_busqueda_proximidad.sql   ← función PostGIS de distancia
│
├── docs/
│   └── contexto-proyecto.md      ← contexto, requerimientos y backlog del proyecto
│
├── assets/                       ← logo, íconos, imágenes
├── AGENTS.md                     ← instrucciones para Claude Code
├── .env                          ← claves secretas (NO se sube a GitHub)
├── .gitignore                    ← lista de lo que Git ignora (incluye .env)
├── app.json                      ← nombre, ícono y configuración de la app
├── package.json                  ← dependencias y comandos (npm start, etc.)
├── tsconfig.json                 ← configuración de TypeScript (viene con Expo)
└── README.md                     ← cómo instalar y correr el proyecto



```

contexto del proyecto en @contexto-proyecto.md
