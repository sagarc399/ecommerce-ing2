// Chequeo previo a la demo: npm run verificar
// Solo usa módulos de Node (sin dependencias externas). Nunca imprime valores de los .env.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TABLAS = ["usuarios", "productos", "ordenes", "orden_items", "pagos"];
const VARIABLES_BACKEND = [
  "PORT", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME",
  "JWT_SECRET", "JWT_EXPIRES_IN", "ADMIN_EMAIL", "ADMIN_PASSWORD", "CORS_ORIGIN",
];
const VARIABLES_FRONTEND = ["VITE_API_URL"];

const problemas = []; // { mensaje, solucion }
const avisos = [];

function ok(mensaje) {
  console.log(`✅ ${mensaje}`);
}
function falla(mensaje, solucion) {
  console.log(`❌ ${mensaje}`);
  problemas.push({ mensaje, solucion });
}
function aviso(mensaje, solucion) {
  console.log(`⚠️  ${mensaje}`);
  avisos.push({ mensaje, solucion });
}

function ejecutar(comando, args) {
  return execFileSync(comando, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15_000 }).trim();
}

// Lee un .env como objeto; los valores nunca se imprimen.
function leerEnv(ruta) {
  const variables = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (m) variables[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return variables;
}

// Vite escucha en "localhost", que en Windows suele resolver a IPv6 (::1): se prueban ambas direcciones.
async function puertoAbierto(puerto) {
  for (const host of ["127.0.0.1", "::1"]) {
    if (await puertoAbiertoEn(puerto, host)) return true;
  }
  return false;
}

function puertoAbiertoEn(puerto, host) {
  return new Promise((resolver) => {
    const socket = connect({ port: puerto, host });
    const terminar = (abierto) => {
      socket.destroy();
      resolver(abierto);
    };
    socket.setTimeout(1500, () => terminar(false));
    socket.once("connect", () => terminar(true));
    socket.once("error", () => terminar(false));
  });
}

async function obtenerTexto(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return await res.text();
  } catch {
    return null;
  }
}

// --- 1. Docker y contenedor ---
function revisarDocker() {
  try {
    ejecutar("docker", ["info", "--format", "{{.ServerVersion}}"]);
    ok("Docker está corriendo");
  } catch {
    falla("Docker no está corriendo", "Abre Docker Desktop y espera a que diga \"Engine running\"");
    return false;
  }

  let estado = "";
  try {
    estado = ejecutar("docker", ["ps", "--filter", "name=^ecommerce_db$", "--format", "{{.Status}}"]);
  } catch {
    estado = "";
  }
  if (estado.startsWith("Up")) {
    ok(`El contenedor ecommerce_db está arriba (${estado})`);
    return true;
  }
  falla("El contenedor ecommerce_db no está corriendo", "En la raíz del proyecto ejecuta: docker compose up -d");
  return false;
}

// --- 2. PostgreSQL y tablas ---
async function revisarBaseDeDatos(contenedorArriba) {
  if (!(await puertoAbierto(5434))) {
    falla("PostgreSQL no responde en el puerto 5434", "Ejecuta docker compose up -d y revisa que nada más use el puerto 5434");
    return;
  }
  if (!contenedorArriba) {
    falla("El puerto 5434 responde, pero no es el contenedor ecommerce_db", "Revisa qué proceso usa el 5434 (netstat -ano | findstr :5434)");
    return;
  }
  try {
    const salida = ejecutar("docker", [
      "exec", "ecommerce_db", "psql", "-U", "postgres", "-d", "ecommerce", "-tAc",
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    ]);
    const existentes = new Set(salida.split(/\r?\n/).map((t) => t.trim()));
    const faltan = TABLAS.filter((t) => !existentes.has(t));
    if (faltan.length === 0) ok(`PostgreSQL responde en el puerto 5434 y existen las ${TABLAS.length} tablas`);
    else falla(`Faltan tablas en la BD: ${faltan.join(", ")}`, "Recrea la BD: docker compose down -v && docker compose up -d && npm run db:reset");
  } catch {
    falla("No se pudo consultar la BD dentro del contenedor", "Espera unos segundos a que PostgreSQL termine de arrancar y vuelve a intentar");
  }
}

// --- 3. Archivos .env ---
function revisarEnv(ruta, nombre, obligatorias) {
  const completa = join(RAIZ, ruta);
  if (!existsSync(completa)) {
    falla(`${nombre} no existe`, `Copia ${ruta}.example a ${ruta} y completa los valores`);
    return null;
  }
  const variables = leerEnv(completa);
  const faltan = obligatorias.filter((v) => !variables[v]);
  if (faltan.length === 0) {
    ok(`${nombre} existe y tiene ${obligatorias.length === 1 ? "la variable obligatoria" : `las ${obligatorias.length} variables obligatorias`}`);
  }
  else falla(`${nombre}: faltan o están vacías ${faltan.join(", ")}`, `Complétalas en ${ruta} (guíate por ${ruta}.example)`);
  return variables;
}

// --- 4. Puertos 3000 y 5173 ---
async function revisarPuerto(puerto, nombre, esDeEsteProyecto) {
  if (!(await puertoAbierto(puerto))) {
    ok(`El puerto ${puerto} (${nombre}) está libre`);
    return;
  }
  if (await esDeEsteProyecto()) {
    ok(`El puerto ${puerto} lo usa el ${nombre} de este proyecto (ya está corriendo)`);
    return;
  }
  falla(
    `El puerto ${puerto} lo ocupa otro programa`,
    `Ciérralo o busca su PID con: netstat -ano | findstr :${puerto} y luego taskkill /PID <pid> /F`
  );
}

// --- 5. Internet y proveedor del chat ---
async function revisarChat(env) {
  const proveedor = env?.CHAT_PROVEEDOR;
  const sinChat = "El chat usará respuestas automáticas";

  if (proveedor === "reglas") {
    ok("Chat configurado con CHAT_PROVEEDOR=reglas (no necesita internet)");
    return;
  }
  if (proveedor !== "groq" && proveedor !== "gemini") {
    aviso(`CHAT_PROVEEDOR no es groq, gemini ni reglas. ${sinChat}`, "Pon CHAT_PROVEEDOR=groq en backend/.env");
    return;
  }

  const prefijo = proveedor.toUpperCase();
  const key = env[`${prefijo}_API_KEY`];
  const modelo = env[`${prefijo}_MODEL`];
  if (!key || !modelo) {
    aviso(`Falta ${prefijo}_API_KEY o ${prefijo}_MODEL en backend/.env. ${sinChat}`, `Completa ${prefijo}_API_KEY y ${prefijo}_MODEL, o usa CHAT_PROVEEDOR=reglas`);
    return;
  }

  try {
    const inicio = Date.now();
    let res;
    if (proveedor === "groq") {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, messages: [{ role: "user", content: "Hola" }], max_tokens: 50, reasoning_effort: "low" }),
        signal: AbortSignal.timeout(8000),
      });
    } else {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Hola" }] }] }),
        signal: AbortSignal.timeout(8000),
      });
    }
    const ms = Date.now() - inicio;
    if (res.ok) ok(`Hay internet y ${proveedor} responde (${modelo}, ${ms} ms)`);
    else aviso(`${proveedor} respondió HTTP ${res.status}. ${sinChat}`, res.status === 401 || res.status === 403 ? `Revisa ${prefijo}_API_KEY` : `Revisa ${prefijo}_MODEL o usa CHAT_PROVEEDOR=reglas`);
  } catch {
    aviso(`Sin internet o ${proveedor} no respondió en 8 s. ${sinChat}`, "Revisa la conexión; si no hay internet en el salón, pon CHAT_PROVEEDOR=reglas");
  }
}

// --- Ejecución ---
console.log("\nVerificación previa a la demo — Tienda USCO\n");

const contenedorArriba = revisarDocker();
await revisarBaseDeDatos(contenedorArriba);
const envBackend = revisarEnv("backend/.env", "backend/.env", VARIABLES_BACKEND);
revisarEnv("frontend/.env", "frontend/.env", VARIABLES_FRONTEND);
await revisarPuerto(3000, "backend", async () => {
  const texto = await obtenerTexto("http://localhost:3000/api/health");
  return texto !== null && texto.includes('"estado"');
});
await revisarPuerto(5173, "frontend", async () => {
  const texto = await obtenerTexto("http://localhost:5173/");
  return texto !== null && texto.includes("<title>Tienda USCO</title>");
});
await revisarChat(envBackend);

console.log("");
if (problemas.length === 0) {
  console.log("🎉 LISTO PARA LA DEMO");
  if (avisos.length > 0) console.log(`   (con ${avisos.length} aviso${avisos.length === 1 ? "" : "s"}: la tienda funciona, revisa lo marcado con ⚠️)`);
} else {
  console.log(`Hay ${problemas.length} problema${problemas.length === 1 ? "" : "s"} que resolver antes de la demo:\n`);
  problemas.forEach((p, i) => console.log(`  ${i + 1}. ${p.mensaje}\n     → ${p.solucion}`));
}
for (const a of avisos) console.log(`\n⚠️  ${a.mensaje}\n   → ${a.solucion}`);
console.log("");

process.exitCode = problemas.length === 0 ? 0 : 1;
