\# ENTREGA 1B PARTE 2: REQUERIMIENTOS FUNCIONALES Y CASOS DE USO

\*\*EQUIPO:\*\* Grupo N° 7  

\*\*INTEGRANTES:\*\*  

\- 2232451 – Hermes Julián Delgado Guerrero – Product Owner, Development Team  

\- 2231893 – Samuel David Penilla Ramirez – Scrum Master, Development Team  



\*\*NOMBRE DEL PROYECTO DEFINIDO:\*\* WHEEL-E  



\---



\## 1. OBJETIVOS DEL PROYECTO



\### Objetivo General

Desarrollar una aplicación móvil que permita a los miembros verificados de la comunidad universitaria de la UIS publicar, encontrar y coordinar viajes compartidos hacia el campus, mediante un mecanismo de búsqueda basado en la proximidad geográfica entre el punto de partida del pasajero y el trazado de la ruta del conductor.



\### Objetivos Específicos

1\. Implementar un módulo de autenticación e identidad que valide el correo institucional (`@uis.edu.co` / `@correo.uis.edu.co`) al momento del registro.

2\. Desarrollar el módulo de gestión de viajes que permita a los conductores definir puntos de partida, trazar la ruta en el mapa, establecer horarios de salida y gestionar el número de cupos disponibles.

3\. Diseñar e integrar el algoritmo de búsqueda por proximidad geográfica para relacionar la ubicación de la casa del pasajero con el trazado de la ruta del conductor dentro de un radio.

4\. Construir un sistema de interacción y reserva de cupos que facilite a los pasajeros solicitar asiento en un viaje coincidente y a los conductores aceptar o rechazar dichas solicitudes, notificando al solicitante si su petición se aceptó o no.

5\. Implementar los mecanismos de confianza y comunicación entre usuarios, incluyendo un canal de mensajería entre el conductor y los pasajeros confirmados para coordinar detalles de recogida, la calificación bidireccional al finalizar el viaje y el historial de valoraciones en el perfil de cada usuario.

6\. Desarrollar el módulo de administración e interacción de soporte para la supervisión de la plataforma, verificación manual de documentos vehiculares, atención a reportes de conducta y sanción de cuentas.

7\. Realizar las pruebas funcionales del producto al cierre de cada incremento.



\---



\## 2. GLOSARIO Y DEFINICIONES



\- \*\*RF#:\*\* Requerimiento Funcional 1, 2, 3, …, N.

\- \*\*CU#:\*\* Caso de Uso 1, 2, 3, …, N.

\- \*\*UIS:\*\* Universidad Industrial de Santander.

\- \*\*UML:\*\* Unified Modeling Language.

\- \*\*API:\*\* Application Programming Interface (servicio de cálculo de rutas).

\- \*\*Usuario verificado:\*\* Miembro de la comunidad universitaria que completó el registro en la aplicación con un correo institucional válido y lo confirmó.

\- \*\*Conductor habilitado:\*\* Usuario verificado que además registró un vehículo, cargó sus documentos y recibió la aprobación de un administrador.

\- \*\*Pasajero:\*\* Usuario verificado que busca y solicita cupo en los viajes publicados por otros usuarios.

\- \*\*Administrador:\*\* Usuario con permisos especiales encargado de la operación de la plataforma.

\- \*\*Trazado de la ruta:\*\* Secuencia de coordenadas que representa el recorrido real del viaje sobre las calles de la ciudad.

\- \*\*Servicio externo de rutas:\*\* Servicio de información geográfica al que la aplicación consulta mediante una API.

\- \*\*Cupo:\*\* Puesto disponible en un vehículo para un viaje determinado.

\- \*\*Punto de partida:\*\* Ubicación que el pasajero marca sobre el mapa para indicar desde dónde iniciaría su desplazamiento.

\- \*\*Radio de tolerancia:\*\* Distancia máxima, expresada en metros, que un pasajero está dispuesto a recorrer desde su punto de partida hasta el trazado de la ruta de un viaje.

\- \*\*Distancia de proximidad:\*\* Distancia mínima entre el punto de partida del pasajero y el trazado de la ruta de un viaje.

\- \*\*Franja horaria:\*\* Rango de horas dentro del cual el pasajero necesita viajar.

\- \*\*Aporte sugerido:\*\* Valor que el conductor propone como contribución voluntaria de cada pasajero.

\- \*\*Calificación bidireccional:\*\* Valoración mutua entre conductor y pasajero al finalizar un viaje.



\---



\## 3. ESPECIFICACIÓN DETALLADA DE REQUERIMIENTOS FUNCIONALES



\### RF1: Registrar usuario con correo institucional

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero, Conductor

\- \*\*Entrada:\*\* Nombre completo, código institucional, correo institucional (`@uis.edu.co` / `@correo.uis.edu.co`), contraseña, programa académico y fotografía de perfil (opcional).

\- \*\*Salida:\*\* Cuenta creada en estado pendiente de confirmación y correo de verificación enviado.

\- \*\*Descripción:\*\* El sistema validará que el correo pertenezca al dominio UIS. La cuenta queda activa únicamente tras confirmar el enlace recibido.

\- \*\*Precondición:\*\* Correo institucional vigente sin registro previo.

\- \*\*Postcondición:\*\* Usuario verificado registrado en el sistema.

\- \*\*Consideraciones:\*\* Rechazo de correos no institucionales, manejo de correos duplicados, campos incompletos, validación de contraseña y expiración del enlace.

\- \*\*Criterios de Aceptación:\*\* Solo crea cuenta con correo UIS; exige confirmación por correo para iniciar sesión.



\### RF2: Autenticar usuario y recuperar acceso

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Baja | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero, Conductor, Administrador

\- \*\*Entrada:\*\* Correo institucional y contraseña (o solo correo para recuperación).

\- \*\*Salida:\*\* Sesión iniciada con rol asignado o correo con enlace de restablecimiento.

\- \*\*Criterios de Aceptación:\*\* Concede acceso solo a cuentas verificadas y activas; restablecimiento enviado únicamente al correo institucional.



\### RF3: Registrar vehículo y solicitar habilitación como conductor

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Conductor

\- \*\*Entrada:\*\* Placa, marca, línea, modelo, color, número de puestos; archivos de SOAT, revisión tecnomecánica (RTM) y licencia de conducción.

\- \*\*Salida:\*\* Solicitud de habilitación en estado pendiente de revisión por el Administrador.

\- \*\*Criterios de Aceptación:\*\* Requiere todos los datos y documentos obligatorios; impide publicar viajes mientras la solicitud no sea aprobada.



\### RF4: Publicar un viaje

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Alta | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Conductor

\- \*\*Entrada:\*\* Coordenadas de origen, paradas intermedias y destino en mapa; fecha, hora de salida, cupos disponibles y aporte sugerido.

\- \*\*Salida:\*\* Viaje creado en estado publicado con trazado de ruta asociado.

\- \*\*Criterios de Aceptación:\*\* Valida datos futuros y cupos dentro de la capacidad del vehículo; asocia el trazado enviado por la API de rutas.



\### RF5: Obtener y almacenar el trazado de la ruta de un viaje

\- \*\*Fuente:\*\* Product Owner y Development Team | \*\*Complejidad:\*\* Alta | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Conductor (indirecto), Servicio externo de rutas

\- \*\*Entrada:\*\* Lista ordenada de coordenadas (origen, paradas, destino).

\- \*\*Salida:\*\* Secuencia de coordenadas de las calles almacenada junto al viaje.

\- \*\*Criterios de Aceptación:\*\* Almacena y asocia la geometría devuelta por la API; ante fallo externo, impide publicar viajes sin trazado.



\### RF6: Modificar o cancelar un viaje publicado

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 4 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Conductor

\- \*\*Entrada:\*\* ID del viaje y datos a modificar, o confirmación y motivo de cancelación.

\- \*\*Salida:\*\* Viaje actualizado (con trazado recalculado si cambia la ruta) o cancelado con notificación a pasajeros confirmados.



\### RF7: Consultar los viajes propios del usuario

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Baja | \*\*Prioridad:\*\* 3 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* No

\- \*\*Usuarios:\*\* Pasajero, Conductor

\- \*\*Entrada:\*\* ID de usuario autenticado y filtros (próximos/finalizados, rol pasajero/conductor).

\- \*\*Salida:\*\* Listado de viajes indicando estado y rol desempeñado.



\### RF8: Buscar viajes por proximidad geográfica

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Alta | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero

\- \*\*Entrada:\*\* Coordenadas del punto de partida en mapa, fecha, franja horaria y radio de tolerancia en metros.

\- \*\*Salida:\*\* Listado de viajes ordenados de menor a mayor distancia de proximidad (en metros) respecto al trazado.



\### RF9: Consultar el detalle de un viaje

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 4 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero

\- \*\*Entrada:\*\* ID del viaje seleccionado y punto de partida del pasajero.

\- \*\*Salida:\*\* Trazado del recorrido en mapa, punto de mayor cercanía, horario, cupos, aporte y perfil público del conductor.



\### RF10: Solicitar un cupo en un viaje

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero

\- \*\*Entrada:\*\* ID del viaje, ID del pasajero y mensaje opcional.

\- \*\*Salida:\*\* Solicitud en estado pendiente y notificación enviada al conductor. Valida la disponibilidad de cupos y evita cruces de horario.



\### RF11: Gestionar las solicitudes de cupo recibidas

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 5 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Conductor

\- \*\*Entrada:\*\* ID de solicitud y decisión (aceptar/rechazar).

\- \*\*Salida:\*\* Solicitud actualizada; al aceptar, descuenta automáticamente un cupo e informa al pasajero.



\### RF12: Cancelar una solicitud o una reserva confirmada

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 4 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Pasajero

\- \*\*Entrada:\*\* ID de solicitud/reserva y confirmación.

\- \*\*Salida:\*\* Solicitud cancelada, reabastecimiento del cupo al viaje y notificación al conductor.



\### RF13: Calificar a los participantes de un viaje finalizado

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Baja | \*\*Prioridad:\*\* 3 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* No

\- \*\*Usuarios:\*\* Pasajero, Conductor

\- \*\*Entrada:\*\* ID del viaje, usuario a calificar, puntuación (1 a 5 estrellas) y comentario opcional.

\- \*\*Salida:\*\* Calificación registrada y actualización del promedio del usuario.



\### RF14: Consultar el perfil público de un usuario

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Baja | \*\*Prioridad:\*\* 3 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* No

\- \*\*Usuarios:\*\* Pasajero, Conductor

\- \*\*Entrada:\*\* ID del usuario a consultar.

\- \*\*Salida:\*\* Nombre, foto, programa académico, promedio de estrellas, total de viajes y comentarios recibidos. (Oculta datos de contacto e identidad sensible).



\### RF15: Notificar los eventos relevantes de los viajes

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Media | \*\*Prioridad:\*\* 4 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* No

\- \*\*Usuarios:\*\* Pasajero, Conductor

\- \*\*Entrada:\*\* Evento del sistema (solicitud, aceptación, rechazo, cancelación, recordatorio).

\- \*\*Salida:\*\* Notificación en app y correo electrónico institucional.



\### RF16: Verificar documentos y habilitar conductores

\- \*\*Fuente:\*\* Product Owner | \*\*Complejidad:\*\* Baja | \*\*Prioridad:\*\* 4 | \*\*Tipo:\*\* Necesario | \*\*Crítico:\*\* Sí

\- \*\*Usuarios:\*\* Administrador

\- \*\*Entrada:\*\* ID de solicitud de habilitación y decisión (aprobar/rechazar con motivo).

\- \*\*Salida:\*\* Conductor habilitado o rechazado con registro del administrador responsable.



\---



\## 4. ESPECIFICACIÓN DE CASOS DE USO (RESUMEN DE FLUJOS)



\- \*\*CU1: Registrar cuenta institucional:\*\* Formulario -> Validación correo UIS -> Envío de token/enlace -> Confirmación y activación.

\- \*\*CU2: Iniciar sesión y recuperar acceso:\*\* Autenticación por correo/pass -> Carga de rol. Opción de token de recuperación al correo.

\- \*\*CU3: Solicitar habilitación como conductor:\*\* Registro de vehículo (placa, marca, color, cupos) + Carga de SOAT, RTM y Licencia -> Estado pendiente.

\- \*\*CU4: Verificar documentos y habilitar conductor:\*\* Panel Admin -> Revisión de archivos -> Aprobación/Rechazo con motivo -> Notificación (CU12).

\- \*\*CU5: Publicar un viaje:\*\* Selección de origen/paradas/destino en mapa -> Invocación de API de rutas (CU6) -> Definición de cupos y aporte -> Confirmación.

\- \*\*CU6: Obtener el trazado de la ruta:\*\* Petición HTTP a API externa -> Recepción de geometría -> Guardado de coordenadas en base de datos.

\- \*\*CU7: Gestionar un viaje publicado:\*\* Vista de viajes del conductor -> Edición de datos (recalcula ruta si aplica) o cancelación notificando a los pasajeros.

\- \*\*CU8: Buscar viajes por proximidad y consultar su detalle:\*\* Selección de punto de origen + radio + franja horaria -> Filtro por fecha -> Cálculo de distancia mínima en metros al trazado -> Ordenamiento y vista de detalle.

\- \*\*CU9: Solicitar y cancelar un cupo:\*\* Envío de solicitud -> Notificación al conductor -> Opción de retiro de solicitud o cancelación de reserva liberando cupo.

\- \*\*CU10: Gestionar solicitudes recibidas:\*\* Vista de solicitudes pendientes -> Consulta del perfil del pasajero -> Aceptación (descuenta cupo) o Rechazo.

\- \*\*CU11: Calificar participantes:\*\* Habilitado tras finalizar el viaje -> Selección de estrellas (1-5) + comentarios opcionales -> Recálculo de reputación promedio.

\- \*\*CU12: Notificar eventos:\*\* Disparador automático por evento o cron de recordatorios -> Registro en bandeja de notificaciones y correo.

