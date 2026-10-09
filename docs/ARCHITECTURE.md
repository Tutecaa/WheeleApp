# Arquitectura base de WHEEL-E

Este documento define la base técnica del Sprint 1 (WE-33) y el alcance de
datos inicial del modelo de base de datos (WE-35). La aplicación se mantiene
como un cliente móvil Expo; las funcionalidades de viajes, reservas y
calificaciones se incorporarán en incrementos posteriores.

## Decisiones técnicas

| Área | Decisión |
| --- | --- |
| Cliente | Expo SDK 57, React Native 0.86, TypeScript estricto |
| Navegación | Expo Router con rutas dentro de `src/app` |
| Backend | Supabase Auth, Postgres y Storage |
| Identidad | Supabase Auth es la fuente de autenticación; `public.profiles` contiene los datos de negocio |
| Autorización | Row Level Security (RLS) en todas las tablas de negocio |
| Archivos | Supabase Storage para documentos del vehículo; la base de datos solo guarda referencias |
| Fechas | `timestamptz` en UTC en la base de datos |
| Identificadores | UUID generados por Postgres |

## Estructura del cliente

```text
src/
├── app/              # Rutas y pantallas Expo Router
├── components/       # Componentes visuales reutilizables
├── lib/              # Clientes y configuración de infraestructura
├── services/         # Casos de uso y acceso a servicios externos
├── types/            # Tipos de dominio compartidos
└── utils/            # Validaciones y funciones puras
```

Las pantallas no deben consultar Supabase directamente. Las operaciones de
autenticación y datos deben pasar por servicios, de forma que las reglas de
negocio no queden acopladas a la interfaz.

## Flujo de identidad

1. El usuario se registra con correo institucional.
2. El cliente valida el dominio antes de enviar la solicitud.
3. Supabase Auth crea el usuario y envía la confirmación de correo.
4. El trigger de la migración crea el perfil inicial en `public.profiles`.
5. El usuario confirmado inicia sesión.
6. La aplicación consulta el perfil y bloquea operaciones según `estado` y
   `rol`.

La validación en el cliente mejora la experiencia, pero la restricción de
dominio también debe mantenerse en la capa de servicio o backend. Nunca se
debe confiar únicamente en una validación de interfaz.

## Flujo de habilitación de conductor

1. Un usuario verificado registra los datos de su vehículo.
2. Se cargan SOAT, RTM y licencia en Storage.
3. `vehicles.estado_habilitacion` inicia en `pendiente`.
4. Un administrador revisa la solicitud.
5. La solicitud pasa a `aprobado` o `rechazado`; en el segundo caso se exige
   `motivo_rechazo`.
6. Solo un vehículo aprobado podrá asociarse a la publicación de viajes en un
   sprint posterior.

## Alcance del modelo inicial

La migración de WE-35 cubre únicamente:

- perfiles vinculados a `auth.users`;
- vehículos de conductores;
- referencias a los tres documentos obligatorios;
- estados y reglas de integridad;
- trigger para crear perfiles después del registro;
- RLS para que cada usuario consulte y modifique solo sus datos, mientras
  los administradores revisan solicitudes.

Las tablas de viajes, solicitudes de cupo, mensajes y calificaciones quedan
fuera de este incremento. Se agregarán en migraciones posteriores cuando sus
historias y diagramas estén definidos.

## Variables de entorno previstas

El cliente deberá leer estas variables desde la configuración local o del
pipeline de despliegue:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

La clave `service_role` nunca debe enviarse a la aplicación móvil ni
almacenarse en el repositorio.

Para probar el flujo de autenticación localmente:

1. Copia `.env.example` como `.env`.
2. Completa la URL y la clave `anon` del proyecto Supabase.
3. En Supabase Auth, habilita la confirmación por correo.
4. Añade `http://localhost:8081/auth/callback` y `wheele://auth/callback`
   a las URL de redirección permitidas.
5. Ejecuta `npm run web:stable` y reinicia Expo después de cambiar `.env`.

La clave `anon` es pública y está diseñada para el cliente; la clave
`service_role` es privada y no debe compartirse.

## Criterios de aceptación técnicos

- Una instalación limpia puede ejecutar la aplicación con `npm install` y
  `npx expo start`.
- TypeScript se mantiene en modo estricto.
- Las migraciones se ejecutan en orden y son repetibles en un proyecto
  Supabase nuevo.
- Todas las tablas de negocio tienen RLS habilitado.
- Ninguna pantalla futura necesita conocer la estructura interna de Auth para
  consultar su perfil.
