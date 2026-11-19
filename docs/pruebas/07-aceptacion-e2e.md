# 07 — Pruebas de aceptación de extremo a extremo (E2E)

Suite que comprueba, sobre la aplicación desplegada, que las historias de usuario principales se cumplen de punta a punta: navegador real, API, base de datos y chatbot con IA. Reúne tres pruebas que ya existían y las resume en criterios de aceptación.

## Criterios de aceptación

Resultado de la corrida contra el despliegue con **Docker Compose** del 19 de noviembre de 2026 (`pruebas/e2e/resultados/e2e-compose.txt` y `.json`):

| ID | Historia de usuario / criterio | Prueba | Resultado |
|---|---|---|---|
| HU-01 | Como visitante quiero registrarme para poder comprar | `flujo.mjs`, paso 1 (registro por la interfaz; queda con la sesión iniciada) | ✅ |
| HU-02 | Como cliente quiero agregar productos al carrito desde el catálogo | `flujo.mjs`, paso 2 | ✅ |
| HU-03 | Como cliente quiero pagar con tarjeta y recibir la confirmación del pedido | `flujo.mjs`, paso 3 (tarjeta 4111…, "¡Gracias por tu compra!") | ✅ |
| HU-04 | Como cliente quiero que un pago rechazado me deje reintentar sin reescribir la tarjeta (solo el CVV) | `flujo.mjs`, paso 4 (tarjeta …0000 → número conservado, CVV vacío con foco; reintento aprobado) | ✅ |
| HU-05 | Como cliente quiero ver mis pedidos y su detalle | `flujo.mjs`, paso 5 | ✅ |
| HU-06 | Como cliente quiero cerrar sesión | `flujo.mjs`, paso 6 | ✅ |
| HU-07 | Como administrador quiero crear un producto y que aparezca en el catálogo | `flujo.mjs`, paso 7 (login de admin, "+ Nuevo producto", visible en `GET /api/productos`) | ✅ |
| HU-08 | La interfaz no debe tener errores de JavaScript ni violaciones de la CSP | `flujo.mjs`, pasos 8 y 9 (consola y evento `securitypolicyviolation`; la CSP de nginx está activa) | ✅ |
| HU-09 | Como visitante quiero preguntarle al chatbot el precio real de un producto | `chatbot.mjs`, prueba 1 ("¿Cuánto cuesta el monitor?" → $1.250.000) | ✅ |
| HU-10 | El chatbot no debe mostrar pedidos a quien no inició sesión | `chatbot.mjs`, prueba 2 | ✅ |
| HU-11 | Como cliente quiero consultar mi pedido en el chatbot | `chatbot.mjs`, prueba 3 | ✅ |
| HU-12 | El chatbot no debe revelar pedidos de otro cliente (IDOR) | `chatbot.mjs`, prueba 4 (`cliente2` pregunta por el pedido de `cliente`) | ✅ |
| HU-13 | Dos compras simultáneas de la última unidad no deben sobrevender | Prueba de concurrencia: `cliente` 201 (orden PAGADA), `cliente2` 409 (stock insuficiente), stock final 0 | ✅ |

**Resultado: 13 de 13 criterios cumplidos.** El chatbot respondió con **Groq** (`openai/gpt-oss-120b`) en las 4 preguntas; ninguna cayó al proveedor de reglas.

La misma suite se corrió también contra el **modo desarrollo** (`npm run dev`, web en :5173): 13 de 13 (`pruebas/e2e/resultados/e2e-desarrollo.*`).

## Entorno

| Elemento | Valor |
|---|---|
| Despliegue | Docker Compose, proyecto `tienda-usco`: `db` (postgres:16, sin puertos publicados), `api` (Node 24 sobre Alpine, usuario `node`, puerto 3000) y `web` (nginx sin privilegios, puerto 8080), los tres en estado *healthy* |
| URL | Web `http://localhost:8080`, API `http://localhost:3000/api` |
| Datos | `npm run deploy:demo` antes de la corrida (15 usuarios, 60 productos, 40 órdenes) |
| Navegador | Chromium de Playwright 1.65.0, 1366×768 |
| Chatbot | `CHAT_PROVEEDOR=groq`, preguntas separadas 25 s por la cuota de Groq |
| Equipo | El mismo de las pruebas anteriores (ver `01-inventario.md`) |

## Cómo repetirla

```bash
npm run deploy          # construir y levantar (si no está corriendo)
npm run deploy:demo     # datos de demostración
npm run test:e2e:compose
npm run deploy:demo     # la prueba de concurrencia deja el monitor en stock 0: recargar la demo
```

Contra el modo desarrollo: `npm run dev`, `npm run db:demo` y `npm run test:e2e`. Las URL se pueden cambiar con las variables `APP_URL` y `API_URL` (por ejemplo, `APP_URL=http://localhost:8080 API_URL=http://localhost:3000/api node pruebas/e2e/ejecutar.mjs --compose`). El comando devuelve código 0 solo si se cumplen los 13 criterios.

## Evidencia

| Archivo | Contenido |
|---|---|
| `pruebas/e2e/ejecutar.mjs` | Ejecutor de la suite y criterios de aceptación |
| `pruebas/e2e/resultados/e2e-compose.txt` y `.json` | Resumen de la corrida contra Compose (criterios, proveedor del chat, salida de la concurrencia) |
| `pruebas/e2e/resultados/e2e-desarrollo.txt` y `.json` | Resumen de la corrida contra desarrollo |
| `pruebas/regresion/resultados/flujo-e2e-compose.txt`, `chatbot-e2e-compose.txt` | Detalle paso a paso del flujo y respuestas del chatbot en Compose |
| `pruebas/regresion/resultados/flujo-e2e-desarrollo.txt`, `chatbot-e2e-desarrollo.txt` | Ídem en desarrollo |

## Problemas encontrados al montar la suite (y su solución)

| Problema | Causa | Solución |
|---|---|---|
| El registro y todo el flujo fallaban con 404 en la primera corrida | El bundle del contenedor `web` llamaba a `http://localhost:3000` sin `/api` | El Dockerfile del frontend usa `VITE_API_URL=$API_URL/api`; la CSP sigue autorizando solo el origen |
| El login del admin daba 401 en Compose | Variables globales de Windows `ADMIN_EMAIL` y `ADMIN_PASSWORD` (de otro proyecto) pisaban las de `.env.compose` en la interpolación de Compose | En `.env.compose` se llaman `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y se pasan a la API como `ADMIN_EMAIL` y `ADMIN_PASSWORD` |
| `npm ci` en los builds y las llamadas a Groq desde la API fallaban con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | El antivirus (Avast Web/Mail Shield) inspecciona el HTTPS con su propio certificado raíz, en el que confía Windows pero no los contenedores | `certs/ca-extra.pem` (no versionado) con ese certificado raíz público, usado con `NODE_EXTRA_CA_CERTS` en el build (secreto de BuildKit) y en la API; sin desactivar la verificación TLS |

Sobre OBS-01 (en la hoja de ruta de `06-matriz-calidad.md`): en regresiones anteriores, el modelo le pedía "iniciar sesión" a `cliente2` en la prueba de IDOR. En esta corrida respondió como pide el prompt ("No encontré el pedido #44 entre tus últimos pedidos"). Como depende de la redacción del modelo, la observación se mantiene abierta; en ningún caso se reveló el pedido ajeno.
