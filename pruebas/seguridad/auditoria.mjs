// Resumen de npm audit por proyecto: node pruebas/seguridad/auditoria.mjs
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const lineas = [];
for (const carpeta of ["backend", "frontend", "."]) {
  // npm audit termina con código 1 si encuentra vulnerabilidades: se usa la salida igual.
  const r = spawnSync("npm audit --json", { cwd: join(RAIZ, carpeta), encoding: "utf8", shell: true, maxBuffer: 50_000_000 });
  const auditoria = JSON.parse(r.stdout);
  lineas.push(`${carpeta === "." ? "raíz" : carpeta}: ${JSON.stringify(auditoria.metadata?.vulnerabilities ?? auditoria)}`);
  for (const [nombre, v] of Object.entries(auditoria.vulnerabilities ?? {})) {
    const origen = v.via.map((x) => (typeof x === "string" ? `vía ${x}` : x.title)).join("; ");
    lineas.push(`   ${nombre} | ${v.severity} | ${v.isDirect ? "directa" : "transitiva"} | ${origen}`);
  }
}
console.log(lineas.join("\n"));
mkdirSync(join(AQUI, "manuales"), { recursive: true });
writeFileSync(join(AQUI, "manuales", "npm-audit.txt"), `${lineas.join("\n")}\n`);
