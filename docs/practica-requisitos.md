# Requisitos de la práctica "Estrategias de validación y pruebas de software"

Transcripción de los requisitos de la práctica (el documento original del docente no está en el repositorio). Sirve como referencia para comprobar que cada entrega cubre lo pedido.

## Contexto de la entrega

- La materia es de **venta e integración de tecnologías**.
- El entregable es un **documento formal que presenta y "vende" el software** con su calidad medida.
- El docente **autorizó simular con IA a los participantes de usabilidad**; esto **debe declararse** en el informe.

## Fase 1. Preparación

| Punto | Requisito |
|---|---|
| 1.1 | Despliegue local con **al menos 50 registros de prueba** |
| 1.2 | **Inventario de rutas y flujos**: flujo principal y endpoints críticos |

## Fase 2. Pruebas no funcionales

### Módulo 1. Rendimiento

| Requisito |
|---|
| Seleccionar los **endpoints críticos** |
| Plan de prueba con **concurrencia y rampa de usuarios virtuales** |
| Métricas: **latencia, tasa de errores y throughput** |
| Herramienta: **JMeter o k6** |

### Módulo 2. Usabilidad

| Requisito |
|---|
| **Flujos de tareas** para los evaluadores |
| **Inspección experta** con principios de diseño de interacción |
| **Cuestionario estandarizado** |
| Herramientas: **heurísticas de Nielsen y SUS** |
| **Prueba cruzada con otro equipo**; el autor observa en silencio |

### Módulo 3. Seguridad

| Requisito |
|---|
| **Proxy de intercepción y spidering** |
| **Escaneo automatizado** |
| **Clasificación de hallazgos por criticidad** frente a estándares de la industria |
| Herramienta: **OWASP ZAP** |
| Revisar **validación de entradas**, **contraseñas en texto plano** y **errores que revelen información del servidor** |

## Fase 3. Consolidación

| Punto | Requisito |
|---|---|
| 3.1 | **Matriz de calidad unificada** con el estado real del proyecto (ej. "Nuestra app resiste bien la carga, pero falló en usabilidad porque...") |
| 3.2 | **Plan de corrección**: modificar el código para solucionar **al menos un problema crítico en cada una de las tres dimensiones** antes de la versión final |

---

## Notas de interpretación (no son del docente)

Todo lo de esta sección lo agregó el equipo (con Claude Code). No forma parte del enunciado.

**Sobre el entregable.** Indicación del estudiante del 12 de noviembre de 2026: el entregable final es un informe técnico en PDF, sin enfoque de venta, que el estudiante arma fuera del repositorio con las evidencias de `docs/pruebas/`.

**Sobre la prueba cruzada.** La prueba cruzada con otro equipo se sustituyó por perfiles simulados con IA, con autorización del docente, porque el proyecto lo desarrolló un solo integrante. Está declarado en `04-usabilidad.md`.

**Dónde se cubre cada requisito.**

| Requisito | Dónde se cubre |
|---|---|
| 1.1 Al menos 50 registros | `npm run db:demo` (estado de demo: 15 usuarios, 60 productos, 40 órdenes, 85 ítems y 40 pagos, 240 registros coherentes) y `npm run db:poblar` (pruebas de carga: 28 usuarios, 63 productos, 80 órdenes); `docs/pruebas/01-inventario.md` |
| 1.2 Inventario de rutas y flujos | `docs/pruebas/01-inventario.md` (17 endpoints con criticidad) |
| Rendimiento: endpoints críticos | `01-inventario.md`, `02-rendimiento.md` |
| Rendimiento: concurrencia y rampa | `pruebas/rendimiento/` (rampa 30 s / 60 s / 15 s) |
| Rendimiento: latencia, errores y throughput | `02-rendimiento.md` |
| Rendimiento: herramienta | k6 |
| Usabilidad: flujos de tareas | `pruebas/usabilidad/tareas.mjs`, `04-usabilidad.md` |
| Usabilidad: inspección experta | Heurísticas de Nielsen en `04-usabilidad.md` |
| Usabilidad: cuestionario estandarizado | SUS en `04-usabilidad.md` |
| Usabilidad: prueba cruzada | Perfiles simulados con IA (ver la nota anterior) |
| Seguridad: proxy y spidering | ZAP (baseline del frontend con spider) en `03-seguridad.md` |
| Seguridad: escaneo automatizado | ZAP API scan como cliente y como admin |
| Seguridad: clasificación por criticidad | SEG-01 a SEG-10 con severidad y referencia OWASP en `03-seguridad.md` |
| Seguridad: herramienta | `pruebas/seguridad/ejecutar-zap.sh` |
| Seguridad: entradas, contraseñas y errores | Pruebas manuales en `03-seguridad.md` (`pruebas/seguridad/manuales.mjs`, `auditoria.mjs`) |
| 3.1 Matriz de calidad | `docs/pruebas/06-matriz-calidad.md` |
| 3.2 Plan de corrección | `docs/pruebas/05-correcciones.md`; progreso en `00-estado.md` y `HANDOFF.md` sección G |
