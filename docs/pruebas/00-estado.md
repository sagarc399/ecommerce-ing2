# 00 — Estado de las pruebas no funcionales (traspaso)

Rama: `pruebas-no-funcionales`, creada desde `master` después de unir `chatbot-v2` (Fase 9). Se midió y documentó el **estado inicial**: **ningún hallazgo se corrigió todavía**.

## Lo que se hizo

1. **Datos de prueba:** `npm run db:poblar` (script nuevo, idempotente). Deja 63 productos (12 del seed, 48 generados y 3 de carga con stock 100000), 28 usuarios (incluye carga01…carga25 con contraseña `Cliente123`) y 80 órdenes históricas (68 PAGADA, 12 RECHAZADA). `db:reset` no se modificó.
2. **Inventario:** flujos, tabla de 17 endpoints con autenticación, operación en BD y criticidad, y la especificación OpenAPI 3.
3. **Rendimiento con k6:** catálogo con 50 VUs, login con 30 y checkout distribuido y con contención con 20. Además, checkouts con 8 VUs, porque con 20 el backend se bloquea. Se verificó la integridad del stock en la BD.
4. **Seguridad:** ZAP baseline (frontend con `vite preview`) y ZAP API scan autenticado como cliente y como admin; 10 pruebas manuales y 4 adicionales; `npm audit`.
5. **Especificaciones del equipo:** en 01-inventario.md.
6. **Usabilidad** (sesión del 12 de noviembre): 9 tareas automatizadas con Playwright (3 corridas cada una, 27/27 exitosas), tiempo humano con KLM, accesibilidad con axe-core en 8 pantallas, evaluación heurística de Nielsen sobre la interfaz real, 5 perfiles **simulados** (declarado; autorizado por el docente) y SUS. Resultado: 45/45 tareas completadas (11 con dificultad) y SUS promedio de **75,0, "Bueno"**. Informe en `04-usabilidad.md`.

## Dónde está cada resultado

| Qué | Dónde |
|---|---|
| Equipo, datos, flujos, endpoints y exclusiones | `docs/pruebas/01-inventario.md` |
| Especificación OpenAPI 3 (usada por ZAP) | `docs/openapi.yaml` |
| Informe de rendimiento | `docs/pruebas/02-rendimiento.md` |
| Informe de seguridad | `docs/pruebas/03-seguridad.md` |
| Scripts de k6 y ejecutor | `pruebas/rendimiento/*.js`, `ejecutar.sh`, `resumen.mjs` |
| Resultados de k6 (salida y JSON por escenario) | `pruebas/rendimiento/resultados/` |
| Integridad del stock antes y después | `pruebas/rendimiento/resultados/integridad.txt` |
| Evidencia del bloqueo del backend | `pruebas/rendimiento/resultados/diagnostico-bloqueo.txt` |
| Reportes de ZAP (HTML y JSON) y resumen | `pruebas/seguridad/reportes/` |
| Script de ZAP | `pruebas/seguridad/ejecutar-zap.sh`, `resumen-zap.mjs` |
| Pruebas manuales y `npm audit` | `pruebas/seguridad/manuales.mjs`, `auditoria.mjs` y `manuales/` |
| Datos de prueba | `backend/src/scripts/poblar.ts` (`npm run db:poblar`) |
| Informe de usabilidad | `docs/pruebas/04-usabilidad.md` |
| Tareas y medición (Playwright, KLM) | `pruebas/usabilidad/tareas.mjs`, `medir.mjs`, `resultados/medicion.json` |
| Accesibilidad (axe-core) | `pruebas/usabilidad/accesibilidad.mjs`, `accesibilidad.csv`, `resultados/accesibilidad.json` |
| Perfiles simulados y SUS (semilla 20261112) | `pruebas/usabilidad/simular.mjs`, `tiempos.csv`, `resultados.csv`, `sus.csv` |
| Capturas (escritorio y 375 px) | `docs/pruebas/capturas/` |

Para repetir la usabilidad: con `npm run db:reset` y la app corriendo, ejecuta desde `pruebas/usabilidad/` (después de `npm install` y `npx playwright install chromium`) `node medir.mjs`, `node capturas.mjs`, `node accesibilidad.mjs` y `node simular.mjs`, en ese orden. `medir.mjs` crea usuarios, órdenes y productos de prueba, así que al terminar ejecuta `npm run db:reset`.

**Cuidado al repetir k6:** `--summary-export` guarda en `setup_data` los tokens JWT de los 25 clientes de carga. Antes de hacer commit, quita ese campo de los JSON de checkout (en esta entrega ya se quitó; las métricas no cambian).

Para repetir las mediciones después de corregir, usa las mismas condiciones: backend con `npm run dev`, datos de `npm run db:poblar` y el mismo equipo. Luego ejecuta `bash pruebas/rendimiento/ejecutar.sh`, `node pruebas/seguridad/manuales.mjs` y `bash pruebas/seguridad/ejecutar-zap.sh` (este último con `vite preview --host 0.0.0.0 --port 4173` corriendo).

## Hallazgos, por prioridad

### Rendimiento y seguridad

| Prioridad | ID | Hallazgo | Severidad |
|---|---|---|---|
| 1 | **REN-01 / SEG-01** | El backend se bloquea por completo con 10 checkouts simultáneos (autobloqueo del pool: `pool.query` en la línea 127 de `ordenes.controller.ts` mientras se retiene la conexión de la transacción) | **Crítica** |
| 2 | REN-02 | 10 órdenes confirmadas sin respuesta al cliente en cada bloqueo (riesgo de compra doble) | Alta |
| 3 | SEG-02 | Login sin límite de intentos ni bloqueo | Alta |
| 4 | SEG-09 | PostgreSQL publicado en `0.0.0.0:5434` con usuario y contraseña `postgres` | Media |
| 5 | SEG-04 | Faltan cabeceras de seguridad (CSP, X-Frame-Options, nosniff, HSTS) | Media |
| 6 | SEG-03 | Token JWT en `localStorage` y sin revocación | Media |
| 7 | REN-03 | El pago simulado retiene el bloqueo de filas 500 ms (máximo de unas 2 ventas por segundo de un mismo producto) | Media |
| 8 | REN-04 | Login con p95 de 2,51 s con 30 VUs (`bcryptjs` en el hilo principal) | Media |
| 9 | SEG-07 | Errores 500 con byte nulo y cuerpo de más de 100 KB (sin filtrar información) | Baja |
| 10 | SEG-06 | Enumeración de usuarios por tiempo de login (144 ms frente a 30 ms) | Baja |
| 11 | SEG-08 | Política de contraseñas débil (se acepta `12345678`) | Baja |
| 12 | SEG-10 | Sin registro de eventos de seguridad | Baja |
| 13 | SEG-05 | Cabecera `X-Powered-By: Express` | Baja |
| 14 | REN-05 | Mediciones en modo desarrollo, en un portátil compartido con k6 y ZAP | Informativa |

### Usabilidad (severidad de Nielsen, 0 a 4)

| Prioridad | ID | Hallazgo | Severidad |
|---|---|---|---|
| 1 | USA-02 | Texto secundario con contraste insuficiente (2,45–2,56:1) en las 8 páginas (axe-core A11Y-01, 43 elementos) | 3 |
| 2 | USA-08 | No hay recuperación de contraseña | 3 |
| 3 | USA-03 | Tras un pago rechazado hay que reescribir el número y el CVV sin aviso | 2 |
| 4 | USA-01 | "Mis pedidos" no muestra los productos de cada pedido ni pagina | 2 |
| 5 | USA-06 | Agregar al carrito desde el catálogo casi no da confirmación | 2 |
| 6 | USA-05 | "Vaciar carrito" y "Quitar" sin confirmación ni deshacer | 2 |
| 7 | USA-09 | Registro sin confirmación de contraseña ni opción para verla | 2 |
| 8 | USA-07 | Las imágenes no corresponden al producto | 2 |
| 9 | USA-10 | En el celular el encabezado no muestra quién inició sesión | 1 |
| 10 | USA-11 | "Limpiar filtros" solo aparece cuando no hay resultados | 1 |
| 11 | USA-04 | En el celular la notificación de rechazo tapa el resumen y repite el mensaje | 1 |
| 12 | USA-12 | Landmarks y enlaces duplicados (axe-core A11Y-02) | 1 |
| 13 | USA-13 | "Respuesta automática" sin explicación | 1 |

## Progreso de correcciones (sesión del 12 de noviembre, interrumpida por contexto)

Todo en la rama `pruebas-no-funcionales`. Las mediciones del "después" usaron los mismos scripts y parámetros que el "antes": k6 con 20 VUs para checkout y 30 para login, datos de `npm run db:poblar` y backend con `npm run dev`.

### Hechas

| ID | Archivos | Cambio y valores |
|---|---|---|
| REN-01 / REN-02 / SEG-01 | `backend/src/controllers/ordenes.controller.ts` | La lectura final de la orden usa el mismo `cliente` de la transacción, antes del `release()`, en lugar de `pool.query`. Se revisaron órdenes, `poblar.ts` y las herramientas del chatbot v2: no hay otro lugar que pida una segunda conexión mientras retiene una |
| REN-01 (defensa) | `backend/src/config/db.ts`, `backend/src/middleware/errorHandler.ts` | Pool con `max: 10` y `connectionTimeoutMillis: 5000`. Si el pool se agota, la petición responde **503** "El servidor está ocupado, intenta de nuevo en unos segundos" en lugar de colgarse. Se comprobó que `pg` devuelve "timeout exceeded when trying to connect" |
| SEG-02 | `backend/src/routes/auth.routes.ts` | `express-rate-limit` en `POST /auth/login`: **5 intentos fallidos por IP + email cada 15 minutos** → 429 "Demasiados intentos fallidos de inicio de sesión. Espera 15 minutos e intenta de nuevo." Los logins exitosos no cuentan (`skipSuccessfulRequests`) |
| SEG-04 / SEG-05 | `backend/src/index.ts`, `backend/package.json` (helmet 8.3.0) | `helmet` con CSP `default-src 'none'; frame-ancestors 'none'` (la API solo devuelve JSON) y `app.disable("x-powered-by")`. CORS sigue funcionando: el preflight desde :5173 responde 204 con el origen correcto |

### Mediciones ANTES y DESPUÉS que ya están

**REN-01: checkout con 20 VUs** (`pruebas/rendimiento/resultados/*_despues.*`)

| Escenario | req/s | p50 | p95 | Máx | Errores | ¿Se cuelga? |
|---|---|---|---|---|---|---|
| C1 antes | 0,62 | 1,06 s | 60,00 s | 60,00 s | 23,26 % (20 de 86) | Sí |
| C1 después | **4,61** | 2,12 s | 5,26 s | 6,87 s | **0 %** (0 de 495) | **No** |
| C2 antes | 0,34 | 3,70 s | 59,99 s | 59,99 s | 44,68 % (21 de 47) | Sí |
| C2 después | **1,84** | 9,38 s | 9,51 s | 9,53 s | **0 %** (0 de 203) | **No** |

- **Integridad después:** carga A 99655 = 100000 − 345, B 99813 = 100000 − 187 y C 99834 = 100000 − 166 (cuadran las 3). 0 stock negativo, 0 órdenes PAGADA sin pago APROBADO (766 PAGADA).
- **Órdenes confirmadas sin respuesta:** antes 10 por bloqueo, después **0**. Unidades vendidas = respuestas 201: 495 en C1 y 203 en C2.
- **Prueba de concurrencia:** 3 de 3 PRUEBA SUPERADA (`resultados/concurrencia-despues.txt`).
- El p95 sigue por encima de 1500 ms por REN-03 (500 ms de pago con las filas bloqueadas), que no entra en esta fase. En C2 se ve el máximo teórico: unas 2 ventas por segundo de un mismo producto.

**SEG-02: fuerza bruta** (`pruebas/seguridad/manuales/fuerza-bruta-despues.txt`)

- **Antes:** 50 × 401, sin límite.
- **Después:** 5 × 401 y **45 × 429; se bloquea en el intento 6**. Con el bloqueo activo, incluso la contraseña correcta da 429 para esa IP + email. Otro email desde la misma IP sigue entrando (200), y 10 logins exitosos seguidos dan 10 × 200.
- Efecto secundario conocido: el dueño real de la cuenta también queda bloqueado 15 minutos desde esa IP. El límite se guarda en memoria y se reinicia al reiniciar el backend.

**Escenario B: login con 30 VUs, para confirmar que no afecta a los legítimos**

| | Peticiones | req/s | p50 | p95 | Máx | Errores |
|---|---|---|---|---|---|---|
| Antes | 1055 | 9,98 | 1,59 s | 2,51 s | 5,11 s | 0 % |
| Después | 1375 | 12,98 | 0,97 s | 1,21 s | 4,01 s | 0 % (ningún 429) |

La mejora de tiempos **no** se debe al límite, que no abarata bcrypt: es variabilidad de la máquina entre sesiones. REN-04 se debe seguir considerando abierto.

**SEG-04/05: cabeceras** (`pruebas/seguridad/manuales/cabeceras-despues.txt`)

| Cabecera | Antes | Después |
|---|---|---|
| Content-Security-Policy | ausente | `default-src 'none';frame-ancestors 'none'` |
| X-Frame-Options | ausente | `SAMEORIGIN` |
| X-Content-Type-Options | ausente | `nosniff` |
| Strict-Transport-Security | ausente | `max-age=31536000; includeSubDomains` (sin efecto sin HTTPS) |
| Referrer-Policy | ausente | `no-referrer` |
| X-Powered-By | `Express` | ausente |

**SEG-04/05: ZAP de API con token de cliente** (`pruebas/seguridad/reportes/api-cliente_despues.*`, `resumen-zap.txt`). Mismo escaneo y parámetros que el antes (OpenAPI, regla *replacer* con Bearer, `maxScanDurationInMins=15`, `threadPerHost=2`, `CHAT_PROVEEDOR=reglas` durante el escaneo). Comando: `SUFIJO=_despues bash pruebas/seguridad/ejecutar-zap.sh cliente` (el script ahora acepta qué escaneos correr y un sufijo, para no pisar los reportes del antes). Se corrió el 12 de noviembre: 120 reglas PASS, 0 FAIL, 1 WARN.

| Severidad | Antes | Después |
|---|---|---|
| Alta | 0 | 0 |
| Media | 0 | 0 |
| Baja | 3 | **1** |
| Informativa | 3 | 3 |

| Alerta | Antes | Después |
|---|---|---|
| Server Leaks Information via "X-Powered-By" (Baja, SEG-05) | 5 instancias | **desaparece** |
| X-Content-Type-Options Header Missing (Baja, SEG-04) | 5 instancias | **desaparece** |
| A Server Error response code (Baja, `buscar=%00` → 500) | 1 | 1 (es SEG-07, hoja de ruta) |
| Client Error response code (Informativa) | 51 | 52 (403/404 esperados) |
| Authentication Request Identified (Informativa) | 2 | 2 |
| Non-Storable Content (Informativa) | 5 | 5 |

Las informativas son esperadas (errores 4xx correctos, el login identificado y respuestas no cacheables). Los escaneos baseline del frontend y de admin no se repitieron: el cambio fue en la API y el escaneo de cliente es el pedido en el plan. SEG-04/05 quedan **cerrados**.

**SEG-09: BD expuesta con contraseña por defecto** (`pruebas/seguridad/manuales/exposicion-bd-antes.txt` y `exposicion-bd-despues.txt`, script `node pruebas/seguridad/exposicion-bd.mjs antes|despues`). El script intenta conectarse como `postgres` por loopback y por cada IP de red local del equipo (como entraría otro equipo de la misma red), con la clave por defecto y con la del `.env` (que no se imprime).

Cambios: `docker-compose.yml` publica `"127.0.0.1:5434:5432"`; `ALTER USER postgres` con una clave aleatoria de 32 caracteres (`crypto.randomBytes(24)` en base64url) sin borrar el volumen (los datos se conservan); `DB_PASSWORD` actualizado en `backend/.env`; `backend/.env.example` ahora trae `cambia_esta_clave` y cómo cambiarla. Los scripts que usan `docker exec ... psql -U postgres` (`verificar.mjs`, `ejecutar.sh` de k6, `manuales.mjs`) siguen funcionando: entran por el socket local del contenedor, que no pide clave.

| Indicador | Antes | Después |
|---|---|---|
| Interfaces donde escucha 5434 | `0.0.0.0` y `[::]` (todas) | **solo `127.0.0.1`** |
| Desde la IP de red local 192.168.194.203 con `postgres/postgres` | **CONECTA** | puerto cerrado |
| Desde la IP 172.26.208.1 (adaptador de WSL) con `postgres/postgres` | **CONECTA** | puerto cerrado |
| Desde 127.0.0.1 con `postgres/postgres` | CONECTA | **RECHAZADA** (contraseña incorrecta) |
| Desde 127.0.0.1 con la clave del `.env` (la app) | CONECTA | CONECTA |
| Desde un contenedor por `host.docker.internal` con `postgres/postgres` | CONECTA | RECHAZADA (contraseña incorrecta) |

Riesgo residual: otro contenedor del mismo equipo aún llega al puerto por `host.docker.internal` (pasarela interna de Docker Desktop), pero la clave por defecto ya no sirve. Verificación de la app: `/api/health` ok, catálogo y login 200, `npm run verificar` → LISTO PARA LA DEMO, `npm run prueba:concurrencia` → PRUEBA SUPERADA. SEG-09 queda **cerrado**.

**USA-02: contraste insuficiente** (`pruebas/usabilidad/resultados/accesibilidad_antes.json` y `accesibilidad_despues.json`, más sus `.csv`; el `accesibilidad.json` original se conserva)

Cambio: `text-slate-400` (`#94a3b8`) → `text-slate-600` (`#475569`) en el texto secundario de 9 archivos (pie de página, notas del carrito y del checkout, enlaces "Quitar" y "Vaciar carrito", fecha en "Mis pedidos", correo e id en el admin, paginación y los dos textos del chat) y → `text-slate-500` (`#64748b`) en 3 íconos (lupa del catálogo, imagen de reemplazo y botón cerrar del modal), que como elementos no textuales piden 3:1 (WCAG 1.4.11). Para el texto no se usó `slate-500` porque queda justo en el límite: 4,55:1 sobre `#f8fafc` y 4,34:1 sobre `slate-100`.

| Color | Blanco | `#f8fafc` (fondo) | `slate-100` | `slate-200` |
|---|---|---|---|---|
| `slate-400` (antes) | 2,56 | 2,45 | 2,34 | 2,08 |
| `slate-500` (íconos) | 4,76 | 4,55 | 4,34 | 3,86 |
| `slate-600` (texto) | **7,58** | **7,24** | **6,92** | **6,15** |

Método: los mismos datos del ANTES original (`npm run db:reset` + 20 pedidos de `cliente@tienda.com`, que es lo que dejaron las corridas de `medir.mjs`), recreados con `node pruebas/usabilidad/preparar-pedidos.mjs` para no volver a correr `medir.mjs` (que sobrescribiría la medición KLM del antes). El ANTES se repitió en esta sesión con `SUFIJO=_antes node pruebas/usabilidad/accesibilidad.mjs` y dio lo mismo que el original (43 graves, 3 moderadas); el DESPUÉS, con `SUFIJO=_despues`.

| Pantalla | Graves antes | Graves después | Moderadas antes | Moderadas después |
|---|---|---|---|---|
| Catálogo | 1 | 0 | 0 | 0 |
| Detalle de producto | 2 | 0 | 0 | 0 |
| Carrito | 3 | 0 | 0 | 0 |
| Checkout | 2 | 0 | 0 | 0 |
| Login | 1 | 0 | 0 | 0 |
| Mis pedidos | 21 | 0 | 0 | 0 |
| Admin productos | 11 | 0 | 1 | 1 |
| Chat abierto | 2 | 0 | 2 | 2 |
| **Total** | **43** | **0** | **3** | **3** |

Críticas y menores: 0 antes y 0 después. Las 3 moderadas que quedan son de landmarks (`landmark-unique` y `landmark-no-duplicate-banner`), es decir USA-12, que está en la hoja de ruta. `color-contrast` ya no aparece en ninguna pantalla. `npm run build` del frontend compila. USA-02 queda **cerrado**.

**USA-03: tras un rechazo hay que reescribir la tarjeta** (`frontend/src/pages/Checkout.tsx`; `pruebas/usabilidad/resultados/medicion_antes.json`, `medicion_despues.json` y `verificacion-usa03.txt`)

Estado real antes del cambio: tras cualquier resultado la app ya conservaba titular y vencimiento y borraba **número y CVV** sin explicar por qué. Cambio: con un **402 (rechazo)** se conservan número, titular y vencimiento **solo en el estado de React** (nunca en `localStorage`, `sessionStorage`, logs ni URL), se borra el CVV, el foco va al CVV y la alerta agrega "Por seguridad, vuelve a ingresar el CVV."; con **cualquier otro resultado** (aprobado, 409, 404, 400, 401, error de red) se borran todos los datos de la tarjeta.

Verificación funcional en el navegador (`node pruebas/usabilidad/verificar-usa03.mjs`, 12 de 12 OK): tras el rechazo quedan número `4000 0000 0000 0000`, titular y vencimiento, CVV vacío y con el foco, mensaje visible y en el almacenamiento del navegador solo están `carrito` y `token`; el reintento con otra tarjeta se aprueba; con un 409 (2 monitores con 1 disponible) se borran los 4 campos.

Medición de T5 (Playwright, 1366×768, 3 corridas, `db:reset`; `SOLO=T5 SUFIJO=_antes|_despues node pruebas/usabilidad/medir.mjs`). La automatización detecta si el número quedó conservado: si quedó, hace clic, **Ctrl+A (2 K)** y escribe el número nuevo encima; si no, clic y escribe. El ANTES repetido en esta sesión dio el mismo KLM que el original.

| T5 "rechazo y reintento con OTRA tarjeta" | Antes | Después |
|---|---|---|
| Éxito máquina | 3/3 | 3/3 |
| Mediana de máquina | 2,014 s (original: 1,92 s) | 2,012 s |
| Clics / campos (caracteres) / teclas | 9 / 6 (52) / 0 | 9 / 6 (52) / 1 (Ctrl+A) |
| KLM | **36,91 s** (52K 9P 9B 12H 5M) | **37,47 s** (54K 9P 9B 12H 5M) |

En la tarea tal como está definida, USA-03 **no** reduce el esfuerzo: lo sube 0,56 s (+1,5 %) porque el usuario debe seleccionar el número anterior antes de escribir el nuevo. La ganancia aparece cuando se reintenta con la **misma** tarjeta (por ejemplo, tras un rechazo temporal del banco o un CVV mal escrito): el pago simulado de esta app rechaza siempre las tarjetas terminadas en 0000, así que ese caso **no se puede automatizar** y se calcula con el mismo KLM (análisis, no medición):

| Tramo de reintento (desde "entender el rechazo") | KLM |
|---|---|
| Antes: reescribir el número (16) y el CVV (3) | 11,87 s |
| Después, con otra tarjeta: clic, Ctrl+A, 16 dígitos, clic en CVV, 3 | 12,43 s (+0,56 s) |
| Después, con la misma tarjeta: el foco ya está en el CVV, 3 teclas | **4,19 s (−7,68 s, −65 %)** |

Equilibrio entre usabilidad y seguridad: conservar el número evita reescribir 16 dígitos en el caso más común de reintento, pero el CVV se pide siempre de nuevo (no debe quedar en memoria tras un intento, criterio alineado con PCI DSS) y ningún dato sale del estado del componente. El SUS **no** se repite (decisión H del traspaso); la mejora se expresa con KLM y con la verificación funcional. USA-03 queda **cerrado** y se documenta como **análisis de compromiso usabilidad-seguridad, no como mejora**: en el simulador el rechazo solo ocurre con tarjetas terminadas en 0000 (se reintenta con otra, +0,56 s); en pasarelas reales con rechazos transitorios se reintenta con la misma (11,87 → 4,19 s). La corrección crítica de usabilidad es USA-02.

### Regresión tras las correcciones (12 de noviembre)

Con el backend reiniciado (sin bloqueos de login en memoria), datos de `db:reset` y el chat en `groq`. Evidencias en `pruebas/regresion/resultados/`.

| Prueba | Comando | Resultado |
|---|---|---|
| Build del frontend | `cd frontend && npm run build` | Compila (`tsc -b` + Vite) |
| Chatbot v2: precio real (anónimo) | `node pruebas/regresion/chatbot.mjs` | OK, $1.250.000 (Groq, 1,5 s) |
| Chatbot v2: pedido sin sesión (anónimo) | ídem | OK, pide iniciar sesión y no muestra datos (1,0 s) |
| Chatbot v2: pedido propio (cliente) | ídem | OK, muestra Mancuernas 5 kg y $149.900 (1,8 s) |
| Chatbot v2: IDOR (cliente2 pide el pedido de cliente) | ídem | OK, no revela productos ni total (1,4 s) |
| Flujo en el navegador: login → carrito → compra aprobada → rechazo con USA-03 y reintento → mis pedidos → salir → admin crea producto | `node pruebas/regresion/flujo.mjs` | 8 de 8 OK, sin errores de JavaScript (solo el 402 esperado) |
| Verificación de la demo | `npm run verificar` | 🎉 LISTO PARA LA DEMO (Groq 961 ms) |

Las preguntas del chatbot van separadas 25 s por la cuota de Groq; ninguna cayó al respaldo por reglas. En la primera corrida de `flujo.mjs` fallaron 2 pasos por la prueba, no por la app: había dos enlaces "Mis pedidos" (encabezado y confirmación) y el producto nuevo cae en otra página de la tabla del admin. Se ajustaron los selectores (como en T8) y se repitió desde `db:reset`.

Observación (no es regresión: `backend/src/chat` no cambia desde la Fase 9): en el caso IDOR el modelo responde a `cliente2`, que sí tiene sesión, "primero debes iniciar sesión" en lugar de "no encontré ese pedido entre los tuyos", como pide el prompt. La seguridad no depende del modelo: la herramienta filtra por `usuario_id` del token en el SQL y devuelve "Pedido no encontrado". Es una imprecisión de redacción del LLM; queda para la hoja de ruta (ajustar el prompt o devolver un mensaje fijo cuando la herramienta no encuentra el pedido).

### Falta del plan, sección por sección

1. **Rendimiento:** completo.
2. **Seguridad:** completo (SEG-04/05 y SEG-09 cerrados, ver arriba).
3. **Usabilidad:** completo (USA-02 y USA-03, ver arriba).
4. **Regresión:** completa (ver arriba).
5. **Documentación:** `05-correcciones.md` (causa raíz, cambio, ANTES/DESPUÉS y efecto en el negocio de cada hallazgo, más la sección sobre USA-03), `06-matriz-calidad.md` (matriz unificada con diagnóstico de una frase por dimensión), hoja de ruta de lo no corregido con esfuerzo y motivo, y actualizar este archivo.
6. **Cierre:** `npm run db:reset` (la BD tiene ahora los datos de `db:poblar` y las órdenes de k6), revisar `.env`, keys y tokens (incluidos los JSON de k6, que guardan tokens en `setup_data`), y el commit "Correcciones de rendimiento, seguridad y usabilidad con nueva medición". No unir a master.

## Lo que falta

1. **Correcciones** en orden de prioridad: primero REN-01, luego las altas de seguridad y después USA-02 y USA-06 (las más baratas y con más efecto). Después de cada una, repetir la medición correspondiente para documentar el "después".
2. **Documento final:** comparación antes y después de rendimiento, seguridad y usabilidad, conclusiones y anexos con los reportes.
3. Regenerar las API keys de Groq y Gemini, que quedaron escritas en una conversación.

Ya resuelto: el `npm run db:reset` pendiente de la sesión de rendimiento y seguridad se ejecutó el 12 de noviembre, antes de las pruebas de usabilidad.
