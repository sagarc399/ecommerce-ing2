# 04 — Pruebas de usabilidad (estado inicial)

Se documenta el estado **antes** de cualquier corrección: no se modificó la interfaz.

## Metodología

**Desviación declarada frente al enunciado.** El enunciado pide una **prueba cruzada**: el equipo "A" prueba la interfaz del equipo "B" mientras el autor observa en silencio, y después aplican el SUS. Como el proyecto lo desarrolló un solo integrante y no hubo otro equipo, esa prueba se **reemplazó por una simulación con perfiles generados con IA, autorizada por el docente**. Las tareas, sus tiempos de máquina, el KLM, la accesibilidad y la inspección heurística sí se midieron sobre la aplicación real; lo simulado son los participantes, sus tiempos, sus observaciones y sus respuestas al SUS.

> **Los participantes son perfiles simulados con IA, con autorización del docente, debido a que el proyecto fue desarrollado por un solo integrante. Los tiempos base, la accesibilidad y la inspección heurística se obtuvieron sobre la aplicación real.**

| Componente | Origen | Herramienta | Archivos |
|---|---|---|---|
| Tiempo de máquina, clics, campos, caracteres, cambios de página | **Real** | Playwright 1.65 + Chromium, 1366×768, 3 corridas por tarea (mediana) | `pruebas/usabilidad/medir.mjs`, `tareas.mjs`, `resultados/medicion.json` |
| Tiempo humano experto | **Real** (modelo) | KLM calculado sobre la secuencia de acciones medida | `tareas.mjs` (`calcularKLM`) |
| Tiempo de respuesta del chatbot | **Real** | Playwright, desde Enter hasta la respuesta | `resultados/medicion.json` |
| Accesibilidad | **Real** | axe-core 4.14 (WCAG 2.0/2.1/2.2 A y AA + buenas prácticas) en 8 pantallas | `accesibilidad.mjs`, `accesibilidad.csv`, `resultados/accesibilidad.json` |
| Evaluación heurística | **Real** | Inspección de la interfaz con los 10 principios de Nielsen | Capturas en `docs/pruebas/capturas/` |
| Tiempos por perfil, resultados y SUS | **Simulado** (declarado) | Factores por perfil sobre el KLM real, con semilla fija | `simular.mjs`, `tiempos.csv`, `resultados.csv`, `sus.csv` |

**Reglas de la simulación** (para que sea reproducible y no invente problemas):

- Tiempo del perfil = KLM × factor de experiencia × factor de dispositivo × (1 ± 15 %).
- Factor de experiencia: **alta 1,0** (el KLM modela a un experto sin errores), **media 1,6**, **baja 2,4** (apunta, lee y decide más despacio).
- Factor de dispositivo: **escritorio 1,0**, **celular 1,2** (escritura táctil más lenta).
- La variación de ±15 % usa el generador `mulberry32` con **semilla 20261112**: `node simular.mjs` produce siempre los mismos números.
- Una tarea solo es "con dificultad" o "fracaso" si la causa un problema real con su ID (USA-xx o accesibilidad). Ningún problema encontrado impide terminar una tarea, por eso no hay fracasos.
- Las dificultades no suman tiempo: el tiempo sale solo de la fórmula. Es una limitación del modelo, que tiende a subestimar los tiempos de los perfiles con dificultades.

**Datos:** `npm run db:reset` (12 productos, 3 usuarios). Backend con `npm run dev`; chatbot con Groq (`openai/gpt-oss-120b`). Equipo de pruebas en [01-inventario.md](01-inventario.md).

## Tareas

| ID | Tarea | Criterio de éxito |
|---|---|---|
| T1 | Registrarse como cliente nuevo | Queda con la sesión iniciada en el catálogo y su nombre aparece en el encabezado |
| T2 | Buscar un producto por nombre y filtrar por categoría | Aparece "Camiseta deportiva" y todos los resultados son de Ropa |
| T3 | Agregar 2 productos al carrito y cambiar la cantidad de uno | El carrito tiene 2 productos y uno con cantidad 2 |
| T4 | Completar una compra con tarjeta válida | Llega a "¡Gracias por tu compra!" |
| T5 | Recibir un pago rechazado (0000) y reintentar con otra tarjeta | Ve el rechazo y con otra tarjeta llega a la confirmación |
| T6 | Consultar el detalle de un pedido en "Mis pedidos" | Ve productos, total y pago de un pedido |
| T7 | Preguntarle al chatbot el precio de un producto | Responde el precio real del monitor ($1.250.000) |
| T8 | (Admin) Crear un producto nuevo | El producto aparece en la tabla del panel |
| T9 | (Admin) Desactivar un producto y volver a activarlo | Queda activo tras haber estado inactivo |

## Medición real (Playwright, 1366×768)

**Las 27 corridas (9 tareas × 3) cumplieron el criterio de éxito.**

| Tarea | Mediana máquina | Clics | Campos (caracteres) | Teclas | Cambios de página | Decisiones | KLM | Operadores |
|---|---|---|---|---|---|---|---|---|
| T1 | 0,51 s | 5 | 3 (49) | 0 | 2 | 3 | 26,17 s | 49K 5P 5B 6H 3M |
| T2 | 0,54 s | 3 | 1 (8) | 0 | 0 | 3 | 10,69 s | 8K 3P 3B 2H 3M |
| T3 | 0,25 s | 4 | 0 (0) | 0 | 1 | 4 | 10,20 s | 0K 4P 4B 0H 4M |
| T4 | 0,95 s | 6 | 4 (33) | 0 | 2 | 3 | 23,69 s | 33K 6P 6B 8H 3M |
| T5 | 1,92 s | 9 | 6 (52) | 0 | 2 | 5 | 36,91 s | 52K 9P 9B 12H 5M |
| T6 | 0,25 s | 2 | 0 (0) | 0 | 2 | 3 | 6,45 s | 0K 2P 2B 0H 3M |
| T7 | 1,23 s | 2 | 1 (26) | 1 | 0 | 3 | 14,41 s | 27K 2P 2B 1H 3M |
| T8 | 0,50 s | 7 | 4 (29) | 0 | 2 | 4 | 25,12 s | 29K 7P 7B 8H 4M |
| T9 | 0,85 s | 4 | 1 (7) | 0 | 0 | 4 | 12,96 s | 7K 4P 4B 2H 4M |

**Operadores KLM:** K = 0,28 s por tecla, P = 1,1 s apuntar, B = 0,1 s clic, H = 0,4 s cambiar entre teclado y mouse, M = 1,35 s preparación mental. La mano empieza en el mouse; cada clic en un campo cuenta P + B; cada decisión marcada en la automatización cuenta M.

**Notas sobre la medición:**

- T2 y T9 no cambian de página porque los filtros solo modifican la URL o la tabla.
- T5 incluye volver a escribir el número y el CVV, porque la app los borra tras el rechazo (USA-03).
- **Chatbot (T7):** tiempo real de respuesta de 1150, 1114 y 1046 ms, con mediana de **1,11 s**. Las 3 respuestas vinieron de Groq, con el precio real y sin el aviso "Respuesta automática".
- **Ajustes al script, no a la app:** dos tareas fallaron en el primer intento por errores de la automatización. En T2, cada tarjeta tiene dos enlaces con el mismo nombre (ver USA-12). En T9, Playwright compara nombres por subcadena y `"Activar"` coincidía con `"Desactivar"`. Se corrigieron los selectores y se repitieron las 27 corridas.

## Tiempos por tarea

| Tarea | Máquina | KLM (experto) | P1 Valentina | P2 Andrés | P3 Rosa | P4 Camilo | P5 Jorge | Promedio perfiles |
|---|---|---|---|---|---|---|---|---|
| T1 | 0,51 s | 26,17 s | 35,47 s | 39,97 s | 67,31 s | 27,90 s | 45,71 s | 43,27 s |
| T2 | 0,54 s | 10,69 s | 11,39 s | 19,21 s | 28,09 s | 11,01 s | 19,71 s | 17,88 s |
| T3 | 0,25 s | 10,20 s | 13,25 s | 17,68 s | 24,27 s | 11,58 s | 18,92 s | 17,14 s |
| T4 | 0,95 s | 23,69 s | 25,43 s | 32,56 s | 54,71 s | 22,21 s | 45,98 s | 36,18 s |
| T5 | 1,92 s | 36,91 s | 48,54 s | 51,03 s | 85,13 s | 38,81 s | 73,71 s | 59,44 s |
| T6 | 0,25 s | 6,45 s | 6,93 s | 9,04 s | 13,71 s | 5,54 s | 13,23 s | 9,69 s |
| T7 | 1,23 s | 14,41 s | 16,60 s | 19,89 s | 29,58 s | 15,67 s | 26,25 s | 21,60 s |
| T8 | 0,50 s | 25,12 s | 25,86 s | 38,14 s | 66,36 s | 21,45 s | 50,69 s | 40,50 s |
| T9 | 0,85 s | 12,96 s | 15,68 s | 17,99 s | 26,58 s | 11,43 s | 21,68 s | 18,67 s |

La tarea más larga es **T5** (pago rechazado y reintento): 36,9 s en KLM y 59,4 s en el promedio de perfiles, sobre todo por volver a escribir la tarjeta (USA-03).

## Participantes simulados

| ID | Perfil | Edad | Experiencia digital | Dispositivo | Compras en línea |
|---|---|---|---|---|---|
| P1 | Valentina, estudiante universitaria | 22 | Alta | Celular | Semanal |
| P2 | Andrés, contador | 35 | Media | Escritorio | Mensual |
| P3 | Rosa, docente jubilada | 58 | Baja | Escritorio | Casi nunca |
| P4 | Camilo, estudiante de sistemas | 19 | Alta | Escritorio | Semanal |
| P5 | Jorge, comerciante | 46 | Media | Celular | Cada 3 meses |

## Tasa de éxito

**Tareas completadas: 45/45 (100 %). Sin dificultad: 34/45 (75,6 %). Con dificultad: 11/45 (24,4 %). Fracasos: 0.**

| Tarea | Completadas | Con dificultad | Errores | Causa |
|---|---|---|---|---|
| T1 | 5/5 | 2 (P3, P5) | 1 | USA-09, USA-10 |
| T2 | 5/5 | 1 (P3) | 1 | USA-11 |
| T3 | 5/5 | 2 (P3, P5) | 2 | USA-06, USA-02 |
| T4 | 5/5 | 0 | 0 | — |
| T5 | 5/5 | 3 (P2, P3, P5) | 3 | USA-03, USA-04 |
| T6 | 5/5 | 2 (P2, P3) | 2 | USA-01 |
| T7 | 5/5 | 0 | 0 | — |
| T8 | 5/5 | 0 | 0 | — |
| T9 | 5/5 | 0 | 0 | — |

Las observaciones por perfil y tarea ("el autor observó que...") están en `pruebas/usabilidad/resultados.csv`. Ejemplos:

- **P3, T5:** "pulsó 'Pagar' sin notar que el número y el CVV se habían borrado; los mensajes de error debajo de cada campo le indicaron qué reescribir" (USA-03).
- **P5, T1:** "al terminar el registro no estaba seguro de haber iniciado sesión: en el celular el encabezado no muestra su nombre" (USA-10).

## Accesibilidad (axe-core, real)

| Página | Crítica | Grave | Moderada | Menor | Reglas que pasaron |
|---|---|---|---|---|---|
| Catálogo | 0 | 1 | 0 | 0 | 37 |
| Detalle de producto | 0 | 2 | 0 | 0 | 33 |
| Carrito | 0 | 3 | 0 | 0 | 35 |
| Checkout | 0 | 2 | 0 | 0 | 39 |
| Login | 0 | 1 | 0 | 0 | 37 |
| Mis pedidos | 0 | 21 | 0 | 0 | 33 |
| Admin productos | 0 | 11 | 1 | 0 | 41 |
| Chat abierto | 0 | 2 | 2 | 0 | 41 |
| **Total (elementos)** | **0** | **43** | **3** | **0** | |

| ID | Regla | Impacto | Elementos | Ejemplo | Problema relacionado |
|---|---|---|---|---|---|
| A11Y-01 | `color-contrast` | Grave | 43 en las 8 páginas | Texto gris `#94a3b8` (Tailwind `slate-400`) sobre blanco o `#f8fafc`: contraste **2,45–2,56:1**, cuando se exige **4,5:1**. Afecta "Quitar", "Vaciar carrito", "Máximo 10 unidades", las unidades en "Mis pedidos", los ids en el admin y el pie de página | USA-02 |
| A11Y-02 | `landmark-no-duplicate-banner`, `landmark-unique` | Moderado | 3 | El encabezado del chat usa `<header>` y crea un segundo *banner*; en el admin hay dos `<nav>` sin nombre | USA-12 |

axe-core no revisa los **enlaces duplicados**: cada tarjeta del catálogo tiene dos enlaces con el mismo nombre (imagen y título), así que un lector de pantalla lo anuncia dos veces. Se detectó en la automatización de T2 y se incluye en USA-12.

## Evaluación heurística (Nielsen, real)

Escala de severidad de Nielsen: 0 no es problema · 1 cosmético · 2 menor · 3 mayor · 4 catastrófico.

| # | Heurística | Veredicto | Evidencia | Problemas |
|---|---|---|---|---|
| H1 | Visibilidad del estado del sistema | Parcial | Bien: "Procesando..." al pagar, "Escribiendo..." en el chat, contador del carrito, notificaciones. Mal: agregar desde el catálogo casi no da confirmación (`tarea-T3-final-escritorio.png`); en el celular no se ve quién inició sesión (`01-catalogo-movil.png`) | USA-06, USA-10 |
| H2 | Coincidencia con el mundo real | Parcial | Español, precios en COP, términos de compra conocidos. Las imágenes no corresponden al producto: "Audífonos Bluetooth" muestra una cámara (`01-catalogo-movil.png`). "Respuesta automática" no se explica | USA-07, USA-13 |
| H3 | Control y libertad del usuario | Parcial | Bien: Escape cierra los modales, "Ajustar cantidad", "Nueva conversación". Mal: "Vaciar carrito" y "Quitar" no piden confirmación ni permiten deshacer (`04-carrito-escritorio.png`); "Limpiar filtros" solo aparece cuando no hay resultados (`02-busqueda-filtro-escritorio.png`) | USA-05, USA-11 |
| H4 | Consistencia y estándares | Cumple | Botón principal siempre índigo, mismas etiquetas de estado (PAGADA en verde, RECHAZADA en rojo) en cliente y admin, formato de precio único. Detalle menor de marcado: landmarks y enlaces duplicados | USA-12 |
| H5 | Prevención de errores | Parcial | Bien: validación en vivo con el error bajo cada campo, máximo de unidades, confirmación al desactivar (`14-admin-confirmar-desactivar-escritorio.png`), bloqueo de doble clic en "Pagar". Mal: el registro no tiene confirmación de contraseña ni opción para verla (`05-registro-escritorio.png`) | USA-09, USA-05 |
| H6 | Reconocer antes que recordar | Parcial | "Mis pedidos" solo muestra número, fecha y total, y lista todo sin paginar (19 pedidos en `10-mis-pedidos-escritorio.png`); para saber qué se compró hay que abrir cada uno | USA-01 |
| H7 | Flexibilidad y eficiencia de uso | Parcial | Bien: Enter envía en el chat, filtros en la URL (se pueden compartir y recargar), búsqueda sin botón. Mal: tras un rechazo hay que reescribir el número y el CVV (`09-pago-rechazado-movil.png`) | USA-03 |
| H8 | Diseño estético y minimalista | Parcial | Diseño limpio y jerarquía clara. El texto secundario gris no se lee bien (contraste 2,5:1). En el celular el rechazo se muestra dos veces y la notificación tapa el resumen (`09-pago-rechazado-movil.png`) | USA-02, USA-04 |
| H9 | Ayudar a reconocer, diagnosticar y recuperarse de errores | Parcial | Bien: los mensajes dicen qué pasó y qué hacer ("Pago rechazado. Intenta con otra tarjeta", "No hay stock suficiente... Ajustar cantidad", "Tu sesión expiró"). Mal: no hay forma de recuperar una contraseña olvidada (`06-login-escritorio.png`) | USA-08 |
| H10 | Ayuda y documentación | Parcial | El chatbot responde dudas con datos reales (T7) y el checkout explica el pago simulado. No hay ayuda o preguntas frecuentes fuera del chat, y no se explica qué significa "Respuesta automática" | USA-13 |

## Cuestionario SUS (simulado)

| Perfil | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | Puntaje | Bangor | Aceptabilidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 Valentina | 4 | 1 | 5 | 1 | 4 | 2 | 5 | 1 | 4 | 1 | **90,0** | Excelente | Aceptable |
| P2 Andrés | 3 | 2 | 4 | 1 | 4 | 2 | 4 | 2 | 4 | 2 | **75,0** | Bueno | Aceptable |
| P3 Rosa | 3 | 3 | 3 | 4 | 3 | 2 | 3 | 3 | 3 | 4 | **47,5** | Pobre | No aceptable |
| P4 Camilo | 4 | 1 | 5 | 1 | 4 | 1 | 5 | 1 | 5 | 1 | **95,0** | Excelente | Aceptable |
| P5 Jorge | 3 | 2 | 4 | 2 | 3 | 2 | 4 | 2 | 3 | 2 | **67,5** | Aceptable (OK) | Marginal |
| **Promedio** | | | | | | | | | | | **75,0** | **Bueno** | **Aceptable** |

**Cálculo:** puntaje = ((suma de los ítems impares − 5) + (25 − suma de los ítems pares)) × 2,5, es decir, la fórmula estándar ((ítem impar − 1) + (5 − ítem par)) × 2,5 aplicada a cada ítem. Las respuestas son coherentes con lo vivido en las tareas: P3 tuvo 5 tareas con dificultad, P5 3, P2 2, y P1 y P4 ninguna.

**Interpretación (escala de Bangor, Kortum y Miller):** un promedio de **75,0** corresponde al adjetivo **"Bueno"** (entre 71,4 y 85,5), está en el rango **aceptable** (70 o más) y supera en 7 puntos el promedio de referencia de **68**. Pero la dispersión es grande: los perfiles con experiencia alta califican el sistema como "Excelente" (90–95) y el de experiencia baja como "Pobre" (47,5). Los problemas encontrados afectan sobre todo a quien menos experiencia tiene.

## Hallazgos de usabilidad, por prioridad

| Prioridad | ID | Hallazgo | Heurística | Severidad (0–4) | Evidencia | Recomendación |
|---|---|---|---|---|---|---|
| 1 | USA-02 | Texto secundario con contraste insuficiente (2,45–2,56:1) en las 8 páginas | H8 + accesibilidad (A11Y-01) | **3** | 43 elementos según axe-core; dificultó T3 a P3 y P5 | Usar `slate-600` (`#475569`, ~7:1) en lugar de `slate-400` para el texto informativo y los enlaces "Quitar" y "Vaciar carrito" |
| 2 | USA-08 | No hay forma de recuperar una contraseña olvidada | H9 | **3** | `06-login-escritorio.png`: el login no tiene "¿Olvidaste tu contraseña?" | Flujo de recuperación por email con un token de un solo uso |
| 3 | USA-03 | Tras un pago rechazado hay que reescribir el número y el CVV | H7 | 2 | T5: +2 campos y 19 caracteres; dificultad en 3 de 5 perfiles | Mantener el borrado (seguridad), pero avisarlo junto al mensaje de rechazo ("Vuelve a escribir el número y el CVV") y poner el foco en el campo del número |
| 4 | USA-01 | "Mis pedidos" no muestra qué productos tiene cada pedido ni pagina | H6 | 2 | `10-mis-pedidos-escritorio.png` (19 pedidos casi iguales); dificultad en 2 de 5 perfiles | Mostrar el nombre del primer producto y "+N más", y paginar o agrupar por mes |
| 5 | USA-06 | Agregar al carrito desde el catálogo casi no da confirmación | H1 | 2 | `tarea-T3-final-escritorio.png`: solo cambia el texto del botón y el contador; 2 de 5 perfiles agregaron dos veces | Notificación "Agregado al carrito" con enlace "Ver carrito" (la app ya tiene notificaciones) |
| 6 | USA-05 | "Vaciar carrito" y "Quitar" actúan sin confirmación ni opción de deshacer | H3, H5 | 2 | `04-carrito-escritorio.png` | Modal de confirmación para vaciar y "Deshacer" en una notificación al quitar |
| 7 | USA-09 | El registro no tiene confirmación de contraseña ni opción para verla | H5 | 2 | `05-registro-escritorio.png`; dificultad en P3 | Botón para mostrar u ocultar la contraseña |
| 8 | USA-07 | Las imágenes no corresponden al producto (fotos aleatorias de picsum) | H2 | 2 | `01-catalogo-movil.png`: "Audífonos Bluetooth" con una cámara | Fotos reales de cada producto; mientras tanto, un placeholder neutro |
| 9 | USA-10 | En el celular el encabezado no muestra quién inició sesión | H1 | 1 | `01-catalogo-movil.png` y la clase `hidden md:inline` en `Header.tsx`; dificultad en P5 | Mostrar las iniciales o un ícono de cuenta con el nombre al tocarlo |
| 10 | USA-11 | "Limpiar filtros" solo aparece cuando no hay resultados | H3 | 1 | `02-busqueda-filtro-escritorio.png`; dificultad en P3 | Mostrar los filtros activos como chips con "×" y un "Limpiar filtros" siempre visible |
| 11 | USA-04 | En el celular, la notificación de rechazo tapa el resumen y repite el mensaje del formulario | H8 | 1 | `09-pago-rechazado-movil.png` | No mostrar la notificación cuando el mensaje ya está en el formulario, o ubicarla arriba |
| 12 | USA-12 | Landmarks duplicados (encabezado del chat, dos `<nav>` en el admin) y dos enlaces con el mismo nombre por tarjeta | H4 + accesibilidad (A11Y-02) | 1 | axe-core (3 elementos) y la automatización de T2 | El chat como `<div>` con título; `aria-label` en cada `<nav>`; la imagen de la tarjeta con `aria-hidden` y `tabindex=-1` |
| 13 | USA-13 | El aviso "Respuesta automática" no explica qué significa | H10 | 1 | Chat con proveedor de reglas | Tooltip: "El asistente no está disponible; esta es una respuesta predefinida" |

## Recomendaciones

1. **Hacer ya, por costo y beneficio:** USA-02 (cambiar una clase de color en pocos componentes) y USA-06 (reusar las notificaciones existentes). Son las que más afectaron a los perfiles con menos experiencia.
2. **Mejora del flujo de pago:** USA-03 y USA-04 atacan la tarea más larga (T5) sin quitar la medida de seguridad de borrar la tarjeta.
3. **Funcionalidad faltante:** USA-08 (recuperar contraseña) es la única severidad 3 que no se arregla con un cambio de interfaz; requiere backend y envío de correos.
4. **Repetir la medición** con los mismos scripts (`medir.mjs`, `accesibilidad.mjs`, `simular.mjs`) después de corregir, para documentar el "después" con la misma semilla.
