# 00 — Estado de las pruebas no funcionales (traspaso)

Rama: `pruebas-no-funcionales`, creada desde `master` después de unir `chatbot-v2` (Fase 9). Se midió y documentó el **estado inicial**: **ningún hallazgo se corrigió todavía**.

## Lo que se hizo

1. **Datos de prueba:** `npm run db:poblar` (script nuevo, idempotente). Deja 63 productos (12 del seed, 48 generados y 3 de carga con stock 100000), 28 usuarios (incluye carga01…carga25 con contraseña `Cliente123`) y 80 órdenes históricas (68 PAGADA, 12 RECHAZADA). `db:reset` no se modificó.
2. **Inventario:** flujos, tabla de 17 endpoints con autenticación, operación en BD y criticidad, y la especificación OpenAPI 3.
3. **Rendimiento con k6:** catálogo con 50 VUs, login con 30 y checkout distribuido y con contención con 20. Además, checkouts con 8 VUs, porque con 20 el backend se bloquea. Se verificó la integridad del stock en la BD.
4. **Seguridad:** ZAP baseline (frontend con `vite preview`) y ZAP API scan autenticado como cliente y como admin; 10 pruebas manuales y 4 adicionales; `npm audit`.
5. **Especificaciones del equipo:** en 01-inventario.md.

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

**Cuidado al repetir k6:** `--summary-export` guarda en `setup_data` los tokens JWT de los 25 clientes de carga. Antes de hacer commit, quita ese campo de los JSON de checkout (en esta entrega ya se quitó; las métricas no cambian).

Para repetir las mediciones después de corregir, usa las mismas condiciones: backend con `npm run dev`, datos de `npm run db:poblar` y el mismo equipo. Luego ejecuta `bash pruebas/rendimiento/ejecutar.sh`, `node pruebas/seguridad/manuales.mjs` y `bash pruebas/seguridad/ejecutar-zap.sh` (este último con `vite preview --host 0.0.0.0 --port 4173` corriendo).

## Hallazgos, por prioridad

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

## Lo que falta

1. **Correcciones** en el orden de la tabla, empezando por REN-01. Después de cada una, repetir la medición correspondiente para documentar el "después".
2. **Pruebas de usabilidad:** no se han hecho (tareas, participantes, métricas como tasa de éxito, tiempo por tarea y SUS).
3. **Documento final:** comparación antes y después, conclusiones y anexos con los reportes.
4. **Pendiente operativo de esta sesión:** al cerrar, Docker Desktop estaba apagado, así que `npm run db:reset` no se pudo ejecutar. La BD todavía tiene los datos de prueba y la basura del escaneo activo de ZAP. Ejecútalo con Docker abierto antes de la próxima demo.
5. Regenerar las API keys de Groq y Gemini, que quedaron escritas en una conversación.
