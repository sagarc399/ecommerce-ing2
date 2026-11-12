# 01 — Inventario del sistema bajo prueba

Estado medido: rama `pruebas-no-funcionales`, creada desde `master` (commit `47f7afa`, Fase 9). Este documento describe el sistema **antes** de cualquier corrección.

## Equipo de pruebas

| Elemento | Valor |
|---|---|
| CPU | AMD Ryzen 5 5500U with Radeon Graphics |
| Núcleos | 6 físicos, 12 hilos lógicos (2,1 GHz base) |
| RAM | 15,3 GB (3,9 GB libres al iniciar las pruebas) |
| Sistema operativo | Windows 11 Home Single Language, 64 bits (build 26200) |
| Node.js / npm | v24.19.0 / 11.17.0 |
| Docker | 28.5.1 (VM con 12 CPU y 7,4 GB de RAM) |
| PostgreSQL | 16.15 (Debian), en contenedor, puerto 5434 |

**Importante para interpretar los resultados:** el backend corre en modo desarrollo (`tsx watch`, sin compilar), con un solo proceso de Node, en la misma máquina que PostgreSQL, k6 y ZAP. Son valores de un portátil, útiles para comparar el antes y el después, no para estimar la capacidad de un servidor de producción.

## Datos de demostración (`npm run db:demo`)

Requisito 1.1 de la práctica: despliegue local con al menos 50 registros. `npm run db:demo` parte de cero (igual que `db:reset`, con las mismas credenciales de prueba) y carga datos coherentes y deterministas. Es el estado en que se entrega y se presenta la aplicación.

| Tabla | Registros | Detalle |
|---|---|---|
| usuarios | 15 | admin, cliente, cliente2 y 12 clientes con nombres reales (`nombre.apellido@correo.com`, clave `Cliente123`) |
| productos | 60 | 12 del seed (sin tocar: monitor con stock 1, lámpara agotada) y 48 del catálogo de prueba en 4 categorías |
| ordenes | 40 | 34 PAGADA y 6 RECHAZADA, repartidas en los últimos 60 días entre los 14 clientes |
| orden_items | 85 | Solo productos del catálogo de prueba |
| pagos | 40 | Solo los últimos 4 dígitos (1111 aprobadas, 0000 rechazadas) |
| **Total** | **240** | |

Comprobaciones que imprime el script (todas en 0): stock negativo, órdenes cuyo estado no coincide con el del pago, órdenes cuyo total no es la suma de sus ítems, órdenes sin ítems e ítems en productos del seed. Además, el stock de los 48 productos cuadra con su stock inicial menos las 73 unidades de las órdenes pagadas, y dos corridas seguidas dejan exactamente los mismos datos.

## Datos de prueba de carga (`npm run db:poblar`)

Para k6 (no para la demo): agrega a lo que haya en la BD los 48 productos, 3 productos de carga con stock 100000, 25 clientes `carga01…carga25` y 80 órdenes. Después de `db:reset` deja:

| Tabla | Registros | Detalle |
|---|---|---|
| usuarios | 28 | admin, cliente, cliente2 y carga01…carga25 |
| productos | 63 | 12 del seed, 48 generados y 3 de carga (stock 100000) |
| ordenes | 80 | 68 PAGADA (85 %) y 12 RECHAZADA (15 %) |
| orden_items | 161 | |
| pagos | 80 | Solo los últimos 4 dígitos |

## Flujos principales

**Cliente:** Registro (`POST /auth/registro`) → Login (`POST /auth/login`) → Catálogo (`GET /productos`, `GET /productos/categorias`, `GET /productos/:id`) → Carrito (solo en el navegador, sin API) → Checkout y pago (`POST /ordenes`) → Mis pedidos (`GET /ordenes/mias`, `GET /ordenes/:id`).

**Administrador:** Login → Panel de productos (`GET /admin/productos`) → Crear, editar, desactivar y activar (`POST`, `PUT`, `DELETE`, `PATCH /productos…`) → Órdenes (`GET /admin/ordenes`, `GET /ordenes/:id`).

**Transversal:** Chatbot (`POST /chat`), con o sin sesión.

## Endpoints

Base: `http://localhost:3000/api`. La especificación completa está en [`docs/openapi.yaml`](../openapi.yaml).

| Método | Ruta | Autenticación | Operación en BD | Criticidad | Justificación |
|---|---|---|---|---|---|
| GET | `/health` | Pública | Lectura (`SELECT 1`) | Baja | Solo diagnóstico; no expone datos |
| POST | `/auth/registro` | Pública | Escritura | Alta | Crea cuentas; riesgo de asignación masiva de rol. bcrypt consume CPU |
| POST | `/auth/login` | Pública | Lectura | Alta | Puerta de entrada; objetivo de fuerza bruta. bcrypt consume CPU |
| GET | `/auth/me` | Cliente o admin | Lectura | Media | Valida la sesión al recargar |
| GET | `/productos` | Pública | Lectura (2 consultas) | Alta | Página principal, la más visitada; ejecuta `ILIKE` con texto del usuario |
| GET | `/productos/categorias` | Pública | Lectura | Baja | Lista corta para el filtro |
| GET | `/productos/:id` | Pública | Lectura | Media | Detalle del producto |
| POST | `/productos` | Admin | Escritura | Media | Datos que se muestran a todos los usuarios (XSS almacenado) |
| PUT | `/productos/:id` | Admin | Escritura | Media | Cambia precios y stock |
| DELETE | `/productos/:id` | Admin | Escritura (borrado lógico) | Media | Saca productos del catálogo |
| PATCH | `/productos/:id/activar` | Admin | Escritura | Baja | Reversa de la anterior |
| GET | `/admin/productos` | Admin | Lectura | Media | Incluye inactivos |
| POST | `/ordenes` | Cliente | **Transacción** (`FOR UPDATE`) | **Crítica/Alta** | Dinero, stock y datos de tarjeta; bloquea filas durante 500 ms |
| GET | `/ordenes/mias` | Cliente | Lectura | Alta | Datos personales del comprador |
| GET | `/ordenes/:id` | Cliente (propias) o admin | Lectura | Alta | Riesgo de IDOR |
| GET | `/admin/ordenes` | Admin | Lectura (2 consultas) | Alta | Datos de todos los compradores |
| POST | `/chat` | Pública (token opcional) | Lectura (herramientas) | Alta | Consume una API externa; lee pedidos del usuario del token |

## Exclusiones

**`POST /api/chat` no se prueba con carga.** Tiene un límite de 10 peticiones por minuto por IP, así que una prueba de carga mediría ese límite y no el rendimiento. Además, cada petición consume la cuota gratuita de Groq (8.000 tokens por minuto) y su tiempo depende de un servicio externo.
