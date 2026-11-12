# 02 — Pruebas de rendimiento (estado inicial)

Herramienta: **k6 v2.3.0** (imagen `grafana/k6`), contra `http://host.docker.internal:3000/api`. Scripts en `pruebas/rendimiento/`, resultados crudos en `pruebas/rendimiento/resultados/`. Equipo y condiciones en [01-inventario.md](01-inventario.md).

Se documenta el estado **antes** de cualquier corrección: ningún hallazgo se corrigió.

## Metodología

- Cada escenario tiene rampa de 30 s de subida, 60 s sostenido y 15 s de bajada, con 1 s de pausa entre iteraciones de cada VU.
- Thresholds de referencia: lecturas p95 < 500 ms; escrituras p95 < 1500 ms; errores < 1 %.
- El login no escribe en la BD, pero se evalúa como escritura porque bcrypt consume CPU a propósito.
- Las métricas se filtran por etiqueta, así que los 25 logins de preparación de los checkouts no cuentan.
- `POST /api/chat` se excluyó (ver [01-inventario.md](01-inventario.md#exclusiones)).

## Resultados

| Escenario | VUs máx | Peticiones | req/s | p50 | p90 | p95 | Máx | Errores | Thresholds |
|---|---|---|---|---|---|---|---|---|---|
| A. Catálogo | 50 | 4126 | 38,97 | 6,3 ms | 7,7 ms | 8,3 ms | 29,7 ms | 0,00 % | ✅ |
| B. Login | 30 | 1055 | 9,98 | 1,59 s | 2,17 s | 2,51 s | 5,11 s | 0,00 % | ❌ p95 |
| C1. Checkout distribuido | 20 | 86 | 0,62 | 1,06 s | 60,00 s | 60,00 s | 60,00 s | 23,26 % | ❌ **se bloquea** |
| C1. Repetición | 20 | 74 | 0,54 | 1,02 s | 59,99 s | 59,99 s | 59,99 s | 27,03 % | ❌ **se bloquea** |
| C2. Checkout con contención | 20 | 47 | 0,34 | 3,70 s | 59,99 s | 59,99 s | 59,99 s | 44,68 % | ❌ **se bloquea** |
| C1 a 8 VUs (adicional) | 8 | 362 | 3,35 | 597 ms | 1,63 s | 1,70 s | 2,26 s | 0,00 % | ❌ p95 |
| C2 a 8 VUs (adicional) | 8 | 184 | 1,70 | 3,20 s | 3,45 s | 3,46 s | 3,77 s | 0,00 % | ❌ p95 |

El valor de 60 s en C1 y C2 es el timeout configurado en k6: esas peticiones nunca recibieron respuesta.

**Sobre los escenarios adicionales.** Con 20 VUs el backend se bloquea (REN-01) y no se puede medir el efecto de `FOR UPDATE`. Por eso se agregaron corridas de C1 y C2 con 8 VUs, por debajo del punto de bloqueo. No reemplazan a los escenarios pedidos: los complementan.

**Sobre la primera corrida de C2.** El primer intento no llegó a medir nada: el backend seguía bloqueado por C1 y el login de preparación falló. Se reinició el backend y el resultado de la tabla es el del segundo intento.

## Integridad de los datos

Verificada en la BD después de todas las corridas (`resultados/integridad.txt`):

| Producto | Stock inicial | Vendidas en órdenes PAGADA | Stock esperado | Stock final | ¿Cuadra? |
|---|---|---|---|---|---|
| Producto carga A | 100000 | 394 | 99606 | 99606 | ✅ |
| Producto carga B | 100000 | 168 | 99832 | 99832 | ✅ |
| Producto carga C | 100000 | 160 | 99840 | 99840 | ✅ |

- Productos con stock negativo: **0**.
- Órdenes PAGADA: **790**, de las cuales **790** tienen pago APROBADO y **0** no tienen pago.
- Órdenes sin items: **0**.

**La transacción cumple:** ni siquiera con el backend bloqueado quedaron datos inconsistentes. El problema de REN-01 es de disponibilidad y de respuesta al cliente, no de integridad.

### Órdenes confirmadas sin respuesta al cliente

| Corrida | Peticiones | Respondidas 201 | Sin respuesta (timeout) | Unidades vendidas en la BD | Confirmadas sin respuesta |
|---|---|---|---|---|---|
| C1 | 86 | 66 | 20 | 76 | **10** |
| C1 repetición | 74 | 54 | 20 | 64 | **10** |
| C2 | 47 | 26 | 21 | 36 | **10** |
| C1 a 8 VUs | 362 | 362 | 0 | 362 | 0 |
| C2 a 8 VUs | 184 | 184 | 0 | 184 | 0 |

## Interpretación

- **Las lecturas sobran.** El catálogo con 50 VUs tiene un p95 de 8,3 ms, 60 veces por debajo del umbral, con 63 productos.
- **El login es el costo de bcrypt.** Cada verificación tarda unos 100 ms de CPU, y `bcryptjs` corre en JavaScript, en el mismo hilo que atiende todas las peticiones. Con 30 VUs se forma una cola: unas 10 validaciones por segundo y 1,6 s de mediana. No hay errores, solo lentitud.
- **`FOR UPDATE` funciona, pero serializa.** En C2 a 8 VUs, el throughput de 1,70 req/s está cerca del máximo teórico de 2 compras por segundo (una cada 500 ms de pago). Cada compra espera a las demás: mediana de 3,2 s, frente a 0,6 s cuando las compras se reparten entre 3 productos (C1 a 8 VUs, 3,35 req/s). Es el costo esperado de hacer el pago dentro de la transacción: el bloqueo se mantiene mientras dura el pago.

## Hallazgos

### REN-01 — Bloqueo total del backend con 10 checkouts simultáneos (Crítica)

**Qué pasa.** Con 10 o más compras a la vez, el backend deja de atender para siempre cualquier ruta que use la BD. Solo se recupera reiniciándolo. Se reprodujo en las 3 corridas de 20 VUs.

**Dónde ocurre.** En C1 (checkout distribuido) y C2 (contención), ambos con 20 VUs; las tres corridas de 20 VUs se bloquearon (C1, su repetición y C2). Con 8 VUs, C1 y C2 terminaron sin un solo error. El umbral teórico son 10 compras en curso a la vez, el tamaño del pool.

**Causa (autobloqueo del pool), confirmada en el código de `backend/src/controllers/ordenes.controller.ts`:**

| Línea | Código | Conexión |
|---|---|---|
| 41 | `const cliente = await pool.connect()` | Toma la conexión 1 |
| 43–121 | `BEGIN`, `SELECT … FOR UPDATE`, `INSERT`s, `UPDATE`, `COMMIT` | Todas con `cliente` (la 1). **Dentro de la transacción no se usa `pool.query`** |
| 127 | `await pool.query(SELECT_ORDEN …)` | **Pide una conexión 2**, mientras la 1 sigue tomada |
| 133 | `cliente.release()` (en el `finally`) | La conexión 1 solo se libera al final |

El pool tiene 10 conexiones (valor por defecto de `pg`) y no define `connectionTimeoutMillis`, así que espera para siempre. Con 10 compras simultáneas, las 10 retienen su conexión y esperan en la línea 127 una undécima que nunca llega, porque ninguna libera la suya hasta conseguirla. El resto de las rutas también usa `pool.query`, por eso toda la API que toca la BD queda colgada.

Se descartaron otras causas: no hay bloqueos de filas pendientes en PostgreSQL (`pg_locks` sin bloqueos no concedidos), no hay deadlock de PostgreSQL (habría devuelto un error) y el rechazo de pago (402) no pide una segunda conexión.

**Evidencia** (`resultados/diagnostico-bloqueo.txt`):

```
GET /api/health → sin respuesta (timeout de 5 s)
GET /api/productos/categorias → sin respuesta (timeout de 5 s)
GET /api/ruta-que-no-existe → HTTP 404 en 17 ms    ← Express sigue vivo; la BD no se alcanza
pg_stat_activity: 10 conexiones idle, última consulta COMMIT
pg_locks: 0 bloqueos no concedidos                 ← no es un bloqueo de PostgreSQL
```

**Impacto.** Cualquiera con cuenta de cliente puede tumbar la tienda con 10 peticiones simultáneas (también es SEG, ver 03-seguridad.md). Un pico normal de ventas produce el mismo efecto.

**Corrección recomendada.** Ejecutar la consulta final con el mismo cliente de la transacción, o liberar el cliente antes de hacerla. Además, definir `max` y `connectionTimeoutMillis` en el `Pool`, para que un agotamiento responda con error y no cuelgue para siempre. Luego repetir C1 y C2 con 20 VUs.

### REN-02 — Órdenes confirmadas sin que el cliente reciba respuesta (Alta)

**Qué pasa.** En cada bloqueo, exactamente 10 órdenes (el tamaño del pool) quedaron PAGADA en la BD mientras el cliente recibía un timeout. Son consecuencia directa de REN-01: el `COMMIT` ya ocurrió cuando la petición se queda esperando la consulta final.

**Impacto.** El cliente cree que su compra falló y puede repetirla, lo que generaría un cobro doble con una pasarela real.

**Corrección recomendada.** Corregir REN-01 y agregar una clave de idempotencia en `POST /ordenes`.

### REN-03 — El pago simulado retiene el bloqueo durante 500 ms (Media)

**Qué pasa.** Los 500 ms de pago ocurren dentro de la transacción y con las filas bloqueadas, lo que limita las ventas de un mismo producto a unas 2 por segundo. El p95 supera el umbral de 1500 ms incluso con 8 VUs, sin bloqueo: 1,70 s distribuido y 3,46 s con contención.

**Impacto.** En un producto muy demandado (lanzamiento, oferta), los clientes hacen cola. Con una pasarela real, que tarda más y puede fallar, sería peor.

**Corrección recomendada.** Reservar el stock en una transacción corta, cobrar fuera de ella y confirmar o liberar la reserva en otra. Quedó documentado como limitación en el README.

### REN-04 — El login no cumple el umbral con 30 VUs (Media)

**Qué pasa.** p95 de 2,51 s y máximo de 5,11 s, contra un umbral de 1,5 s. `bcryptjs` hace el trabajo en el hilo principal de Node.

**Impacto.** Además de la lentitud del login, cada verificación compite con las demás peticiones por el mismo hilo. Junto con la falta de límite de intentos (SEG), una ráfaga de logins degrada toda la API.

**Corrección recomendada.** Usar `bcrypt` nativo, que trabaja en hilos aparte, y limitar los intentos de login. No conviene bajar las rondas de bcrypt.

### REN-05 — Medición en modo desarrollo (Informativa)

El backend corrió con `tsx watch`, en un solo proceso y en la misma máquina que PostgreSQL, k6 y ZAP. Los números sirven para comparar antes y después, no como capacidad de producción. Para la medición "después" se debe usar la misma configuración.

## Lo que salió bien

- Catálogo con 50 VUs: p95 de 8,3 ms y 0 errores.
- Integridad total del stock en todas las corridas, incluidas las que terminaron bloqueadas.
- Ninguna sobreventa ni stock negativo.
- Ningún error de aplicación ni deadlock de PostgreSQL con 8 VUs; `ORDER BY id` en `FOR UPDATE` cumplió su función.
