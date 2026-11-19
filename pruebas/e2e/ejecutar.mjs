// Suite E2E de aceptación de Tienda USCO. Reúne tres pruebas existentes y resume el resultado:
//   1. pruebas/regresion/flujo.mjs   → registro, carrito, compra aprobada, rechazo y reintento, mis pedidos, admin crea producto
//   2. pruebas/regresion/chatbot.mjs → precio real, consulta sin sesión, pedido propio e IDOR
//   3. prueba de concurrencia        → dos compras simultáneas de la última unidad (201 + 409, stock 0)
//
// Uso (desde la raíz):
//   npm run test:e2e            → contra desarrollo (APP_URL http://localhost:5173, API_URL http://localhost:3000/api)
//   npm run test:e2e:compose    → contra Docker Compose (APP_URL http://localhost:8080, API_URL http://localhost:3000/api)
// APP_URL y API_URL se pueden cambiar con variables de entorno. Requiere los datos de demo (npm run db:demo
// o npm run deploy:demo). La prueba de concurrencia deja el monitor en stock 0: al terminar, recarga la demo.
// Escribe pruebas/e2e/resultados/e2e-<entorno>.txt y .json.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const COMPOSE = process.argv.includes("--compose");
const ENTORNO = COMPOSE ? "compose" : "desarrollo";
const APP_URL = process.env.APP_URL || (COMPOSE ? "http://localhost:8080" : "http://localhost:5173");
const API_URL = process.env.API_URL || "http://localhost:3000/api";
const RESULTADOS = join(AQUI, "resultados");
mkdirSync(RESULTADOS, { recursive: true });

function correr(nombre, comando, args, entorno = {}) {
  console.log(`\n>>> ${nombre}: ${[comando, ...args].join(" ")}`);
  const inicio = Date.now();
  const r = spawnSync(comando, args, {
    cwd: RAIZ,
    env: { ...process.env, APP_URL, API_URL, ...entorno },
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 10 * 60 * 1000,
  });
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  console.log(salida.trim());
  return { codigo: r.status, salida, segundos: Math.round((Date.now() - inicio) / 1000) };
}

// Verifica que el despliegue responda antes de empezar.
async function disponible(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(5000) })).ok;
  } catch {
    return false;
  }
}
if (!(await disponible(`${API_URL}/health`)) || !(await disponible(APP_URL))) {
  console.error(`La app no responde en ${APP_URL} o la API en ${API_URL}. Levántala antes (npm run dev o npm run deploy).`);
  process.exit(2);
}

const flujo = correr("Flujo en el navegador", "node", ["pruebas/regresion/flujo.mjs"], { FLUJO_SALIDA: `flujo-e2e-${ENTORNO}.txt` });
const chatbot = correr("Chatbot v2", "node", ["pruebas/regresion/chatbot.mjs"], { CHATBOT_SALIDA: `chatbot-e2e-${ENTORNO}.txt` });
const concurrencia = COMPOSE
  ? correr("Concurrencia", "docker", ["compose", "--env-file", ".env.compose", "exec", "-T", "api", "node", "dist/scripts/prueba-concurrencia.js"])
  : correr("Concurrencia", "npm", ["run", "prueba:concurrencia"]);

// Criterios de aceptación: cada uno se busca en la salida de su prueba.
const lineaOk = (salida, texto) => salida.split("\n").some((l) => l.startsWith("OK") && l.includes(texto));
const lineaChat = (texto) => chatbot.salida.split("\n").find((l) => l.includes(texto)) ?? "";
const criterios = [
  ["HU-01", "Como visitante quiero registrarme para poder comprar", "flujo.mjs, paso 1", lineaOk(flujo.salida, "1. Registro")],
  ["HU-02", "Como cliente quiero agregar productos al carrito desde el catálogo", "flujo.mjs, paso 2", lineaOk(flujo.salida, "2. Agregar al carrito")],
  ["HU-03", "Como cliente quiero pagar con tarjeta y recibir la confirmación del pedido", "flujo.mjs, paso 3", lineaOk(flujo.salida, "3. Compra aprobada")],
  ["HU-04", "Como cliente quiero que un pago rechazado me deje reintentar sin reescribir la tarjeta (CVV de nuevo)", "flujo.mjs, paso 4", lineaOk(flujo.salida, "4. Rechazo")],
  ["HU-05", "Como cliente quiero ver mis pedidos y su detalle", "flujo.mjs, paso 5", lineaOk(flujo.salida, "5. Mis pedidos")],
  ["HU-06", "Como cliente quiero cerrar sesión", "flujo.mjs, paso 6", lineaOk(flujo.salida, "6. Salir")],
  ["HU-07", "Como administrador quiero crear un producto y que aparezca en el catálogo", "flujo.mjs, paso 7", lineaOk(flujo.salida, "7. Admin crea")],
  ["HU-08", "La interfaz no debe tener errores de JavaScript ni violaciones de la CSP", "flujo.mjs, pasos 8 y 9", lineaOk(flujo.salida, "8. Sin errores") && lineaOk(flujo.salida, "9. Sin violaciones")],
  ["HU-09", "Como visitante quiero preguntarle al chatbot el precio real de un producto", "chatbot.mjs, prueba 1", lineaChat("Precio real").startsWith("OK")],
  ["HU-10", "El chatbot no debe mostrar pedidos a quien no inició sesión", "chatbot.mjs, prueba 2", lineaChat("Pedido sin sesión").startsWith("OK")],
  ["HU-11", "Como cliente quiero consultar mi pedido en el chatbot", "chatbot.mjs, prueba 3", lineaChat("Pedido propio").startsWith("OK")],
  ["HU-12", "El chatbot no debe revelar pedidos de otro cliente (IDOR)", "chatbot.mjs, prueba 4", lineaChat("IDOR").startsWith("OK")],
  ["HU-13", "Dos compras simultáneas de la última unidad no deben sobrevender (201 + 409, stock 0)", "prueba de concurrencia", concurrencia.codigo === 0 && /PRUEBA SUPERADA/.test(concurrencia.salida)],
];
const proveedores = [...chatbot.salida.matchAll(/\| \d+ ms \| (\S+)/g)].map((m) => m[1]);

const ahora = new Date().toISOString();
const aprobados = criterios.filter((c) => c[3]).length;
const lineas = [
  `Suite E2E de aceptación — ${ahora}`,
  `Entorno: ${ENTORNO} | APP_URL ${APP_URL} | API_URL ${API_URL}`,
  "",
  ...criterios.map(([id, historia, prueba, ok]) => `${ok ? "OK   " : "FALLA"} ${id} ${historia} [${prueba}]`),
  "",
  `Proveedor del chatbot en las 4 preguntas: ${proveedores.join(", ") || "(sin dato)"}`,
  `Duración: flujo ${flujo.segundos} s, chatbot ${chatbot.segundos} s, concurrencia ${concurrencia.segundos} s`,
  "",
  aprobados === criterios.length ? `ACEPTACIÓN: ${aprobados} de ${criterios.length} criterios cumplidos` : `ACEPTACIÓN INCOMPLETA: ${aprobados} de ${criterios.length}`,
];
writeFileSync(join(RESULTADOS, `e2e-${ENTORNO}.txt`), `${lineas.join("\n")}\n`);
writeFileSync(
  join(RESULTADOS, `e2e-${ENTORNO}.json`),
  JSON.stringify({ fecha: ahora, entorno: ENTORNO, APP_URL, API_URL, aprobados, total: criterios.length, proveedores,
    criterios: criterios.map(([id, historia, prueba, ok]) => ({ id, historia, prueba, ok })),
    salidas: { concurrencia: concurrencia.salida.split("\n").filter((l) => /PRUEBA|201|409|stock/i.test(l)).slice(0, 10) } }, null, 2) + "\n"
);
console.log(`\n${lineas.join("\n")}`);
process.exit(aprobados === criterios.length ? 0 : 1);
