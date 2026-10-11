# WHEEL-E

Aplicación móvil de viajes compartidos para la comunidad de la Universidad Industrial de Santander (UIS). Está hecha con Expo (React Native + TypeScript + Expo Router) y Supabase (Auth, PostgreSQL con RLS y Storage).

El contexto, los requerimientos y el backlog están en [docs/contexto-proyecto.md](docs/contexto-proyecto.md). La estructura del código y las reglas para los asistentes están en [AGENTS.md](AGENTS.md).

## Requisitos

- Node.js en su versión LTS, y npm.
- La app **Expo Go** en el celular (Android o iOS), o un emulador.
- Acceso al proyecto de Supabase del equipo.

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y completa las claves:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_ORS_API_KEY=<clave de OpenRouteService>
```

En la app solo va la **anon key**. La `service_role` key nunca se pone en `.env` ni en el código.

## Configurar Supabase

1. **Migraciones.** Ejecuta en orden, en el SQL Editor, cada archivo de [supabase/migrations/](supabase/migrations/) que aún no esté aplicado (`001`, `002`, `003`, …). Una migración ya aplicada no se edita: los cambios van en un archivo nuevo.
2. **Redirect URLs.** En *Authentication → URL Configuration*, agrega estas URLs para que funcionen los enlaces de confirmación y recuperación:
   - `wheele://**` (app instalada / development build)
   - `exp://**` (Expo Go)
   - `http://localhost:8081/**` (web, en desarrollo)
3. **Primer administrador.** Regístrate en la app, confirma el correo y ejecuta en el SQL Editor:

   ```sql
   update public.profiles
   set rol = 'administrador'
   where correo_institucional = 'tu-correo@uis.edu.co';
   ```

   Cierra sesión y vuelve a entrar: en el inicio aparece **Revisar habilitaciones**.

## Comandos

```bash
npm start            # servidor de desarrollo (escanea el QR con Expo Go)
npm run android      # abrir en emulador Android
npm run web          # abrir en el navegador
npm run lint         # ESLint
npm run typecheck    # TypeScript
npx expo-doctor      # revisar dependencias y configuración
```

Antes de hacer commit, `npm run lint` y `npm run typecheck` deben pasar sin errores.

Las librerías se instalan con `npx expo install <paquete>`, no con `npm install`, para que la versión sea compatible con el SDK de Expo.

## Estado actual (Sprint 1)

- Registro con correo institucional, confirmación por correo, inicio de sesión y recuperación de contraseña (WE-7, WE-10, WE-11, WE-12).
- Registro de vehículo y solicitud de habilitación como conductor (WE-14).
- Revisión de habilitaciones por el administrador (WE-15).
