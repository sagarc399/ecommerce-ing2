// Medición real: ejecuta cada tarea 3 veces en Chromium (1366×768) y guarda tiempos, conteos y KLM.
// Uso: npm --prefix pruebas/usabilidad run medir   (app en :5173, API en :3000, datos de db:reset)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { calcularKLM, EJECUTAR, Medidor, TAREAS } from "./tareas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, "resultados");
const CAPTURAS = join(AQUI, "..", "..", "docs", "pruebas", "capturas");
const CORRIDAS = 3;
const PAUSA_CHAT_MS = 25000; // cuota de Groq: ~2-3 preguntas con herramientas por minuto

mkdirSync(SALIDA, { recursive: true });
mkdirSync(CAPTURAS, { recursive: true });

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const navegador = await chromium.launch();
const resultados = [];

for (const tarea of TAREAS) {
  const corridas = [];
  for (let c = 1; c <= CORRIDAS; c++) {
    if (tarea.id === "T7" && c > 1) await new Promise((r) => setTimeout(r, PAUSA_CHAT_MS));
    const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 }, locale: "es-CO" });
    const page = await contexto.newPage();
    const m = new Medidor(page);
    const extra = {};
    let exito = false;
    let error = null;
    try {
      exito = await EJECUTAR[tarea.id](page, m, c, extra);
    } catch (e) {
      error = e.message.split("\n")[0];
    }
    const ms = m.inicio ? m.terminar() : null;
    if (c === 1) await page.screenshot({ path: join(CAPTURAS, `tarea-${tarea.id}-final-escritorio.png`) });
    corridas.push({ corrida: c, ms: ms && Math.round(ms), exito, error, ...extra });
    console.log(`${tarea.id} corrida ${c}: ${exito ? "éxito" : "FALLO"} en ${ms ? (ms / 1000).toFixed(2) : "-"} s${extra.chatMs ? ` (chat ${extra.chatMs} ms${extra.automatica ? ", respuesta automática" : ""})` : ""}${error ? ` | ${error}` : ""}`);
    if (c === CORRIDAS) {
      tarea.conteo = m.conteo();
      tarea.klm = calcularKLM(m.acciones);
      tarea.acciones = m.acciones;
    }
    await contexto.close();
  }
  const exitosas = corridas.filter((x) => x.exito);
  resultados.push({
    ...tarea,
    corridas,
    exitoMaquina: `${exitosas.length}/${CORRIDAS}`,
    maquinaMedianaS: exitosas.length ? Math.round(mediana(exitosas.map((x) => x.ms))) / 1000 : null,
    chatMedianaMs: tarea.id === "T7" ? mediana(corridas.filter((x) => x.chatMs).map((x) => x.chatMs)) : undefined,
  });
}

await navegador.close();
writeFileSync(join(SALIDA, "medicion.json"), JSON.stringify(resultados, null, 2));

console.log("\n| Tarea | Éxito máquina | Mediana máquina | Clics | Campos (caracteres) | Teclas | Cambios de página | Decisiones | KLM | Operadores |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const r of resultados) {
  const o = r.klm.operadores;
  console.log(
    `| ${r.id} | ${r.exitoMaquina} | ${r.maquinaMedianaS ?? "-"} s | ${r.conteo.clics} | ${r.conteo.campos} (${r.conteo.caracteres}) | ${r.conteo.teclas} | ${r.conteo.cambiosDePagina} | ${r.conteo.decisiones} | ${r.klm.segundos} s | ${o.K}K ${o.P}P ${o.B}B ${o.H}H ${o.M}M |`
  );
}
