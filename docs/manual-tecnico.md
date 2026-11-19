# Manual técnico — Tienda USCO

Manual para quien nunca vio el proyecto: qué necesita, cómo está hecho, cómo se despliega, cómo se prueba y qué hacer cuando algo falla. Tienda USCO es un ecommerce de clase (Ingeniería de Software II, USCO) con catálogo, carrito, checkout con pago simulado, "Mis pedidos", panel de administración y un chatbot de ayuda.

## 1. Requisitos

| Para | Necesitas |
|---|---|
| Desplegar con Docker Compose | Docker Desktop (o Docker Engine con Compose v2) y Git |
| Desarrollar | Node.js 22.18 o superior (probado con v24.19.0), npm, Docker Desktop (solo para PostgreSQL) y Git |
| Chatbot con IA | Una API key de Groq (opcional: sin key responde el proveedor de reglas) |
| Pruebas | k6 y OWASP ZAP se usan desde sus imágenes de Docker; Playwright se instala en `pruebas/usabilidad` |

Puertos usados: **8080** (web en Compose), **3000** (API), **5173** (web en desarrollo), **5434** (PostgreSQL de desarrollo, solo en `127.0.0.1`).

## 2. Arquitectura resumida

```
Navegador ──► Frontend (React + Vite + Tailwind)
                 │  fetch con JWT en Authorization: Bearer
                 ▼
             API REST (Node + Express + TypeScript)
               ├─ middleware: helmet, CORS, JSON, autenticación JWT y roles (401/403)
               ├─ módulos: auth · productos · órdenes (checkout) · chat
               └─ pg (sin ORM) ──► PostgreSQL 16
```

- **Backend modular con JWT.** Cada módulo tiene su ruta (`routes/`), su controlador (`controllers/`) y sus validaciones (`validators/`). El login devuelve un JWT firmado con `JWT_SECRET`; el middleware `middleware/auth.ts` lo verifica y el de roles separa cliente y admin. Las contraseñas se guardan con bcrypt; el login tiene límite de intentos (`express-rate-limit`).
- **Módulo de checkout.** `POST /api/ordenes` ejecuta una sola transacción (`BEGIN … COMMIT/ROLLBACK`) que bloquea las filas de los productos con `SELECT … FOR UPDATE` (en orden de id, para evitar interbloqueos), valida el stock, registra la orden, sus ítems y el pago simulado, y descuenta el stock. Dos compras de la última unidad se atienden en fila: una responde 201 y la otra 409. Solo se guardan los últimos 4 dígitos de la tarjeta; las que terminan en `0000` se rechazan (402).
- **Chatbot con patrón Strategy.** `chat/proveedor.ts` define la interfaz; hay tres estrategias intercambiables: Groq (`proveedor-groq.ts`, la principal), Gemini (`proveedor-gemini.ts`) y reglas (`proveedor-reglas.ts`). `CHAT_PROVEEDOR` elige la estrategia y, si el proveedor externo falla, responde el de reglas. Con IA, el chat usa herramientas de solo lectura (`herramientas.ts`): productos, categorías y los pedidos del usuario del token (filtrados por `usuario_id` en el SQL).
- **Frontend.** React con React Router; el carrito vive en el navegador y la sesión en un contexto. En producción se sirve con nginx y cabeceras de seguridad (CSP, `X-Frame-Options`, `nosniff`).

## 3. Estructura del repositorio

| Ruta | Contenido |
|---|---|
| `backend/src/index.ts` | Arranque de Express: helmet, CORS, rutas y manejo de errores |
| `backend/src/config/` | `env.ts` (variables obligatorias) y `db.ts` (pool de `pg`) |
| `backend/src/routes/`, `controllers/`, `validators/` | Módulos auth, productos, órdenes y chat |
| `backend/src/middleware/` | Autenticación JWT, roles y manejador de errores |
| `backend/src/services/pago.service.ts` | Pago simulado |
| `backend/src/chat/` | Chatbot: proveedores (Strategy), herramientas y prompt |
| `backend/src/scripts/` | Seed, `reset`, `demo`, `poblar` y prueba de concurrencia |
| `backend/Dockerfile` | Imagen de la API (multi-etapa, usuario sin privilegios) |
| `frontend/src/` | Páginas, componentes, contextos y cliente de la API |
| `frontend/cabeceras-seguridad.ts` | Cabeceras de seguridad (única fuente para Vite y nginx) |
| `frontend/generar-nginx.mjs`, `frontend/Dockerfile` | Imagen del frontend con nginx |
| `database/schema.sql` | Esquema (5 tablas); PostgreSQL lo ejecuta al crear el volumen |
| `docker-compose.yml` | Solución completa (proyecto `tienda-usco`: db, api, web) |
| `docker-compose.dev.yml` | Solo la BD de desarrollo (contenedor `ecommerce_db`) |
| `scripts/verificar.mjs` | Chequeo previo del entorno de desarrollo |
| `pruebas/` | Rendimiento (k6), seguridad (ZAP y manuales), usabilidad, regresión y E2E |
| `docs/` | OpenAPI, informes de pruebas (`docs/pruebas/00` a `07`), guion de la demo y este manual |

## 4. Variables de entorno

Solo los nombres y para qué sirven; los valores de ejemplo están en `backend/.env.example`, `frontend/.env.example` y `.env.compose.example`. Los archivos reales (`backend/.env`, `frontend/.env`, `.env.compose`) **no se versionan**.

**Backend (`backend/.env` en desarrollo; en Compose las arma `docker-compose.yml`)**

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto de la API |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de los tokens de sesión |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo, `2h`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador que crea el seed |
| `CORS_ORIGIN` | Origen del frontend autorizado a llamar a la API |
| `CHAT_PROVEEDOR` | Estrategia del chatbot: `groq`, `gemini` o `reglas` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Credencial y modelo de Groq |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Credencial y modelo de Gemini (alternativa) |

**Frontend (`frontend/.env`)**

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | URL de la API que usa el navegador (se incrusta en el build) |

**Docker Compose (`.env.compose`)**

| Variable | Para qué sirve |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Usuario, contraseña y base del contenedor `db` (también los usa la API) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Igual que en el backend |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Administrador del seed (llegan a la API como `ADMIN_EMAIL` y `ADMIN_PASSWORD`; el prefijo evita que los pisen variables globales del sistema con esos nombres) |
| `WEB_URL` | URL pública del frontend; la API la usa como `CORS_ORIGIN` |
| `API_URL` | Origen público de la API, sin `/api` (por ejemplo, `http://localhost:3000`): el bundle usa `API_URL/api` y la CSP lo autoriza en `connect-src` |
| `CHAT_PROVEEDOR`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot |

## 5. Despliegue con Docker Compose (paso a paso)

1. Clona el repositorio y abre Docker Desktop.
2. Crea las variables del despliegue y complétalas (contraseña de la BD y `JWT_SECRET` aleatorios; la key de Groq si quieres el chat con IA):
   ```bash
   cp .env.compose.example .env.compose
   ```
3. Construye y levanta los tres servicios:
   ```bash
   npm run deploy
   ```
   Equivale a `docker compose --env-file .env.compose up -d --build`. Arranca primero `db`; la `api` espera a que la BD esté sana y el `web` espera a que la API esté sana (healthchecks con `depends_on: condition: service_healthy`).
4. Carga los datos de demostración (15 usuarios, 60 productos, 40 órdenes):
   ```bash
   npm run deploy:demo
   ```
5. Comprueba que todo esté sano y abre la tienda:
   ```bash
   docker compose ps
   ```
   Web: http://localhost:8080 · API: http://localhost:3000/api · Credenciales: `admin@tienda.com` / `Admin12345`, `cliente@tienda.com` / `Cliente123`.
6. Para detenerlo (los datos quedan en el volumen `tienda-usco_datos`):
   ```bash
   npm run deploy:down
   ```

Detalles del despliegue: la API corre con el usuario `node` (sin privilegios) y el frontend con `nginx-unprivileged`; la BD no publica puertos (solo la API la alcanza por la red interna). El proyecto se llama `tienda-usco`, así que no choca con la BD de desarrollo (`ecommerce_db`). Si cambias `API_URL` o `WEB_URL`, vuelve a ejecutar `npm run deploy` para reconstruir el frontend.

## 6. Despliegue en modo desarrollo

1. BD de desarrollo: `npm run db:levantar` (contenedor `ecommerce_db` en `127.0.0.1:5434`, archivo `docker-compose.dev.yml`).
2. Variables: `cp backend/.env.example backend/.env` y `cp frontend/.env.example frontend/.env`; completa `backend/.env` (`DB_PASSWORD`, `JWT_SECRET`, key de Groq).
3. Dependencias: `npm run instalar`.
4. Datos: `npm run db:demo` (o `npm run db:reset` para el mínimo).
5. Chequeo: `npm run verificar` → debe terminar en "LISTO PARA LA DEMO".
6. Arranque: `npm run dev` → web en http://localhost:5173 y API en http://localhost:3000/api, con recarga en caliente.

No se pueden correr a la vez el modo desarrollo y Compose, porque ambos usan el puerto 3000: detén uno antes de levantar el otro.

## 7. Scripts de base de datos

| Script | Qué hace |
|---|---|
| `npm run db:reset` | Vacía las tablas, reinicia los ids y ejecuta el seed: 3 usuarios (admin, cliente, cliente2) y 12 productos |
| `npm run db:demo` | Igual que `db:reset` y agrega 48 productos, 12 clientes y 40 órdenes coherentes (240 registros); es el estado de demostración y de entrega |
| `npm run db:poblar` | Datos para pruebas de carga: suma 48 productos, 3 productos de carga con stock 100000, 25 clientes `carga01…carga25` y 80 órdenes |
| `npm run deploy:demo` | `db:demo` dentro del contenedor de la API del despliegue con Compose |

Los tres se niegan a correr con `NODE_ENV=production`.

## 8. API

La especificación completa está en `docs/openapi.yaml` (OpenAPI 3). Endpoints principales (base `/api`):

| Método y ruta | Acceso | Para qué |
|---|---|---|
| `POST /auth/registro`, `POST /auth/login`, `GET /auth/me` | Público / sesión | Cuenta y sesión (JWT) |
| `GET /productos`, `GET /productos/:id`, `GET /productos/categorias` | Público | Catálogo con búsqueda, filtro y paginación |
| `POST /productos`, `PUT /productos/:id`, `DELETE /productos/:id`, `PATCH /productos/:id/activar` | Admin | CRUD (el borrado es lógico) |
| `GET /admin/productos`, `GET /admin/ordenes` | Admin | Panel de administración |
| `POST /ordenes` | Cliente | Checkout en una transacción con `FOR UPDATE` |
| `GET /ordenes/mias`, `GET /ordenes/:id` | Cliente (propias) o admin | Mis pedidos y detalle |
| `POST /chat` | Público (token opcional) | Chatbot |
| `GET /health` | Público | Diagnóstico (lo usa el healthcheck) |

Códigos: 400 datos inválidos, 401 sin token o token inválido, 402 pago rechazado, 403 sin permiso, 404 no encontrado, 409 sin stock, 429 demasiados intentos, 503 servidor ocupado.

## 9. Cómo correr las pruebas

| Prueba | Preparación | Comando | Resultados |
|---|---|---|---|
| E2E de aceptación (desarrollo) | `npm run dev` y `npm run db:demo` | `npm run test:e2e` | `pruebas/e2e/resultados/e2e-desarrollo.*` |
| E2E de aceptación (Compose) | `npm run deploy` y `npm run deploy:demo` | `npm run test:e2e:compose` | `pruebas/e2e/resultados/e2e-compose.*` y `docs/pruebas/07-aceptacion-e2e.md` |
| Rendimiento (k6) | `npm run dev` y `npm run db:poblar` | `bash pruebas/rendimiento/ejecutar.sh` | `pruebas/rendimiento/resultados/` y `docs/pruebas/02-rendimiento.md` |
| Seguridad (OWASP ZAP) | `npm run dev`, build del frontend con `vite preview --host 0.0.0.0 --port 4173` y `CHAT_PROVEEDOR=reglas` | `bash pruebas/seguridad/ejecutar-zap.sh` | `pruebas/seguridad/reportes/` y `docs/pruebas/03-seguridad.md` |
| Concurrencia | `npm run dev` (o Compose) | `npm run prueba:concurrencia` (o `npm run deploy:concurrencia`) | Debe decir PRUEBA SUPERADA |

Después de las pruebas que compran (E2E, concurrencia, k6), vuelve a cargar la demo (`npm run db:demo` o `npm run deploy:demo`).

## 10. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `docker ps` da "500 Internal Server Error" o "cannot find the file" | Docker Desktop está cerrado o arrancando. Ábrelo y espera |
| Docker Desktop se cierra al arrancar con "remove …\dockerInference: The file cannot be accessed by the system" | Socket AF_UNIX dañado de un arranque anterior. Cierra Docker Desktop, renombra `%LOCALAPPDATA%\Docker\run` (y, si el error menciona `engine.sock`, `%LOCALAPPDATA%\docker-secrets-engine`) y vuelve a abrirlo. No uses "Reset to factory defaults": borra imágenes y volúmenes |
| `ecommerce_db` aparece `Exited` | `npm run db:levantar` |
| Los puertos 5432 y 5433 están ocupados | Son PostgreSQL nativos de Windows; por eso la BD de desarrollo usa el 5434 |
| La app toma `ADMIN_EMAIL` o `ADMIN_PASSWORD` de otro proyecto | Variables globales de Windows; `env.ts` usa `dotenv.config({ override: true })` para que mande `backend/.env` |
| Cambié `backend/.env` y no pasa nada | `tsx watch` no recarga el `.env`: reinicia el backend |
| El login responde 429 | Se superaron 5 intentos fallidos en 15 minutos para esa IP y ese email; espera o reinicia el backend |
| El chat responde "Respuesta automática" | Falló Groq (cuota de unas 8.000 tokens por minuto o key inválida) y respondió el proveedor de reglas. Espera unos 25 s entre preguntas |
| Un cuerpo mayor de 100 KB o con byte nulo da 500 | Hallazgo conocido (SEG-07), no un fallo del entorno |
| CORS bloquea las peticiones | `CORS_ORIGIN` no coincide con el origen del frontend (5173 en desarrollo, 8080 en Compose) |
| `npm run deploy` falla porque el puerto 3000 está ocupado | El backend de desarrollo está corriendo: detén `npm run dev` |
| En `npm run deploy`, `npm ci` falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, o en Compose el chat responde siempre con reglas | Un antivirus o proxy inspecciona el HTTPS con su propio certificado raíz (en el equipo de pruebas, Avast Web/Mail Shield): Windows confía en él, pero los contenedores no. Exporta ese certificado raíz (público) en formato PEM a `certs/ca-extra.pem`; el build y la API lo usan con `NODE_EXTRA_CA_CERTS`. No desactives la verificación TLS |
| En Compose, el admin del seed no puede entrar (401) | Variables globales del sistema con el mismo nombre pisan a `.env.compose` en la interpolación de Compose. Por eso el compose usa `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`; si agregas variables, evita nombres que ya existan en el sistema |
| El chat consume la cuota durante un escaneo de ZAP | Pon `CHAT_PROVEEDOR=reglas` durante el escaneo y vuelve a `groq` al final |

## 11. Decisiones técnicas

- **Sin ORM: `pg` con consultas parametrizadas.** Todas las consultas usan parámetros (`$1, $2…`), lo que elimina la inyección SQL (comprobado con 14 cargas en `03-seguridad.md`). Sobre todo, permite controlar de forma explícita la transacción del checkout: el `SELECT … FOR UPDATE` en orden de id, cuándo se libera la conexión y qué conexión hace cada consulta. Ese control fue el que permitió diagnosticar y corregir el autobloqueo del pool (REN-01) midiéndolo con k6.
- **Monolito modular en contenedores separados, en vez de microservicios.** La API es un solo proceso con módulos independientes (auth, productos, órdenes, chat) que comparten una BD transaccional. El checkout necesita stock, orden y pago en una misma transacción ACID; partirlo en servicios obligaría a transacciones distribuidas (sagas) sin beneficio para el tamaño del proyecto. La separación sí está en el despliegue: base de datos, API y frontend corren en contenedores distintos, cada uno con su healthcheck, y la API se puede escalar sin estado porque la sesión va en el JWT.
- **Patrón Strategy en el chatbot**, para cambiar de proveedor de IA por configuración y tener siempre un respaldo por reglas.
- **Cabeceras de seguridad en una sola fuente** (`frontend/cabeceras-seguridad.ts`), compartida por Vite y nginx, para que desarrollo, `vite preview` y el contenedor no diverjan.
