// Participantes SIMULADOS (declarado en el informe; autorizado por el docente).
// Los tiempos base (KLM) y los problemas (USA-xx, A11Y-xx) son reales: salen de resultados/medicion.json,
// de la inspección heurística y de axe-core. Aquí solo se aplican factores por perfil y una variación con semilla fija.
// Uso: node pruebas/usabilidad/simular.mjs → tiempos.csv, resultados.csv, sus.csv y resultados/simulacion.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMILLA = 20261112;
const VARIACION = 0.15;

// Factor por experiencia digital: el KLM modela a un experto sin errores (1,0); los usuarios con menos
// experiencia apuntan, leen y deciden más despacio. Celular: escritura táctil más lenta (×1,2).
const FACTOR_EXPERIENCIA = { alta: 1.0, media: 1.6, baja: 2.4 };
const FACTOR_DISPOSITIVO = { escritorio: 1.0, celular: 1.2 };

export const PERFILES = [
  { id: "P1", nombre: "Valentina", edad: 22, experiencia: "alta", dispositivo: "celular", compras: "semanal", ocupacion: "estudiante universitaria" },
  { id: "P2", nombre: "Andrés", edad: 35, experiencia: "media", dispositivo: "escritorio", compras: "mensual", ocupacion: "contador" },
  { id: "P3", nombre: "Rosa", edad: 58, experiencia: "baja", dispositivo: "escritorio", compras: "casi nunca", ocupacion: "docente jubilada" },
  { id: "P4", nombre: "Camilo", edad: 19, experiencia: "alta", dispositivo: "escritorio", compras: "semanal", ocupacion: "estudiante de sistemas" },
  { id: "P5", nombre: "Jorge", edad: 46, experiencia: "media", dispositivo: "celular", compras: "cada 3 meses", ocupacion: "comerciante" },
];

// Dificultades: SOLO problemas reales encontrados en la inspección (USA-xx) o en axe-core (A11Y-xx).
// Ninguno es lo bastante grave para impedir completar una tarea, así que no hay fracasos.
const REGLAS = [
  { tarea: "T1", aplica: (p) => p.experiencia === "baja", ids: ["USA-09"], errores: 1,
    observacion: "dudó si había escrito bien la contraseña porque no hay opción para verla ni campo de confirmación; la primera vez escribió una de 6 caracteres y el aviso en rojo la guió" },
  { tarea: "T1", aplica: (p) => p.dispositivo === "celular" && p.experiencia !== "alta", ids: ["USA-10"], errores: 0,
    observacion: "al terminar el registro no estaba seguro de haber iniciado sesión: en el celular el encabezado no muestra su nombre" },
  { tarea: "T2", aplica: (p) => p.experiencia === "baja", ids: ["USA-11"], errores: 1,
    observacion: "después de filtrar quiso volver a ver todo el catálogo y no encontró cómo quitar los filtros; borró la búsqueda a mano y volvió a elegir 'Todas las categorías'" },
  { tarea: "T3", aplica: (p) => p.experiencia !== "alta" && (p.experiencia === "baja" || p.dispositivo === "celular"), ids: ["USA-06", "USA-02"], errores: 1,
    observacion: "al agregar desde el catálogo no vio una confirmación clara (solo cambia el texto del botón y el contador), pulsó otra vez y quedó con 2 unidades; además le costó leer 'Quitar' en gris claro" },
  { tarea: "T5", aplica: (p) => p.experiencia !== "alta", ids: ["USA-03"], errores: 1,
    observacion: "tras el rechazo pulsó 'Pagar' sin notar que el número y el CVV se habían borrado; los mensajes de error debajo de cada campo le indicaron qué reescribir" },
  { tarea: "T5", aplica: (p) => p.dispositivo === "celular", ids: ["USA-04"], errores: 0, soloObservacion: (p) => p.experiencia === "alta",
    observacion: "notó que la notificación roja tapó el resumen del pedido mientras corregía la tarjeta" },
  { tarea: "T6", aplica: (p) => p.experiencia !== "alta" && p.dispositivo === "escritorio", ids: ["USA-01"], errores: 1,
    observacion: "la lista solo muestra número, fecha y total; abrió varios pedidos hasta encontrar el que buscaba" },
];

// Respuestas SUS (1 a 5), coherentes con la experiencia de cada perfil en las tareas.
// Ítems impares: positivos (1 uso frecuente, 3 fácil, 5 integrado, 7 se aprende rápido, 9 confianza).
// Ítems pares: negativos (2 complejo, 4 necesita soporte, 6 inconsistente, 8 engorroso, 10 hay que aprender mucho).
const SUS = {
  P1: { respuestas: [4, 1, 5, 1, 4, 2, 5, 1, 4, 1], razon: "completó todo sin dificultad; la notificación que tapó el resumen en el celular le pareció una inconsistencia menor" },
  P2: { respuestas: [3, 2, 4, 1, 4, 2, 4, 2, 4, 2], razon: "dos tareas con dificultad (reescribir la tarjeta tras el rechazo y buscar el pedido); compra poco, por eso no la usaría con frecuencia" },
  P3: { respuestas: [3, 3, 3, 4, 3, 2, 3, 3, 3, 4], razon: "cinco tareas con dificultad; terminó todas, pero siente que necesitaría ayuda y que hay que aprender varias cosas" },
  P4: { respuestas: [4, 1, 5, 1, 4, 1, 5, 1, 5, 1], razon: "completó todo sin dificultad y de forma rápida" },
  P5: { respuestas: [3, 2, 4, 2, 3, 2, 4, 2, 3, 2], razon: "tres tareas con dificultad en el celular (confirmaciones poco visibles y tener que reescribir la tarjeta)" },
};

function puntajeSUS(r) {
  const suma = r.reduce((s, v, i) => s + (i % 2 === 0 ? v - 1 : 5 - v), 0);
  return suma * 2.5;
}

// Escala de Bangor, Kortum y Miller (2009).
function bangor(puntaje) {
  const adjetivo = puntaje >= 85.5 ? "Excelente" : puntaje >= 71.4 ? "Bueno" : puntaje >= 50.9 ? "Aceptable (OK)" : puntaje >= 35.7 ? "Pobre" : "Muy pobre";
  const aceptabilidad = puntaje >= 70 ? "Aceptable" : puntaje >= 50 ? "Marginal" : "No aceptable";
  return { adjetivo, aceptabilidad };
}

// Generador con semilla (mulberry32): mismos números en cada ejecución.
function crearAzar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const medicion = JSON.parse(readFileSync(join(AQUI, "resultados", "medicion.json"), "utf8"));
const azar = crearAzar(SEMILLA);
const r2 = (x) => Math.round(x * 100) / 100;

const resultados = [];
const filasTiempos = ["tarea,nombre,maquina_s,klm_s,P1_s,P2_s,P3_s,P4_s,P5_s,promedio_perfiles_s"];
const filasResultados = ["perfil,tarea,resultado,errores,problemas,observacion"];

for (const t of medicion) {
  const tiempos = [];
  for (const p of PERFILES) {
    const variacion = 1 + (azar() * 2 - 1) * VARIACION;
    const segundos = r2(t.klm.segundos * FACTOR_EXPERIENCIA[p.experiencia] * FACTOR_DISPOSITIVO[p.dispositivo] * variacion);
    tiempos.push(segundos);

    const aplicables = REGLAS.filter((r) => r.tarea === t.id && r.aplica(p));
    const dificultades = aplicables.filter((r) => !(r.soloObservacion && r.soloObservacion(p)));
    const resultado = dificultades.length ? "éxito con dificultad" : "éxito";
    const ids = [...new Set(aplicables.flatMap((r) => r.ids))];
    const errores = dificultades.reduce((s, r) => s + r.errores, 0);
    const observacion = aplicables.length
      ? `El autor observó que ${p.nombre} ${aplicables.map((r) => r.observacion).join("; además, ")}.`
      : `El autor observó que ${p.nombre} completó la tarea sin dudas.`;
    resultados.push({ perfil: p.id, tarea: t.id, segundos, resultado, errores, problemas: ids, observacion });
    filasResultados.push([p.id, t.id, resultado, errores, ids.join(" "), `"${observacion.replace(/"/g, '""')}"`].join(","));
  }
  const promedio = r2(tiempos.reduce((s, x) => s + x, 0) / tiempos.length);
  filasTiempos.push([t.id, `"${t.nombre}"`, t.maquinaMedianaS, t.klm.segundos, ...tiempos, promedio].join(","));
}

const filasSus = ["perfil,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,puntaje,adjetivo,aceptabilidad"];
const sus = PERFILES.map((p) => {
  const { respuestas, razon } = SUS[p.id];
  const puntaje = puntajeSUS(respuestas);
  const b = bangor(puntaje);
  filasSus.push([p.id, ...respuestas, puntaje, b.adjetivo, b.aceptabilidad].join(","));
  return { perfil: p.id, respuestas, puntaje, ...b, razon };
});
const promedioSus = sus.reduce((s, x) => s + x.puntaje, 0) / sus.length;

writeFileSync(join(AQUI, "tiempos.csv"), `${filasTiempos.join("\n")}\n`);
writeFileSync(join(AQUI, "resultados.csv"), `${filasResultados.join("\n")}\n`);
writeFileSync(join(AQUI, "sus.csv"), `${filasSus.join("\n")}\n`);
writeFileSync(
  join(AQUI, "resultados", "simulacion.json"),
  JSON.stringify({ semilla: SEMILLA, variacion: VARIACION, factores: { FACTOR_EXPERIENCIA, FACTOR_DISPOSITIVO }, perfiles: PERFILES, resultados, sus, promedioSus, interpretacion: bangor(promedioSus) }, null, 2)
);

console.log(readFileSync(join(AQUI, "tiempos.csv"), "utf8"));
for (const t of medicion) {
  const filas = resultados.filter((r) => r.tarea === t.id);
  console.log(`${t.id}: éxito ${filas.filter((r) => r.resultado !== "fracaso").length}/5 (con dificultad ${filas.filter((r) => r.resultado === "éxito con dificultad").length}) errores ${filas.reduce((s, r) => s + r.errores, 0)}`);
}
for (const s of sus) console.log(`${s.perfil}: SUS ${s.puntaje} (${s.adjetivo}, ${s.aceptabilidad})`);
console.log(`Promedio SUS: ${promedioSus} → ${JSON.stringify(bangor(promedioSus))}`);
