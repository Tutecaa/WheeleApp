# Especificación de Requisitos de Software (SRS)

![WHEEL-E Logo](https://via.placeholder.com/150?text=WHEEL-E)  
**WHEEL-E: Aplicación Móvil de Viajes Compartidos (Carpooling) para la Comunidad UIS**

---

## 1. INFORMACIÓN DEL PROYECTO

* **Equipo:** Grupo N° 7
* **Integrantes:** 
  * 2232451 – Hermes Julián Delgado Guerrero (Product Owner, Dev Team)
  * 2231893 – Samuel David Penilla Ramirez (Scrum Master, Dev Team)
* **Curso:** Ingeniería de Software I – 22969 – C2
* **Prototipo (Figma):** [WHEEL-E Mobile App UI Kit](https://www.figma.com/make/ZT4JiXKAKfTcj0Z8ahxs63/WHEEL-E-Mobile-App-UI-Kit)

---

## 2. CONTEXTO

La movilidad en el área metropolitana de Bucaramanga enfrenta un desafío crítico. El parque automotor ha crecido significativamente, pasando de 849.000 vehículos en 2023 a una proyección de ~972.000 para el 2026 (un aumento de 93.000 vehículos en tan solo 2 años). En contraste, el sistema de transporte masivo Metrolínea movilizó solo 1.4 millones de pasajeros en 2024, lo que representa una drástica reducción del 96% respecto al 2016.

La Universidad Industrial de Santander (UIS) cuenta con una población de más de 24.000 estudiantes, muchos de los cuales se desplazan diariamente desde municipios aledaños como Floridablanca, Girón y Piedecuesta. Actualmente, la coordinación de viajes compartidos entre miembros de la comunidad se realiza de manera informal a través de grupos de WhatsApp y redes sociales. Esta modalidad presenta graves deficiencias:
* Falta de verificación de identidad de los participantes.
* Inexistencia de un historial de viajes.
* Ausencia de un sistema de reputación y calificación.
* Ineficiencia en la búsqueda de rutas coincidentes.

Actualmente, no existe en el mercado una plataforma adaptada que resuelva este caso de uso específico de *carpooling* universitario con destino común.

---

## 3. JUSTIFICACIÓN

El desarrollo de WHEEL-E se fundamenta en cuatro pilares principales:

* **Económico:** Permite la división de los costos de traslado mediante el aporte voluntario y sugerido de los pasajeros, aliviando la carga económica diaria.
* **Ambiental:** Fomenta una mayor ocupación por vehículo, lo que se traduce en menos automóviles ingresando al campus, reducción de la congestión vehicular y disminución de emisiones de CO2.
* **Seguridad:** La restricción de registro mediante correo institucional (@uis.edu.co / @correo.uis.edu.co) garantiza un círculo de confianza cerrado, exclusivo para la comunidad universitaria.
* **Social:** Reemplaza la coordinación caótica e informal por un sistema estructurado, rastreable y basado en la reputación mutua.

---

## 4. VISIÓN

Construir una aplicación móvil que reemplace la coordinación informal de transporte con un sistema digital eficiente donde la comunidad universitaria organice sus trayectos diarios. Siguiendo el marco de trabajo Scrum, el desarrollo será iterativo e incremental, entregando una versión funcional y de valor al final de cada sprint.

---

## 5. OBJETIVOS

### Objetivo General
Desarrollar una aplicación móvil que permita a los miembros verificados de la comunidad de la Universidad Industrial de Santander (UIS) publicar, buscar y coordinar viajes compartidos hacia y desde el campus, utilizando un algoritmo de búsqueda por proximidad geográfica entre el punto de partida del pasajero y el trazado de la ruta del conductor.

### Objetivos Específicos
1. Desarrollar un módulo de autenticación que valide la identidad mediante el correo institucional (@uis.edu.co / @correo.uis.edu.co).
2. Implementar la gestión de viajes permitiendo definir puntos de partida, trazar la ruta en un mapa, establecer horarios de salida y administrar cupos disponibles.
3. Integrar un algoritmo de búsqueda por proximidad geográfica que relacione la ubicación de origen del pasajero con el trazado de la ruta del conductor dentro de un radio configurable.
4. Crear un sistema de interacción y reserva de cupos con capacidades de aceptación, rechazo y emisión de notificaciones en tiempo real.
5. Fomentar la confianza y comunicación mediante un canal de mensajería entre conductor y pasajeros confirmados, incluyendo historial y calificación bidireccional.
6. Desarrollar un módulo de administración para la supervisión de la plataforma, verificación manual de documentos vehiculares, atención de reportes de conducta y aplicación de sanciones.
7. Ejecutar pruebas funcionales al final de cada incremento para asegurar la calidad y estabilidad del sistema.

---

## 6. ACTORES DEL SISTEMA

| Actor | Descripción |
| :--- | :--- |
| **Pasajero** | Miembro verificado de la comunidad UIS que requiere transporte y busca viajes publicados en la plataforma. |
| **Conductor** | Miembro verificado que posee un vehículo aprobado por la administración y publica trayectos disponibles. |
| **Administrador** | Operador encargado de la supervisión de la plataforma, verificación de documentos vehiculares, resolución de reportes y configuración del sistema. |
| **Servicio Externo de Rutas** | API o servicio de terceros (ej. Google Maps API, Mapbox) consultado por el sistema para obtener trazados, distancias y tiempos estimados. |

---

## 7. GLOSARIO DE TÉRMINOS

* **RF# / CU#:** Requisito Funcional / Caso de Uso, acompañados de su número de identificación.
* **UIS:** Universidad Industrial de Santander.
* **UML:** Lenguaje Unificado de Modelado (Unified Modeling Language).
* **API:** Interfaz de Programación de Aplicaciones (Application Programming Interface).
* **Usuario verificado:** Persona registrada que ha validado exitosamente su correo institucional.
* **Conductor habilitado:** Usuario verificado que ha enviado la documentación de su vehículo y ha sido aprobado por un administrador.
* **Pasajero:** Rol adoptado por un usuario verificado que reserva cupos en viajes de conductores habilitados.
* **Administrador:** Personal encargado de la moderación y soporte técnico de la plataforma.
* **Trazado de la ruta:** Conjunto de coordenadas geográficas que representan el trayecto desde el punto de origen hasta el destino.
* **Servicio externo de rutas:** Proveedor de mapas y geolocalización.
* **Cupo:** Asiento disponible en el vehículo de un conductor para un viaje específico.
* **Punto de partida:** Ubicación geográfica exacta desde donde el conductor inicia su ruta o donde el pasajero espera ser recogido.
* **Radio de tolerancia:** Distancia máxima permitida entre el punto de recogida solicitado por un pasajero y el trazado de la ruta del conductor.
* **Distancia de proximidad:** Medición en metros o kilómetros para determinar si un pasajero es viable para ser recogido durante la ruta.
* **Franja horaria:** Rango de tiempo estimado para la salida o llegada de un viaje.
* **Aporte sugerido:** Contribución económica voluntaria acordada para cubrir gastos de combustible y peajes.
* **Calificación bidireccional:** Sistema de evaluación donde tanto el conductor califica al pasajero, como el pasajero al conductor, tras finalizar un viaje.

---

## 8. REQUISITOS FUNCIONALES (RF)

### 8.1. Módulo de Gestión de Cuentas y Acceso

#### RF1: Registrar cuenta institucional
* **Fuente:** Objetivo Específico 1
* **Complejidad:** Media | **Prioridad:** 5 (Alta) | **Tipo:** Autenticación
* **RF Relacionados:** RF2
* **Criticidad:** Alta. Es la barrera de entrada y garantía del entorno seguro.
* **Usuarios:** Pasajero, Conductor
* **Entrada:** Nombre, Apellidos, Correo Institucional, Contraseña.
* **Salida:** Enlace de verificación enviado al correo, cuenta creada en estado pendiente.
* **Descripción:** El sistema debe permitir el registro de usuarios verificando que el correo ingresado pertenezca al dominio `@uis.edu.co` o `@correo.uis.edu.co`.
* **Precondición:** El usuario no debe estar registrado previamente.
* **Postcondición:** El usuario queda registrado y validado en la base de datos de la plataforma.
* **Consideraciones:** Formatos de correo inválidos, correos ya en uso, falla en el envío del email.
* **Criterios de aceptación:** 
  1. El sistema rechaza correos que no sean del dominio UIS.
  2. El sistema envía un token alfanumérico o enlace de activación seguro.
  3. No se permite iniciar sesión hasta que se valide el correo.

#### RF2: Iniciar sesión y recuperar acceso
* **Fuente:** Objetivo Específico 1
* **Complejidad:** Baja | **Prioridad:** 5 (Alta) | **Tipo:** Autenticación
* **RF Relacionados:** RF1
* **Criticidad:** Alta. Necesario para acceder a las funcionalidades del sistema.
* **Usuarios:** Todos
* **Entrada:** Correo, Contraseña / Solicitud de PIN de recuperación.
* **Salida:** Token de sesión (JWT) o mensaje de error / Correo con PIN.
* **Descripción:** Permite a los usuarios acceder a su cuenta verificada o restablecer su contraseña en caso de olvido.
* **Precondición:** Cuenta previamente registrada y verificada.
* **Postcondición:** Usuario autenticado en el dispositivo.
* **Consideraciones:** Bloqueo temporal por intentos fallidos.
* **Criterios de aceptación:** Validación correcta de credenciales, expiración de sesión implementada, flujo de recuperación funcional por email.

#### RF3: Solicitar habilitación como conductor
* **Fuente:** Objetivo Específico 6
* **Complejidad:** Media | **Prioridad:** 4 | **Tipo:** Gestión de Perfil
* **RF Relacionados:** RF16
* **Criticidad:** Media-Alta. Requisito legal y de confianza para publicar viajes.
* **Usuarios:** Conductor
* **Entrada:** Fotografías de Licencia de Conducción, SOAT, Tarjeta de Propiedad, Modelo y Placa del vehículo.
* **Salida:** Solicitud en estado "En revisión".
* **Descripción:** Un usuario verificado puede enviar documentación de su vehículo para ser evaluada por un administrador y obtener el rol de conductor.
* **Precondición:** Usuario logueado sin rol de conductor o con solicitud rechazada previamente.
* **Postcondición:** Solicitud encolada para el panel administrativo.
* **Consideraciones:** Formatos de imagen inválidos, tamaño excedido.
* **Criterios de aceptación:** El sistema debe permitir subir múltiples imágenes, mostrar el estado de la solicitud en el perfil del usuario.

### 8.2. Módulo de Gestión de Viajes

#### RF4: Publicar un viaje
* **Fuente:** Objetivo Específico 2
* **Complejidad:** Alta | **Prioridad:** 5 | **Tipo:** Core
* **RF Relacionados:** RF5, RF15
* **Criticidad:** Crítica. Es la acción principal de los conductores.
* **Usuarios:** Conductor
* **Entrada:** Punto de partida (coordenadas), destino (UIS o externo), fecha, hora de salida, número de cupos, aporte sugerido.
* **Salida:** Viaje creado en estado "Programado".
* **Descripción:** El conductor habilitado ingresa los datos de su próximo trayecto para que esté visible a la comunidad.
* **Precondición:** Ser conductor habilitado.
* **Postcondición:** El viaje se indexa en la base de datos para la búsqueda.
* **Consideraciones:** Evitar cruce de horarios para un mismo conductor.
* **Criterios de aceptación:** El viaje se crea exitosamente, se refleja en el historial de viajes programados del conductor.

#### RF5: Obtener el trazado de la ruta
* **Fuente:** Objetivo Específico 2
* **Complejidad:** Alta | **Prioridad:** 5 | **Tipo:** Integración
* **RF Relacionados:** RF4, RF8
* **Criticidad:** Crítica. Base para el algoritmo de emparejamiento.
* **Usuarios:** Conductor, Sistema
* **Entrada:** Coordenadas de origen y destino, Puntos intermedios.
* **Salida:** Polilínea (Polyline) de coordenadas y distancia estimada.
* **Descripción:** El sistema consulta el Servicio Externo de Rutas para generar la ruta óptima en el mapa y guardar los puntos para futuras consultas espaciales.
* **Precondición:** Datos de origen y destino válidos proporcionados por RF4.
* **Postcondición:** La ruta gráfica queda asociada al ID del viaje.
* **Consideraciones:** Falla de conexión con la API externa, rutas inaccesibles.
* **Criterios de aceptación:** El sistema muestra una línea en el mapa conectando A y B a lo largo de las calles.

#### RF6: Modificar un viaje publicado
* **Fuente:** Objetivo Específico 2
* **Complejidad:** Media | **Prioridad:** 3 | **Tipo:** Gestión
* **RF Relacionados:** RF4, RF15
* **Criticidad:** Baja-Media.
* **Usuarios:** Conductor
* **Entrada:** Nuevos horarios o alteración de cupos libres.
* **Salida:** Viaje actualizado.
* **Descripción:** Permite al conductor editar ciertos parámetros de un viaje siempre que no existan reservas confirmadas que se vean afectadas drásticamente.
* **Precondición:** Viaje en estado "Programado".
* **Postcondición:** Datos actualizados en el sistema.
* **Consideraciones:** Si cambia la ruta, se invalida el emparejamiento actual; si cambian cupos a un número menor que los ya aceptados, debe bloquearse.
* **Criterios de aceptación:** Solo se permite modificar hora (con tolerancia mínima) o número de cupos vacantes sin afectar a pasajeros confirmados.

#### RF7: Cancelar un viaje
* **Fuente:** Objetivo Específico 2
* **Complejidad:** Media | **Prioridad:** 4 | **Tipo:** Gestión
* **RF Relacionados:** RF15
* **Criticidad:** Media. Impacta a los pasajeros que dependían del viaje.
* **Usuarios:** Conductor
* **Entrada:** Motivo de cancelación.
* **Salida:** Viaje en estado "Cancelado", cupos liberados.
* **Descripción:** El conductor puede abortar un viaje antes de su inicio.
* **Precondición:** Viaje no iniciado.
* **Postcondición:** Viaje cancelado; pasajeros notificados.
* **Consideraciones:** Cancelaciones recurrentes pueden afectar la reputación.
* **Criterios de aceptación:** Se envían notificaciones a todos los pasajeros aceptados o pendientes. Se registra el evento en el historial del conductor.

### 8.3. Módulo de Búsqueda y Emparejamiento

#### RF8: Búsqueda de viajes por proximidad
* **Fuente:** Objetivo Específico 3
* **Complejidad:** Muy Alta | **Prioridad:** 5 | **Tipo:** Core / Algorítmico
* **RF Relacionados:** RF5, RF9
* **Criticidad:** Crítica. Es la propuesta de valor diferencial de la app.
* **Usuarios:** Pasajero
* **Entrada:** Ubicación del pasajero (GPS o manual), destino (UIS o casa), franja horaria.
* **Salida:** Lista de viajes compatibles ordenados por proximidad y hora.
* **Descripción:** El sistema utiliza operaciones espaciales (ej. PostGIS o similar) para encontrar trayectos cuyo trazado pase dentro de un "Radio de tolerancia" respecto a la ubicación de recogida del pasajero.
* **Precondición:** Usuario logueado, existen viajes activos en la BD.
* **Postcondición:** Se despliegan resultados en interfaz.
* **Consideraciones:** Optimización de la consulta para no saturar la base de datos (Indexación espacial).
* **Criterios de aceptación:** Los resultados mostrados no deben exceder el radio de tolerancia configurado; deben coincidir con la franja horaria deseada.

#### RF9: Consultar detalle de viaje
* **Fuente:** Objetivo Específico 2, 3
* **Complejidad:** Baja | **Prioridad:** 4 | **Tipo:** Consulta
* **RF Relacionados:** RF8
* **Criticidad:** Media.
* **Usuarios:** Pasajero
* **Entrada:** ID de viaje.
* **Salida:** Mapa de la ruta, datos del conductor (nombre, foto, vehículo, calificación), cupos restantes, aporte sugerido.
* **Descripción:** Al seleccionar un viaje de la búsqueda, el pasajero puede ver toda la información pública necesaria para decidir si solicita un cupo.
* **Precondición:** RF8 ejecutado.
* **Postcondición:** Ninguna (solo lectura).
* **Consideraciones:** El viaje pudo llenarse o cancelarse justo antes de abrirlo.
* **Criterios de aceptación:** La interfaz refleja datos actualizados en tiempo real del viaje, incluyendo la calificación promedio del conductor.

### 8.4. Módulo de Solicitudes y Cupos

#### RF10: Solicitar cupo
* **Fuente:** Objetivo Específico 4
* **Complejidad:** Media | **Prioridad:** 5 | **Tipo:** Transacción
* **RF Relacionados:** RF9, RF11, RF15
* **Criticidad:** Crítica. Conecta la oferta con la demanda.
* **Usuarios:** Pasajero
* **Entrada:** Solicitud generada al presionar "Pedir cupo".
* **Salida:** Registro de solicitud en estado "Pendiente".
* **Descripción:** El pasajero envía una petición al conductor para reservar un asiento en un viaje específico.
* **Precondición:** Viaje con cupos > 0, pasajero no está en otro viaje simultáneo.
* **Postcondición:** Conductor notificado de la solicitud.
* **Consideraciones:** Evitar múltiples solicitudes spam de un mismo pasajero.
* **Criterios de aceptación:** Se descuenta visualmente el cupo como "en proceso" o se notifica al conductor para su aprobación manual.

#### RF11: Gestionar solicitudes recibidas (Aceptar/Rechazar)
* **Fuente:** Objetivo Específico 4
* **Complejidad:** Media | **Prioridad:** 5 | **Tipo:** Transacción
* **RF Relacionados:** RF10, RF15
* **Criticidad:** Crítica.
* **Usuarios:** Conductor
* **Entrada:** Decisión del conductor (Aceptar / Rechazar).
* **Salida:** Actualización de estado de la solicitud, descuento real de cupo si es aceptada.
* **Descripción:** El conductor visualiza el perfil del pasajero solicitante (y su reputación) y decide si aprueba o declina su incorporación al viaje.
* **Precondición:** Existencia de solicitudes en estado "Pendiente".
* **Postcondición:** Pasajero notificado, viaje actualizado.
* **Consideraciones:** Si los cupos llegan a 0, se auto-rechazan las demás solicitudes pendientes.
* **Criterios de aceptación:** Solo se pueden aceptar pasajeros hasta el límite de cupos del vehículo.

#### RF12: Cancelar solicitud o cupo reservado
* **Fuente:** Objetivo Específico 4
* **Complejidad:** Media | **Prioridad:** 4 | **Tipo:** Gestión
* **RF Relacionados:** RF11, RF15
* **Criticidad:** Media.
* **Usuarios:** Pasajero
* **Entrada:** Acción de cancelar.
* **Salida:** Cupo liberado, solicitud anulada.
* **Descripción:** Un pasajero puede retractarse de su solicitud (esté pendiente o ya aceptada).
* **Precondición:** Solicitud en estado "Pendiente" o "Aceptada".
* **Postcondición:** El cupo vuelve a estar disponible para otros. Notificación al conductor.
* **Consideraciones:** Penalizaciones en reputación si cancela minutos antes de salir.
* **Criterios de aceptación:** El sistema recalcula inmediatamente los cupos libres del viaje.

### 8.5. Módulo de Confianza y Reputación

#### RF13: Calificación bidireccional
* **Fuente:** Objetivo Específico 5
* **Complejidad:** Media | **Prioridad:** 4 | **Tipo:** Feedback
* **RF Relacionados:** RF14
* **Criticidad:** Alta. Mantiene el estándar de calidad de la comunidad.
* **Usuarios:** Conductor, Pasajero
* **Entrada:** Puntuación (1 a 5 estrellas) y comentario opcional.
* **Salida:** Registro de calificación asociado al viaje y al usuario evaluado.
* **Descripción:** Tras finalizar el viaje, el sistema solicita a las partes calificarse mutuamente.
* **Precondición:** Viaje marcado como "Finalizado".
* **Postcondición:** Promedio del usuario actualizado en su perfil.
* **Consideraciones:** Prevenir calificaciones sin haber realizado el viaje.
* **Criterios de aceptación:** Las calificaciones son obligatorias para el pasajero antes de solicitar un nuevo viaje.

#### RF14: Mensajería del viaje
* **Fuente:** Objetivo Específico 5
* **Complejidad:** Alta | **Prioridad:** 3 | **Tipo:** Comunicación
* **RF Relacionados:** RF11
* **Criticidad:** Media. Evita usar WhatsApp, centraliza la comunicación.
* **Usuarios:** Conductor, Pasajeros confirmados
* **Entrada:** Mensajes de texto.
* **Salida:** Chat grupal actualizado en tiempo real.
* **Descripción:** Se habilita una sala de chat exclusiva para el conductor y los pasajeros aceptados en un viaje específico para coordinar detalles de recogida.
* **Precondición:** Pasajero en estado "Aceptado".
* **Postcondición:** Mensaje distribuido a los participantes.
* **Consideraciones:** El chat se bloquea 24 horas después de finalizado el viaje.
* **Criterios de aceptación:** Solo pueden leer y escribir los miembros confirmados del viaje.

### 8.6. Módulo de Notificaciones

#### RF15: Emitir notificaciones de eventos
* **Fuente:** Objetivo Específico 4
* **Complejidad:** Media | **Prioridad:** 4 | **Tipo:** Sistema
* **RF Relacionados:** RF4, RF7, RF10, RF11
* **Criticidad:** Alta. Mantienen el flujo de la aplicación.
* **Usuarios:** Sistema, Todos los actores
* **Entrada:** Disparadores de estado de otros módulos (solicitud, cancelación, inicio de viaje).
* **Salida:** Alerta Push o In-App en el dispositivo destino.
* **Descripción:** El sistema informa de forma proactiva sobre actualizaciones importantes (ej. "Te han aceptado en el viaje", "Viaje cancelado").
* **Precondición:** El usuario destino debe tener sesión activa o token push válido.
* **Postcondición:** Notificación entregada y marcada como no leída.
* **Consideraciones:** Manejo de permisos del sistema operativo móvil.
* **Criterios de aceptación:** Las notificaciones llegan en menos de 5 segundos tras el evento disparador.

### 8.7. Módulo de Administración

#### RF16: Panel de administración y moderación
* **Fuente:** Objetivo Específico 6
* **Complejidad:** Alta | **Prioridad:** 3 | **Tipo:** Administración
* **RF Relacionados:** RF3
* **Criticidad:** Media-Alta. Mantiene la seguridad de la plataforma.
* **Usuarios:** Administrador
* **Entrada:** Decisiones de aprobación de documentos, bloqueos manuales.
* **Salida:** Cambio de roles, cuentas suspendidas.
* **Descripción:** Interfaz web/móvil para administradores donde visualizan reportes, documentos de conductores (RF3), y pueden sancionar usuarios por mal comportamiento.
* **Precondición:** Usuario logueado con rol de Administrador.
* **Postcondición:** Estados de usuarios y permisos actualizados.
* **Consideraciones:** Privacidad en el manejo de fotos de documentos (SOAT, Licencias).
* **Criterios de aceptación:** El administrador puede aprobar un conductor en 1 clic y puede suspender cuentas ingresando un motivo de sanción.

---

## 9. CASOS DE USO (CU)

| Caso de Uso | Detalles y Flujos |
| :--- | :--- |
| **CU1: Registrar cuenta institucional**<br>*(Ref: RF1)* | **Descripción:** Un usuario de la comunidad UIS crea su cuenta en la aplicación.<br>**Actores:** Nuevo Usuario.<br>**Precondiciones:** Ninguna.<br>**Postcondiciones:** Cuenta creada y en espera de verificación por correo.<br>**Gatillo:** El usuario abre la app y selecciona "Registrarse".<br>**Flujo Principal:** <br>1. El sistema muestra formulario.<br>2. Usuario ingresa datos y correo @uis.edu.co.<br>3. Sistema valida sintaxis de los datos.<br>4. Sistema envía correo con enlace de verificación.<br>5. Muestra mensaje de confirmación.<br>**Flujos Alternativos:** Si el correo no es UIS, el sistema muestra error y no permite avanzar.<br>**Validación:** Verificar que el correo no esté registrado previamente. |
| **CU2: Iniciar sesión y recuperar acceso**<br>*(Ref: RF2)* | **Descripción:** Autenticación de un usuario existente.<br>**Actores:** Pasajero, Conductor, Administrador.<br>**Precondiciones:** Cuenta verificada.<br>**Postcondiciones:** Sesión iniciada y token guardado en el dispositivo.<br>**Gatillo:** Usuario abre la app y selecciona "Iniciar Sesión".<br>**Flujo Principal:** <br>1. Ingresa credenciales.<br>2. El sistema valida hash de contraseña.<br>3. El sistema redirige a la pantalla principal según su rol.<br>**Flujos Alternativos:** (Recuperar Contraseña) Usuario selecciona "Olvidé mi contraseña" -> Ingresa correo -> Sistema envía PIN -> Usuario ingresa PIN -> Asigna nueva contraseña. |
| **CU3: Solicitar habilitación como conductor**<br>*(Ref: RF3)* | **Descripción:** El usuario sube los documentos de su vehículo.<br>**Actores:** Usuario / Pasajero.<br>**Precondiciones:** Estar autenticado.<br>**Postcondiciones:** Solicitud en estado pendiente para el Admin.<br>**Gatillo:** Usuario accede a "Mi Perfil" y presiona "Quiero ser conductor".<br>**Flujo Principal:** <br>1. El sistema solicita fotos (Licencia, SOAT, Vehículo).<br>2. Usuario adjunta fotos usando cámara/galería.<br>3. Usuario ingresa placa y detalles del auto.<br>4. Sistema sube imágenes al servidor y crea la solicitud.<br>5. Muestra mensaje de éxito. |
| **CU4: Verificar documentos y habilitar conductor**<br>*(Ref: RF16)* | **Descripción:** El administrador aprueba o rechaza la solicitud de CU3.<br>**Actores:** Administrador.<br>**Precondiciones:** Existen solicitudes pendientes.<br>**Postcondiciones:** Usuario obtiene rol "Conductor" o solicitud es rechazada.<br>**Gatillo:** El administrador abre el módulo de moderación.<br>**Flujo Principal:** <br>1. Administrador selecciona solicitud de la lista.<br>2. Visualiza documentos y valida vigencias.<br>3. Presiona "Aprobar".<br>4. Sistema actualiza rol del usuario y notifica.<br>**Flujos Alternativos:** Si los datos son borrosos, presiona "Rechazar" especificando el motivo. |
| **CU5: Publicar un viaje**<br>*(Ref: RF4)* | **Descripción:** El conductor define un trayecto y ofrece cupos.<br>**Actores:** Conductor.<br>**Precondiciones:** Rol Conductor habilitado.<br>**Postcondiciones:** Viaje publicado y visible en el sistema.<br>**Gatillo:** Botón flotante "Publicar Viaje".<br>**Flujo Principal:** <br>1. Conductor selecciona punto de partida en el mapa.<br>2. Selecciona destino (ej. UIS - Puerta Principal).<br>3. *Incluye CU6: El sistema muestra el trazado de la ruta.*<br>4. Conductor confirma el trazado.<br>5. Ingresa fecha, hora, cupos (1-4) y aporte sugerido.<br>6. Confirma publicación.<br>7. Sistema guarda y notifica éxito. |
| **CU6: Obtener trazado de ruta**<br>*(Ref: RF5)* | **Descripción:** Cálculo algorítmico del camino a seguir en el mapa.<br>**Actores:** Sistema, Servicio Externo de Rutas.<br>**Precondiciones:** Dos coordenadas geográficas proporcionadas.<br>**Postcondiciones:** Geometría de ruta dibujada.<br>**Gatillo:** Solicitado por CU5 o CU7.<br>**Flujo Principal:** <br>1. Sistema envía request (origen, destino) a la API de mapas.<br>2. La API retorna un array de coordenadas y metadata (tiempo/distancia).<br>3. El sistema decodifica la respuesta y la dibuja como polilínea azul en el mapa de la app. |
| **CU7: Gestionar un viaje publicado**<br>*(Ref: RF6, RF7)* | **Descripción:** Modificar o cancelar el viaje ofertado.<br>**Actores:** Conductor.<br>**Precondiciones:** Viaje programado.<br>**Postcondiciones:** Viaje alterado o eliminado.<br>**Gatillo:** Seleccionar un viaje de la lista "Mis Viajes".<br>**Flujo Principal:** <br>1. Conductor visualiza detalles.<br>2. Selecciona "Cancelar Viaje".<br>3. Ingresa motivo.<br>4. Sistema elimina viaje de la búsqueda.<br>5. *Incluye CU12: Notifica a pasajeros*. |
| **CU8: Buscar viajes por proximidad**<br>*(Ref: RF8, RF9, RF14)* | **Descripción:** Pasajero busca quién lo lleve a la Universidad o a su casa.<br>**Actores:** Pasajero.<br>**Precondiciones:** Autenticado, GPS activo.<br>**Postcondiciones:** Lista de viajes compatibles mostrada.<br>**Gatillo:** Pantalla principal de búsqueda.<br>**Flujo Principal:** <br>1. Pasajero establece su ubicación actual o punto de recogida deseado.<br>2. Establece destino.<br>3. Sistema cruza ubicación con el *radio de tolerancia* respecto a los trazados de viajes activos en la BD.<br>4. Muestra tarjetas con viajes compatibles.<br>5. Pasajero selecciona uno para ver detalle y mapa interactivo. |
| **CU9: Solicitar y cancelar cupo**<br>*(Ref: RF10, RF12, RF7)* | **Descripción:** Flujo del pasajero para apartar un asiento.<br>**Actores:** Pasajero.<br>**Precondiciones:** Ejecución de CU8.<br>**Postcondiciones:** Solicitud generada.<br>**Gatillo:** Botón "Pedir Cupo" en el detalle del viaje.<br>**Flujo Principal:** <br>1. Pasajero revisa detalles de CU8.<br>2. Presiona "Pedir Cupo".<br>3. Sistema genera la solicitud.<br>4. *Incluye CU12: Notificación al conductor.*<br>5. La UI del pasajero cambia a "Esperando respuesta...".<br>**Flujos Alternativos:** Pasajero presiona "Cancelar solicitud" -> Sistema borra la solicitud y notifica. |
| **CU10: Gestionar solicitudes recibidas**<br>*(Ref: RF11, RF14)* | **Descripción:** El conductor responde a las solicitudes de cupo.<br>**Actores:** Conductor.<br>**Precondiciones:** Notificación de nueva solicitud.<br>**Postcondiciones:** Cupo restado o solicitud declinada.<br>**Gatillo:** Panel "Solicitudes Pendientes" del viaje.<br>**Flujo Principal:** <br>1. Conductor visualiza perfil y calificación del solicitante.<br>2. Selecciona "Aceptar".<br>3. Sistema resta 1 a los cupos disponibles.<br>4. El pasajero es añadido al chat grupal.<br>5. *Incluye CU12: Notificación al pasajero "Solicitud Aceptada".* |
| **CU11: Calificar participantes**<br>*(Ref: RF13)* | **Descripción:** Evaluación mutua tras el trayecto.<br>**Actores:** Conductor, Pasajero.<br>**Precondiciones:** Viaje ha concluido en el sistema (el conductor presionó "Finalizar Viaje").<br>**Postcondiciones:** Reputación actualizada.<br>**Gatillo:** Aparición automática de modal (pop-up) post-viaje.<br>**Flujo Principal:** <br>1. Sistema muestra pantalla "¿Cómo estuvo tu viaje?".<br>2. Usuario selecciona cantidad de estrellas (1 a 5).<br>3. (Opcional) Deja un comentario escrito.<br>4. Sistema promedia y actualiza la calificación global de la contraparte. |
| **CU12: Notificar eventos relevantes**<br>*(Ref: RF15)* | **Descripción:** Mecanismo automático de alertas del sistema.<br>**Actores:** Sistema.<br>**Precondiciones:** Un caso de uso principal genera un disparador.<br>**Postcondiciones:** Mensaje en pantalla del usuario final.<br>**Gatillo:** Invocado por CU7, CU9, CU10.<br>**Flujo Principal:** <br>1. Sistema recibe el evento y el ID del destinatario.<br>2. Genera payload (título, cuerpo, data).<br>3. Envía a través de servicio Push (ej. Firebase Cloud Messaging).<br>4. Dispositivo móvil muestra la alerta visual o sonora. |

---

## 10. REFERENCIA DE STORYBOARD (MOCKUPS UI)

La representación visual de las interfaces de usuario correspondientes a los requisitos descritos en este documento se encuentra centralizada en la plataforma de diseño Figma.

* **Enlace al UI Kit y Prototipo Oficial:**
  [WHEEL-E Mobile App UI Kit](https://www.figma.com/make/ZT4JiXKAKfTcj0Z8ahxs63/WHEEL-E-Mobile-App-UI-Kit)

### Pantallas Principales Mapeadas a Requisitos:
1. **Login y Registro Institucional:** Representa los flujos de `RF1` y `RF2`. Contiene la entrada de credenciales y mensajes de validación @uis.edu.co.
2. **Publicar Ruta (Conductor):** Refleja la UI de mapas, campos de fecha/hora, input de cupos y confirmación `RF4`, `RF5`.
3. **Buscar Ruta (Pasajero):** Muestra el mapa base, campo de dirección y tarjetas superpuestas con conductores cercanos encontrados mediante búsqueda geográfica `RF8`.
4. **Solicitudes y Detalles del Viaje:** Interfaz del chat interno, estado de aceptación, y botones de confirmación de conductor `RF10`, `RF11`, `RF14`.
5. **Calificación de Viaje (Rating):** Sistema de estrellas y feedback UI visible al terminar la ruta `RF13`.

---
*Fin del Documento de Especificación de Requisitos de Software - WHEEL-E*
