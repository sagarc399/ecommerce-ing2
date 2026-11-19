// Regresión del chatbot v2 tras las correcciones. Uso (desde la raíz, con npm run dev y datos de db:reset):
//   node pruebas/regresion/chatbot.mjs
// Preguntas separadas 25 s por la cuota de Groq. Escribe pruebas/regresion/resultados/chatbot.txt.
// 1) Precio real del monitor (anónimo).  2) Pedido sin sesión (anónimo): no debe mostrar datos.
// 3) Pedido propio (cliente): debe mostrarlo.  4) IDOR: cliente2 pregunta por el pedido de cliente.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// API_URL (con /api) permite correrla contra otro despliegue (por ejemplo, Docker Compose).
const API = process.env.API_URL || "http://localhost:3000/api";
const AQUI = dirname(fileURLToPath(import.meta.url));
const PAUSA_MS = 25000;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return (await r.json()).token;
}

async function preguntar(texto, token) {
  const inicio = performance.now();
  const r = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ mensajes: [{ rol: "usuario", texto }] }),
  });
  const j = await r.json();
  const respuesta = String(j.respuesta ?? j.texto ?? j.mensaje ?? JSON.stringify(j));
  return { status: r.status, ms: Math.round(performance.now() - inicio), respuesta, datos: j };
}

const tokenCliente = await login("cliente@tienda.com", "Cliente123");
const tokenCliente2 = await login("cliente2@tienda.com", "Cliente123");

// Pedido de cliente con un producto fácil de reconocer (Mancuernas 5 kg).
const orden = await fetch(`${API}/ordenes`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenCliente}` },
  body: JSON.stringify({
    items: [{ producto_id: 10, cantidad: 1 }],
    pago: { numero_tarjeta: "4111111111111111", titular: "Cliente Prueba", vencimiento: "12/30", cvv: "123" },
  }),
});
if (orden.status !== 201) throw new Error(`orden: ${orden.status}`);
const ordenId = (await orden.json()).id;

const casos = [
  { nombre: "Precio real del monitor (anónimo)", texto: "¿Cuánto cuesta el monitor?", token: null, ok: (r) => /1\.250\.000/.test(r) },
  { nombre: "Pedido sin sesión (anónimo)", texto: `¿Cuál es el estado de mi pedido #${ordenId}?`, token: null, ok: (r) => /inicia(r)? sesi[oó]n|iniciar sesi[oó]n/i.test(r) && !/Mancuernas/i.test(r) },
  { nombre: "Pedido propio (cliente)", texto: `¿Qué productos tiene mi pedido #${ordenId}?`, token: tokenCliente, ok: (r) => /Mancuernas/i.test(r) },
  { nombre: "IDOR: cliente2 pide el pedido de cliente", texto: `¿Qué productos tiene mi pedido #${ordenId}?`, token: tokenCliente2, ok: (r) => !/Mancuernas/i.test(r) && !/149\.900/.test(r) },
];

const lineas = [`Regresión del chatbot v2 — ${new Date().toISOString()} (pedido de cliente: #${ordenId})`, ""];
let fallos = 0;
for (const [i, c] of casos.entries()) {
  if (i > 0) await esperar(PAUSA_MS);
  const r = await preguntar(c.texto, c.token);
  const automatica = r.datos.proveedor === "reglas";
  const ok = r.status === 200 && c.ok(r.respuesta);
  if (!ok) fallos++;
  lineas.push(`${ok ? "OK   " : "FALLA"} ${c.nombre} | ${r.status} | ${r.ms} ms | ${automatica ? "respuesta automática (reglas)" : r.datos.proveedor}`);
  lineas.push(`      P: ${c.texto}`);
  lineas.push(`      R: ${r.respuesta.replace(/\s+/g, " ").slice(0, 300)}`);
  console.log(lineas.slice(-3).join("\n"));
}
lineas.push("", fallos === 0 ? "CHATBOT v2 SIN REGRESIONES" : `CHATBOT v2 CON ${fallos} FALLAS`);
mkdirSync(join(AQUI, "resultados"), { recursive: true });
writeFileSync(join(AQUI, "resultados", process.env.CHATBOT_SALIDA || "chatbot.txt"), `${lineas.join("\n")}\n`);
console.log(lineas.slice(-1)[0]);
process.exit(fallos ? 1 : 0);
