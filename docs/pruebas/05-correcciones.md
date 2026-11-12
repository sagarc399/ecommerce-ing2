# 05 — Plan de corrección ejecutado: antes y después

La práctica pide corregir **al menos un problema crítico en cada una de las tres dimensiones** (rendimiento, usabilidad y seguridad) antes de la versión final. Este documento muestra, por cada corrección, la causa raíz, el cambio en el código, la medición **ANTES/DESPUÉS con el mismo método y los mismos parámetros** y su efecto en el negocio. Todo está en la rama `pruebas-no-funcionales`.

## Resumen

| Dimensión | Corrección crítica | Indicador principal | Antes | Después |
|---|---|---|---|---|
| Rendimiento | **REN-01** (Crítica; en seguridad, SEG-01, Alta) autobloqueo del backend con 10 compras simultáneas, y REN-02 | Errores en el checkout con contención (C2, 20 VUs) | 44,68 % y el servidor colgado | **0 %**, sin bloqueo |
| Seguridad | **SEG-02** login sin límite de intentos | Intentos de fuerza bruta aceptados (50 seguidos) | 50 de 50 | **5** (bloqueo en el intento 6) |
| Usabilidad | **USA-02** contraste insuficiente (severidad 3) | Violaciones graves de accesibilidad (axe-core, 8 pantallas) | 43 | **0** |

Además se corrigieron SEG-04 (cabeceras de seguridad, en la API y en el frontend) y SEG-05 y SEG-09 (base de datos expuesta), y se aplicó USA-03 (conservar la tarjeta tras un rechazo), que se documenta como **análisis de compromiso entre usabilidad y seguridad**, no como mejora.

## Método

- Mismo equipo de las mediciones iniciales (AMD Ryzen 5 5500U, 15,3 GB de RAM, Windows 11), backend en modo desarrollo (`npm run dev`) y PostgreSQL 16 en Docker. Es un **escenario conservador** (REN-05): en un servidor de producción los tiempos serían menores.
- Cada medición del DESPUÉS repite el script del ANTES con los mismos parámetros. Los scripts aceptan un `SUFIJO` para guardar el después sin pisar el antes (`_despues`).
- Cuando la medición inicial venía de otra sesión, el ANTES **se repitió en la misma sesión que el DESPUÉS** para descartar la variación del equipo (axe-core, T5 y exposición de la BD). En todos los casos el ANTES repetido coincidió con el original.

| Medición | Comando |
|---|---|
| Carga (k6) | `VUS=20 SUFIJO=_despues bash pruebas/rendimiento/ejecutar.sh c1_checkout_distribuido c2_checkout_contencion` (datos de `npm run db:poblar`) |
| Concurrencia | `npm run prueba:concurrencia` (3 veces) |
| Fuerza bruta | `node pruebas/seguridad/manuales.mjs` → `manuales/fuerza-bruta-despues.txt` |
| ZAP | `SUFIJO=_despues bash pruebas/seguridad/ejecutar-zap.sh cliente` (con `CHAT_PROVEEDOR=reglas` durante el escaneo) |
| Exposición de la BD | `node pruebas/seguridad/exposicion-bd.mjs antes\|despues` |
| Accesibilidad | `npm run db:reset`, `node pruebas/usabilidad/preparar-pedidos.mjs`, `SUFIJO=_antes\|_despues node pruebas/usabilidad/accesibilidad.mjs` |
| Tarea T5 y KLM | `npm run db:reset`, `SOLO=T5 SUFIJO=_antes\|_despues node pruebas/usabilidad/medir.mjs` |

---

## Rendimiento

### REN-01 (Crítica) / SEG-01 (Alta) — El backend se bloqueaba con 10 compras simultáneas y REN-02 — Órdenes confirmadas sin respuesta (Alta)

**Causa raíz.** Al final del checkout, `ordenes.controller.ts` leía la orden recién creada con `pool.query` **mientras todavía retenía la conexión de la transacción**. Con 10 compras en curso (el tamaño del pool) las 10 conexiones quedaban ocupadas y cada petición esperaba una conexión libre que nunca llegaba: el servidor dejaba de responder a todo, incluido el catálogo. Las 10 órdenes ya estaban confirmadas en la BD, pero el cliente no recibía respuesta (REN-02: riesgo de que vuelva a pagar).

**Cambio.**
- `backend/src/controllers/ordenes.controller.ts`: la lectura final usa el mismo `cliente` de la transacción, antes del `release()`. Se revisaron el resto de órdenes, `poblar.ts` y las herramientas del chatbot: no hay otro punto que pida una segunda conexión mientras retiene una.
- `backend/src/config/db.ts` (defensa): pool con `max: 10` y `connectionTimeoutMillis: 5000`.
- `backend/src/middleware/errorHandler.ts`: si el pool se agota, la petición responde **503 "El servidor está ocupado, intenta de nuevo en unos segundos"** en lugar de quedarse colgada.

**Medición (k6, 20 VUs, rampa 30 s / 60 s / 15 s, `sleep(1)`).**

| Escenario | req/s | p50 | p95 | Máx | Errores | ¿Se cuelga? |
|---|---|---|---|---|---|---|
| C1 checkout distribuido, antes | 0,62 | 1,06 s | 60,00 s | 60,00 s | 23,26 % (20 de 86) | Sí |
| C1 checkout distribuido, después | **4,61** | 2,12 s | 5,26 s | 6,87 s | **0 %** (0 de 495) | **No** |
| C2 checkout con contención, antes | 0,34 | 3,70 s | 59,99 s | 59,99 s | 44,68 % (21 de 47) | Sí |
| C2 checkout con contención, después | **1,84** | 9,38 s | 9,51 s | 9,53 s | **0 %** (0 de 203) | **No** |

| Indicador | Antes | Después |
|---|---|---|
| Órdenes confirmadas sin respuesta al cliente (por bloqueo) | 10 | **0** |
| Unidades vendidas = respuestas 201 | No (10 de diferencia) | Sí (495 en C1, 203 en C2) |
| Integridad del stock (3 productos de carga) | Cuadra | Cuadra: 99655 = 100000 − 345, 99813 = 100000 − 187, 99834 = 100000 − 166 |
| Stock negativo / órdenes PAGADA sin pago APROBADO | 0 / 0 | 0 / 0 |
| Prueba de concurrencia (último monitor) | Superada | 3 de 3 superadas |

**Cómo leer la latencia.** La mediana de C2 subió de 3,70 a 9,38 s y la de C1 de 1,06 a 2,12 s. No es un retroceso: en el ANTES, entre el 23 % y el 45 % de las peticiones se colgaban hasta el timeout y las medianas solo reflejaban las que alcanzaron a responder (sesgo de supervivencia). En el DESPUÉS, el 100 % se completa, pero en fila por el bloqueo de 500 ms (REN-03). Los indicadores correctos de la mejora son la tasa de errores (45 % → 0 %), el throughput (×5,4 en C2) y el máximo (60 s colgado → 9,5 s). La latencia restante se resuelve con REN-03 (hoja de ruta).

**Efecto en el negocio.** Antes, una campaña con apenas 10 compradores pagando al mismo tiempo tumbaba la tienda entera y dejaba cobros sin confirmar. Ahora la tienda **procesa 7,4 veces más compras por segundo** en ventas distribuidas, **ninguna compra se pierde** y nadie queda con un pago cobrado sin confirmación. Si el servidor llega a saturarse, el cliente recibe un mensaje claro en lugar de una página que no carga.

---

## Seguridad

### SEG-02 — Login sin límite de intentos (Alta)

**Causa raíz.** `POST /api/auth/login` aceptaba intentos ilimitados: una contraseña débil podía adivinarse por fuerza bruta.

**Cambio.** `backend/src/routes/auth.routes.ts`: `express-rate-limit` con **5 intentos fallidos por IP + email cada 15 minutos** (`skipSuccessfulRequests`, `ipKeyGenerator`) → 429 "Demasiados intentos fallidos de inicio de sesión. Espera 15 minutos e intenta de nuevo."

| Indicador | Antes | Después |
|---|---|---|
| 50 contraseñas incorrectas seguidas | 50 × 401 (sin límite) | 5 × 401 y **45 × 429** (bloqueo en el intento 6) |
| Otro email desde la misma IP | 200 | 200 (no se bloquea a otros usuarios) |
| 10 logins correctos seguidos | 10 × 200 | 10 × 200 |
| Escenario B, login con 30 VUs | 1055 peticiones, p95 2,51 s, 0 % errores | 1375 peticiones, p95 1,21 s, 0 % errores, **ningún 429** |

El límite no afecta a los usuarios legítimos. La mejora de tiempos del escenario B **no** se debe al límite (no abarata bcrypt): es variación del equipo entre sesiones, por eso REN-04 sigue abierto.

**Efecto en el negocio.** Las cuentas de los clientes ya no pueden atacarse por fuerza bruta: el atacante pasa de intentos ilimitados a 5 cada 15 minutos por cuenta y dirección IP. Efecto secundario conocido: el dueño real de la cuenta también queda bloqueado 15 minutos desde esa IP.

### SEG-04 y SEG-05 — Cabeceras de seguridad ausentes (Media) y `X-Powered-By` (Baja)

**Causa raíz.** Express no envía cabeceras de seguridad por defecto y anuncia la tecnología del servidor.

**Cambio.** `backend/src/index.ts`: `helmet` 8.3.0 con CSP `default-src 'none'; frame-ancestors 'none'` (la API solo devuelve JSON) y `app.disable("x-powered-by")`. CORS sigue funcionando (preflight 204 desde :5173).

| Cabecera | Antes | Después |
|---|---|---|
| Content-Security-Policy | ausente | `default-src 'none';frame-ancestors 'none'` |
| X-Frame-Options | ausente | `SAMEORIGIN` |
| X-Content-Type-Options | ausente | `nosniff` |
| Strict-Transport-Security | ausente | `max-age=31536000; includeSubDomains` (efectiva con HTTPS) |
| Referrer-Policy | ausente | `no-referrer` |
| X-Powered-By | `Express` | ausente |

**OWASP ZAP, escaneo de API con token de cliente** (OpenAPI, regla *replacer* con Bearer, `maxScanDurationInMins=15`, `threadPerHost=2`; 120 reglas aprobadas, 0 fallidas):

| Severidad | Antes | Después |
|---|---|---|
| Alta | 0 | 0 |
| Media | 0 | 0 |
| Baja | 3 | **1** |
| Informativa | 3 | 3 |

Desaparecen "X-Powered-By" (5 instancias) y "X-Content-Type-Options Header Missing" (5). Queda el 500 con `buscar=%00` (SEG-07, hoja de ruta). Las informativas son esperadas (errores 4xx correctos, el login identificado y respuestas no cacheables).

**SEG-04 en el frontend** (`frontend/vite.config.ts`, commit `507ae43`). El paso 2.3.1 mostró que el frontend seguía sin estas cabeceras, porque las pone el servidor que entrega el HTML. Se agregaron en `preview.headers` (build): CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' http://localhost:3000; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`, `X-Frame-Options: DENY` y `nosniff`; en `server.headers` (desarrollo) solo `X-Frame-Options` y `nosniff`, para no romper la recarga en caliente. `img-src` admite `https:` porque con `'self' data:` el navegador bloqueaba la vista previa de imágenes externas del panel admin.

| ZAP baseline sobre el build (:4173), mismo comando del antes | Antes | Después |
|---|---|---|
| CSP Header Not Set (Media) | 3 | **0** |
| Missing Anti-clickjacking Header (Media) | 1 | **0** |
| X-Content-Type-Options Header Missing (Baja) | 5 | **0** |
| Alta / Media / Baja / Informativa | 0 / 2 / 1 / 2 | 0 / 1 / 4 / 3 |

Las 3 alertas de SEG-04 desaparecen. Las nuevas se registraron como hallazgos: SEG-14 (comodín `https:` en `img-src`, el compromiso para permitir imágenes externas) y SEG-15 (faltan COOP, COEP, CORP y `Permissions-Policy`), ambas en la hoja de ruta. Verificación: el flujo completo contra el build pasa 9 de 9 con 0 violaciones de CSP, y en desarrollo también 9 de 9, con la recarga en caliente funcionando.

**Efecto en el negocio.** La API y las páginas de la tienda llevan instrucciones explícitas contra *clickjacking*, *MIME sniffing* y fugas por *referrer*, y el servidor deja de anunciar su tecnología a quien lo escanea.

### SEG-09 — Base de datos expuesta a la red con la contraseña por defecto (Media)

**Causa raíz.** `docker-compose.yml` publicaba PostgreSQL en todas las interfaces (`0.0.0.0:5434`) con usuario y contraseña `postgres`: cualquier equipo de la misma red Wi-Fi podía leer y modificar la tienda.

**Cambio.** `docker-compose.yml` publica `"127.0.0.1:5434:5432"`; la contraseña de `postgres` se cambió con `ALTER USER` por una aleatoria de 32 caracteres (sin borrar el volumen) que vive solo en `backend/.env`; `.env.example` trae `cambia_esta_clave` y cómo cambiarla.

| Origen de la conexión | Antes | Después |
|---|---|---|
| Interfaces donde escucha el puerto 5434 | `0.0.0.0` y `[::]` (todas) | **solo `127.0.0.1`** |
| IP de la red local (192.168.194.203) con `postgres/postgres` | **conecta** | puerto cerrado |
| IP del adaptador de WSL (172.26.208.1) con `postgres/postgres` | **conecta** | puerto cerrado |
| 127.0.0.1 con `postgres/postgres` | conecta | **rechazada** |
| 127.0.0.1 con la clave del `.env` (la aplicación) | conecta | conecta |
| Otro contenedor por `host.docker.internal` con `postgres/postgres` | conecta | **rechazada** |

Riesgo residual: otro contenedor del mismo equipo llega al puerto por la pasarela interna de Docker Desktop, pero la clave por defecto ya no sirve. La app, `npm run verificar` y la prueba de concurrencia siguen funcionando.

**Efecto en el negocio.** Los datos de clientes, pedidos y pagos ya no son accesibles desde la red del local ni con credenciales públicamente conocidas.

---

## Usabilidad

### USA-02 — Contraste insuficiente del texto secundario (severidad 3) — corrección crítica de usabilidad

**Causa raíz.** El texto secundario usaba `text-slate-400` (`#94a3b8`): 2,45:1 sobre el fondo `#f8fafc` y 2,56:1 sobre blanco, por debajo del mínimo de **4,5:1** de WCAG 2.1 AA (criterio 1.4.3). Afectaba las 8 pantallas: pie de página, notas del carrito y del checkout, enlaces "Quitar" y "Vaciar carrito", fechas de "Mis pedidos", el panel admin y el chat. En la evaluación con perfiles simulados, dificultó T3 a dos de los cinco (P3 y P5).

**Cambio.** `text-slate-400` → `text-slate-600` (`#475569`) en el texto de 9 archivos de `frontend/src`, y → `text-slate-500` (`#64748b`) en 3 íconos (lupa, imagen de reemplazo y botón cerrar del modal), que como elementos no textuales piden 3:1 (WCAG 1.4.11). No se usó `slate-500` para texto porque queda en el límite (4,55:1 sobre el fondo y 4,34:1 sobre `slate-100`).

| Color | Blanco | Fondo `#f8fafc` | `slate-100` | `slate-200` |
|---|---|---|---|---|
| `slate-400` (antes) | 2,56 | 2,45 | 2,34 | 2,08 |
| `slate-500` (íconos) | 4,76 | 4,55 | 4,34 | 3,86 |
| `slate-600` (texto) | **7,58** | **7,24** | **6,92** | **6,15** |

**Medición (axe-core 4.14, WCAG 2.0/2.1/2.2 A y AA + buenas prácticas, 8 pantallas a 1366×768).** Mismos datos del ANTES original: `db:reset` + 20 pedidos de `cliente@tienda.com`.

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

Críticas y menores: 0 antes y 0 después. La regla `color-contrast` ya no aparece en ninguna pantalla. Las 3 moderadas restantes son de landmarks (USA-12, hoja de ruta).

**Efecto en el negocio.** Toda la información secundaria (totales finales, fechas de pedidos, enlaces para quitar productos) es legible para personas mayores, con baja visión o que usan el celular a pleno sol. La tienda cumple el criterio de contraste de **WCAG 2.1 AA**, el estándar que exigen muchos clientes institucionales y públicos.

### USA-03: equilibrio usabilidad-seguridad

Esta sección **no se presenta como una mejora**, sino como el análisis de un compromiso de diseño.

**Situación inicial.** Tras cualquier resultado del pago, la app conservaba titular y vencimiento y borraba **número y CVV** sin explicar por qué. Después de un rechazo, el usuario tenía que volver a escribir los 16 dígitos.

**Cambio aplicado.** `frontend/src/pages/Checkout.tsx`: tras un **402 (rechazo)** se conservan número, titular y vencimiento **solo en el estado de React** (nunca en `localStorage`, `sessionStorage`, logs ni URL), se borra el CVV, el foco va a ese campo y la alerta agrega "Por seguridad, vuelve a ingresar el CVV.". Con **cualquier otro resultado** (aprobado, sin stock, error de red, sesión vencida) se borran todos los datos de la tarjeta. Verificación en el navegador (`node pruebas/usabilidad/verificar-usa03.mjs`): 12 de 12 comprobaciones correctas; en el almacenamiento del navegador solo están `carrito` y `token`.

**Medición de T5 "recibir un pago rechazado y reintentar con otra tarjeta"** (Playwright, 3 corridas, KLM con K = 0,28 s, P = 1,1 s, B = 0,1 s, H = 0,4 s, M = 1,35 s):

| T5 | Antes | Después |
|---|---|---|
| Éxito | 3/3 | 3/3 |
| Mediana de máquina | 2,014 s | 2,012 s |
| KLM | 36,91 s (52K 9P 9B 12H 5M) | 37,47 s (54K 9P 9B 12H 5M) |

**El compromiso.** En el simulador el rechazo solo ocurre con tarjetas terminadas en 0000, así que el reintento realista es **con otra tarjeta**: ahora debe seleccionar el número anterior (Ctrl+A) antes de escribir el nuevo, y la tarea cuesta **0,56 s más** (+1,5 %). En **pasarelas reales** muchos rechazos son **transitorios** (fondos momentáneos, validación del banco, un CVV mal escrito) y el usuario **reintenta con la misma tarjeta**: ahí basta con escribir el CVV, porque el foco ya está en ese campo. Ese caso no se puede automatizar en el simulador y se calcula con el mismo KLM:

| Tramo de reintento (desde "entender el rechazo") | KLM |
|---|---|
| Antes: reescribir el número (16) y el CVV (3) | 11,87 s |
| Después, con otra tarjeta (caso del simulador) | 12,43 s (+0,56 s) |
| Después, con la misma tarjeta (caso de pasarelas reales) | 4,19 s (−7,68 s, −65 %) |

**Seguridad.** El CVV nunca se conserva tras un intento (criterio alineado con PCI DSS, que prohíbe guardarlo después de la autorización) y ningún dato de la tarjeta sale del estado del componente: no se escribe en el almacenamiento del navegador ni viaja en la URL. Con cualquier resultado distinto de un rechazo, el formulario queda vacío.

### Sobre el SUS

El cuestionario SUS (75,0, "Bueno") **no se repite** después de las correcciones: requeriría otra ronda de evaluación con participantes y, en esta práctica, los participantes son perfiles simulados con IA, con autorización del docente, debido a que el proyecto fue desarrollado por un solo integrante. La mejora de usabilidad se mide con **indicadores objetivos sobre la aplicación real**: axe-core (accesibilidad) y KLM con Playwright (esfuerzo de la tarea).

---

## Regresión

Después de las correcciones se verificó que nada se rompiera (detalle en `00-estado.md` y `pruebas/regresion/resultados/`):

| Prueba | Resultado |
|---|---|
| Build del backend (`tsc`) y del frontend (`tsc -b` + Vite) | Compilan |
| Chatbot v2 (`node pruebas/regresion/chatbot.mjs`): precio real, pedido sin sesión, pedido propio e IDOR con `cliente2` | 4 de 4 correctas con Groq, sin fuga de datos |
| Flujo completo en el navegador (`node pruebas/regresion/flujo.mjs`): registro → carrito → compra aprobada → rechazo y reintento → mis pedidos → salir → admin crea producto | 8 de 8 pasos correctos, sin errores de JavaScript |
| `npm run verificar` | LISTO PARA LA DEMO |
| `npm run prueba:concurrencia` | 3 de 3 superadas |

Lo que quedó sin corregir, con su esfuerzo y su motivo, está en la hoja de ruta de `06-matriz-calidad.md`.
