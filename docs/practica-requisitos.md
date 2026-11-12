# Requisitos de la práctica "Estrategias de validación y pruebas de software"

Transcripción de los requisitos de la práctica (el documento original del docente no está en el repositorio). Sirve como referencia para comprobar que cada entrega cubre lo pedido.

## Contexto de la entrega

- La materia es de **venta e integración de tecnologías**.
- El entregable es un **documento formal que presenta y "vende" el software** con su calidad medida.
- El docente **autorizó simular con IA a los participantes de usabilidad**; esto **debe declararse** en el informe.

## Fase 1. Preparación

| Punto | Requisito | Dónde se cubre |
|---|---|---|
| 1.1 | Despliegue local con **al menos 50 registros de prueba** | `npm run db:demo` (estado de demo: 15 usuarios, 60 productos, 40 órdenes, 85 ítems y 40 pagos, 240 registros coherentes) y `npm run db:poblar` (pruebas de carga: 28 usuarios, 63 productos, 80 órdenes); `docs/pruebas/01-inventario.md` |
| 1.2 | **Inventario de rutas y flujos**: flujo principal y endpoints críticos | `docs/pruebas/01-inventario.md` (17 endpoints con criticidad) |

## Fase 2. Pruebas no funcionales

### Módulo 1. Rendimiento

| Requisito | Dónde se cubre |
|---|---|
| Seleccionar los **endpoints críticos** | `01-inventario.md`, `02-rendimiento.md` |
| Plan de prueba con **concurrencia y rampa de usuarios virtuales** | `pruebas/rendimiento/` (rampa 30 s / 60 s / 15 s) |
| Métricas: **latencia, tasa de errores y throughput** | `02-rendimiento.md` |
| Herramienta: **JMeter o k6** | k6 |

### Módulo 2. Usabilidad

| Requisito | Dónde se cubre |
|---|---|
| **Flujos de tareas** para los evaluadores | `pruebas/usabilidad/tareas.mjs`, `04-usabilidad.md` |
| **Inspección experta** con principios de diseño de interacción | Heurísticas de Nielsen en `04-usabilidad.md` |
| **Cuestionario estandarizado** | SUS en `04-usabilidad.md` |
| Herramientas: **heurísticas de Nielsen y SUS** | `04-usabilidad.md` |
| **Prueba cruzada con otro equipo**; el autor observa en silencio | Sustituida por perfiles simulados con IA (autorizado por el docente, declarado en `04-usabilidad.md`) |

### Módulo 3. Seguridad

| Requisito | Dónde se cubre |
|---|---|
| **Proxy de intercepción y spidering** | ZAP (baseline del frontend con spider) en `03-seguridad.md` |
| **Escaneo automatizado** | ZAP API scan como cliente y como admin |
| **Clasificación de hallazgos por criticidad** frente a estándares de la industria | SEG-01 a SEG-10 con severidad y referencia OWASP en `03-seguridad.md` |
| Herramienta: **OWASP ZAP** | `pruebas/seguridad/ejecutar-zap.sh` |
| Revisar **validación de entradas**, **contraseñas en texto plano** y **errores que revelen información del servidor** | Pruebas manuales en `03-seguridad.md` (`pruebas/seguridad/manuales.mjs`, `auditoria.mjs`) |

## Fase 3. Consolidación

| Punto | Requisito | Dónde se cubre |
|---|---|---|
| 3.1 | **Matriz de calidad unificada** con el estado real del proyecto (ej. "Nuestra app resiste bien la carga, pero falló en usabilidad porque...") | `docs/pruebas/06-matriz-calidad.md` (pendiente) |
| 3.2 | **Plan de corrección**: modificar el código para solucionar **al menos un problema crítico en cada una de las tres dimensiones** antes de la versión final | `docs/pruebas/05-correcciones.md` (pendiente); progreso en `00-estado.md` y `HANDOFF.md` sección G |
