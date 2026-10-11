# Roadmap y Pipeline de Desarrollo: WHEEL-E

Este documento define el ciclo de vida del desarrollo, los estándares de ingeniería y la planificación iterativa para **WHEEL-E**, la aplicación móvil de carpooling exclusiva para la comunidad de la Universidad Industrial de Santander (UIS).

---

## 1. Modelo de Desarrollo: Enfoque en Espiral

El desarrollo de WHEEL-E seguirá un **Modelo en Espiral**. Este enfoque iterativo e incremental está diseñado para gestionar riesgos de manera efectiva, permitiendo refinamientos continuos basados en un prototipo inicial.

**Punto de partida (Prototipo Actual):**
El desarrollo no comienza desde cero. Existe un prototipo funcional (HTML + Leaflet + OpenRouteService) que ya traza rutas en calles reales y calcula la distancia de proximidad (distancia perpendicular) desde un punto de origen del pasajero hasta la polilínea de la ruta del conductor.

**Ciclo de la Espiral (por cada iteración):**
1. **Determinación de Objetivos:** Definir qué requerimientos funcionales (RF) se abordarán.
2. **Análisis de Riesgos:** Identificar cuellos de botella técnicos (ej. precisión del GPS, latencia de la API de rutas).
3. **Ingeniería y Desarrollo:** Implementación de la iteración actual, integrando la lógica del prototipo en la arquitectura móvil.
4. **Evaluación:** Pruebas, revisión y planificación de la siguiente fase.

---

## 2. Estándares del Proyecto

### 2.1. Convenciones de Commits Semánticos (Conventional Commits)
Todo el historial de Git debe ser semántico y automatizable. Cada commit debe seguir la estructura:
`tipo(ámbito): descripción breve`

**Tipos permitidos:**
- `feat`: Nueva funcionalidad. *(Ej: `feat(auth): implementar login con correo institucional`)*
- `fix`: Corrección de un bug. *(Ej: `fix(map): corregir cálculo de distancia a la polilínea`)*
- `docs`: Cambios en la documentación. *(Ej: `docs(api): actualizar swagger de rutas`)*
- `style`: Cambios de formato, espacios, punto y coma (no afectan la lógica).
- `refactor`: Refactorización de código que no corrige bugs ni añade features.
- `perf`: Mejoras de rendimiento.
- `test`: Añadir o corregir pruebas.
- `chore`: Tareas de mantenimiento, actualización de dependencias, configuración de build.
- `ci`: Cambios en archivos de configuración y scripts de Integración Continua.

### 2.2. Estrategia de Ramas (GitFlow)
- `main`: Código en producción. Siempre estable.
- `develop`: Rama principal de integración para el desarrollo activo.
- `feature/*`: Para nuevas funcionalidades (ej. `feature/RF1-registro-usuario`). Nacen de `develop` y se fusionan en `develop`.
- `hotfix/*`: Para corregir errores críticos en producción. Nacen de `main` y se fusionan en `main` y `develop`.
- `release/*`: Para preparar un nuevo lanzamiento.

### 2.3. Definición de Hecho (Definition of Done - DoD)
Una tarea o historia de usuario se considera "Hecha" cuando:
- [ ] El código cumple con los estándares de linting.
- [ ] Pasa todas las pruebas unitarias y de integración en el pipeline de CI/CD.
- [ ] La funcionalidad ha sido probada manualmente en un emulador/dispositivo físico.
- [ ] El Pull Request (PR) ha sido aprobado por al menos 1 revisor.
- [ ] La documentación relevante ha sido actualizada.

### 2.4. Métricas de Calidad
- **Cobertura de Pruebas (Test Coverage):** Mínimo 70% en backend, 60% en componentes críticos de UI.
- **Tiempos de Respuesta API:** < 200ms para consultas regulares, < 800ms para cálculos geoespaciales.
- **Crash-free sessions:** > 99% en entornos de pruebas.

---

## 3. Estructura del Repositorio

La estructura vigente está definida en `AGENTS.md` (sección "Arquitectura de Carpetas"). Resumen:

```text
wheel-e/
├── app/                    # Pantallas (Expo Router)
├── services/               # Funciones que hablan con Supabase / OpenRouteService
├── components/             # Piezas reutilizables de interfaz
├── lib/                    # Cliente de Supabase
├── utils/                  # Validaciones y formato
├── constants/              # Colores y configuración
├── hooks/                  # useSesion y otros hooks
├── types/                  # Tipos del dominio
├── supabase/migrations/    # Esquema de base de datos en SQL
└── docs/                   # Documentación del proyecto
```

---

## 4. Pipeline de Iteraciones

### Iteración 0 - Fundación
**Objetivo:** Establecer la infraestructura base del proyecto, repositorios, CI/CD y arquitecturas en blanco.

**Tareas Específicas:**
- [ ] Inicializar repositorio Git y configurar ramas base (`main`, `develop`).
- [ ] Configurar proyecto backend (framework, base de datos) y proyecto móvil.
- [ ] Configurar Linter (ej. ESLint, Prettier) y convenciones de código.
- [ ] Configurar pipeline CI para ejecutar linting y tests en cada PR a `develop`.
- [ ] Crear estructura de carpetas según el estándar definido.
- [ ] Desplegar entorno de "Staging" con un endpoint de Health Check.

**Criterios de Aceptación:** Repositorio funcional con CI/CD que bloquea PRs con errores de linting. Backend responde 200 OK en `/health`.
**Riesgos Identificados:** Incompatibilidad de versiones en herramientas base.
**Commits Esperados:** `chore:`, `ci:`, `docs:`
**Entregable:** Repositorio configurado y primera build automatizada ("Hola Mundo" compilando).

---

### Iteración 1 - Autenticación e Identidad (RF1, RF2)
**Objetivo:** Garantizar que solo la comunidad de la UIS pueda acceder, mediante registro y validación.

**Tareas Específicas:**
- [ ] Crear modelo de base de datos para Usuario.
- [ ] Implementar endpoint de registro y encriptación de contraseñas.
- [ ] Desarrollar servicio de envío de correos (SMTP/SendGrid).
- [ ] Validar que el dominio del correo sea exclusivamente `@uis.edu.co` o `@correo.uis.edu.co`.
- [ ] Implementar flujo de verificación por token (enviado al correo).
- [ ] Desarrollar endpoint de Login y generación de token JWT.
- [ ] Desarrollar flujo de recuperación de contraseña.
- [ ] UI Móvil: Pantalla de Login.
- [ ] UI Móvil: Pantalla de Registro y Verificación.

**Criterios de Aceptación:** El usuario puede registrarse solo con correo UIS, verificar la cuenta y hacer login recibiendo un JWT válido.
**Riesgos Identificados:** Retrasos en la entrega de correos de verificación.
**Commits Esperados:** `feat(auth):`, `test(auth):`, `refactor(db):`
**Entregable:** Módulo de autenticación completamente funcional en frontend y backend.

---

### Iteración 2 - Vehículos y Habilitación (RF3, RF16)
**Objetivo:** Permitir a los usuarios registrarse como conductores subiendo los documentos requeridos.

**Tareas Específicas:**
- [ ] Crear modelo de datos para Vehículo y Documentos (SOAT, Tecnomecánica).
- [ ] Configurar servicio de almacenamiento de imágenes (ej. AWS S3, Cloudinary).
- [ ] Desarrollar endpoints para CRUD de vehículos.
- [ ] UI Móvil: Pantalla "Mis Vehículos" y formulario de registro de vehículo.
- [ ] UI Móvil: Interfaz para captura/subida de fotos de documentos.
- [ ] Backend: Lógica de cambio de rol de usuario (Pasajero -> Pendiente -> Conductor).
- [ ] Panel de Admin (Básico): Endpoint para aprobar o rechazar documentos de un vehículo.

**Criterios de Aceptación:** Usuario puede registrar un vehículo y subir fotos. El rol cambia a conductor una vez un administrador aprueba el vehículo vía API.
**Riesgos Identificados:** Manejo de permisos de cámara y almacenamiento en dispositivos móviles.
**Commits Esperados:** `feat(vehicles):`, `feat(admin):`, `fix(ui):`
**Entregable:** Flujo de habilitación de conductores operativo.

---

### Iteración 3 - Viajes y Rutas (RF4, RF5, RF6, RF7)
**Objetivo:** Migrar la lógica del prototipo (Leaflet + OpenRouteService) al backend y móvil para permitir la publicación de viajes.

**Tareas Específicas:**
- [ ] Integrar OpenRouteService en el Backend (o Cliente) para obtener polilíneas.
- [ ] Crear modelo de datos para Viaje (Ruta, Polilínea GeoJSON, Fecha/Hora, Cupos, Precio).
- [ ] UI Móvil: Integración de mapa nativo (Google Maps / Mapbox).
- [ ] UI Móvil: Flujo para seleccionar Origen y Destino en el mapa.
- [ ] Backend: Endpoint para crear viaje almacenando la polilínea como tipo espacial (PostGIS o similar).
- [ ] UI Móvil: Pantalla para gestionar viajes activos (Modificar cupos, Cancelar viaje).
- [ ] UI Móvil: Historial de viajes realizados.

**Criterios de Aceptación:** El conductor traza una ruta en el mapa, el sistema dibuja la polilínea y el viaje se guarda en BD con sus datos espaciales.
**Riesgos Identificados:** Consumo de cuota de API de OpenRouteService; tamaño de almacenamiento de polilíneas.
**Commits Esperados:** `feat(map):`, `feat(trips):`, `perf(map):`
**Entregable:** Creación y gestión de viajes con trazado real de rutas.

---

### Iteración 4 - Búsqueda y Emparejamiento (RF8, RF9)
**Objetivo:** Implementar el algoritmo básico del sistema: encontrar viajes cuya ruta pase cerca del pasajero.

**Tareas Específicas:**
- [ ] Backend: Implementar algoritmo de distancia punto a polilínea (PostGIS `ST_Distance` o matemática geoespacial adaptada del prototipo).
- [ ] Endpoint de búsqueda: Recibir coordenadas de origen, destino (opcional) y radio de tolerancia.
- [ ] Implementar filtros de búsqueda (Hora, Puntos de encuentro).
- [ ] UI Móvil: Pantalla principal de pasajero con mapa y selección de punto de recogida.
- [ ] UI Móvil: Visualización de resultados de búsqueda (Tarjetas de viajes compatibles).
- [ ] UI Móvil: Vista de detalle de un viaje encontrado (Perfil conductor, ruta en mapa, cupos).

**Criterios de Aceptación:** Un pasajero ingresa su ubicación y el sistema devuelve viajes cuya ruta proyectada pase a menos de "X" metros de dicho punto.
**Riesgos Identificados:** Rendimiento de consultas espaciales simultáneas.
**Commits Esperados:** `feat(search):`, `perf(db):`, `test(search):`
**Entregable:** Motor de búsqueda y match geoespacial funcional.

---

### Iteración 5 - Solicitudes y Cupos (RF10, RF11, RF12)
**Objetivo:** Gestionar el ciclo de vida de una reserva de asiento en un viaje.

**Tareas Específicas:**
- [ ] Modelo de datos para Solicitud de Viaje (Pendiente, Aceptada, Rechazada, Cancelada).
- [ ] UI Móvil Pasajero: Botón "Solicitar Cupo" en detalle del viaje.
- [ ] UI Móvil Conductor: Pantalla de "Solicitudes Entrantes" para un viaje.
- [ ] Backend: Lógica para descontar cupos disponibles al Aceptar solicitud.
- [ ] Backend: Lógica para restaurar cupos si el pasajero cancela o el conductor revoca.
- [ ] Prevención de sobreventa (control de concurrencia al aceptar múltiples solicitudes).

**Criterios de Aceptación:** El pasajero solicita viaje, el conductor aprueba, los cupos disminuyen, y ambos ven el viaje como "Programado".
**Riesgos Identificados:** Condiciones de carrera (Race conditions) si dos conductores aceptan solicitudes al mismo tiempo con 1 solo cupo.
**Commits Esperados:** `feat(booking):`, `fix(trips):`, `test(booking):`
**Entregable:** Flujo completo de reserva y gestión de asientos.

---

### Iteración 6 - Confianza y Comunicación (RF13, RF14, RF15)
**Objetivo:** Mejorar la seguridad percibida y facilitar el encuentro entre usuarios.

**Tareas Específicas:**
- [ ] Implementar sistema de calificaciones (1 a 5 estrellas) y comentarios.
- [ ] Lógica backend: Trigger para calificar solo si el viaje finalizó y la solicitud fue "Aceptada".
- [ ] UI Móvil: Perfil público (Nombre, Foto, Calificación promedio, Vehículo).
- [ ] Configurar Push Notifications (Firebase Cloud Messaging - FCM).
- [ ] Eventos de notificación: Nueva solicitud, Solicitud aceptada/rechazada, Viaje cancelado.
- [ ] Desarrollar módulo de chat en tiempo real (WebSockets / Socket.io o Firebase).
- [ ] UI Móvil: Pantalla de chat vinculada a una solicitud aceptada.

**Criterios de Aceptación:** Usuarios reciben alertas push. Pueden chatear una vez hecho el match y calificarse al terminar el viaje.
**Riesgos Identificados:** Complejidad en manejo del estado de WebSockets en background y desconexiones.
**Commits Esperados:** `feat(chat):`, `feat(notifications):`, `feat(ratings):`
**Entregable:** Sistema social, de mensajería y reputación.

---

### Iteración 7 - Administración y Soporte (RF16)
**Objetivo:** Proveer herramientas al equipo de la UIS para moderar la plataforma.

**Tareas Específicas:**
- [ ] Desarrollar Dashboard Web (puede ser un panel básico en React/Vue o un admin template).
- [ ] Pantalla Admin: Lista de usuarios y su estado.
- [ ] Pantalla Admin: Flujo de validación manual de documentos de vehículos (Aprobar/Rechazar con motivo).
- [ ] Sistema de reportes: Endpoint para que usuarios reporten mala conducta.
- [ ] Funcionalidad para suspender/banear cuentas desde el panel de admin.

**Criterios de Aceptación:** El administrador puede entrar al panel web, ver documentos pendientes, aprobarlos y banear usuarios si es necesario.
**Riesgos Identificados:** Seguridad del panel de administración.
**Commits Esperados:** `feat(admin-web):`, `feat(moderation):`
**Entregable:** Panel de control de administradores.

---

### Iteración 8 - Pruebas, Optimización y Lanzamiento
**Objetivo:** Asegurar la calidad técnica antes del despliegue a la comunidad universitaria.

**Tareas Específicas:**
- [ ] Pruebas E2E de flujos críticos (Registro -> Crear Viaje -> Buscar -> Solicitar -> Aceptar).
- [ ] Auditoría de seguridad (JWT, validación de inputs, Rate Limiting en APIs).
- [ ] Optimización de assets móviles e índices de base de datos espaciales.
- [ ] Preparar entornos de Producción (Servidores, bases de datos, dominios).
- [ ] Generar binarios finales (APK/AAB para Android, IPA para iOS).
- [ ] Redactar manuales de usuario y Términos y Condiciones.

**Criterios de Aceptación:** Aplicación publicada en tiendas de pruebas (TestFlight / Google Play Console Internal Track) sin crashes.
**Riesgos Identificados:** Rechazo en revisión por parte de Apple/Google.
**Commits Esperados:** `chore(release):`, `docs:`, `perf:`, `fix(core):`
**Entregable:** Release Version 1.0 lista para la comunidad UIS.
    
    
