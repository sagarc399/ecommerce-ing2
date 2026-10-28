# Evidencias de pruebas del backend

Proyecto: Ecommerce, Electiva Ingeniería de Software II (USCO).
Fecha de ejecución: 2026-10-28. Entorno: Windows 11, Node.js v24.19.0 y PostgreSQL 16 en Docker (puerto 5434 del host).

## 1. Prueba de concurrencia (sobreventa)

Script: `backend/src/scripts/prueba-concurrencia.ts` (`npm run prueba:concurrencia`).
El script pone el stock del "Monitor 24 pulgadas" en 1 y lanza al mismo tiempo, con `Promise.all`, dos compras de ese producto desde dos clientes distintos.
La prueba se supera si una compra responde 201, la otra 409 y el stock final es 0.

### 1.1 Contraprueba SIN `FOR UPDATE`

Cambio temporal en `backend/src/controllers/ordenes.controller.ts` (revertido después con `git restore`):

```diff
        WHERE id = ANY($1::int[])
-       ORDER BY id
-       FOR UPDATE`,
+       ORDER BY id`,
       [ids]
```

Salida de `npm run prueba:concurrencia`:

```
1. Stock de "Monitor 24 pulgadas" (id 4) puesto en 1
2. Login correcto de cliente@tienda.com y cliente2@tienda.com
3. Lanzando las dos compras al mismo tiempo...
   cliente@tienda.com: HTTP 500 → Error interno del servidor
   cliente2@tienda.com: HTTP 201 → orden 7 PAGADA
4. Stock final en la BD: 0
PRUEBA FALLIDA
```

Error registrado en el log del servidor (`npm run dev`):

```
error: new row for relation "productos" violates check constraint "productos_stock_check"
    at C:\dev\ecommerce-ing2\backend\node_modules\pg\lib\client.js:694:17
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async crearOrden (C:\dev\ecommerce-ing2\backend\src\controllers\ordenes.controller.ts:105:7) {
  length: 446,
  severity: 'ERROR',
  code: '23514',
  detail: 'Failing row contains (4, Monitor 24 pulgadas, Monitor Full HD IPS de 24 pulgadas a 75 Hz. Última unidad dispo..., 1250000.00, -1, https://picsum.photos/seed/Monitor24pulgadas/600/400, Tecnología, t, 2026-10-28 13:56:50.889888, 2026-10-28 14:11:02.190224).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'productos',
  column: undefined,
  dataType: undefined,
  constraint: 'productos_stock_check',
  file: 'execMain.c',
  line: '2109',
  routine: 'ExecConstraints'
}
```

La orden 6 no aparece porque su id lo reservó la transacción que falló. Las secuencias de PostgreSQL no devuelven el número aunque se haga ROLLBACK.

### 1.2 CON `FOR UPDATE` (código final)

Después de `git restore backend/src/controllers/ordenes.controller.ts`, `git status` mostró `nothing to commit, working tree clean`. Salida de la prueba:

```
1. Stock de "Monitor 24 pulgadas" (id 4) puesto en 1
2. Login correcto de cliente@tienda.com y cliente2@tienda.com
3. Lanzando las dos compras al mismo tiempo...
   cliente@tienda.com: HTTP 201 → orden 8 PAGADA
   cliente2@tienda.com: HTTP 409 → Stock insuficiente para "Monitor 24 pulgadas"
4. Stock final en la BD: 0
PRUEBA SUPERADA
```

Además, antes de la contraprueba el script se ejecutó 3 veces seguidas con `FOR UPDATE` y las 3 veces dio `PRUEBA SUPERADA` (órdenes 3, 4 y 5: una con 201, la otra con 409 y stock final 0).

### 1.3 Qué pasó y por qué

1. Sin `FOR UPDATE`, las dos transacciones leyeron el stock al mismo tiempo, las dos vieron 1 y las dos pasaron la validación. Un SELECT normal no bloquea la fila, así que ninguna esperó a la otra.
2. Las dos cobraron. Al descontar, la segunda calculó 0 − 1 = −1 y la restricción `CHECK (stock >= 0)` lo rechazó. Se hizo ROLLBACK y respondió 500 en lugar de 409.
3. La restricción CHECK evitó vender de más, pero lo hizo tarde: el pago simulado de ese cliente ya estaba aprobado. Con `FOR UPDATE`, la segunda transacción espera en el SELECT, lee stock 0 y responde 409 antes de cobrar.

## 2. Fase 2: autenticación (JWT y roles)

| # | Prueba | Esperado | Obtenido | Respuesta |
|---|---|---|---|---|
| 1 | GET /api/health | 200 | 200 ✅ | `{"estado":"ok"}` |
| 2 | Registro de usuario nuevo | 201 | 201 ✅ | `{"id":7,...,"rol":"cliente"}` |
| 3 | Registro con el mismo email | 409 | 409 ✅ | "El email ya está registrado" |
| 4 | Registro con password de 5 caracteres | 400 | 400 ✅ | "La contraseña debe tener al menos 8 caracteres" |
| 5 | Registro enviando `"rol":"admin"` en el body | 201 | 201 ✅ | `"rol":"cliente"` (el campo se ignora) |
| 6 | Login de cliente correcto | 200 | 200 ✅ | incluye `token` |
| 7 | Login con contraseña incorrecta | 401 | 401 ✅ | "Credenciales inválidas" |
| 8 | Login con email inexistente | 401 | 401 ✅ | "Credenciales inválidas" (mismo mensaje) |
| 9 | GET /api/auth/me sin token | 401 | 401 ✅ | "Token no proporcionado" |
| 10 | GET /api/auth/me con token basura | 401 | 401 ✅ | "Token inválido o expirado" |
| 11 | GET /api/auth/me con token válido | 200 | 200 ✅ | `{"id":2,...,"rol":"cliente"}` |
| 12 | Login como admin | 200 | 200 ✅ | `"rol":"admin"` |

Comprobaciones adicionales:
- El seed es idempotente: en la segunda ejecución responde "Ya existía" y no duplica usuarios.
- Si falta `JWT_SECRET` en el `.env`, el servidor no arranca y muestra qué variable falta.

## 3. Fase 3: CRUD de productos

| # | Prueba | Esperado | Obtenido | Detalle |
|---|---|---|---|---|
| 1 | GET /api/productos | 200 | 200 ✅ | total=12, totalPaginas=1, todos activos, `precio: 189900` (número) |
| 2 | GET ?buscar=YoGa | 200 | 200 ✅ | 1 resultado: Mat de yoga (sin distinguir mayúsculas) |
| 3 | GET ?categoria=Tecnología | 200 | 200 ✅ | 4 productos, todos de Tecnología |
| 4 | GET ?limite=500 | 200 | 200 ✅ | `limite: 50` |
| 5 | GET /api/productos/categorias | 200 | 200 ✅ | `["Deportes","Hogar","Ropa","Tecnología"]` |
| 6 | GET /api/productos/abc | 400 | 400 ✅ | "El id debe ser un número entero positivo" |
| 7 | GET /api/productos/99999 | 404 | 404 ✅ | "Producto no encontrado" |
| 8 | POST sin token | 401 | 401 ✅ | "Token no proporcionado" |
| 9 | POST con token de cliente | 403 | 403 ✅ | "No tiene permisos para esta acción" |
| 10 | POST como admin con datos válidos | 201 | 201 ✅ | id=13, `precio: 99900` |
| 11 | POST como admin con precio -5 | 400 | 400 ✅ | "El campo precio debe ser un número mayor o igual a 0" |
| 12 | POST como admin sin nombre | 400 | 400 ✅ | "El campo nombre es obligatorio" |
| 13 | PUT como admin cambiando el precio | 200 | 200 ✅ | precio 109900; actualizado_en pasó de 18:57:24.786 a 18:57:26.054 |
| 14 | DELETE como admin | 200 | 200 ✅ | "Producto desactivado" (borrado lógico) |
| 15 | GET /:id del producto desactivado | 404 | 404 ✅ | "Producto no encontrado" |
| 16 | GET /admin/productos?activo=false | 200 | 200 ✅ | aparece el id 13 |
| 17 | PATCH /:id/activar | 200 | 200 ✅ | vuelve a aparecer en GET /:id y en el listado público |
| 18 | POST con nombre `'; DROP TABLE productos; --` | 201 | 201 ✅ | el nombre se guardó como texto literal y la tabla sigue existiendo |

Nota sobre la prueba 3: el curl de Git Bash en Windows codifica la "í" en latin1 (`%ED`) y por eso devolvía 0 resultados. Con la URL en UTF-8 (`?categoria=Tecnolog%C3%ADa`), que es lo que envía el navegador, el filtro funciona.

### Regresión después del cambio a `validators/comunes.ts`

| # | Prueba | Esperado | Obtenido | Detalle |
|---|---|---|---|---|
| 1 | GET /api/productos | 200 | 200 ✅ | total=12, totalPaginas=1 |
| 2 | GET ?limite=500 | 200, limite 50 | 200 ✅ | limite=50 |
| 3 | GET /api/productos/categorias | 200 | 200 ✅ | `["Deportes","Hogar","Ropa","Tecnología"]` |
| 4 | GET /api/productos/abc | 400 | 400 ✅ | "El id debe ser un número entero positivo" |
| 5 | GET /api/productos/99999 | 404 | 404 ✅ | "Producto no encontrado" |
| 6 | POST con token de cliente | 403 | 403 ✅ | "No tiene permisos para esta acción" |
| 7 | POST como admin con precio -5 | 400 | 400 ✅ | "El campo precio debe ser un número mayor o igual a 0" |

## 4. Fase 4: órdenes con pago simulado

| # | Prueba | Esperado | Obtenido | Detalle |
|---|---|---|---|---|
| 1 | POST /api/ordenes sin token | 401 | 401 ✅ | "Token no proporcionado" |
| 2 | POST como admin | 403 | 403 ✅ | "No tiene permisos para esta acción" |
| 3 | items vacío | 400 | 400 ✅ | "El campo items debe ser un arreglo con al menos un producto" |
| 4 | cantidad 0 | 400 | 400 ✅ | "items[0].cantidad debe ser un entero entre 1 y 10" |
| 5 | producto_id 99999 | 404 | 404 ✅ | "El producto 99999 no existe o no está disponible" |
| 6 | producto desactivado (id 13) | 404 | 404 ✅ | "El producto 13 no existe o no está disponible" |
| 7 | Lámpara de escritorio LED (stock 0) | 409 | 409 ✅ | `disponible: 0, solicitado: 1`; el stock sigue en 0 |
| 8 | tarjeta de 15 dígitos | 400 | 400 ✅ | "El campo pago.numero_tarjeta debe tener exactamente 16 dígitos" |
| 9 | tarjeta vencida (01/20) | 400 | 400 ✅ | "La tarjeta está vencida" |
| 10 | 2 teclados enviando `"precio": 1` | 201 | 201 ✅ | total 499800 (2 × 249900, precio de la BD); stock pasó de 15 a 13 |
| 11 | tarjeta terminada en 0000 | 402 | 402 ✅ | la orden 2 queda RECHAZADA en la BD; el stock del balón no cambia (30 → 30) |
| 12 | Mouse ×1 + Chaqueta ×9 (stock 8) | 409 | 409 ✅ | el stock del Mouse no cambia (40 → 40) y no se crea ninguna orden (atomicidad) |
| 13 | Consulta a la tabla `pagos` | solo 4 dígitos | ✅ | `ultimos4` = `1111` y `0000`; el número completo no aparece en ninguna fila de pagos, ordenes ni orden_items |
| 14 | GET /api/ordenes/mias | 200 | 200 ✅ | incluye la orden 1 PAGADA (Teclado ×2) y la orden 2 RECHAZADA (Balón ×1, pago 0000) |
| 15 | cliente2 pide la orden 1 de cliente | 404 | 404 ✅ | "Orden no encontrada" |
| 16 | admin pide la orden 1 | 200 | 200 ✅ | comprador cliente@tienda.com, total 499800 |
| 17 | GET /admin/ordenes?estado=RECHAZADA | 200 | 200 ✅ | 1 orden, todas en estado RECHAZADA |
| 18 | npm run prueba:concurrencia (3 veces) | PRUEBA SUPERADA | ✅ ×3 | ver sección 1 |

Comprobaciones adicionales: el número de tarjeta no aparece en el log del servidor ni en las respuestas de `/api/admin/ordenes` y `/api/ordenes/1`.
