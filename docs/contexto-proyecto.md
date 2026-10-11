# WHEEL-E · Contexto del proyecto

> Documento de referencia para el equipo y para los asistentes de código.
> Fuente: Entrega 1A (análisis y definición), Entrega 1B (requerimientos funcionales y casos de uso), backlog en Jira y EDT del proyecto (Entrega 2A).
> Ubicación sugerida en el repositorio: `docs/contexto-proyecto.md`.
> Si algo de este documento cambia en Jira o en una entrega, actualízalo aquí.

---

## 1. Resumen en una frase

WHEEL-E es una **aplicación móvil de viajes compartidos exclusiva para la comunidad de la Universidad Industrial de Santander (UIS)**. Un conductor publica un trayecto que ya iba a hacer hacia o desde el campus. El pasajero encuentra viajes que **pasan cerca de su punto de partida**, y esa cercanía la **calcula el sistema** sobre el trazado real de la ruta.

## 2. Equipo y forma de trabajo

| Código | Integrante | Rol principal | Rol secundario | Iniciales en Jira |
|---|---|---|---|---|
| 2232451 | Hermes Julián Delgado Guerrero | Product Owner | Development Team | JG |
| 2231893 | Samuel David Penilla Ramírez | Scrum Master | Development Team | SP |

- Proyecto de la asignatura **Ingeniería de Software (UIS)**, Grupo N° 7.
- Marco de trabajo **Scrum**, con 4 sprints. El backlog está en Jira (proyecto `WE`, tablero "WE board").
- Los dos integrantes diseñan, programan, prueban y documentan.

## 3. Problema que resuelve

- **Movilidad en el área metropolitana de Bucaramanga.** El parque automotor pasó de ~849.000 vehículos (2022) a ~972.000 (2026), sin nuevas soluciones viales. Metrolínea movilizó en 2024 solo 1,4 millones de pasajeros, un 96 % menos que en 2016.
- **La UIS** tiene más de 24.000 estudiantes, además de docentes y personal administrativo. Muchos viven en Floridablanca, Girón, Piedecuesta u otros municipios, y llegan al mismo punto en las mismas franjas horarias.
- **El problema tiene dos caras:**
  - Quienes no tienen vehículo dependen de transporte público o informal, que es costoso, lento e inseguro, sobre todo de noche.
  - Quienes sí tienen vehículo hacen el mismo recorrido con 2 o 3 puestos vacíos.
- **Hoy la coordinación es informal**, por grupos de WhatsApp y redes sociales. Eso trae varios problemas:
  - La información se pierde entre otros mensajes.
  - El alcance se limita a los contactos de cada persona.
  - No hay forma de verificar que el otro pertenece a la UIS.
  - No queda registro de viajes ni del comportamiento de los usuarios.
- **Las apps existentes** son servicios pagos entre desconocidos y no aprovechan que los viajeros tienen un destino común.

## 4. Justificación y propuesta de valor

- **Económica:** los pasajeros reparten el costo de un trayecto que de todos modos se iba a hacer. El conductor recibe un **aporte voluntario** que alivia el gasto de combustible.
- **Movilidad y ambiente:** más ocupantes por vehículo significa menos carros entrando al campus, menos congestión, menos ocupación de parqueaderos y menos emisiones.
- **Confianza:** solo pueden entrar personas con **correo institucional UIS**. Eso crea un espacio de confianza que las plataformas abiertas no ofrecen.
- **Viabilidad:** hay antecedentes en universidades colombianas, como la plataforma GoU (U. de Cundinamarca) y el prototipo de vehículo compartido de la U. del Cauca.

## 5. Visión

Reemplazar la coordinación informal por una app **funcional, sencilla y confiable**, en la que un miembro de la comunidad UIS encuentre en pocos pasos con quién compartir su trayecto. El desarrollo es iterativo: al final de cada sprint debe existir una versión funcional que se pueda revisar.

## 6. Objetivos

**Objetivo general.** Desarrollar una aplicación móvil que permita a los miembros verificados de la comunidad universitaria de la UIS publicar, encontrar y coordinar viajes compartidos hacia el campus. La búsqueda se basa en la proximidad geográfica entre el punto de partida del pasajero y el trazado de la ruta del conductor.

**Objetivos específicos** (tal como están en las entregas):
1. Implementar un módulo de autenticación e identidad que valide el correo institucional (`@uis.edu.co` / `@correo.uis.edu.co`) al registrarse.
2. Desarrollar el módulo de gestión de viajes: puntos de partida, trazado de la ruta en el mapa, horarios de salida y número de cupos.
3. Diseñar e integrar el algoritmo de búsqueda por proximidad geográfica entre el origen del pasajero y el trazado de la ruta del conductor, dentro de un radio configurable.
4. Construir el sistema de solicitud y reserva de cupos: el pasajero solicita, el conductor acepta o rechaza, y el solicitante recibe el resultado.
5. Implementar mecanismos de confianza y comunicación: mensajería entre conductor y pasajeros confirmados, calificación bidireccional al finalizar el viaje e historial de valoraciones en el perfil.
6. Desarrollar el módulo de administración: supervisión de la plataforma, verificación manual de documentos vehiculares, atención de reportes de conducta y sanción de cuentas.
7. Realizar pruebas funcionales al cierre de cada incremento y elaborar la documentación técnica y de usuario.

> Hay partes de los objetivos 5 y 6 que **no tienen requerimiento funcional ni historia en el backlog** (ver sección 13).

## 7. Actores

| Actor | Descripción |
|---|---|
| **Pasajero** | Usuario verificado que necesita transporte. Busca viajes por cercanía, solicita cupos, se comunica con el conductor y lo califica al final. |
| **Conductor** | Usuario verificado que además registró un vehículo y fue **habilitado por un administrador**. Publica viajes, gestiona solicitudes y cupos, y califica a sus pasajeros. **Un mismo usuario puede ser conductor en unos viajes y pasajero en otros.** |
| **Administrador** | Opera la plataforma. Verifica documentos vehiculares y habilita conductores. **No publica ni solicita viajes.** |
| **Servicio externo de rutas** | Actor de sistema, en nuestro caso OpenRouteService. Recibe coordenadas y devuelve el trazado del recorrido sobre las calles de la ciudad. |

## 8. Cómo funciona el producto

1. **Registro:** el usuario se registra con correo UIS y confirma el correo. Solo entonces la cuenta queda activa.
2. **Habilitación de conductor (opcional):**
   - El usuario registra su vehículo y carga SOAT, revisión tecnomecánica y licencia de conducción.
   - La solicitud queda pendiente hasta que un administrador la aprueba.
3. **Publicar un viaje:**
   - El conductor habilitado marca en el mapa el origen, las paradas intermedias opcionales y el destino.
   - Indica fecha, hora de salida, cupos, aporte sugerido y vehículo.
   - El sistema consulta OpenRouteService, obtiene el trazado real y lo **guarda con el viaje, una sola vez**.
4. **Buscar un viaje:**
   - El pasajero marca su punto de partida e indica fecha, franja horaria y radio de tolerancia en metros (cuánto está dispuesto a caminar).
   - El sistema calcula la **distancia mínima entre ese punto y el trazado de cada viaje** y muestra los resultados ordenados de menor a mayor, con la distancia en metros.
5. **Ver el detalle:** el pasajero ve la ruta dibujada en el mapa, el punto donde pasa más cerca, la hora, los cupos, el aporte y el perfil público del conductor.
6. **Solicitar cupo:** queda pendiente. El conductor acepta o rechaza, y al aceptar se descuenta un cupo.
7. **El viaje se realiza y se finaliza.**
8. **Calificar:** conductor y pasajeros se califican entre sí, de 1 a 5 y con comentario opcional.
9. **Notificaciones:** la app avisa de cada evento importante, dentro de la app y por correo institucional.

**El sistema NO procesa pagos.** El aporte sugerido es solo una referencia, y el dinero se arregla directamente entre las personas.

**Lo que diferencia al producto:** el usuario no declara la coincidencia de ruta. **La calcula el sistema** sobre el trazado real.

## 9. Glosario

- **Usuario verificado:** se registró con correo UIS válido y lo confirmó. Es el requisito mínimo para usar el sistema.
- **Conductor habilitado:** usuario verificado con al menos un vehículo aprobado por un administrador. Es el único que puede publicar viajes.
- **Trazado de la ruta:** secuencia de coordenadas del recorrido real por las calles. Lo devuelve el servicio de rutas y se almacena con el viaje.
- **Cupo:** puesto disponible en un viaje. Disminuye cuando el conductor **acepta** una solicitud, no cuando el pasajero la envía.
- **Punto de partida:** ubicación que marca el pasajero. Es la referencia para calcular la proximidad.
- **Radio de tolerancia:** distancia máxima, en metros, que el pasajero acepta entre su punto de partida y el trazado.
- **Distancia de proximidad:** distancia mínima entre el punto de partida y el trazado del viaje. Sirve para filtrar y ordenar los resultados.
- **Franja horaria:** rango de horas en el que el pasajero necesita viajar.
- **Aporte sugerido:** contribución voluntaria por pasajero que propone el conductor. Solo se registra.
- **Calificación bidireccional:** valoración mutua entre el conductor y cada pasajero al finalizar el viaje.

## 10. Stack tecnológico y decisiones técnicas

| Capa | Tecnología |
|---|---|
| App móvil | **React Native con Expo** (TypeScript, expo-router) |
| Backend | **Supabase**: Auth, PostgreSQL con **PostGIS**, Storage y políticas **RLS** |
| Mapas | **OpenStreetMap** (mapa base) |
| Rutas | **OpenRouteService** (API de direcciones) |
| Gestión | Jira (Scrum), GitHub (código) |

Decisiones ya tomadas en los requerimientos:
- **El trazado se calcula una sola vez:** al publicar el viaje o al modificar su recorrido. Nunca en cada consulta, para no gastar la cuota de OpenRouteService.
- **No se publica un viaje sin trazado.** Si OpenRouteService falla, se informa al usuario y se permite reintentar.
- **La proximidad es distancia en línea recta** entre el punto y la ruta (PostGIS sobre `geography`), no distancia caminando. Por eso siempre se muestra la ruta en el mapa, para que el pasajero verifique.
- **Antes de calcular distancias** se filtra por fecha, franja horaria, cupos disponibles, viaje no propio y hora de salida no pasada.
- **El perfil público nunca expone** correo, número de documento ni datos de contacto.

## 11. Estructura del código y reglas

```
app/            pantallas (expo-router): (auth)/, (tabs)/, viaje/[id], etc.
services/       funciones que hablan con Supabase u OpenRouteService, una por módulo
components/     piezas de interfaz reutilizables (Mapa, TarjetaViaje, Estrellas…)
lib/            supabase.ts (cliente único)
utils/          validaciones y formatos
constants/      colores y configuración (dominios permitidos, valores por defecto)
hooks/          useSesion, etc.
supabase/migrations/   scripts SQL numerados (tablas, RLS, funciones PostGIS)
docs/           documentación del proyecto (este archivo)
```

Reglas:
1. **Las pantallas no llaman a Supabase directamente**: siempre pasan por `services/`.
2. **Todo cambio de base de datos se guarda en un archivo** de `supabase/migrations/` (numerado), no solo en el panel web.
3. **RLS activado en todas las tablas.** Cada usuario solo ve o modifica lo que le corresponde según su rol.
4. **Claves solo en `.env`**, y ese archivo no se sube a GitHub. En la app va únicamente la *anon key*; la *service_role key* nunca va.
5. Las librerías se instalan con `npx expo install`.
6. Se trabaja **una historia de usuario a la vez**, en su propia rama (`feature/...`), y se valida contra sus criterios de aceptación.

## 12. Estados del sistema

Estos estados están implícitos en los requerimientos y conviene modelarlos tal cual.

| Entidad | Estados | Notas |
|---|---|---|
| Cuenta | `pendiente_confirmacion` → `activa`; además `suspendida` / `bloqueada` | Solo una cuenta activa puede iniciar sesión. |
| Solicitud de habilitación | `pendiente` → `aprobada` / `rechazada`; `cancelada` (la retira el usuario) | Se registran el administrador que decide y la fecha. El rechazo exige motivo. |
| Viaje | `publicado` → `en_curso` → `finalizado`; `cancelado` | Solo se edita o cancela si no ha iniciado. Solo un viaje finalizado se puede calificar. |
| Solicitud de cupo | `pendiente` → `aceptada` (reserva confirmada) / `rechazada`; `cancelada` | Al aceptar se descuenta 1 cupo. Al cancelar una reserva confirmada se devuelve el cupo. |

## 13. Alcance

**Dentro del alcance (backlog actual):** RF1 a RF16 (sección 14) y la tarea de inicio y finalización del viaje.

**Fuera del alcance actual** (se mencionan en los objetivos pero no tienen RF ni historia):
- Mensajería o chat entre conductor y pasajeros.
- Reportes de conducta y sanción de cuentas por el administrador.
- Configuración de parámetros del sistema desde la app.
- Pagos (por definición, el sistema no procesa pagos).

> No implementar nada de esta lista sin que antes se agregue al backlog.

## 14. Requerimientos funcionales

Prioridad de 1 a 5, donde 5 es la más alta.

### Módulo de cuentas y acceso

**RF1 · Registrar usuario con correo institucional.** Complejidad media, prioridad 5, crítico.
- **Entrada:** nombre completo, código institucional, correo institucional, contraseña, programa académico y foto de perfil (opcional).
- **Salida:** cuenta en estado pendiente de confirmación y correo de verificación enviado.
- **Regla:** el dominio debe ser `@uis.edu.co` o `@correo.uis.edu.co`. La cuenta solo se activa al abrir el enlace de verificación.
- **Casos a manejar:**
  - Correo no institucional: mensaje "solo se admiten correos de la UIS" y no se crea la cuenta.
  - Correo ya registrado: avisar y ofrecer recuperar la contraseña.
  - Faltan datos: señalar los campos obligatorios.
  - Contraseña corta: mostrar las condiciones.
  - El enlace expira: permitir reenviarlo.
  - Si el registro ya existía sin confirmar: reenviar el enlace en vez de crear otra cuenta.
- **Aceptación:**
  - La cuenta solo se crea con dominio UIS.
  - Se rechaza e informa si el correo no es institucional o ya existe.
  - Solo se inicia sesión después de confirmar el correo.

**RF2 · Autenticar usuario y recuperar acceso.** Complejidad baja, prioridad 5, crítico.
- **Entrada:** correo y contraseña. Para recuperar, solo el correo.
- **Salida:** sesión iniciada con su rol (pasajero, conductor habilitado o administrador), o correo con el enlace de restablecimiento.
- **Casos a manejar:**
  - Credenciales incorrectas: mensaje **genérico**, sin decir cuál de los dos datos falló.
  - Cuenta sin confirmar: avisar y permitir reenviar la verificación.
  - Cuenta suspendida o bloqueada: informar el estado y no dejar entrar.
  - Demasiados intentos fallidos: bloqueo temporal en ese dispositivo.
  - Enlace de restablecimiento vencido: permitir pedir otro.
  - La sesión se mantiene en el dispositivo y hay opción de cerrar sesión.
- **Aceptación:**
  - Solo entran cuentas registradas, confirmadas y activas.
  - El enlace de restablecimiento se envía solo al correo de la cuenta y tiene vigencia limitada.

**RF3 · Registrar vehículo y solicitar habilitación como conductor.** Complejidad media, prioridad 5, crítico.
- **Entrada:** placa, marca, línea, modelo, color, número de puestos, y archivos del SOAT, la revisión tecnomecánica y la licencia de conducción.
- **Salida:** solicitud de habilitación en estado pendiente.
- **Casos a manejar:**
  - Faltan datos o documentos: indicar cuáles.
  - Placa ya registrada por otro usuario: conflicto, no se crea la solicitud.
  - Archivo con formato o tamaño no permitido: indicar los permitidos.
  - Ya hay una solicitud pendiente: mostrar su estado en lugar de crear otra.
  - El usuario abandona el formulario: conservar el borrador.
  - El usuario retira la solicitud: queda cancelada.
  - Solicitud rechazada: puede corregir y reenviar.
  - Segundo vehículo: genera una solicitud independiente.
- **Aceptación:**
  - Solo se crea la solicitud con todos los datos y documentos.
  - No se publican viajes hasta que la solicitud sea aprobada.
  - El usuario puede consultar el estado en todo momento.

### Módulo de gestión de viajes

**RF4 · Publicar un viaje.** Complejidad alta, prioridad 5, crítico.
- **Entrada:** coordenadas de origen, paradas intermedias (opcionales) y destino; fecha, hora de salida, cupos, aporte sugerido y vehículo.
- **Salida:** viaje en estado publicado, con el trazado almacenado y visible en las búsquedas.
- **Casos a manejar:**
  - Fecha u hora ya pasada: no se permite publicar.
  - Cupos en 0 o mayores que la capacidad del vehículo elegido: informar el rango válido.
  - Origen igual al destino: pedir que se corrijan los puntos.
  - Falta el origen o el destino: no se habilita publicar.
  - Falla el servicio de rutas: informar y permitir reintentar, sin publicar.
  - Usuario no habilitado: redirigir al registro de vehículo (RF3).
  - Si mueve puntos antes de confirmar, se recalcula el trazado.
- **Aceptación:**
  - Solo se publica con datos válidos y conductor habilitado.
  - El viaje queda asociado a un trazado almacenado.
  - Aparece en las búsquedas que correspondan.

**RF5 · Obtener y almacenar el trazado de la ruta.** Complejidad alta, prioridad 5, crítico.
- **Entrada:** lista ordenada de coordenadas (origen, paradas, destino).
- **Salida:** geometría del recorrido real por las calles, guardada con el viaje.
- **Reglas:**
  - Se calcula una sola vez, al publicar o al cambiar el recorrido.
  - Si la edición no cambia los puntos, no se vuelve a consultar el servicio.
- **Casos a manejar:**
  - El servicio no responde o tarda demasiado: informar y permitir reintentar.
  - Se agotó la cuota: registrar el error y avisar al administrador.
  - Un punto no está sobre una vía transitable: pedir que se ajuste.
  - Respuesta incompleta o con formato inesperado: descartarla y pedir reintentar.
- **Aceptación:**
  - El trazado queda almacenado y asociado al viaje.
  - La ruta se dibuja siguiendo las calles.
  - Si el servicio falla, se informa y no se publica un viaje sin trazado.

**RF6 · Modificar o cancelar un viaje publicado.** Complejidad media, prioridad 4, crítico.
- **Entrada:** viaje y datos a cambiar, o confirmación de cancelación con su motivo.
- **Salida:** viaje actualizado, o cancelado con aviso a los pasajeros afectados.
- **Reglas:**
  - Solo puede hacerlo el conductor que lo publicó, y solo si el viaje no ha iniciado.
  - Si cambia el recorrido, se recalcula el trazado (RF5).
- **Casos a manejar:**
  - Reducir los cupos por debajo de las reservas confirmadas: no se permite.
  - Viaje ya iniciado o finalizado: se muestra en solo lectura.
  - Nueva fecha u hora ya pasada: no se guarda el cambio.
  - Falla el recálculo: se conserva el trazado anterior y no se guarda el cambio de recorrido.
  - Cancelación con reservas confirmadas: exige motivo, cierra solicitudes y reservas, notifica a cada pasajero y retira el viaje de las búsquedas.
- **Aceptación:**
  - Solo el conductor del viaje puede modificarlo o cancelarlo.
  - Al cancelar, los pasajeros confirmados reciben notificación.
  - El trazado se actualiza cuando cambia el recorrido.

**RF7 · Consultar los viajes propios.** Complejidad baja, prioridad 3.
- **Entrada:** usuario autenticado y filtro (próximos o finalizados; como conductor o como pasajero).
- **Salida:** lista de viajes con fecha, hora, estado y rol que desempeñó el usuario.
- **Casos a manejar:**
  - Sin resultados: mostrar un mensaje.
  - Debe indicarse claramente el rol del usuario en cada viaje.
- **Aceptación:**
  - Solo aparecen viajes en los que el usuario participa.
  - Cada viaje muestra su estado y el rol del usuario.

### Módulo de búsqueda y emparejamiento

**RF8 · Buscar viajes por proximidad geográfica.** Complejidad alta, prioridad 5, crítico. **Es la funcionalidad diferenciadora.**
- **Entrada:** punto de partida (coordenadas), fecha, franja horaria y radio de tolerancia en metros.
- **Salida:** viajes con distancia menor o igual al radio, ordenados de menor a mayor e indicando los metros.
- **Reglas:**
  - Se excluyen los viajes sin cupos, los propios y los que ya salieron.
  - Se filtra por fecha y franja **antes** de calcular distancias.
  - La distancia es en línea recta hasta el trazado.
- **Casos a manejar:**
  - Sin resultados: sugerir ampliar el radio o cambiar la franja, conservando los criterios.
  - No marcó el punto de partida: no se habilita la búsqueda.
  - Hora final anterior a la inicial: pedir corrección.
  - Fecha ya pasada: no se ejecuta la búsqueda.
  - Conductor suspendido: su viaje no aparece.
- **Aceptación:**
  - Solo aparecen viajes dentro del radio.
  - Los resultados van ordenados y muestran los metros.
  - Al cambiar el radio, los resultados se actualizan.

**RF9 · Consultar el detalle de un viaje.** Complejidad media, prioridad 4, crítico.
- **Entrada:** viaje seleccionado y punto de partida del pasajero.
- **Salida:** recorrido en el mapa, punto donde la ruta pasa más cerca, distancia, hora de salida, cupos, aporte sugerido y datos públicos del conductor.
- **Casos a manejar:**
  - Viaje cancelado o sin cupos mientras se consulta: informar y deshabilitar la solicitud.
  - Solo se muestran datos públicos del conductor; no hay datos de contacto antes de que la reserva esté confirmada.
- **Aceptación:**
  - Se ve el trazado completo y la distancia al punto de partida.
  - Solicitar cupo solo está disponible si hay cupos.

### Módulo de solicitudes y cupos

**RF10 · Solicitar un cupo.** Complejidad media, prioridad 5, crítico.
- **Entrada:** viaje, pasajero y mensaje opcional al conductor.
- **Salida:** solicitud pendiente y notificación al conductor.
- **Casos a manejar:**
  - El viaje no tiene cupos: no se registra la solicitud.
  - Ya existe una solicitud o reserva en ese viaje: mostrar su estado.
  - El horario se cruza con otra reserva confirmada del pasajero: no se permite.
  - Es un viaje propio: la opción no aparece.
- **Aceptación:**
  - Solo se registra si hay cupos y no hay cruce de horario.
  - El conductor recibe la notificación.
  - **El cupo no se descuenta hasta que el conductor acepte.**

**RF11 · Gestionar las solicitudes recibidas (conductor).** Complejidad media, prioridad 5, crítico.
- **Entrada:** solicitud y decisión (aceptar, o rechazar con motivo opcional).
- **Salida:** solicitud aceptada o rechazada, cupo descontado si se acepta y notificación al pasajero.
- **Detalles:**
  - Las solicitudes se ven agrupadas por viaje, junto con el perfil público del solicitante y su mensaje.
  - Al aceptar se habilita la comunicación entre las partes.
- **Casos a manejar:**
  - Aceptar sin cupos disponibles: no se permite.
  - El pasajero canceló antes: se muestra como cancelada.
  - Viaje cancelado: todas las solicitudes pendientes se cierran y se notifica.
  - Usuario que no es el conductor del viaje: no puede acceder.
- **Aceptación:**
  - Al aceptar, los cupos bajan en 1.
  - El pasajero recibe la decisión.
  - Solo el conductor del viaje decide.

**RF12 · Cancelar una solicitud o una reserva confirmada (pasajero).** Complejidad media, prioridad 4, crítico.
- **Entrada:** solicitud o reserva y confirmación.
- **Salida:** solicitud o reserva cancelada, cupo devuelto si estaba confirmada y conductor notificado.
- **Casos a manejar:**
  - El viaje ya inició o finalizó: no se permite cancelar.
  - Cancelación con poca antelación: se registra en el historial del pasajero.
  - El conductor siempre se notifica.
- **Aceptación:**
  - El cupo vuelve a quedar disponible.
  - El conductor recibe la notificación.
  - No se puede cancelar un viaje ya iniciado.

### Módulo de confianza y reputación

**RF13 · Calificar a los participantes de un viaje finalizado.** Complejidad baja, prioridad 3.
- **Entrada:** viaje, usuario calificado, nota de 1 a 5 y comentario opcional.
- **Salida:** calificación registrada y promedio del usuario calificado actualizado.
- **Casos a manejar:**
  - Viaje no finalizado: la opción no aparece.
  - Ya calificó a esa persona en ese viaje: no puede calificar dos veces.
  - Venció el plazo: la opción se cierra.
  - Confirmar sin elegir una nota: pedirla.
  - Usuario que no participó en el viaje: no puede acceder.
  - El conductor califica uno por uno a sus pasajeros.
- **Aceptación:**
  - Una sola calificación por participante y viaje.
  - Se refleja en el promedio del calificado.
  - Solo en viajes finalizados.

**RF14 · Consultar el perfil público de un usuario.** Complejidad baja, prioridad 3.
- **Salida:** nombre, foto, programa académico, calificación promedio, número de viajes y comentarios recibidos.
- **Casos a manejar:**
  - Sin calificaciones: mostrar "aún sin valoraciones" en vez de un promedio.
  - No se exponen el correo, el documento ni los datos de contacto.
  - Cuenta suspendida: el perfil no se muestra.
- **Aceptación:**
  - Muestra el promedio y el número de viajes.
  - No expone datos sensibles.

### Módulo de notificaciones

**RF15 · Notificar los eventos relevantes.** Complejidad media, prioridad 4.
- **Eventos:**
  - Nueva solicitud de cupo.
  - Solicitud aceptada o rechazada.
  - Cancelación de un viaje o de una reserva.
  - Cambios en un viaje con reservas confirmadas.
  - Decisión sobre la habilitación como conductor.
  - Recordatorio cercano a la hora de salida.
  - Calificación disponible.
- **Canal:** bandeja dentro de la app y correo institucional.
- **Casos a manejar:**
  - Falla el correo: la notificación sigue en la app y se reintenta el envío.
  - Notificaciones ordenadas de la más reciente a la más antigua, con indicador de no leídas.
  - Hay historial consultable.
  - No se envían a cuentas suspendidas.
  - No se duplican si el mismo evento se reporta dos veces.
  - Al abrir una notificación, lleva al viaje o la solicitud correspondiente.
- **Aceptación:**
  - Cada evento genera la notificación para los usuarios involucrados.
  - Las notificaciones quedan registradas en la app.

### Módulo de administración

**RF16 · Verificar documentos y habilitar conductores.** Complejidad baja, prioridad 4, crítico.
- **Entrada:** solicitud pendiente y decisión (aprobar, o rechazar con motivo **obligatorio**).
- **Salida:** usuario habilitado como conductor con su vehículo aprobado, o rechazo con el motivo notificado.
- **Detalles:**
  - Las solicitudes se listan por fecha de recepción.
  - El administrador revisa la vigencia y la legibilidad de cada documento.
- **Casos a manejar:**
  - Documentos vencidos o ilegibles: se rechaza con motivo y el usuario puede volver a cargarlos.
  - Rechazar sin motivo: no se permite.
  - Solicitud cancelada por el usuario: no se puede aprobar ni rechazar.
  - Ya la resolvió otro administrador: avisar y refrescar la lista.
  - El administrador puede aplazar la decisión.
- **Aceptación:**
  - Solo se publican viajes después de la aprobación.
  - El usuario recibe la decisión, y el motivo si fue rechazado.
  - Cada decisión queda registrada con el administrador y la fecha.

### Requerimientos no funcionales (resumen de la EDT)

- App móvil en React Native, compatible con Android e iOS.
- Operaciones CRUD sobre los datos, con persistencia en PostgreSQL (Supabase).
- Uso de APIs externas (Supabase y OpenRouteService) integradas con la app.
- Seguridad: acceso solo con correo UIS y permisos por rol (RLS).
- Rendimiento razonable en la búsqueda: filtrar antes de calcular distancias y no recalcular trazados.
- Formatos estándar para el intercambio de datos (JSON y GeoJSON).

## 15. Casos de uso

| CU | Nombre | RF | Actor | Incluye |
|---|---|---|---|---|
| CU1 | Registrar cuenta institucional | RF1 | Usuario | — |
| CU2 | Iniciar sesión y recuperar el acceso | RF2 | Usuario, Administrador | — |
| CU3 | Solicitar habilitación como conductor | RF3 | Conductor | — |
| CU4 | Verificar documentos y habilitar conductor | RF16 | Administrador | CU12 |
| CU5 | Publicar un viaje | RF4 | Conductor | CU6 |
| CU6 | Obtener el trazado de la ruta | RF5 | Servicio de rutas | — |
| CU7 | Gestionar un viaje publicado | RF6, RF7 | Conductor | CU6, CU12 |
| CU8 | Buscar viajes por proximidad y ver su detalle | RF8, RF9, RF14 | Pasajero | — |
| CU9 | Solicitar y cancelar un cupo | RF10, RF12, RF7 | Pasajero | CU12 |
| CU10 | Gestionar las solicitudes recibidas | RF11, RF14 | Conductor | CU12 |
| CU11 | Calificar a los participantes | RF13 | Pasajero, Conductor | — |
| CU12 | Notificar eventos del viaje | RF15 | Sistema → Pasajero, Conductor | — |

## 16. Backlog en Jira (épicas, historias y sprints)

**Épicas:**
1. Gestión de cuentas y perfiles: RF1, RF2, RF14.
2. Gestión de viajes: RF4, RF5, RF6, RF7.
3. Búsqueda por proximidad: RF8, RF9.
4. Gestión de solicitudes y reservas: RF10, RF11, RF12.
5. Confianza y comunicación: RF3, RF13, RF15.
6. Administración de la plataforma: RF16.

| Sprint | Jira | Historia de usuario | RF | SP | Responsable |
|---|---|---|---|---|---|
| 1 | WE-7 | Registrarme con mi correo institucional para acceder a la aplicación | RF1 | 5 | Hermes |
| 1 | WE-10 | Confirmar mi correo institucional para que mi cuenta quede verificada | RF1 | 3 | Samuel |
| 1 | WE-11 | Iniciar sesión con mis credenciales para acceder a mi perfil | RF2 | 3 | Hermes |
| 1 | WE-12 | Recuperar mi contraseña para no perder el acceso a mi cuenta | RF2 | 3 | Samuel |
| 1 | WE-14 | Solicitar mi habilitación como conductor cargando los documentos de mi vehículo | RF3 | 5 | Samuel |
| 1 | WE-15 | Revisar los documentos de una solicitud para habilitar o rechazar a un conductor | RF16 | 5 | Hermes |
| 2 | WE-16 | Publicar un viaje marcando origen, paradas y destino para ofrecer cupos | RF4 | 8 | Samuel |
| 2 | WE-17 | Obtener el trazado real de la ruta desde el servicio externo y almacenarlo | RF5 | 8 | Hermes |
| 2 | WE-18 | Modificar un viaje publicado para corregir sus datos antes de realizarlo | RF6 | 5 | Samuel |
| 2 | WE-19 | Cancelar un viaje publicado para informar a los pasajeros | RF6 | 3 | Hermes |
| 2 | WE-20 | Consultar mis viajes y reservas para hacer seguimiento a mi participación | RF7 | 3 | Samuel |
| 3 | WE-13 | Consultar el perfil público de otro usuario para saber con quién viajaré | RF14 | 3 | Hermes |
| 3 | WE-21 | Buscar los viajes que pasan cerca de mi punto de partida | RF8 | 8 | Hermes |
| 3 | WE-22 | Consultar el detalle de un viaje sobre el mapa para decidir si me sirve | RF9 | 5 | Samuel |
| 4 | WE-23 | Solicitar un cupo en un viaje para reservar mi puesto | RF10 | 5 | Hermes |
| 4 | WE-24 | Aceptar o rechazar las solicitudes recibidas | RF11 | 5 | Samuel |
| 4 | WE-25 | Cancelar mi solicitud o mi reserva para liberar el cupo | RF12 | 3 | Hermes |
| 4 | WE-26 | Calificar a los demás participantes para construir la confianza de la comunidad | RF13 | 5 | Samuel |
| 4 | WE-27 | Recibir notificaciones de los eventos de mis viajes | RF15 | 5 | Hermes |

Total: 19 historias, 90 story points. Para estimar se usa 1 SP ≈ 2 horas.

**Además**, la EDT incluye el entregable **"Inicio y finalización del viaje" (4 h)**, necesario porque RF13 exige que el viaje esté finalizado. Si aún no existe en Jira, hay que crearlo.

**Orden de dependencias:**
1. Cuentas (Sprint 1).
2. Habilitación de conductor (Sprint 1).
3. Publicación y trazado (Sprint 2).
4. Búsqueda y detalle (Sprint 3).
5. Solicitudes, calificación y notificaciones (Sprint 4).

## 17. Valores sin definir en los documentos

Los requerimientos mencionan estos parámetros pero no fijan su valor. Hay que centralizarlos en `constants/config.ts` y **acordarlos con el equipo**, no inventarlos en cada pantalla:

- Longitud mínima y reglas de la contraseña.
- Vigencia del enlace de verificación y del de restablecimiento de contraseña.
- Número de intentos fallidos antes del bloqueo temporal, y duración del bloqueo.
- Formatos y tamaño máximo de los documentos y fotos.
- Radio de tolerancia por defecto y máximo.
- Tiempo previo para el recordatorio de salida.
- Plazo para calificar un viaje finalizado.
- Qué se considera "cancelación con poca antelación".
- Rango de calificación: de 1 a 5 (este sí está definido).

## 18. Diseño de interfaces

Prototipo en Figma: https://www.figma.com/make/ZT4JiXKAKfTcj0Z8ahxs63/WHEEL-E-Mobile-App-UI-Kit

Pantallas del storyboard:
- Inicio de sesión y crear cuenta.
- Publicar ruta y buscar ruta.
- Solicitudes y detalle del viaje.
- Calificación del viaje.
