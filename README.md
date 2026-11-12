# Tienda USCO — Ecommerce

Proyecto de la electiva **Ingeniería de Software II** (Universidad Surcolombiana).

Tienda web con inicio de sesión (JWT y roles), catálogo con búsqueda y filtros, carrito, checkout con **pago simulado**, "Mis pedidos", panel de administración (productos y órdenes) y un chatbot de ayuda. El objetivo académico es implementar la arquitectura de referencia del curso y, en particular, una **transacción ACID con bloqueo de fila** que evita la sobreventa.

## Arquitectura de referencia vs. implementación

| Arquitectura de referencia (matrículas) | Implementación en el ecommerce | Dónde está |
|---|---|---|
| **Cliente** | SPA en React + Vite + TypeScript (web y móvil, responsive) | `frontend/` |
| **API Gateway / Seguridad** | Express: CORS, `verificarToken` (JWT → 401), `requiereRol` (→ 403), límite de peticiones en el chat y validadores (→ 400) | `backend/src/middleware/`, `backend/src/validators/` |
| **Microservicio de matrículas** | Módulo de órdenes (`POST /api/ordenes`) | `backend/src/controllers/ordenes.controller.ts` |
| · Validar requisitos | Validar el cuerpo (items, tarjeta), que el usuario sea cliente y que cada producto exista y esté activo (→ 404) | `validators/orden.validator.ts` |
| · Verificar cupo con bloqueo de fila | `SELECT … FROM productos … ORDER BY id FOR UPDATE` y comparar stock (→ 409 si no alcanza) | `ordenes.controller.ts` |
| · Registrar inscripción | `INSERT` en `ordenes`, `orden_items` y `pagos` y `UPDATE` del stock | `ordenes.controller.ts` |
| **PostgreSQL con transacción ACID** | PostgreSQL 16 en Docker; todo el checkout dentro de `BEGIN … COMMIT` / `ROLLBACK` con un cliente dedicado del pool | `docker-compose.yml`, `database/schema.sql` |

```mermaid
flowchart LR
    C["Cliente<br/>React SPA (web y móvil)"] -->|"HTTP + JSON<br/>Authorization: Bearer JWT"| G

    subgraph API["Backend Express (monolito modular)"]
        G["Gateway / Seguridad<br/>CORS · verificarToken · requiereRol<br/>validadores · rate limit"]
        G --> A["Auth<br/>registro · login · me"]
        G --> P["Productos<br/>catálogo · CRUD admin"]
        G --> O["Órdenes (checkout)<br/>1. validar requisitos<br/>2. SELECT … FOR UPDATE<br/>3. registrar orden y pago"]
        G --> CH["Chat (Strategy)"]
        O --> PS["pago.service<br/>pasarela simulada"]
        CH --> GQ["Groq (principal)"]
        CH -.->|"configurable"| GM["Gemini"]
        CH -.->|"si falla"| R["Reglas (sin internet)"]
    end

    A --> DB[("PostgreSQL 16<br/>transacción ACID")]
    P --> DB
    O --> DB
```

## Requisitos

- **Node.js 20 o superior** (probado con v24)
- **Docker Desktop** (para PostgreSQL)
- Git
- Opcional: una API key gratuita de [Groq](https://console.groq.com/keys) para el chatbot. Sin key, el chat responde con reglas.

> En esta máquina los puertos 5432 y 5433 los ocupan PostgreSQL nativos de Windows; por eso el contenedor se expone en el **5434**.

## Instalación desde cero

```bash
git clone <url-del-repositorio> ecommerce-ing2
cd ecommerce-ing2
```

1. **Base de datos.** Con Docker Desktop abierto:
   ```bash
   docker compose up -d
   ```
   La primera vez, PostgreSQL ejecuta `database/schema.sql` y crea las 5 tablas. El contenedor se reinicia solo cuando se abre Docker Desktop.

2. **Variables de entorno.** Copia los ejemplos y complétalos:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   En `backend/.env` genera un `JWT_SECRET` propio:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Para el chat, pega tu key en `GROQ_API_KEY` (o deja `CHAT_PROVEEDOR=reglas`). Las keys **solo** van en `backend/.env`, que está en `.gitignore`.

3. **Dependencias** (raíz, backend y frontend):
   ```bash
   npm run instalar
   ```

4. **Datos de prueba** (3 usuarios y 12 productos):
   ```bash
   npm run db:reset
   ```

5. **Chequeo previo:**
   ```bash
   npm run verificar
   ```
   Debe terminar en `LISTO PARA LA DEMO`. Si no, muestra cada problema con su solución.

6. **Arrancar** backend y frontend juntos:
   ```bash
   npm run dev
   ```
   Abre http://localhost:5173 (la API queda en http://localhost:3000/api).

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@tienda.com | Admin12345 (`ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`) |
| Cliente | cliente@tienda.com | Cliente123 |
| Cliente 2 (prueba de concurrencia) | cliente2@tienda.com | Cliente123 |

## Tarjetas de prueba

El pago es **simulado**: no se cobra dinero real y nunca se guarda el número completo ni el CVV (solo los últimos 4 dígitos).

| Número | Resultado |
|---|---|
| 4111 1111 1111 1111 (o cualquier número de 16 dígitos) | APROBADO → orden PAGADA, se descuenta el stock |
| 4000 0000 0000 0000 (cualquiera que termine en **0000**) | RECHAZADO → orden RECHAZADA, el stock no cambia |

Vencimiento: cualquier fecha futura en formato MM/AA (ej. 12/28). CVV: cualquier número de 3 dígitos.

## Scripts disponibles (desde la raíz)

| Script | Qué hace |
|---|---|
| `npm run instalar` | `npm install` en la raíz, `backend/` y `frontend/` |
| `npm run dev` | Levanta backend y frontend juntos (prefijos de color `[api]` y `[web]`) |
| `npm run db:reset` | Vacía las tablas, reinicia los ids y carga los datos de prueba. Se niega a correr con `NODE_ENV=production` |
| `npm run db:demo` | Igual que `db:reset` y además carga datos de demostración coherentes: 48 productos más, 12 clientes y 40 órdenes con su historial (240 registros) |
| `npm run verificar` | Chequeo previo: Docker, contenedor, tablas, `.env`, puertos e internet/Groq |
| `npm run prueba:concurrencia` | Dos clientes compran a la vez la última unidad del monitor: debe dar 201 + 409 y stock final 0 |

En `backend/` también están `npm run seed`, `npm run build` y `npm start`; en `frontend/`, `npm run build` y `npm run lint`.

## Endpoints de la API

Base: `http://localhost:3000/api`. Todas las respuestas son JSON con nombres en español.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servidor y de la BD |
| POST | `/auth/registro` | Público | Crea un cliente (el rol siempre es `cliente`) |
| POST | `/auth/login` | Público | Devuelve `{ token, usuario }` |
| GET | `/auth/me` | Autenticado | Usuario del token |
| GET | `/productos` | Público | Catálogo activo. Query: `buscar`, `categoria`, `pagina`, `limite` (máx. 50) |
| GET | `/productos/categorias` | Público | Categorías de productos activos |
| GET | `/productos/:id` | Público | Detalle (404 si no existe o está inactivo) |
| POST | `/productos` | Admin | Crea un producto |
| PUT | `/productos/:id` | Admin | Reemplazo completo |
| DELETE | `/productos/:id` | Admin | **Borrado lógico** (`activo = false`) |
| PATCH | `/productos/:id/activar` | Admin | Reactiva un producto |
| GET | `/admin/productos` | Admin | Todos los productos. Query: `buscar`, `activo`, `pagina`, `limite` |
| POST | `/ordenes` | Cliente | Checkout en una transacción: 201 pagada, 402 rechazada, 404 producto no disponible, 409 sin stock |
| GET | `/ordenes/mias` | Cliente | Mis pedidos, del más reciente al más antiguo |
| GET | `/ordenes/:id` | Autenticado | Detalle; un cliente solo ve las suyas (las ajenas dan 404) |
| GET | `/admin/ordenes` | Admin | Todas las órdenes. Query: `estado`, `pagina`, `limite` |
| POST | `/chat` | Público | Chatbot. 10 peticiones por minuto por IP (→ 429) |

Códigos: **400** datos inválidos · **401** sin token o token inválido · **403** sin permiso por rol · **404** no encontrado · **409** conflicto de stock · **402** pago rechazado · **429** demasiadas peticiones.

## Decisiones de diseño

- **Transacción del checkout.** Un cliente dedicado del pool ejecuta `BEGIN`, bloquea los productos con `SELECT … FOR UPDATE`, valida existencia y stock, simula el pago, registra orden, items y pago, descuenta el stock y hace `COMMIT`; ante cualquier error, `ROLLBACK`. La evidencia (con y sin `FOR UPDATE`) está en `docs/evidencias/pruebas-backend.md`.
- **`ORDER BY id` en el bloqueo.** Dos transacciones siempre bloquean las filas en el mismo orden, lo que evita deadlocks cuando dos carritos comparten productos.
- **El total sale de la BD.** El backend ignora cualquier precio o total que envíe el cliente y calcula con los precios de la tabla `productos` (en centavos, para evitar errores de redondeo).
- **Respaldo con `CHECK (stock >= 0)`.** Aunque el código fallara, la BD nunca acepta stock negativo.
- **Borrado lógico** de productos: las órdenes históricas siguen apuntando a productos existentes.
- **404 en órdenes ajenas** (en lugar de 403), para no revelar que la orden existe.
- **SQL parametrizado** (`$1, $2…`) en todas las consultas, sin ORM (`pg`); probado contra inyección SQL.
- **Contraseñas con bcrypt** (bcryptjs, 10 rondas) y JWT con `{ id, rol }`; el login responde el mismo mensaje si falla el email o la contraseña.
- **Datos de tarjeta**: solo viven en el estado del formulario; el backend guarda únicamente los últimos 4 dígitos y nunca los escribe en logs.
- **Chatbot con patrón Strategy**: `ProveedorChat` con implementaciones Groq, Gemini y reglas; `CHAT_PROVEEDOR` elige el principal y, si falla (timeout de 8 s, 429, 5xx, key inválida, sin red), responde el de reglas. Las keys solo están en el backend.
- **Imágenes locales** (`frontend/public/productos/`) para que el catálogo no dependa de internet en la demo.
- **Validación en los dos lados**: el frontend da retroalimentación inmediata y el backend es la autoridad.

## Limitaciones conocidas

- **No son microservicios reales**: es un backend modular (un solo proceso Express y una sola BD). Los módulos están separados por rutas, controladores, servicios y validadores, pero se despliegan juntos.
- **La latencia del pago simulado ocurre dentro de la transacción** (500 ms con las filas bloqueadas). Con una pasarela real convendría reservar stock, cobrar fuera de la transacción y confirmar o liberar después.
- **El token se guarda en `localStorage`**, expuesto a XSS. En producción se usaría una cookie `HttpOnly` + `SameSite` y tokens de refresco.
- **No hay HTTPS en local.** En producción iría detrás de un proxy con TLS.
- El chatbot v1 **no consulta la BD** (no conoce precios, stock ni pedidos); el plan de la v2 es darle esas herramientas.
- El plan gratuito de Groq tiene cuotas; si se agotan, el chat responde con reglas.
- No hay suite de pruebas automatizadas; las pruebas son scripts y recorridos documentados en `docs/evidencias/`.

## Estructura

```
database/        schema.sql (5 tablas)
backend/         API REST (Express + TypeScript)
  src/chat/        proveedores del chatbot (Strategy) y system prompt
  src/controllers/ lógica de cada recurso
  src/middleware/  JWT, roles y manejo de errores
  src/validators/  validación de entradas
  src/scripts/     seed, reset y prueba de concurrencia
frontend/        SPA React (Vite + Tailwind)
scripts/         verificar.mjs (chequeo previo a la demo)
docs/            evidencias de pruebas y guion de la demo
```
