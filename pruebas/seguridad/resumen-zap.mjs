// Resumen de los reportes JSON de ZAP: node pruebas/seguridad/resumen-zap.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "reportes");
const REPORTES = [
  ["Baseline frontend (:4173)", "baseline-frontend.json"],
  ["API con token de cliente", "api-cliente.json"],
  ["API con token de admin", "api-admin.json"],
  ["Baseline frontend (:4173) — DESPUÉS", "baseline-frontend_despues.json"],
  ["API con token de cliente — DESPUÉS", "api-cliente_despues.json"],
  ["API con token de admin — DESPUÉS", "api-admin_despues.json"],
];
const NIVELES = ["High", "Medium", "Low", "Informational"];
const nivel = (a) => a.riskdesc.split(" ")[0];

for (const [nombre, archivo] of REPORTES) {
  const ruta = join(DIR, archivo);
  if (!existsSync(ruta)) {
    if (!archivo.includes("_despues")) console.log(`\n${nombre}: SIN REPORTE`);
    continue;
  }
  const alertas = JSON.parse(readFileSync(ruta, "utf8")).site.flatMap((s) => s.alerts);
  const conteo = NIVELES.map((n) => `${n}: ${alertas.filter((a) => nivel(a) === n).length}`).join(" | ");
  console.log(`\n## ${nombre} → ${conteo}`);
  for (const a of [...alertas].sort((x, y) => NIVELES.indexOf(nivel(x)) - NIVELES.indexOf(nivel(y)))) {
    const urls = [...new Set(a.instances.map((i) => `${i.method} ${i.uri.replace("http://host.docker.internal", "")}`))];
    console.log(`[${nivel(a)}] ${a.name} (plugin ${a.pluginid}, CWE ${a.cweid}, ${a.instances.length} instancias, confianza ${a.confidence})`);
    console.log(`     ejemplo: ${urls.slice(0, 2).join(" ; ")}`);
    const evidencia = a.instances.find((i) => i.evidence)?.evidence;
    if (evidencia) console.log(`     evidencia: ${evidencia.slice(0, 100)}`);
  }
}
