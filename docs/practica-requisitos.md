# Enunciado original del docente (textual)

> Texto pegado por el estudiante el 12 de noviembre de 2026. Se reproduce sin cambios, incluidos su formato y sus erratas.

<table> <colgroup> <col style="width: 49%" /> <col style="width: 50%" /> </colgroup> <thead> <tr class="header"> <th><blockquote> <p>Estrategias de validación y pruebas de software.</p> </blockquote></th> <th><blockquote> <p>Implementación de pruebas en el proyecto.</p> </blockquote></th> </tr> </thead> <tbody> </tbody> </table> 
Metodología Paso a Paso y Herramientas
 
Fase 1: Preparación
 

* Paso 1.1: Desplegar el Sistema Bajo Prueba (SUT) en un entorno local o controlado.
* Paso 1.2: Validar la instalación del conjunto de herramientas de evaluación.

 
Fase 2: Ejecución de Pruebas No Funcionales
 
Módulo 1: Pruebas de Rendimiento
 

* Paso 2.1.1: Seleccionar los endpoints o flujos críticos del sistema.
* Paso 2.1.2: Diseñar el plan de pruebas definiendo la concurrencia y la rampa de usuarios virtuales (ramp-up).
* Paso 2.1.3: Ejecutar la simulación de carga y recolectar las métricas de latencia, tasa de errores y rendimiento (throughput).
* 🛠️ Herramienta sugerida: Apache JMeter o k6.

 
Módulo 2: Pruebas de Usabilidad
 

* Paso 2.2.1: Establecer flujos de tareas específicas para que los evaluadores los ejecuten en la interfaz.
* Paso 2.2.2: Realizar una inspección experta de la interfaz basada en principios de diseño de interacción.
* Paso 2.2.3: Aplicar el cuestionario estandarizado de percepción subjetiva al usuario evaluador.
* 🛠️ Herramienta sugerida: Evaluación heurística (Principios de Nielsen) y Escala SUS (System Usability Scale).

 
Módulo 3: Pruebas de Seguridad
 

* Paso 2.2.1: Configurar el proxy de intercepción para mapear las rutas y peticiones de la aplicación web (spidering).
* Paso 2.3.2: Ejecutar el escaneo automatizado de vulnerabilidades sobre el sistema objetivo.
* Paso 2.3.3: Clasificar los hallazgos identificados según su nivel de criticidad frente a estándares de la industria.
* 🛠️ Herramienta sugerida: OWASP ZAP (Zed Attack Proxy).

 
Fase 3: Consolidación y Reporte
 

* Paso 3.1: Integrar los resultados de las tres dimensiones en una matriz de calidad unificada.
* Paso 3.2: Definir el plan de acciones correctivas y de mejora técnica para cada hallazgo detectado.

 
Practica.
 
El grupo de estudiantes evalúan su propia aplicación "X" (es decir, el proyecto software que han desarrollado), con el fin de que la práctica sea más significativa porque se enfrentan a los errores reales de su propio código y arquitectura.
 
Para adaptar la metodología paso a paso a una aplicación desarrollada, se aplicaría de la siguiente manera:
 
Fase 1: Preparación (Adecuación de la App "X")
 

* Paso 1.1: Despliegue local del proyecto
   * Cómo se haría: Cada grupo de trabajo debe levantar su "Aplicación X" en su entorno de desarrollo local (localhost), asegurándose de que la base de datos (SQL o NoSQL) esté poblada con datos de prueba (por ejemplo, al menos 50 registros simulados para que las pruebas de rendimiento tengan sentido).
* Paso 1.2: Inventario de rutas y flujos
   * Cómo se haría: Los estudiantes deben entregar un mapa rápido de su app indicando: ¿Cuál es el flujo principal? (Ej: Registro ➔ Catálogo ➔ Carrito ➔ Pago) y ¿Cuáles son los endpoints críticos del backend?

 
Fase 2: Ejecución de Pruebas No Funcionales en la App "X"
 
Módulo 1: Pruebas de Rendimiento (Enfocadas en el Backend de la App "X")
 

* Cómo se haría:
   1. Los estudiantes eligen el endpoint más pesado de su app (por ejemplo, una consulta compleja con múltiples cruces de tablas o el login).
   2. Configuran JMeter o k6 apuntando a su http://localhost:PUERTO/api/....
   3. Ejecutan la carga y descubren si su propia base de datos o su servidor colapsa ante la concurrencia.

 
Módulo 2: Pruebas de Usabilidad (Enfocadas en la Interfaz de la App "X")
 

* Cómo se haría:
   1. Prueba cruzada: El equipo "A" prueba la interfaz de la aplicación del equipo "B" (para evitar sesgos por haberla programado ellos mismos).
   2. El evaluador externo intenta completar tareas clave en la App "X" mientras el autor observa en silencio dónde se tropieza el usuario.
   3. Aplican la escala SUS basada en la experiencia real con esa interfaz.

 
Módulo 3: Pruebas de Seguridad (Enfocadas en las vulnerabilidades de la App "X")
 

* Cómo se haría:
   1. Configuran OWASP ZAP para interceptar el tráfico de su propia aplicación web mientras navegan por ella.
   2. Ejecutan el escaneo automatizado sobre las rutas de su App "X".
   3. Analizan si su código tiene fallos comunes como falta de validación de entradas, contraseñas en texto plano o errores mal gestionados que revelen información del servidor.

 
Fase 3: Consolidación y Refactorización de la App "X"
 

* Paso 3.1: Diagnóstico cruzado
   * Cómo se haría: Cada grupo consolida los resultados en una matriz donde se evidencia el estado real de su proyecto (ej: "Nuestra app resiste bien la carga, pero falló en usabilidad porque el menú no es intuitivo y tiene una vulnerabilidad de inyección en el buscador").
* Paso 3.2: Plan de corrección de código (Refactoring)
   * Cómo se haría: Como cierre de la práctica, los estudiantes deben modificar directamente el código fuente de su App "X" para solucionar al menos un problema crítico detectado en cada una de las tres dimensiones evaluadas antes de entregar la versión final de su proyecto.

---

## Notas de interpretación (no son del docente)

Todo lo de esta sección lo agregó el equipo (con Claude Code). No forma parte del enunciado.

**Sobre el entregable.** El enunciado no describe el formato del entregable. Indicación del estudiante del 12 de noviembre de 2026: es un informe técnico en PDF, sin enfoque de venta, que el estudiante arma fuera del repositorio con las evidencias de `docs/pruebas/`.

**Sobre la numeración.** En el Módulo 3 de la metodología, el primer paso aparece como "Paso 2.2.1"; por el orden, corresponde al **2.3.1**, y así se cita en la auditoría.

**Sobre la prueba cruzada.** La prueba cruzada con otro equipo (Módulo 2 de la práctica) se reemplazó por perfiles simulados con IA, con autorización del docente, porque el proyecto lo desarrolló un solo integrante. Está declarada como desviación en `04-usabilidad.md`, sección "Metodología".

**Datos.** El requisito de "al menos 50 registros simulados" se cumple con dos scripts reproducibles: `npm run db:demo` (estado de demo y de entrega: 15 usuarios, 60 productos, 40 órdenes, 85 ítems y 40 pagos, 240 registros coherentes) y `npm run db:poblar` (pruebas de carga con k6: 28 usuarios, 63 productos, 80 órdenes, 161 ítems y 80 pagos).

### Auditoría de cobertura (12 de noviembre de 2026, sin ejecutar pruebas nuevas)

| Paso | ¿Cubierto? | Evidencia (archivo y sección) | Qué falta |
|---|---|---|---|
| 1.1 Desplegar el SUT en local con datos de prueba (≥50 registros) | Sí | `01-inventario.md`, "Datos de demostración" y "Datos de prueba de carga"; `README.md` (arranque en localhost) | Nada |
| 1.2 Validar las herramientas / inventario de rutas y flujos | Sí (las versiones se documentaron en esta auditoría) | `01-inventario.md`, "Herramientas de evaluación" (k6 2.3.0, ZAP 2.17.0, Playwright 1.65.0, axe-core 4.14.0, npm audit), "Flujos principales" (Registro → Catálogo → Carrito → Checkout y pago → Mis pedidos) y "Endpoints" (17 con criticidad) | Nada |
| 2.1.1 Seleccionar endpoints o flujos críticos | Sí | `01-inventario.md`, "Endpoints" (criticidad); `02-rendimiento.md`, "Metodología" (catálogo, login y checkout; `/api/chat` excluido en "Exclusiones") | Nada |
| 2.1.2 Plan con concurrencia y rampa (ramp-up) | Sí (la tabla por escenario se agregó en esta auditoría) | `02-rendimiento.md`, "Plan por escenario" (stages 30 s / 60 s / 15 s, VUs, thresholds y datos de cada escenario); `pruebas/rendimiento/comun.js` | Nada |
| 2.1.3 Ejecutar la carga y medir latencia, errores y throughput | Sí | `02-rendimiento.md`, "Resultados" e "Integridad de los datos"; después de corregir, `05-correcciones.md`, REN-01 | Nada |
| 2.2.1 Flujos de tareas para los evaluadores | Sí (con evaluadores simulados) | `04-usabilidad.md`, "Tareas" (9 tareas con criterio de éxito) y "Medición real"; `pruebas/usabilidad/tareas.mjs` | Evaluadores reales: desviación autorizada |
| 2.2.2 Inspección experta (principios de interacción) | Sí | `04-usabilidad.md`, "Evaluación heurística (Nielsen, real)" y "Accesibilidad (axe-core, real)" | Nada |
| 2.2.3 Cuestionario estandarizado (SUS) | Parcial (desviación autorizada) | `04-usabilidad.md`, "Cuestionario SUS (simulado)" (75,0, "Bueno") y la desviación declarada en "Metodología" | Un SUS de evaluadores reales, solo si el docente lo exige (requiere una sesión con personas) |
| 2.3.1 Proxy de intercepción y spidering | Parcial | `03-seguridad.md`, "Mapeo de rutas: spider y proxy": spider tradicional en el baseline (6 URL de la SPA) y rutas del API importadas desde OpenAPI (17 endpoints) | Navegar la app con el navegador a través del proxy de ZAP o correr el *AJAX spider* (**requiere ejecutar una prueba nueva; no se hizo**) |
| 2.3.2 Escaneo automatizado | Sí | `03-seguridad.md`, "Escaneos con ZAP" (baseline, API como cliente y como admin); después, `05-correcciones.md`, SEG-04 y SEG-05 | Nada |
| 2.3.3 Clasificar por criticidad frente a estándares | Sí (la revisión explícita de contraseñas en texto plano se agregó en esta auditoría) | `03-seguridad.md`, "Hallazgos" (severidad y categoría OWASP Top 10) y "Análisis pedido por el enunciado" (validación de entradas, contraseñas con bcrypt y errores que revelan información) | Nada |
| 3.1 Matriz de calidad unificada / diagnóstico cruzado | Sí | `06-matriz-calidad.md`, "Matriz" y "Diagnóstico por dimensión" | Nada |
| 3.2 Plan de acciones para cada hallazgo / corrección de código | Sí | `06-matriz-calidad.md`, "Trazabilidad de todos los hallazgos" (29 hallazgos: 9 corregidos con commit, 20 en la hoja de ruta con esfuerzo) y "Hoja de ruta"; `05-correcciones.md` (un crítico corregido por dimensión: REN-01, SEG-02 y USA-02, con antes y después) | Nada |
