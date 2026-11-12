# HANDOFF — Traspaso para la siguiente sesión de Claude Code

Escrito el 12 de noviembre de 2026 al cerrar una sesión muy larga, para una sesión **sin ningún recuerdo previo**. Léelo completo antes de actuar. Complementa (no reemplaza) `CLAUDE.md` y `docs/pruebas/00-estado.md`.

---

## A. Qué es el proyecto y para qué

- **Tienda USCO**: ecommerce de clase para la electiva **Ingeniería de Software II (USCO)**. Lo desarrolla **un estudiante solo**.
- **Entregas ya hechas:** la app completa (Fases 1 a 8: BD, backend con auth/JWT/roles, CRUD de productos, órdenes con pago simulado en una transacción con `FOR UPDATE`, frontend con catálogo, carrito, checkout, mis pedidos y panel admin, preparación de la demo) y el **chatbot v1 y v2** (v2 consulta productos y pedidos con herramientas de solo lectura).
- **Entrega actual:** la práctica **"Estrategias de validación y pruebas de software"**:
  - rendimiento con **k6**;
  - usabilidad con **heurísticas de Nielsen + SUS**;
  - seguridad con **OWASP ZAP**;
  - **matriz de calidad unificada**;
  - **corrección de al menos un problema crítico por dimensión**, con medición antes y después.
  - Requisitos completos de la práctica (fases 1 a 3 y contexto de la entrega): **`docs/practica-requisitos.md`**.
- **Entregable final:** un **documento formal con enfoque de VENTA del software** (la materia es de venta e integración de tecnologías): debe mostrar el producto, su calidad medida y su valor para un cliente.
- **Usabilidad simulada:** el docente **autorizó simular con IA a los participantes** de usabilidad. El informe **DEBE declararlo** con esta frase (ya está en `docs/pruebas/04-usabilidad.md`): *"Los participantes son perfiles simulados con IA, con autorización del docente, debido a que el proyecto fue desarrollado por un solo integrante. Los tiempos base, la accesibilidad y la inspección heurística se obtuvieron sobre la aplicación real."*

## B. Cómo se trabaja

- El usuario usa **otro chat de Claude como planificador** y te pega **prompts por fases**. Ejecuta **un prompt a la vez** y haz solo lo que pide.
- **Medir antes de corregir.** Cada corrección queda con **ANTES/DESPUÉS medidos con el mismo método y los mismos parámetros**.
- Al terminar cada prompt: **detenerse y reportar en español, con tablas**. No avanzar solo.
- **No unir ramas a master sin permiso explícito.**
- **Nunca imprimir keys** (Groq, Gemini, JWT_SECRET, contraseñas). Para leerlas, hazlo desde el `.env` dentro del comando, sin mostrarlas.
- Antes de **cada commit**, verificar que no entren `.env`, keys ni tokens (ver la sección D sobre los JSON de k6). Comprobación usada:
  ```bash
  for V in GROQ_API_KEY GEMINI_API_KEY JWT_SECRET; do P=$(grep "^$V=" backend/.env | cut -d= -f2- | tr -d '\r\n' | cut -c1-10); echo "$V: $(git grep -l --untracked -F "$P" -- . ':!backend/.env' | wc -l)"; done
  git grep -l --untracked -E 'eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' -- .
  ```
- Commits con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Si el contexto supera el 85 %: termina la tarea en curso, actualiza "Progreso de correcciones" en `docs/pruebas/00-estado.md` (y este archivo), haz commit y detente.

## C. Entorno

**Ramas**

| Rama | Contenido |
|---|---|
| `master` | App completa hasta la Fase 9 (`47f7afa`, chatbot v2 ya unido) |
| `chatbot-v2` | Igual a `master` (ya se unió); se puede borrar con permiso |
| `pruebas-no-funcionales` | **Rama de trabajo.** Todo lo de pruebas y correcciones. Commits: `f349fd0` rendimiento y seguridad (estado inicial), `eabd850` usabilidad (estado inicial), `a76c206` REN-01/02, SEG-02 y SEG-04/05 (código), `195b45f` traspaso, `536a6e7` requisitos de la práctica, `fff72eb` ZAP de SEG-04/05, `8391d27` SEG-09, `60e7393` USA-02, `df10b04` USA-03, `c52b290` regresión, `f0c2ac4` documentos 05 y 06 y regresión con registro, `CIERRE_HASH` cierre (db:demo y revisión de secretos). **Plan de correcciones completo. No unir a master sin permiso.** |

**Puertos:** BD PostgreSQL **5434** (contenedor `ecommerce_db`), API **3000**, web **5173**, `vite preview` **4173** (solo para ZAP baseline).

**Comandos desde la raíz**

| Comando | Qué hace |
|---|---|
| `npm run instalar` | `npm install` en la raíz, `backend/` y `frontend/` |
| `npm run dev` | Backend + frontend con `concurrently` (prefijos `[api]` y `[web]`) |
| `npm run verificar` | `scripts/verificar.mjs`: Docker, contenedor, tablas, `.env`, puertos, Groq → "LISTO PARA LA DEMO" |
| `npm run db:reset` | Vacía las tablas y deja los datos de demo (3 usuarios, 12 productos, 0 órdenes) |
| `npm run db:demo` | **Estado de demo con ≥50 registros** (requisito 1.1): hace lo mismo que `db:reset` y agrega 48 productos, 12 clientes con nombres reales (`nombre.apellido@correo.com`, clave `Cliente123`) y 40 órdenes históricas (34 PAGADA, 6 RECHAZADA) con ítems y pagos: 15 usuarios, 60 productos, 40 órdenes, 85 ítems, 40 pagos (240 registros). Stock coherente; no toca los 12 productos del seed (el guion y `prueba:concurrencia` siguen funcionando). Determinista |
| `npm run db:poblar` | Datos de prueba: 63 productos (12 + 48 + 3 de carga con stock 100000), 28 usuarios (carga01…carga25, clave `Cliente123`), 80 órdenes históricas |
| `npm run prueba:concurrencia` | Dos clientes compran el último monitor a la vez → debe decir PRUEBA SUPERADA |

**Variables de `backend/.env`** (solo nombres): `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN`, `CHAT_PROVEEDOR`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`. En `frontend/.env`: `VITE_API_URL`.

**Chat:** `CHAT_PROVEEDOR=groq`, modelo `openai/gpt-oss-120b` (fetch directo a la API de Groq, `reasoning_effort: "low"`, `max_tokens: 800`, herramientas de solo lectura, máximo 3 rondas, 12 s). Si falla, responde el proveedor de reglas.

**Credenciales de prueba:** admin@tienda.com / Admin12345 · cliente@tienda.com / Cliente123 · cliente2@tienda.com / Cliente123. Tarjeta aprobada `4111 1111 1111 1111`; rechazada cualquiera que termine en `0000`.

**Equipo de pruebas:** AMD Ryzen 5 5500U (6 núcleos, 12 hilos, 2,1 GHz); 15,3 GB de RAM (poca libre, de 3,9 GB hacia abajo); Windows 11 Home 64 bits (build 26200); Node v24.19.0, npm 11.17.0; Docker 28.5.1; PostgreSQL 16.15; k6 2.3.0 (`grafana/k6`); ZAP `zaproxy/zap-stable`; Playwright 1.65.0; axe-core 4.14.0.

## D. Trampas ya conocidas

1. **Docker Desktop debe estar abierto** antes de todo. Si `docker ps` da "500 Internal Server Error" o "cannot find the file", Docker está arrancando o cerrado. A veces `ecommerce_db` queda `Exited`: `docker compose up -d`.
2. **Dos PostgreSQL nativos de Windows** ocupan 5432 y 5433; por eso la BD usa **5434**.
3. **Variables globales de Windows** (`ADMIN_EMAIL`/`ADMIN_PASSWORD` de otro proyecto) pisaban el `.env` → `backend/src/config/env.ts` usa `dotenv.config({ override: true })`.
4. **`tsx watch` no recarga el `.env`**: tras cambiarlo, reinicia el backend. Truco usado: `touch backend/src/routes/chat.routes.ts`. Reiniciar también **borra los bloqueos de login en memoria** (SEG-02).
5. **ZAP:** durante los escaneos poner `CHAT_PROVEEDOR=reglas` (y reiniciar el backend) y **restaurar `groq` al final**.
6. **Cuota de Groq:** unos 8.000 tokens por minuto, es decir 2 o 3 preguntas con herramientas por minuto. Las pruebas del chatbot van **separadas unos 20–25 s**. Si se agota, el chat responde con reglas y muestra "Respuesta automática".
7. **Los JSON de k6 (`--summary-export`) guardan tokens JWT en `setup_data`**: quítalos antes del commit con:
   ```bash
   cd pruebas/rendimiento/resultados && node -e "const fs=require('fs');for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.json'))){const j=JSON.parse(fs.readFileSync(f,'utf8'));if('setup_data' in j){delete j.setup_data;fs.writeFileSync(f,JSON.stringify(j,null,4)+'\n')}}"
   ```
8. **No modificar archivos del backend mientras corre k6**: `tsx watch` reinicia el servidor y arruina la medición.
9. `db:reset` deja lo mínimo (3 usuarios, 12 productos, 0 órdenes); `db:demo` deja la demo con historial (≥50 registros); `db:poblar` carga los datos de prueba de carga. Las mediciones de k6 usan `db:poblar`; Playwright y axe usan `db:reset` (sus mediciones del antes se hicieron así); la demo y el estado final usan `db:demo`. **Al terminar, dejar la BD en `db:demo`.**
10. **curl de Git Bash envía las tildes en latin1**: usa URLs ya codificadas (`Tecnolog%C3%ADa`) o `--data-binary @archivo.json` con el cuerpo en UTF-8.
11. **Playwright:** `getByRole` compara el nombre por subcadena: usa `exact: true` (`"Activar"` coincide con `"Desactivar"`). Cada tarjeta del catálogo tiene **dos enlaces con el mismo nombre** (imagen y título): usa `.first()`.
12. **La verificación de seguridad de Bash a veces falla temporalmente** ("no verdict"): reintenta el mismo comando una vez.
13. **Poca RAM libre**, backend en modo desarrollo (`tsx watch`) y k6/ZAP en la misma máquina: las mediciones son un **escenario conservador**. Hubo variación entre sesiones (el login mejoró sin cambios que lo expliquen).
14. **ZAP desde Docker:** el objetivo es `host.docker.internal`. `vite preview` debe correr con `--host 0.0.0.0 --port 4173` y la variable `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=host.docker.internal`. El script copia `openapi.yaml` cambiando `localhost` por `host.docker.internal`.
15. **Google rechaza plazos menores a 10 s en `httpOptions.timeout`** (Gemini): el corte se hace del lado del cliente.
16. **El panel del navegador integrado oculto** no dispara eventos de scroll ni carga imágenes `loading="lazy"`: en pruebas, dispáralos a mano o fuerza la carga.
17. **Un `body` mayor de 100 KB o un byte nulo dan 500** (SEG-07, abierto): no es un fallo de las pruebas.
18. **La prueba de fuerza bruta bloquea `cliente@tienda.com` 15 minutos** desde esa IP: reinicia el backend antes de pruebas que usen esa cuenta.
19. **Git Bash:** con `docker run -v` usa `MSYS_NO_PATHCONV=1` y rutas de Windows (`pwd -W`).
20. **Gemini gratuito está saturado** (503 y 10–20 s de latencia): por eso se usa Groq.
21. **La clave de `postgres` ya no es `postgres`** (SEG-09): está solo en `DB_PASSWORD` de `backend/.env`. Los scripts con `docker exec ecommerce_db psql -U postgres` no la necesitan. Si se borra el volumen, el contenedor nuevo vuelve a nacer con `postgres` y hay que repetir el `ALTER USER`.
22. Al recrear `ecommerce_db`, `docker compose up -d` puede fallar con "bind: Only one usage of each socket address" en `127.0.0.1:5434`: `wslrelay.exe` todavía tiene el puerto del contenedor anterior. Repetir `docker compose up -d` unos segundos después.
23. **La carpeta de la sesión de Claude puede no ser la del proyecto**: el proyecto está en `C:\dev\ecommerce-ing2`; usa `cd /c/dev/ecommerce-ing2 && ...` en cada comando.

## E. Estado de las pruebas

**Informes (`docs/pruebas/`)**

| Archivo | Contenido |
|---|---|
| `00-estado.md` | Resumen, dónde está cada cosa, hallazgos priorizados y "Progreso de correcciones" |
| `01-inventario.md` | Equipo, datos, flujos, 17 endpoints con criticidad, exclusión de `/api/chat` en carga |
| `02-rendimiento.md` | k6: resultados, integridad, REN-01 a REN-05 |
| `03-seguridad.md` | ZAP (3 escaneos), 10 pruebas manuales y extras, SEG-01 a SEG-10 |
| `04-usabilidad.md` | Playwright, KLM, axe-core, Nielsen, 5 perfiles simulados, SUS, USA-01 a USA-13 |
| `05-correcciones.md` | Correcciones con causa raíz, cambio, ANTES/DESPUÉS, efecto en el negocio; USA-03 como compromiso; regresión |
| `06-matriz-calidad.md` | Matriz unificada (Requiere mejora → Aceptable en las 3 dimensiones), diagnóstico por dimensión y hoja de ruta |
| `capturas/` | 28 capturas (escritorio y 375 px) + 9 de final de tarea |
| `docs/openapi.yaml` | OpenAPI 3 de la API (lo usa ZAP) |

**Cómo repetir cada medición con el mismo método**

| Medición | Preparación | Comando exacto |
|---|---|---|
| k6, los 4 escenarios (A catálogo 50 VUs, B login 30, C1 y C2 20) | Docker + `npm run dev` + `npm run db:poblar` | `bash pruebas/rendimiento/ejecutar.sh` (todos) o `bash pruebas/rendimiento/ejecutar.sh c1_checkout_distribuido c2_checkout_contencion`. Rampa: 30 s subida, 60 s sostenido, 15 s bajada, `sleep(1)`. Para el después: `VUS=20 SUFIJO=_despues bash pruebas/rendimiento/ejecutar.sh ...`. Resumen: `node pruebas/rendimiento/resumen.mjs`. Integridad: `resultados/integridad.txt` (lo escribe el script) |
| Concurrencia | `npm run dev` | `npm run prueba:concurrencia` (3 veces) |
| ZAP (baseline del frontend + API como cliente y como admin) | `npm run dev`, `cd frontend && npm run build && __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=host.docker.internal npx vite preview --host 0.0.0.0 --port 4173` (solo para baseline), `CHAT_PROVEEDOR=reglas` y reiniciar el backend | `bash pruebas/seguridad/ejecutar-zap.sh [baseline] [cliente] [admin]` (sin argumentos, los tres; `SUFIJO=_despues` para no pisar el antes) (regla *replacer* con Bearer; `scanner.maxScanDurationInMins=15`, `threadPerHost=2`). Resumen: `node pruebas/seguridad/resumen-zap.mjs`. Restaura `groq` al final |
| Pruebas manuales de seguridad | `npm run dev` | `node pruebas/seguridad/manuales.mjs` (escribe en `manuales/pruebas-api.txt`; la prueba 5 deja un producto XSS que se revisa en el navegador) y `node pruebas/seguridad/auditoria.mjs` |
| Usabilidad (Playwright 1366×768, 3 corridas) | `npm run db:reset` + `npm run dev`; en `pruebas/usabilidad`: `npm install && npx playwright install chromium` | `node medir.mjs` → `resultados/medicion.json` (incluye KLM). Luego `node capturas.mjs`, `node accesibilidad.mjs` (axe en 8 pantallas) y `node simular.mjs` (semilla 20261112). Al terminar, `npm run db:reset`. **Solo axe, sin repetir `medir.mjs`:** `npm run db:reset`, `node pruebas/usabilidad/preparar-pedidos.mjs` (deja 20 pedidos de cliente, como en el antes) y `SUFIJO=_despues node pruebas/usabilidad/accesibilidad.mjs` |

**KLM usado:** K = 0,28 s, P = 1,1 s, B = 0,1 s, H = 0,4 s, M = 1,35 s. La mano empieza en el mouse; cada clic en un campo cuenta P + B; cada decisión marcada en `tareas.mjs` cuenta M.

## F. Hallazgos

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| REN-01 / SEG-01 | Autobloqueo del pool con 10 checkouts simultáneos | Crítica | **Corregido y medido** |
| REN-02 | Órdenes confirmadas sin respuesta al cliente | Alta | **Corregido y medido** |
| REN-03 | Pago simulado de 500 ms con el bloqueo de filas (unas 2 ventas por segundo de un producto) | Media | Hoja de ruta |
| REN-04 | Login lento con 30 VUs (`bcryptjs` en el hilo principal) | Media | Abierto (el después mejoró por variabilidad, no por un cambio) |
| REN-05 | Medición en modo desarrollo en un portátil | Informativa | Abierto (limitación) |
| SEG-02 | Login sin límite de intentos | Alta | **Corregido y medido** |
| SEG-03 | Token en `localStorage` y sin revocación | Media | Hoja de ruta |
| SEG-04 | Faltan cabeceras de seguridad | Media | **Corregido y medido** |
| SEG-05 | `X-Powered-By` | Baja | **Corregido y medido** |
| SEG-06 | Enumeración de usuarios por tiempo (144 ms frente a 30 ms) | Baja | Hoja de ruta |
| SEG-07 | 500 con byte nulo o cuerpo grande | Baja | Hoja de ruta |
| SEG-08 | Política de contraseñas débil | Baja | Hoja de ruta |
| SEG-09 | BD en `0.0.0.0:5434` con contraseña `postgres` | Media | **Corregido y medido** |
| SEG-10 | Sin registro de eventos de seguridad | Baja | Hoja de ruta |
| USA-01 | "Mis pedidos" sin productos ni paginación | 2 | Hoja de ruta |
| USA-02 | Contraste insuficiente (`text-slate-400`, 2,45–2,56:1; 43 elementos) | 3 | **Corregido y medido** |
| USA-03 | Tras un rechazo hay que reescribir la tarjeta | 2 | **Corregido y medido** |
| USA-04 | En el celular la notificación de rechazo tapa el resumen | 1 | Hoja de ruta |
| USA-05 | Vaciar carrito y Quitar sin confirmación | 2 | Hoja de ruta |
| USA-06 | Agregar al carrito casi sin confirmación | 2 | Hoja de ruta |
| USA-07 | Imágenes que no corresponden al producto | 2 | Hoja de ruta |
| USA-08 | Sin recuperación de contraseña | 3 | Hoja de ruta (requiere un servicio de correo) |
| USA-09 | Registro sin confirmar ni mostrar la contraseña | 2 | Hoja de ruta |
| USA-10 | En el celular no se ve quién inició sesión | 1 | Hoja de ruta |
| USA-11 | "Limpiar filtros" solo sin resultados | 1 | Hoja de ruta |
| USA-12 | Landmarks y enlaces duplicados | 1 | Hoja de ruta |
| USA-13 | "Respuesta automática" sin explicación | 1 | Hoja de ruta |

## G. Progreso del plan de correcciones

| Ítem | Estado | Detalle |
|---|---|---|
| REN-01/02 | **Hecho** (commit `a76c206`) | `ordenes.controller.ts`: la lectura final usa `cliente.query` antes del `release()`. `config/db.ts`: `max: 10`, `connectionTimeoutMillis: 5000`. `errorHandler.ts`: pool agotado → 503 "El servidor está ocupado, intenta de nuevo en unos segundos". **C1 (20 VUs):** 0,62 → 4,61 req/s; p50 1,06 → 2,12 s; p95 60 → 5,26 s; máx 60 → 6,87 s; errores 23,26 % → 0 %; se cuelga sí → no. **C2:** 0,34 → 1,84 req/s; p50 3,70 → 9,38 s; p95 60 → 9,51 s; máx 60 → 9,53 s; errores 44,68 % → 0 %; sí → no. Integridad cuadra (A 99655 = 100000 − 345, B 99813 = 100000 − 187, C 99834 = 100000 − 166). Órdenes sin respuesta: 10 → 0. Concurrencia 3/3. El p95 sigue sobre 1,5 s por REN-03. **Nota de interpretación (llevarla a `05-correcciones.md`):** "La mediana de C2 subió de 3,70 a 9,38 s y la de C1 de 1,06 a 2,12 s. No es un retroceso: en el ANTES, entre el 23 % y el 45 % de las peticiones se colgaban hasta el timeout y las medianas solo reflejaban las que alcanzaron a responder (sesgo de supervivencia). En el DESPUÉS, el 100 % se completa, pero en fila por el bloqueo de 500 ms (REN-03). Los indicadores correctos de la mejora son la tasa de errores (45 % → 0 %), el throughput (×5,4 en C2) y el máximo (60 s colgado → 9,5 s). La latencia restante se resuelve con REN-03 (hoja de ruta)." |
| SEG-02 | **Hecho** (`a76c206`) | `routes/auth.routes.ts`: `express-rate-limit`, 5 fallidos por IP + email cada 15 minutos, `skipSuccessfulRequests`, `ipKeyGenerator`. Fuerza bruta: antes 50 × 401; después 5 × 401 y 45 × 429 (se bloquea en el intento 6). **Escenario B (30 VUs):** 1055 → 1375 peticiones, p95 2,51 → 1,21 s, errores 0 % → 0 %, ningún 429 |
| SEG-04/05 | **Hecho y medido** (código en `a76c206`) | `index.ts`: `helmet` 8.3.0 con CSP `default-src 'none'; frame-ancestors 'none'` y `app.disable("x-powered-by")`. Cabeceras: de ausentes a CSP, XFO SAMEORIGIN, nosniff, HSTS y no-referrer; X-Powered-By eliminado; CORS correcto (preflight 204). **ZAP de API con token de cliente** (`SUFIJO=_despues bash pruebas/seguridad/ejecutar-zap.sh cliente`): Alta 0 → 0, Media 0 → 0, **Baja 3 → 1**, Informativa 3 → 3. Desaparecen X-Powered-By y X-Content-Type-Options Missing; queda el 500 con `buscar=%00` (SEG-07, hoja de ruta). Tabla en `00-estado.md` |
| SEG-09 | **Hecho y medido** | `docker-compose.yml` → `"127.0.0.1:5434:5432"`; `ALTER USER postgres` con clave aleatoria (sin borrar el volumen) guardada solo en `backend/.env`; `.env.example` → `cambia_esta_clave`. Medición con `node pruebas/seguridad/exposicion-bd.mjs antes\|despues`: escucha en `0.0.0.0` → solo `127.0.0.1`; desde la IP de red local con `postgres/postgres` CONECTA → puerto cerrado; por loopback con `postgres/postgres` CONECTA → RECHAZADA; la app con la clave del `.env` sigue conectando. `verificar` LISTO y concurrencia SUPERADA. Tabla en `00-estado.md` |
| USA-02 | **Hecho y medido** | `text-slate-400` → `text-slate-600` (texto, 7,24:1 sobre `#f8fafc`) en 9 archivos y → `text-slate-500` (íconos, que piden 3:1) en `Catalogo.tsx`, `ImagenProducto.tsx` y `Modal.tsx`. `slate-500` no se usó para texto porque queda en 4,55:1 sobre `#f8fafc` y 4,34:1 sobre `slate-100`. Medición: `npm run db:reset` + `node pruebas/usabilidad/preparar-pedidos.mjs` (20 pedidos de cliente, el estado del antes) + `SUFIJO=_antes\|_despues node pruebas/usabilidad/accesibilidad.mjs`. El ANTES repetido dio lo mismo que el original. **Graves 43 → 0**, moderadas 3 → 3 (landmarks, USA-12), críticas y menores 0 → 0. `npm run build` ok. Tabla en `00-estado.md` |
| USA-03 | **Hecho y medido** | `Checkout.tsx`: tras un 402 se conservan número, titular y vencimiento (solo estado de React), se borra el CVV, foco al CVV y "Por seguridad, vuelve a ingresar el CVV."; con otro resultado se borra todo. (Antes del cambio la app ya conservaba titular y vencimiento y borraba número y CVV.) `node pruebas/usabilidad/verificar-usa03.mjs`: 12/12 OK (almacenamiento solo `carrito` y `token`; 409 borra todo). T5 con `SOLO=T5 SUFIJO=_antes\|_despues node pruebas/usabilidad/medir.mjs` (`tareas.mjs` detecta el número conservado y hace clic + Ctrl+A = 2K): máquina 2,014 → 2,012 s; **KLM 36,91 → 37,47 s** (52K → 54K). Con OTRA tarjeta no mejora (+0,56 s); con la MISMA tarjeta el tramo de reintento baja de 11,87 a 4,19 s (−65 %), calculado con KLM porque el pago simulado no permite automatizarlo. Explicación y tablas en `00-estado.md` → llevar a `05-correcciones.md` ("USA-03: equilibrio usabilidad-seguridad"). **Decisión del usuario sobre cómo documentarlo:** USA-03 va como **análisis de compromiso usabilidad-seguridad, NO como mejora**: en el simulador el rechazo solo ocurre con tarjetas terminadas en 0000, así que se reintenta con otra tarjeta (+0,56 s en KLM); en pasarelas reales con rechazos transitorios se reintenta con la misma (el tramo baja de 11,87 a 4,19 s). **La corrección crítica de usabilidad es USA-02** (axe 43 → 0 graves) |
| Regresión | **Hecha** (dos veces; la segunda tras un reinicio de Docker) | Build del backend y del frontend ok; `node pruebas/regresion/chatbot.mjs` 4/4 OK con Groq (precio $1.250.000, sin sesión pide login, pedido propio visible, IDOR sin fuga); `node pruebas/regresion/flujo.mjs` 8/8 OK (registro → carrito → compra aprobada → rechazo USA-03 y reintento → mis pedidos → salir → admin crea producto, sin errores JS); `npm run verificar` LISTO. Observación (no regresión, para la hoja de ruta): en el IDOR el modelo le dice a cliente2 "inicia sesión" en vez de "no encontré ese pedido entre los tuyos"; el filtro por `usuario_id` está en el SQL. Detalle en `00-estado.md` |
| Documentación 05 y 06 | **Hecha** | `05-correcciones.md` (causa raíz, cambio, ANTES/DESPUÉS y efecto en el negocio; sección "USA-03: equilibrio usabilidad-seguridad", como análisis de compromiso y no como mejora (ver fila USA-03); la corrección crítica de usabilidad es USA-02; aclarar que el SUS no se repite y que la mejora se mide con axe y KLM), `06-matriz-calidad.md` (filas rendimiento, seguridad y usabilidad con accesibilidad; columnas: indicadores, estado inicial, estado después, hallazgos abiertos y calificación Óptimo / Aceptable / Requiere mejora; diagnóstico de una frase por dimensión), hoja de ruta con esfuerzo y motivo, y actualizar `00-estado.md` |
| Cierre | **Hecho** (`CIERRE_HASH`) | Nuevo `npm run db:demo` (requisito de ≥50 registros con datos coherentes); los 10 JSON de k6 ya no tenían `setup_data`; revisión de secretos sin hallazgos; commit "Correcciones de rendimiento, seguridad y usabilidad con nueva medición"; BD en estado de demo. Sin unir a master |

**Al cerrar esta sesión (12 de noviembre, segunda sesión):** plan de correcciones completo y con commit; BD en `db:demo`; `ecommerce_db` arriba en `127.0.0.1:5434`; `npm run dev` corriendo en segundo plano (si no responde, relanzarlo); `CHAT_PROVEEDOR=groq`.

## H. Decisiones ya tomadas (no volver a discutirlas)

- **Groq en vez de Gemini** como proveedor principal del chat: el plan gratuito de Gemini tenía 13–20 s de latencia y 503 frecuentes. Gemini queda como alternativa configurable y reglas como respaldo.
- **USA-03:** conservar número, titular y vencimiento en memoria (nunca en el almacenamiento del navegador) y **borrar solo el CVV** tras un rechazo; con cualquier otro resultado se borra todo.
- **El SUS no se vuelve a simular** después de las correcciones: la mejora se mide con indicadores objetivos (axe-core y KLM); repetir el SUS requeriría otra ronda de evaluación.
- **A la hoja de ruta:** USA-08 (requiere un servicio de correo), REN-03 (requiere rediseñar el pago con reserva de stock), REN-04 (cambiar a `bcrypt` nativo), SEG-03 (cookies HttpOnly y refresh tokens), SEG-06, SEG-07, SEG-08, SEG-10 y el resto de USA. Quedaron fuera porque la práctica pide al menos un crítico por dimensión y estos son de mayor esfuerzo o de menor severidad.
- `/api/chat` **no se prueba con carga** (límite de peticiones y cuota externa).
- **k6 con 8 VUs** fue un escenario adicional del "antes" para medir `FOR UPDATE` sin el bloqueo; los escenarios oficiales son con 20.
- **`cliente2` y los perfiles simulados** se mantienen como están; no inventar problemas de usabilidad que no existan en la interfaz.

## I. Qué sigue (en orden)

1. ~~SEG-04/05~~, ~~SEG-09~~, ~~USA-02~~, ~~USA-03~~, ~~regresión~~, ~~documentos 05 y 06~~ y ~~cierre~~: **hechos** (ver la sección G).
2. Siguiente:  el **documento formal final con enfoque de venta**. Los datos de portada (nombre del estudiante, código, docente, fecha y demás) están **pendientes del usuario**: pídeselos.

## J. Primeros pasos de la siguiente sesión

1. Lee `CLAUDE.md` y este `docs/HANDOFF.md` (y `docs/pruebas/00-estado.md` si necesitas detalle).
2. `git status`, `git branch --show-current` (debe ser `pruebas-no-funcionales`) y `git log --oneline -5`.
3. `docker ps`: detén cualquier contenedor de k6 o ZAP que haya quedado; si `ecommerce_db` está detenido, `docker compose up -d`.
4. Verifica `curl localhost:3000/api/health` y `:5173`; si no responden, `npm run dev` desde la raíz en segundo plano.
5. Confírmale al usuario el estado en una **lista corta** (hecho, en curso y pendiente) y **espera su prompt**. No empieces nada sin él.
