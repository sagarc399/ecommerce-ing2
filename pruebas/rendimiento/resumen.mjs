// Imprime la tabla de resultados a partir de los JSON de k6: node pruebas/rendimiento/resumen.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "resultados");
const FILAS = [
  ["A catálogo", "a_catalogo", "catalogo"],
  ["B login", "b_login", "login"],
  ["C1 distribuido", "c1_checkout_distribuido", "checkout"],
  ["C1 repetición", "c1_checkout_distribuido_repeticion", "checkout"],
  ["C2 contención", "c2_checkout_contencion", "checkout"],
  ["C1 distribuido 8 VUs", "c1_checkout_distribuido_8vus", "checkout"],
  ["C2 contención 8 VUs", "c2_checkout_contencion_8vus", "checkout"],
];
const ms = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(1)} ms`);
console.log("| Escenario | VUs máx | Peticiones | req/s | p50 | p90 | p95 | Máx | Errores | Thresholds |\n|---|---|---|---|---|---|---|---|---|---|");
for (const [nombre, archivo, tag] of FILAS) {
  const ruta = join(DIR, `${archivo}.json`);
  if (!existsSync(ruta)) continue;
  const m = JSON.parse(readFileSync(ruta, "utf8")).metrics;
  const d = m[`http_req_duration{name:${tag}}`], r = m[`http_reqs{name:${tag}}`], e = m[`http_req_failed{name:${tag}}`];
  const fallo = [...Object.values(d.thresholds ?? {}), ...Object.values(e.thresholds ?? {})].some(Boolean);
  console.log(`| ${nombre} | ${m.vus_max.max} | ${r.count} | ${r.rate.toFixed(2)} | ${ms(d.med)} | ${ms(d["p(90)"])} | ${ms(d["p(95)"])} | ${ms(d.max)} | ${(e.value * 100).toFixed(2)} % | ${fallo ? "❌" : "✅"} |`);
}
