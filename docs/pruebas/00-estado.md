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

## Lo que falta

1. **Correcciones** en orden de prioridad: primero REN-01, luego las altas de seguridad y después USA-02 y USA-06 (las más baratas y con más efecto). Después de cada una, repetir la medición correspondiente para documentar el "después".
2. **Documento final:** comparación antes y después de rendimiento, seguridad y usabilidad, conclusiones y anexos con los reportes.
3. Regenerar las API keys de Groq y Gemini, que quedaron escritas en una conversación.

Ya resuelto: el `npm run db:reset` pendiente de la sesión de rendimiento y seguridad se ejecutó el 12 de noviembre, antes de las pruebas de usabilidad.
