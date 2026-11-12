# 06 — Matriz de calidad unificada

Estado real de Tienda USCO en las tres dimensiones no funcionales, antes y después del plan de corrección (detalle de cada corrección en `05-correcciones.md`). Todos los valores son medidos sobre la aplicación real, salvo el SUS y los tiempos por perfil, que vienen de perfiles simulados con IA (autorizado por el docente y declarado en `04-usabilidad.md`).

## Criterio de calificación

| Calificación | Criterio |
|---|---|
| **Óptimo** | Cumple todos los umbrales y no tiene hallazgos abiertos de severidad media o superior (Nielsen 2 o más). |
| **Aceptable** | No tiene hallazgos críticos abiertos (Crítica, o Nielsen 4) y cada indicador principal cumple su umbral o, si no lo cumple, tiene la causa identificada y una corrección en la hoja de ruta. |
| **Requiere mejora** | Tiene algún hallazgo crítico abierto o un indicador principal que falla sin causa identificada. |

Umbrales de referencia: lecturas p95 < 500 ms; escrituras p95 < 1500 ms; errores < 1 % (k6). ZAP sin alertas altas ni medias. WCAG 2.1 AA sin violaciones graves ni críticas (axe-core). SUS ≥ 68 (promedio de referencia).

## Matriz

| Dimensión | Indicadores | Estado inicial | Estado después | Hallazgos abiertos | Calificación inicial → final |
|---|---|---|---|---|---|
| **Rendimiento** (k6) | Catálogo con 50 VUs: p95 y errores | 8,3 ms, 0 % | Sin cambios en esa ruta (no se repitió) | REN-03 (Media): el pago simulado retiene el bloqueo 500 ms; el checkout sigue sobre 1,5 s de p95 | Requiere mejora → **Aceptable** |
| | Checkout con 20 VUs (C1 / C2): errores | 23,26 % / 44,68 % | **0 % / 0 %** | REN-04 (Media): login con `bcryptjs` en el hilo principal | |
| | Checkout (C1 / C2): throughput | 0,62 / 0,34 req/s | **4,61 / 1,84 req/s** | REN-05 (Informativa): medición en modo desarrollo en un portátil | |
| | Checkout (C1 / C2): máximo | 60 s colgado / 60 s colgado | 6,87 s / 9,53 s | | |
| | Checkout (C1 / C2): p95 | 60,00 s / 59,99 s | 5,26 s / 9,51 s (sobre el umbral por REN-03) | | |
| | ¿El servidor se bloquea? / órdenes sin respuesta | Sí / 10 | **No / 0** | | |
| | Login con 30 VUs: p95 y errores | 2,51 s, 0 % | 1,21 s, 0 % (por variación del equipo, no por un cambio) | | |
| | Integridad del stock y concurrencia | Cuadra | Cuadra; 3 de 3 superadas | | |
| **Seguridad** (OWASP ZAP + pruebas manuales) | ZAP API con token de cliente: Alta / Media / Baja / Informativa | 0 / 0 / 3 / 3 | 0 / 0 / **1** / 3 | SEG-03 (Media): token en `localStorage` y sin revocación | Requiere mejora → **Aceptable** |
| | Fuerza bruta: 50 intentos fallidos | 50 aceptados | **5** aceptados, 45 bloqueados (429) | SEG-06, SEG-07, SEG-08, SEG-10 (Bajas) | |
| | Cabeceras de seguridad en la API | 0 de 5, `X-Powered-By: Express` | **5 de 5**, sin `X-Powered-By` | | |
| | ZAP baseline del frontend (build :4173): Alta / Media / Baja / Informativa | 0 / 2 / 1 / 2 (sin CSP, sin X-Frame-Options, sin nosniff) | 0 / 1 / 4 / 3: desaparecen las 3 de SEG-04; nuevas SEG-14 y SEG-15 | SEG-13 (Informativa), SEG-14 y SEG-15 (Bajas) | |
| | Rutas mapeadas por ZAP (paso 2.3.1) | 6 URL del frontend (spider tradicional) | 15 URL del frontend y 12 endpoints del API (proxy + AJAX spider) | | |
| | Base de datos desde la red local con `postgres/postgres` | Conecta | **Puerto cerrado**; por loopback, clave rechazada | | |
| | Autobloqueo con 10 compras (SEG-01, disponibilidad) | Sí | **No** | | |
| | Inyección SQL (14 cargas), XSS almacenado, IDOR, asignación masiva, errores que revelan el servidor | No explotables; ningún error filtra stack ni detalles de PostgreSQL | Igual; IDOR del chatbot sin fuga en la regresión | | |
| | Contraseñas en texto plano / `npm audit` | No (bcrypt) / 0 vulnerabilidades | Igual | | |
| **Usabilidad y accesibilidad** (Nielsen, SUS, KLM, axe-core) | axe-core en 8 pantallas: críticas / graves / moderadas | 0 / **43** / 3 | 0 / **0** / 3 | USA-08 (3): sin recuperación de contraseña | Requiere mejora → **Aceptable** |
| | Contraste del texto secundario sobre el fondo | 2,45:1 (falla WCAG AA) | **7,24:1** (cumple AA) | USA-01, 05, 06, 07, 09 (2) | |
| | Tareas completadas por los perfiles (simulado) | 45/45, 11 con dificultad | No se repite (ver `05-correcciones.md`) | USA-04, 10, 11, 12, 13 (1) | |
| | SUS promedio (simulado) | 75,0, "Bueno" | No se repite | | |
| | Tareas automatizadas (Playwright) | 27/27 | T5 3/3; flujo de regresión 8/8 | | |
| | T5 rechazo y reintento: KLM | 36,91 s | 37,47 s con otra tarjeta; tramo de reintento con la misma tarjeta 11,87 → 4,19 s (compromiso, no mejora) | | |

## Diagnóstico por dimensión

- **Rendimiento:** nuestra app resiste bien la carga de lectura (catálogo de 50 usuarios con 8 ms de p95) y ya no se cae con compras simultáneas, pero el checkout sigue lento bajo contención porque el pago simulado retiene el bloqueo del producto 500 ms.
- **Seguridad:** nuestra app no tiene alertas altas según ZAP, envía cabeceras de seguridad en la API y en el frontend, protege el login contra fuerza bruta y ya no expone la base de datos, pero el token de sesión vive en `localStorage` y no se puede revocar, y la CSP admite imágenes de cualquier origen `https:` para que el admin pueda usar imágenes externas.
- **Usabilidad:** nuestra app se usa con éxito (SUS 75, "Bueno") y ahora cumple el contraste de WCAG 2.1 AA en todas las pantallas, pero falla a los usuarios con menos experiencia en puntos como la recuperación de contraseña y la confirmación de acciones.

**En una frase:** Tienda USCO pasó de "Requiere mejora" a "Aceptable" en las tres dimensiones, con los tres problemas críticos corregidos y medidos, y con una hoja de ruta concreta para lo que falta.

## Trazabilidad de todos los hallazgos (paso 3.2 de la metodología)

Hay **32 hallazgos válidos** en `02`, `03` y `04` (incluidos SEG-13 del paso 2.3.1, SEG-14 y SEG-15 de la medición de SEG-04 en el frontend y la observación de la regresión) y **2 descartados** (SEG-11 y SEG-12). Los 32 válidos tienen destino: **8 corregidos** con su commit, **1 implementado** como compromiso (USA-03) y **23 en la hoja de ruta** con su esfuerzo. **Ningún hallazgo válido queda sin destino.** Las severidades de usabilidad son de Nielsen (0 a 4).

| ID | Hallazgo | Severidad | Destino |
|---|---|---|---|
| REN-01 | Autobloqueo del pool con 10 checkouts simultáneos | Crítica | **Corregido**, `a76c206` (código y medición k6) |
| REN-02 | Órdenes confirmadas sin respuesta al cliente | Alta | **Corregido**, `a76c206` (código y medición k6) |
| REN-03 | Pago simulado de 500 ms con el bloqueo de filas | Media | Hoja de ruta, esfuerzo Alto |
| REN-04 | Login lento con 30 VUs (`bcryptjs`) | Media | Hoja de ruta, esfuerzo Bajo |
| REN-05 | Medición en modo desarrollo en un portátil | Informativa | Hoja de ruta, esfuerzo Medio |
| SEG-01 | Denegación de servicio con 10 checkouts (mismo defecto que REN-01) | Alta | **Corregido**, `a76c206` (mismo cambio que REN-01) |
| SEG-02 | Login sin límite de intentos | Alta | **Corregido**, `a76c206` (código y prueba de fuerza bruta) |
| SEG-03 | Token en `localStorage` y sin revocación | Media | Hoja de ruta, esfuerzo Alto |
| SEG-04 | Faltan cabeceras de seguridad | Media | **Corregido en la API** (`a76c206`, ZAP del después en `fff72eb`) **y en el frontend** (`507ae43`, baseline del después sobre :4173) |
| SEG-05 | `X-Powered-By: Express` | Baja | **Corregido**, `a76c206` (código; ZAP del después en `fff72eb`) |
| SEG-06 | Enumeración de usuarios por tiempo | Baja | Hoja de ruta, esfuerzo Bajo |
| SEG-07 | 500 con byte nulo o cuerpo grande | Baja | Hoja de ruta, esfuerzo Bajo |
| SEG-08 | Política de contraseñas débil | Baja | Hoja de ruta, esfuerzo Bajo |
| SEG-09 | BD en `0.0.0.0:5434` con contraseña `postgres` | Media | **Corregido**, `8391d27` |
| SEG-10 | Sin registro de eventos de seguridad | Baja | Hoja de ruta, esfuerzo Medio |
| SEG-11 | Timestamp Disclosure en una dependencia de desarrollo | — | **Descartado** (falso positivo: máscara de bits de React, solo en desarrollo) |
| SEG-12 | Token de recarga en caliente de Vite en la URL | — | **Descartado** (solo de desarrollo; no es el JWT ni existe en el build) |
| SEG-13 | El login devuelve el token de sesión en el cuerpo JSON | Informativa | Hoja de ruta con SEG-03, esfuerzo Alto |
| SEG-14 | La CSP del frontend admite imágenes de cualquier origen `https:` | Baja | Hoja de ruta, esfuerzo Medio |
| SEG-15 | Faltan COOP, COEP, CORP y `Permissions-Policy` en el frontend | Baja | Hoja de ruta, esfuerzo Bajo |
| USA-01 | "Mis pedidos" sin productos ni paginación | 2 | Hoja de ruta, esfuerzo Medio |
| USA-02 | Contraste insuficiente (43 elementos) | 3 | **Corregido**, `60e7393` (axe 43 → 0 graves) |
| USA-03 | Tras un rechazo hay que reescribir la tarjeta | 2 | **Implementado (compromiso usabilidad-seguridad)**, `df10b04` |
| USA-04 | En el celular la notificación de rechazo tapa el resumen | 1 | Hoja de ruta, esfuerzo Bajo |
| USA-05 | Vaciar carrito y Quitar sin confirmación | 2 | Hoja de ruta, esfuerzo Bajo |
| USA-06 | Agregar al carrito casi sin confirmación | 2 | Hoja de ruta, esfuerzo Bajo |
| USA-07 | Imágenes que no corresponden al producto | 2 | Hoja de ruta, esfuerzo Bajo |
| USA-08 | Sin recuperación de contraseña | 3 | Hoja de ruta, esfuerzo Alto |
| USA-09 | Registro sin confirmar ni mostrar la contraseña | 2 | Hoja de ruta, esfuerzo Bajo |
| USA-10 | En el celular no se ve quién inició sesión | 1 | Hoja de ruta, esfuerzo Bajo |
| USA-11 | "Limpiar filtros" solo sin resultados | 1 | Hoja de ruta, esfuerzo Bajo |
| USA-12 | Landmarks y enlaces duplicados | 1 | Hoja de ruta, esfuerzo Bajo |
| USA-13 | "Respuesta automática" sin explicación | 1 | Hoja de ruta, esfuerzo Bajo |
| OBS-01 | En el IDOR del chatbot, el modelo pide "iniciar sesión" a un usuario con sesión | Informativa | Hoja de ruta, esfuerzo Bajo |


## Brechas frente al enunciado

Lo que la auditoría de cobertura encontró sin cubrir del todo y que **requiere ejecutar pruebas nuevas** (no se ejecutaron):

| Paso | Brecha | Qué haría falta |
|---|---|---|
| 2.2.1–2.2.3 y Módulo 2 | La prueba cruzada con otro equipo se reemplazó por perfiles simulados (desviación declarada y autorizada) | Solo si el docente lo pide: una sesión con un evaluador externo real y su SUS |

## Hallazgos descartados

| ID | Alerta de ZAP | Motivo del descarte |
|---|---|---|
| SEG-11 | Timestamp Disclosure - Unix (10096) | Falso positivo: `2080374784` es `0x7C000000`, una máscara de bits interna de React, no una fecha; además solo aparece en un archivo del servidor de desarrollo |
| SEG-12 | Information Disclosure - Sensitive Information in URL (10024) | Solo de desarrollo: es el `wsToken` de 12 caracteres de la recarga en caliente de Vite, no el JWT de la app; no existe en el build de producción |

## Hoja de ruta (lo que no se corrigió)

Esfuerzo estimado para un desarrollador que ya conoce el proyecto: **Bajo** (menos de medio día), **Medio** (1 o 2 días) y **Alto** (3 días o más, o un servicio externo).

| Prioridad | ID | Hallazgo | Severidad | Esfuerzo | Motivo para dejarlo fuera de esta entrega | Propuesta |
|---|---|---|---|---|---|---|
| 1 | REN-03 | El pago simulado retiene el bloqueo de filas 500 ms (unas 2 ventas por segundo de un mismo producto) | Media | Alto | Requiere rediseñar el checkout; con una pasarela real cambia por completo | Reservar el stock en una transacción corta, cobrar fuera de ella y confirmar o liberar la reserva (con idempotencia y webhooks) |
| 2 | SEG-03 | Token JWT en `localStorage` y sin revocación | Media | Alto | Cambia la autenticación de frontend y backend; la CSP de SEG-04 ya reduce el riesgo de XSS | Cookie `HttpOnly`, `Secure` y `SameSite`; access token corto con refresh token y lista de revocación al salir |
| 3 | USA-08 | No hay recuperación de contraseña | 3 | Alto | Requiere un servicio de correo | Enlace de un solo uso con vencimiento, enviado por correo |
| 4 | REN-04 | Login lento con 30 usuarios (`bcryptjs` en el hilo principal) | Media | Bajo | Mejora de rendimiento sin riesgo funcional; no era crítica | Cambiar a `bcrypt` nativo (hilos de libuv) y volver a medir el escenario B |
| 5 | USA-01 | "Mis pedidos" sin productos ni paginación | 2 | Medio | No impide completar tareas (T6 5/5) | Mostrar el primer producto y "+N más"; paginar |
| 6 | USA-05 | "Vaciar carrito" y "Quitar" sin confirmación | 2 | Bajo | Severidad menor que la corregida | Confirmación o "Deshacer" en un aviso |
| 7 | USA-06 | Agregar al carrito casi sin confirmación | 2 | Bajo | Severidad menor | Aviso visible y contador animado |
| 8 | USA-09 | Registro sin confirmar ni mostrar la contraseña | 2 | Bajo | Severidad menor | Botón para ver la contraseña |
| 9 | USA-07 | Imágenes que no corresponden al producto | 2 | Bajo | Contenido de demo, no código | Fotos propias de cada producto |
| 10 | SEG-07 | 500 con byte nulo o cuerpo mayor de 100 KB | Baja | Bajo | No filtra información | Rechazar `\0` en la validación y responder 413/400 en el `errorHandler` |
| 11 | SEG-06 | Enumeración de usuarios por tiempo de login | Baja | Bajo | Mitigada por el límite de SEG-02 | Comparar contra un hash ficticio cuando el usuario no existe |
| 12 | SEG-08 | Política de contraseñas débil | Baja | Bajo | Severidad baja | Mínimo de 10 caracteres y lista de contraseñas comunes |
| 13 | SEG-10 | Sin registro de eventos de seguridad | Baja | Medio | No afecta el funcionamiento | Log estructurado de logins fallidos, bloqueos 429 y 403 |
| 14 | OBS-01 | En el IDOR del chatbot, el modelo le pide "iniciar sesión" a un usuario que sí la tiene | Informativa | Bajo | No hay fuga: el filtro está en el SQL | Respuesta fija cuando la herramienta devuelve "Pedido no encontrado" |
| 15 | USA-04, 10, 11, 12, 13 | Detalles del celular, filtros, landmarks y el aviso "Respuesta automática" | 1 | Bajo | Severidad cosmética | Ajustes de interfaz (ver `04-usabilidad.md`) |
| 16 | REN-05 | Medición en modo desarrollo en un portátil | Informativa | Medio | Limitación del entorno de la práctica | Repetir k6 con el build de producción en un servidor dedicado |
| 17 | SEG-14 | La CSP admite imágenes de cualquier origen `https:` | Baja | Medio | Compromiso para permitir imágenes externas en el panel admin | Subir las imágenes al propio servidor o permitir solo una lista de dominios |
| 18 | SEG-13 | Token de sesión en el cuerpo JSON del login | Informativa | Alto | Es el diseño actual; se resuelve con SEG-03 | Cookie `HttpOnly` (ver SEG-03) |
| 19 | SEG-15 | Faltan COOP, COEP, CORP y `Permissions-Policy` en el frontend | Baja | Bajo | Defensas adicionales; no son las que pedía SEG-04 | Agregar COOP y CORP `same-origin` y una `Permissions-Policy` restrictiva en `preview.headers` |
