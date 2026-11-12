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

- **Spider de ZAP:** sí se usó. El escaneo baseline ejecuta el spider tradicional de ZAP sobre el frontend (`zap-baseline.py`, 1 minuto) y mapeó 6 URL: `/`, `/robots.txt`, `/sitemap.xml`, `/favicon.svg` y los dos *assets* (JS y CSS) (`pruebas/seguridad/reportes/baseline-frontend.json`). Encuentra tan pocas porque la app es una SPA: las rutas (`/carrito`, `/checkout`, `/admin`…) las dibuja React en el navegador y el spider tradicional no ejecuta JavaScript.
- **Rutas del backend:** se mapearon importando la especificación OpenAPI (`docs/openapi.yaml`, 17 endpoints) en `zap-api-scan.py`, con el token de cliente y de admin inyectado por una regla *replacer*. Es el equivalente al mapeo por proxy para una API REST.
- **Pendiente (requiere ejecutar una prueba nueva):** el enunciado pide "interceptar el tráfico de su propia aplicación web mientras navegan por ella". No se hizo una sesión de navegación manual con el navegador configurado contra el proxy de ZAP, ni se usó el *AJAX spider*, que sí ejecuta JavaScript. Ver `06-matriz-calidad.md`, "Brechas frente al enunciado".

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
