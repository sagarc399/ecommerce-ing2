// SEG-09: exposición de la BD. Uso (desde la raíz): node pruebas/seguridad/exposicion-bd.mjs [antes|despues]
// Prueba, desde el propio equipo, la conexión a PostgreSQL por loopback y por la IP de la red local
// (que es como entraría otro equipo de la misma red), con la contraseña por defecto "postgres"
// y con la del backend/.env (que nunca se imprime). Escribe manuales/exposicion-bd-<etapa>.txt.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { Client } = createRequire(join(RAIZ, "backend", "package.json"))("pg");
const etapa = process.argv[2] ?? "despues";
const envBackend = Object.fromEntries(
  readFileSync(join(RAIZ, "backend", ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const PUERTO = Number(envBackend.DB_PORT);

const ipsLan = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

async function probar(host, clave) {
  const c = new Client({ host, port: PUERTO, user: "postgres", password: clave, database: "ecommerce", connectionTimeoutMillis: 4000 });
  try {
    await c.connect();
    await c.query("select 1");
    return "CONECTA";
  } catch (e) {
    if (e.code === "28P01") return "RECHAZADA (contraseña incorrecta)";
    if (e.code === "ECONNREFUSED") return "SIN ACCESO (puerto cerrado)";
    return `SIN ACCESO (${e.code ?? e.message})`;
  } finally {
    await c.end().catch(() => {});
  }
}

const lineas = [`SEG-09 exposición de la BD (${etapa}) — ${new Date().toISOString()}`, ""];
const escucha = execSync("netstat -ano", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter((l) => l.includes(`:${PUERTO} `) && l.includes("LISTEN"))
  .map((l) => l.trim().split(/\s+/)[1]);
lineas.push(`Puerto ${PUERTO} escuchando en: ${escucha.join(", ") || "(ninguno)"}`);
lineas.push(`docker port ecommerce_db: ${execSync("docker port ecommerce_db", { encoding: "utf8" }).trim().replace(/\r?\n/g, " ; ")}`, "");
lineas.push("| Origen | Contraseña \"postgres\" | Contraseña del .env |", "|---|---|---|");
for (const host of ["127.0.0.1", ...ipsLan]) {
  const nombre = host === "127.0.0.1" ? "127.0.0.1 (loopback)" : `${host} (IP de red local)`;
  lineas.push(`| ${nombre} | ${await probar(host, "postgres")} | ${await probar(host, envBackend.DB_PASSWORD)} |`);
}
const salida = lineas.join("\n") + "\n";
writeFileSync(join(RAIZ, "pruebas", "seguridad", "manuales", `exposicion-bd-${etapa}.txt`), salida);
console.log(salida);
