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

### Incompleto

- **SEG-04/05:** falta repetir el **escaneo de API de ZAP con token de cliente** (mismo comando, `bash pruebas/seguridad/ejecutar-zap.sh`, con `CHAT_PROVEEDOR=reglas` durante el escaneo y `groq` al final) y armar la tabla ANTES/DESPUÉS por severidad. Antes: Alta 0, Media 0, Baja 3, Informativa 3. El script ejecuta los 3 escaneos; si solo interesa el de cliente, se puede comentar el resto.

### Falta del plan, sección por sección

1. **Rendimiento:** completo.
2. **Seguridad:** el ZAP de SEG-04/05 (arriba); **SEG-09** completo: puerto `127.0.0.1:5434:5432` en `docker-compose.yml`, `ALTER USER postgres` con contraseña aleatoria sin borrar el volumen, actualizarla en `backend/.env` (valor de ejemplo en `.env.example`), recrear el contenedor y verificar que no escucha en `0.0.0.0` y que la app funciona.
3. **Usabilidad:**
   - **USA-02:** cambiar `text-slate-400` por un tono que cumpla 4,5:1 (probar `slate-500`) en toda la app, incluidos el chat y el admin, y repetir `node pruebas/usabilidad/accesibilidad.mjs`. Antes: 43 graves y 3 moderadas.
   - **USA-03:** en `frontend/src/pages/Checkout.tsx`, tras un 402 conservar el número, el titular y el vencimiento en memoria, borrar solo el CVV, poner el foco en el CVV y mostrar "Por seguridad, vuelve a ingresar el CVV"; con cualquier otro resultado, borrar todo. Verificar con el script de la prueba 11 de la Fase 6 y volver a medir T5 con Playwright y KLM. **Ojo:** T5 pide reintentar con *otra* tarjeta, así que con el número conservado el usuario debe borrarlo antes de escribir el nuevo (selección + Ctrl+A en el KLM). Hay que medirlo y explicar el compromiso en "USA-03: equilibrio entre usabilidad y seguridad". No repetir el SUS.
4. **Regresión:** `npm run build` del frontend; pruebas del chatbot v2 (precio real, pedido sin sesión, IDOR con cliente2), espaciadas por la cuota de Groq; flujo completo en el navegador. Antes, reiniciar el backend para borrar los bloqueos de login en memoria: la prueba de fuerza bruta bloqueó `cliente@tienda.com` desde localhost por 15 minutos.
5. **Documentación:** `05-correcciones.md` (causa raíz, cambio, ANTES/DESPUÉS y efecto en el negocio de cada hallazgo, más la sección sobre USA-03), `06-matriz-calidad.md` (matriz unificada con diagnóstico de una frase por dimensión), hoja de ruta de lo no corregido con esfuerzo y motivo, y actualizar este archivo.
6. **Cierre:** `npm run db:reset` (la BD tiene ahora los datos de `db:poblar` y las órdenes de k6), revisar `.env`, keys y tokens (incluidos los JSON de k6, que guardan tokens en `setup_data`), y el commit "Correcciones de rendimiento, seguridad y usabilidad con nueva medición". No unir a master.

## Lo que falta

1. **Correcciones** en orden de prioridad: primero REN-01, luego las altas de seguridad y después USA-02 y USA-06 (las más baratas y con más efecto). Después de cada una, repetir la medición correspondiente para documentar el "después".
2. **Documento final:** comparación antes y después de rendimiento, seguridad y usabilidad, conclusiones y anexos con los reportes.
3. Regenerar las API keys de Groq y Gemini, que quedaron escritas en una conversación.

Ya resuelto: el `npm run db:reset` pendiente de la sesión de rendimiento y seguridad se ejecutó el 12 de noviembre, antes de las pruebas de usabilidad.
