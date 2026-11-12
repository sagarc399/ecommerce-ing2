# 03 — Pruebas de seguridad (estado inicial)

Herramientas: **OWASP ZAP** (imagen `zaproxy/zap-stable`), pruebas manuales con scripts de Node (`pruebas/seguridad/manuales.mjs`) y `npm audit`. Reportes en `pruebas/seguridad/reportes/` y evidencia manual en `pruebas/seguridad/manuales/`. Clasificación según **OWASP Top 10:2025**.

Se documenta el estado **antes** de cualquier corrección: ningún hallazgo se corrigió.

## Escaneos con ZAP

| Escaneo | Objetivo | Alta | Media | Baja | Informativa | Reglas que pasaron |
|---|---|---|---|---|---|---|
| Baseline (pasivo) | Frontend construido, `vite preview` en :4173 | 0 | 2 | 1 | 2 | 57 |
| API autenticada como cliente | Backend :3000 con `docs/openapi.yaml` | 0 | 0 | 3 | 3 | 118 |
| API autenticada como admin | Backend :3000 con `docs/openapi.yaml` | 0 | 0 | 3 | 3 | 118 |

Alertas relevantes:

| Alerta de ZAP | Severidad ZAP | Dónde | Hallazgo |
|---|---|---|---|
| Content Security Policy (CSP) Header Not Set | Media | Frontend | SEG-04 |
| Missing Anti-clickjacking Header | Media | Frontend | SEG-04 |
| X-Content-Type-Options Header Missing | Baja | Frontend y API | SEG-04 |
| Server Leaks Information via "X-Powered-By" | Baja | API | SEG-05 |
| A Server Error response code was returned (500) | Baja | API: `buscar=%00` y `categoria=%00` | SEG-07 |
| Suspicious Comments, Modern Web Application, Non-Storable Content, Authentication Request Identified | Informativa | Varios | Sin acción |

Notas del escaneo:

- La autenticación se hizo con la regla *replacer* de ZAP, que agrega `Authorization: Bearer <token>` a todas las peticiones. Los tokens no quedaron en los reportes.
- Durante el escaneo se usó `CHAT_PROVEEDOR=reglas`, para no consumir la cuota de Groq. Luego se restauró a `groq`.
- `vite preview` no es un servidor de producción: las cabeceras que falten en un despliegue real dependen del servidor que se use.
- **0 alertas altas no significa que no haya vulnerabilidades.** ZAP no detectó REN-01 ni SEG-02, que son los hallazgos más graves; salieron de la prueba de carga y de las pruebas manuales.

### Mapeo de rutas: spider y proxy (paso 2.3.1)

**Primer mapeo (estado inicial).** El escaneo baseline ejecutó el spider tradicional de ZAP sobre el build de producción servido con `vite preview` (:4173) y mapeó solo 6 URL: `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.svg` y los dos *assets* (JS y CSS). La app es una SPA: las rutas (`/carrito`, `/checkout`, `/admin`…) las dibuja React en el navegador y el spider tradicional no ejecuta JavaScript. Las rutas del backend se mapearon importando `docs/openapi.yaml` (17 endpoints) en `zap-api-scan.py`.

**Proxy de intercepción y AJAX spider (12 de noviembre de 2026).** Para cumplir lo que pide el enunciado ("interceptar el tráfico de su propia aplicación web mientras navegan por ella"):

1. ZAP 2.17.0 en modo daemon como proxy en `127.0.0.1:8090` (contenedor `zaproxy/zap-stable`), con `CHAT_PROVEEDOR=reglas` durante la prueba y `groq` al final. Como ZAP corre en Docker y la app en el `localhost` del equipo, un contenedor auxiliar con la misma imagen y la misma red de ZAP reenvía su `localhost:5173` y `localhost:3000` al equipo, y en Windows un reenvío local pasa de `127.0.0.1:5174` a `[::1]:5173` (el servidor de Vite solo escucha en IPv6).
2. **Navegación interceptada como cliente y como admin:** `PROXY=http://127.0.0.1:8090 node pruebas/regresion/flujo.mjs` (Chromium de Playwright con `--proxy-bypass-list=<-loopback>`, porque Chromium no usa el proxy para `localhost` por defecto): registro → carrito → compra aprobada → rechazo y reintento → mis pedidos → salir → admin crea producto. 8 de 8 pasos (`pruebas/regresion/resultados/flujo-proxy.txt`).
3. **AJAX spider** de ZAP (Firefox headless, 3 minutos) sobre `http://localhost:5173/`.
4. Extracción del árbol de sitios y de las alertas pasivas: `node pruebas/seguridad/extraer-zap-proxy.mjs` → `pruebas/seguridad/proxy/arbol-sitios.json`, `alertas-pasivas.json` y `resumen.txt`.

> El antes y el después no apuntan al mismo servidor: el antes se midió contra el **build** (:4173) y el después contra el servidor de **desarrollo** (:5173), que además entrega los archivos fuente de la app. La última columna quita esos archivos internos para que la comparación sea de la misma naturaleza.

| URL mapeadas | Antes: spider tradicional sobre el **build** (`vite preview` :4173) | Después: proxy + AJAX spider sobre el servidor de **desarrollo** (:5173) y la API (:3000) | Después, comparable con el antes (sin archivos internos de Vite) |
|---|---|---|---|
| Objetivo | Build de producción | Servidor de desarrollo y API | Igual que el después |
| Mensajes HTTP registrados | No aplica | 8879 | No aplica |
| URL únicas del frontend (sin query) | **6** (`/`, `/robots.txt`, `/sitemap.xml`, `/favicon.svg`, JS y CSS del bundle) | 80 (15 de la app + 65 internas de Vite) | **15** (`/`, `/favicon.svg`, `/productos` y 12 imágenes de productos) |
| Archivos internos del servidor de desarrollo de Vite (`/src`, `/node_modules`, `/@vite`…) | No aplica (el build no los tiene) | 65 | Excluidos |
| URL únicas del API | 0 (la API se mapeó por OpenAPI) | 32 URL; **12 endpoints distintos** (sin `OPTIONS`) de los 17 del inventario | 12 endpoints |

Endpoints alcanzados navegando: `GET /productos`, `/productos/:id`, `/productos/categorias`, `/auth/me`, `/ordenes/mias`, `/ordenes/:id`, `/admin/productos`; `POST /auth/registro`, `/auth/login`, `/ordenes`, `/productos` y `/chat` (este último lo disparó el AJAX spider al abrir el chat). No se alcanzaron `PUT`, `DELETE` y `PATCH` de productos, `GET /admin/ordenes` ni `GET /health`, porque el flujo no edita ni desactiva productos ni abre las órdenes del admin; esos endpoints sí estaban en el escaneo por OpenAPI. Las rutas de la SPA (`/carrito`, `/checkout`, `/pedidos`, `/admin`…) no aparecen como URL porque React cambia de pantalla sin pedir nada al servidor.

**Alertas pasivas** (80 instancias en 9 reglas, ninguna alta):

| Regla de ZAP | Riesgo ZAP | Frontend / Vite / API | ¿Nueva? | Clasificación |
|---|---|---|---|---|
| Content Security Policy (CSP) Header Not Set (10038) | Media | 1 / 0 / 0 | No (estaba en el baseline) | SEG-04 en el frontend (**corregido después**, ver abajo) |
| Missing Anti-clickjacking Header (10020) | Media | 1 / 0 / 0 | No | SEG-04 en el frontend |
| X-Content-Type-Options Header Missing (10021) | Baja | 14 / 50 / 0 | No | SEG-04 en el frontend |
| Timestamp Disclosure - Unix (10096) | Baja | 0 / 1 / 0 | **Sí** | **SEG-11, descartado** (falso positivo) |
| Information Disclosure - Sensitive Information in URL (10024) | Informativa | 1 / 0 / 0 | **Sí** | **SEG-12, descartado** (solo de desarrollo) |
| Session Management Response Identified (10112) | Informativa | 0 / 0 / 1 | **Sí** | **SEG-13** |
| Authentication Request Identified (10111) | Informativa | 0 / 0 / 3 | No | Esperada |
| Information Disclosure - Suspicious Comments (10027) | Informativa | 0 / 7 / 0 | No (en el baseline salía en el bundle) | Código de terceros (React) |
| Modern Web Application (10109) | Informativa | 1 / 0 / 0 | No | Esperada |

**Lo que confirma y lo que revela.** El API no tiene alertas de cabeceras: la corrección de SEG-04 y SEG-05 con `helmet` funciona. Pero el **frontend sigue sin CSP, X-Frame-Options ni `nosniff`**: esas cabeceras las pone el servidor que entrega el HTML (Vite en desarrollo; en producción, el servidor web que sirva el build), no Express. La corrección de SEG-04 solo cubría la API; la parte del frontend se corrigió después en `frontend/vite.config.ts` (ver "SEG-04 en el frontend"). Las evidencias del resumen se restauraron a mano tras un error de extracción, sin afectar los conteos (ver la nota en `proxy/resumen.txt`).

### SEG-04 en el frontend: corrección y medición (12 de noviembre)

**Cambio** (`frontend/vite.config.ts`). En el build servido con `vite preview`, cabeceras `Content-Security-Policy`, `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`. La CSP es: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' http://localhost:3000; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. En el servidor de desarrollo, solo `X-Frame-Options` y `nosniff`, sin CSP, para no romper la recarga en caliente. `img-src` admite `https:` porque el admin puede usar una URL de imagen externa con vista previa: con `img-src 'self' data:` el navegador la bloqueaba (decisión del estudiante: opción A).

**Verificación funcional** (build en :4173 con CORS del backend apuntado temporalmente a :4173): `APP_URL=http://localhost:4173 node pruebas/regresion/flujo.mjs` → 9 de 9 pasos, **0 violaciones de CSP** (`pruebas/regresion/resultados/flujo-build-csp.txt`); la vista previa de una imagen externa en el panel admin ya no viola la CSP. En desarrollo (:5173) el flujo también pasa 9 de 9 y la recarga en caliente responde.

**Medición con el mismo método del baseline original** (`SUFIJO=_despues bash pruebas/seguridad/ejecutar-zap.sh baseline`, ZAP 2.17.0 sobre :4173; `reportes/baseline-frontend_despues.*`):

| Alerta del frontend | Antes (5 nov) | Después (12 nov) |
|---|---|---|
| Content Security Policy (CSP) Header Not Set — Media | 3 instancias | **desaparece** |
| Missing Anti-clickjacking Header — Media | 1 | **desaparece** |
| X-Content-Type-Options Header Missing — Baja | 5 | **desaparece** |
| CSP: Wildcard Directive — Media | — | **nueva**, 3 (por `https:` en `img-src`): **SEG-14** |
| Cross-Origin-Embedder/Opener/Resource-Policy Missing — Baja | — | **nueva**, 3 + 3 + 5: **SEG-15** |
| Permissions Policy Header Not Set — Baja | — | **nueva**, 4: **SEG-15** |
| Suspicious Comments — Informativa | 1 | 1 (código de terceros en el bundle) |
| Modern Web Application — Informativa | 3 | 3 |
| Storable but Non-Cacheable Content — Informativa | — | 5 (esperada) |
| **Total por severidad (Alta / Media / Baja / Informativa)** | **0 / 2 / 1 / 2** | **0 / 1 / 4 / 3** |
| Reglas que pasaron | 57 | 62 |

Las 3 alertas que definían SEG-04 en el frontend desaparecen: **SEG-04 queda corregido en la API y en el frontend**. Aparecen alertas nuevas: la de comodín es consecuencia directa de admitir imágenes `https:` (SEG-14), y las de aislamiento entre orígenes y `Permissions-Policy` (SEG-15) son cabeceras que ZAP no reportó en la corrida del 5 de noviembre. Ambas corridas usaron ZAP 2.17.0 y el mismo comando; en la segunda se evaluaron 62 reglas frente a 57, probablemente porque `zap-baseline.py` actualiza los complementos al arrancar (no se pudo confirmar).

### Análisis pedido por el enunciado (Módulo 3, punto 3)

| Fallo común que pide revisar el enunciado | ¿Se encontró? | Evidencia |
|---|---|---|
| **Falta de validación de entradas** | Parcial: la validación existe, pero dos entradas dan 500 en lugar de 400 (SEG-07) | Prueba manual 3 (JSON malformado → 400; cuerpo de 2 MB y byte nulo → 500), prueba 4 (14 cargas de inyección SQL sin efecto), prueba 5 (XSS almacenado no se ejecuta), prueba 6 (asignación masiva de `rol` ignorada), `imagen_url` rechaza `javascript:`; ZAP: 500 con `buscar=%00` |
| **Contraseñas en texto plano** | No | Revisión de código: el registro y el seed guardan `bcrypt.hash(password, 10)` en la columna `password_hash` (`backend/src/controllers/auth.controller.ts:30`, `backend/src/scripts/seed.ts:77`) y el login compara con `bcrypt.compare` (`auth.controller.ts:63`); ninguna ruta devuelve `password_hash` (la inyección `UNION SELECT … password_hash` no lo filtró: `manuales/pruebas-api.txt`, líneas 31 y 32). La tarjeta tampoco se guarda: solo los últimos 4 dígitos |
| **Errores mal gestionados que revelen información del servidor** | No | Prueba manual 3: ninguna respuesta filtra stack, rutas ni mensajes de PostgreSQL (los 500 de SEG-07 son genéricos); `X-Powered-By: Express` sí revelaba la tecnología (SEG-05, corregido) |

## Pruebas manuales

Evidencia completa en `pruebas/seguridad/manuales/pruebas-api.txt` y `npm-audit.txt`.

| # | Prueba | Resultado | Evidencia | Veredicto |
|---|---|---|---|---|
| 1 | Fuerza bruta: 50 logins fallidos seguidos | No hay límite ni bloqueo | 50 × 401 en 6,6 s; el login correcto inmediatamente después da 200 | ❌ SEG-02 |
| 2 | Cabeceras de seguridad de la API | No hay CSP, X-Frame-Options, X-Content-Type-Options, HSTS ni Referrer-Policy; `X-Powered-By: Express` | Cabeceras de `GET /api/productos` | ❌ SEG-04, SEG-05 |
| 3 | JSON malformado y errores | Ninguna respuesta filtra stack, rutas ni detalles de PostgreSQL. Dos casos dan 500 en vez de 4xx | JSON malformado → 400 genérico; cuerpo de 2 MB → 500; byte nulo → 500 | ⚠️ SEG-07 |
| 4 | Inyección SQL en `buscar` y `categoria` | No es explotable | 14 cargas (`' OR '1'='1`, `DROP TABLE`, `UNION SELECT` con hashes, `pg_sleep(3)`, `%`, `_`, `\`): todas 200, 0 resultados, 14–30 ms (no se ejecutó `pg_sleep`), sin hashes; la tabla sigue con 63 productos | ✅ |
| 5 | XSS almacenado (`<img src=x onerror=alert(1)>` como nombre, `<script>` como descripción) | No se ejecuta en ninguna vista | El texto se muestra literal y hay 0 `<img>` o `<script>` inyectados en el catálogo, el detalle, el carrito, mis pedidos, el detalle de orden del admin y la tabla de productos del admin. `imagen_url` con `javascript:` → 400 | ✅ |
| 6 | Asignación masiva: registro con `"rol":"admin"` | Se ignora | HTTP 201 con `"rol":"cliente"`; en la BD queda `cliente` | ✅ |
| 7 | IDOR: cliente2 pide la orden de cliente | Bloqueado sin revelar que existe | Dueño 200, cliente2 **404**, admin 200; cliente2 en `/admin/ordenes` y `POST /productos` → 403; JWT con `alg=none` y rol admin → 401 | ✅ |
| 8 | CORS con `Origin: http://evil.com` | El navegador lo bloquea | La respuesta siempre trae `Access-Control-Allow-Origin: http://localhost:5173`, nunca el origen atacante | ✅ |
| 9 | Dónde vive el token y cuánto dura | En `localStorage`, legible por JavaScript; dura 2 h; no hay logout en el servidor | `payload {id, rol, iat, exp}`, HS256, sin cookies | ⚠️ SEG-03 |
| 10 | `npm audit` | Sin vulnerabilidades conocidas | backend, frontend y raíz: 0 en todas las severidades | ✅ |

Pruebas adicionales:

| Prueba | Resultado | Hallazgo |
|---|---|---|
| Enumeración de usuarios por tiempo | Login con email existente: mediana de 144 ms; inexistente: 30 ms (no ejecuta bcrypt) | SEG-06 |
| Política de contraseñas | Se acepta `12345678` | SEG-08 |
| Exposición de la BD | El contenedor publica `0.0.0.0:5434` con usuario y contraseña `postgres` | SEG-09 |
| Byte nulo (`%00`) en `buscar` o `categoria` | HTTP 500 con mensaje genérico; el detalle (`invalid byte sequence for encoding "UTF8": 0x00`) solo queda en el log del servidor | SEG-07 |

## Hallazgos

| ID | Hallazgo | Severidad | OWASP Top 10:2025 |
|---|---|---|---|
| SEG-01 | Denegación de servicio con 10 checkouts simultáneos (REN-01) | **Alta** | A06 Diseño inseguro |
| SEG-02 | Login sin límite de intentos ni bloqueo | **Alta** | A07 Fallas de autenticación |
| SEG-03 | Token JWT en `localStorage` y sin revocación | Media | A07 Fallas de autenticación |
| SEG-04 | Faltan cabeceras de seguridad (CSP, X-Frame-Options, nosniff, HSTS) | Media | A02 Configuración de seguridad incorrecta |
| SEG-09 | PostgreSQL publicado en todas las interfaces con credenciales por defecto | Media | A02 Configuración de seguridad incorrecta |
| SEG-05 | Cabecera `X-Powered-By: Express` | Baja | A02 Configuración de seguridad incorrecta |
| SEG-06 | Enumeración de usuarios por tiempo de respuesta del login | Baja | A07 Fallas de autenticación |
| SEG-07 | Errores 500 ante entradas inválidas (byte nulo, cuerpo grande) | Baja | A10 Manejo incorrecto de condiciones excepcionales |
| SEG-08 | Política de contraseñas débil (solo 8 caracteres) | Baja | A07 Fallas de autenticación |
| SEG-10 | Sin registro de eventos de seguridad (logins fallidos, 403) | Baja | A09 Fallas de registro y alertas |
| SEG-11 | Timestamp Disclosure en una dependencia del servidor de desarrollo | **Descartado** (falso positivo) | No aplica |
| SEG-12 | Token en la URL del servidor de desarrollo de Vite (recarga en caliente) | **Descartado** (solo de desarrollo) | No aplica |
| SEG-13 | El login devuelve el token de sesión en el cuerpo JSON | Informativa | A07 Fallas de autenticación |
| SEG-14 | La CSP del frontend admite imágenes de cualquier origen `https:` | Baja (ZAP: Media) | A02 Configuración de seguridad incorrecta |
| SEG-15 | Faltan cabeceras de aislamiento entre orígenes (COOP, COEP, CORP) y `Permissions-Policy` en el frontend | Baja | A02 Configuración de seguridad incorrecta |

### SEG-01 — Denegación de servicio con 10 checkouts simultáneos (Alta)

- **Descripción:** cualquier cliente autenticado puede dejar la tienda sin servicio enviando 10 compras a la vez. Es el mismo defecto que REN-01 visto desde seguridad.
- **Evidencia:** ver REN-01 en [02-rendimiento.md](02-rendimiento.md). Se reprodujo 3 veces; Express sigue respondiendo, pero todo lo que usa la BD queda colgado hasta reiniciar.
- **Corrección:** la de REN-01, más un límite de peticiones por usuario en `POST /ordenes`.

### SEG-02 — Login sin límite de intentos ni bloqueo (Alta)

- **Descripción:** se pueden probar contraseñas sin restricción, unas 7,6 por segundo desde un solo cliente. Además, cada intento consume CPU por bcrypt, así que la misma ráfaga degrada toda la API (REN-04).
- **Evidencia:** 50 logins fallidos en 6,6 s, todos 401; el siguiente con la contraseña correcta, 200.
- **Corrección:** `express-rate-limit` en `/auth/login` y `/auth/registro` (por IP y por email), bloqueo temporal con espera creciente tras varios fallos y registro de los intentos.

### SEG-03 — Token JWT en `localStorage` y sin revocación (Media)

- **Descripción:** el token es legible por cualquier JavaScript de la página, así que un XSS futuro permitiría robarlo. Cerrar sesión solo lo borra del navegador: un token copiado sigue sirviendo 2 h.
- **Evidencia:** `localStorage` contiene `token`; no hay cookies; el payload es `{id, rol, iat, exp}` con 2 h de vida; no existe endpoint de logout.
- **Corrección:** cookie `HttpOnly`, `Secure` y `SameSite`; access token corto con refresh token y una lista de revocación al cerrar sesión. Mientras tanto, la CSP de SEG-04 reduce el riesgo.

### SEG-04 — Faltan cabeceras de seguridad (Media)

- **Descripción:** ni la API ni el frontend envían CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security ni Referrer-Policy.
- **Evidencia:** prueba manual 2 y alertas de ZAP 10038, 10020 y 10021.
- **Corrección:** `helmet` en Express y las mismas cabeceras en el servidor que entregue el frontend. HSTS solo cuando haya HTTPS.

### SEG-09 — PostgreSQL publicado con credenciales por defecto (Media)

- **Descripción:** `docker-compose.yml` publica el puerto en `0.0.0.0:5434`, accesible desde cualquier equipo de la misma red (por ejemplo, la red de la universidad), con usuario y contraseña `postgres`.
- **Evidencia:** `docker ps` muestra `0.0.0.0:5434->5432/tcp`; en `docker-compose.yml`, `POSTGRES_PASSWORD: postgres`.
- **Corrección:** publicar solo en `127.0.0.1:5434`, mover la contraseña a un `.env` y usar un usuario de aplicación con permisos mínimos.

### SEG-05 — Cabecera `X-Powered-By: Express` (Baja)

- **Descripción:** revela la tecnología del servidor y facilita buscar ataques conocidos.
- **Evidencia:** prueba manual 2 y alerta de ZAP 10037.
- **Corrección:** `app.disable("x-powered-by")`, o `helmet`.

### SEG-06 — Enumeración de usuarios por tiempo (Baja)

- **Descripción:** el mensaje de error es el mismo para un email inexistente y para una contraseña incorrecta, pero el tiempo de respuesta delata si la cuenta existe. El registro también lo revela con "El email ya está registrado".
- **Evidencia:** mediana de 144 ms con email existente frente a 30 ms con email inexistente (15 intentos de cada uno).
- **Corrección:** cuando el email no existe, comparar contra un hash ficticio para igualar el tiempo; el límite de SEG-02 también lo mitiga.

### SEG-07 — Errores 500 ante entradas inválidas (Baja)

- **Descripción:** un byte nulo en `buscar` o `categoria` llega a PostgreSQL y falla; un cuerpo mayor de 100 KB da 500 en lugar de 413. **No se filtra información:** la respuesta es siempre `{"mensaje":"Error interno del servidor"}`.
- **Evidencia:** `GET /api/productos?buscar=%00` → 500. En el log del servidor aparecen 12 veces `invalid byte sequence for encoding "UTF8": 0x00` y una vez `PayloadTooLargeError`.
- **Corrección:** rechazar los caracteres de control en los validadores (400) y que el manejador de errores respete `err.status` cuando sea 4xx.

### SEG-08 — Política de contraseñas débil (Baja)

- **Descripción:** solo se exigen 8 caracteres; se aceptan contraseñas como `12345678`.
- **Evidencia:** registro con `12345678` → 201.
- **Corrección:** subir el mínimo y comparar contra una lista de contraseñas comunes o filtradas (recomendación de NIST 800-63B).

### SEG-10 — Sin registro de eventos de seguridad (Baja)

- **Descripción:** el backend no registra logins fallidos, 401 ni 403; el único log es `console.error` de los errores 500. Un ataque como el de SEG-02 pasaría inadvertido.
- **Evidencia:** revisión del código (`errorHandler.ts` es el único `console.*` de los middlewares y de auth).
- **Corrección:** registro estructurado de eventos de autenticación y autorización, sin contraseñas ni tokens, con alertas ante ráfagas.

### SEG-11 — Timestamp Disclosure en una dependencia de desarrollo (Descartado)

- **Descripción:** ZAP (regla 10096, riesgo Bajo) marca el número `2080374784` en `/node_modules/.vite/deps/react-dom_client.js` como una marca de tiempo Unix.
- **Análisis:** es `0x7C000000`, una máscara de bits interna de React, no una fecha; además el archivo solo existe en el servidor de desarrollo de Vite. Se clasifica como **falso positivo** (Informativa). Encontrado en el paso 2.3.1 (proxy + AJAX spider).
- **Destino:** **descartado** (falso positivo): no es una fecha ni existe en el build de producción. Fuera de la hoja de ruta.

### SEG-12 — Token en la URL del servidor de desarrollo (Descartado)

- **Descripción:** ZAP (regla 10024) encuentra un parámetro `token` en `GET http://localhost:5173/?token=…`.
- **Análisis:** es el `wsToken` de 12 caracteres que Vite 8.3.5 usa para el WebSocket de recarga en caliente, no el JWT de la app (no empieza por `eyJ`). Solo existe en modo desarrollo. Encontrado en el paso 2.3.1.
- **Destino:** **descartado** (solo de desarrollo): el token no existe en el build y no da acceso a datos de la app. Fuera de la hoja de ruta.

### SEG-13 — El login devuelve el token de sesión en el cuerpo JSON (Informativa)

- **Descripción:** ZAP (regla 10112) identifica `POST /api/auth/login` como respuesta de gestión de sesión: el JWT viaja en el campo `token` del JSON.
- **Análisis:** es el diseño actual y no es una vulnerabilidad por sí mismo; el riesgo está en que el frontend lo guarda donde JavaScript puede leerlo (SEG-03). Encontrado en el paso 2.3.1.
- **Destino:** hoja de ruta junto con SEG-03 (cookie `HttpOnly`), esfuerzo Alto.

### SEG-14 — La CSP del frontend admite imágenes de cualquier origen `https:` (Baja)

- **Descripción:** ZAP (regla 10055, riesgo Medio) marca `img-src 'self' data: https:` como directiva con comodín.
- **Análisis:** es el compromiso elegido para que el admin pueda usar imágenes externas. Una imagen no ejecuta código: `script-src`, `style-src`, `connect-src` y `frame-ancestors` siguen cerrados. El riesgo que queda es cargar imágenes de terceros (rastreo o contenido engañoso puesto por un admin). Por eso se clasifica como **Baja** en la escala de este informe, aunque ZAP la reporte como Media. Encontrado en la medición del después de SEG-04.
- **Destino:** hoja de ruta, esfuerzo Medio: subir las imágenes al propio servidor o permitir solo una lista de dominios.

### SEG-15 — Faltan cabeceras de aislamiento y `Permissions-Policy` en el frontend (Baja)

- **Descripción:** ZAP (reglas 90004 y 10063, riesgo Bajo) reporta la ausencia de `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy` y `Permissions-Policy` en el build.
- **Análisis:** son defensas adicionales contra ataques de canal lateral entre pestañas y para restringir APIs del navegador (cámara, micrófono…), que la app no usa. Encontrado en la medición del después de SEG-04.
- **Destino:** hoja de ruta, esfuerzo Bajo: agregar `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin` y una `Permissions-Policy` restrictiva en `preview.headers` (COEP `require-corp` bloquearía las imágenes externas de SEG-14).

## Controles que funcionaron

- **Inyección SQL:** todas las consultas usan parámetros. Las cargas clásicas, la ciega por tiempo y la de `UNION` no surtieron efecto, y los comodines de `LIKE` se escapan.
- **XSS:** React escapa todo el texto. El payload almacenado no se ejecutó en ninguna de las 6 vistas, y `imagen_url` rechaza `javascript:`.
- **Control de acceso:** roles verificados en el servidor (403); las órdenes ajenas dan 404, sin revelar que existen; un JWT manipulado o con `alg=none` da 401.
- **Asignación masiva:** el registro ignora `rol` e `id`.
- **Errores:** ninguna respuesta filtró stack, rutas ni mensajes de PostgreSQL.
- **CORS** restringido a un solo origen.
- **Datos de tarjeta:** solo se guardan los últimos 4 dígitos (comprobado en los 80 pagos históricos y en los creados por las pruebas).
- **Dependencias:** `npm audit` sin vulnerabilidades conocidas.
- **Secretos:** las API keys y el `JWT_SECRET` solo están en `backend/.env`, que git ignora. Los reportes de ZAP no contienen tokens.
- **Integridad transaccional:** ni con el backend bloqueado hubo sobreventa ni stock negativo (ver 02-rendimiento.md).
