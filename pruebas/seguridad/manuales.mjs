// Pruebas manuales de seguridad contra la API local (las que ZAP no cubre bien).
// Uso: node pruebas/seguridad/manuales.mjs  (requiere backend en :3000 y datos de db:reset o db:poblar)
// La prueba 5 (XSS) deja creado un producto y una orden para revisarlos en el navegador.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SALIDA = join(dirname(fileURLToPath(import.meta.url)), "manuales", "pruebas-api.txt");
const API = "http://localhost:3000/api";
const lineas = [];
const log = (...a) => {
  const t = a.join(" ");
  console.log(t);
  lineas.push(t);
};
const sql = (q) => execFileSync("docker", ["exec", "ecommerce_db", "psql", "-U", "postgres", "-d", "ecommerce", "-tAc", q], { encoding: "utf8" }).trim();
const post = (ruta, cuerpo, h = {}) =>
  fetch(`${API}${ruta}`, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });
const token = async (email, password) => (await (await post("/auth/login", { email, password })).json()).token;
const FUGA = /node_modules|\.ts:\d|C:\\|at async|postgres|pg_|syntax error|stack|relation "/i;

// 1. Fuerza bruta
log("=== 1. Fuerza bruta: 50 logins fallidos contra cliente@tienda.com ===");
const codigos = {};
const inicio = Date.now();
let peor = 0;
for (let i = 1; i <= 50; i++) {
  const t = Date.now();
  const r = await post("/auth/login", { email: "cliente@tienda.com", password: `Incorrecta${i}` });
  await r.text();
  codigos[r.status] = (codigos[r.status] ?? 0) + 1;
  peor = Math.max(peor, Date.now() - t);
}
log(`códigos: ${JSON.stringify(codigos)} | total ${Date.now() - inicio} ms | peor ${peor} ms`);
const tras = await post("/auth/login", { email: "cliente@tienda.com", password: "Cliente123" });
log(`login correcto inmediatamente después: HTTP ${tras.status}`);

// 2. Cabeceras
log("\n=== 2. Cabeceras de seguridad de la API ===");
const h = (await fetch(`${API}/productos?limite=1`)).headers;
for (const n of ["content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security", "referrer-policy", "x-powered-by", "access-control-allow-origin"]) {
  log(`${n}: ${h.get(n) ?? "(ausente)"}`);
}

// 3. Errores
log("\n=== 3. JSON malformado y errores: ¿filtran información? ===");
const pruebas3 = [
  ["JSON malformado en login", () => post("/auth/login", "{ esto no es json")],
  ["JSON malformado en ordenes", () => post("/ordenes", '{"items": [', { Authorization: "Bearer x" })],
  ["Cuerpo de 2 MB", () => post("/auth/login", JSON.stringify({ email: "a".repeat(2_000_000) }))],
  ["id fuera de rango INT", () => fetch(`${API}/productos/99999999999999999999`)],
  ["id negativo", () => fetch(`${API}/productos/-1`)],
  ["pagina enorme", () => fetch(`${API}/productos?pagina=2147483647&limite=50`)],
  ["limite 0", () => fetch(`${API}/productos?limite=0`)],
  ["email como objeto", () => post("/auth/login", { email: { $ne: 1 }, password: "x" })],
  ["ruta inexistente", () => fetch(`${API}/no-existe`)],
  ["null como body", () => post("/auth/registro", "null")],
];
for (const [n, f] of pruebas3) {
  const r = await f();
  const b = await r.text();
  log(`${n}: HTTP ${r.status} | filtra: ${FUGA.test(b) ? "SÍ" : "no"} | ${b.slice(0, 110)}`);
}

// 4. Inyección SQL
log("\n=== 4. Inyección SQL en buscar y categoria ===");
const antes = sql("SELECT count(*) FROM productos");
const cargas = ["' OR '1'='1", "'; DROP TABLE productos; --", "' UNION SELECT id,email,password_hash,1,1,1,1,true,now(),now() FROM usuarios --", "%' AND pg_sleep(3) IS NULL --", "\\", "%", "_"];
for (const c of cargas) {
  for (const campo of ["buscar", "categoria"]) {
    const t = Date.now();
    const r = await fetch(`${API}/productos?${campo}=${encodeURIComponent(c)}&limite=50`);
    const j = await r.json();
    log(`${campo}=${JSON.stringify(c)} → HTTP ${r.status}, ${Date.now() - t} ms, total=${j.total}, hash en respuesta: ${JSON.stringify(j).includes("$2b$") ? "SÍ" : "no"}`);
  }
}
log(`productos antes=${antes}, después=${sql("SELECT count(*) FROM productos")}; la tabla existe: ${sql("SELECT to_regclass('public.productos') IS NOT NULL")}`);

// 6. Asignación masiva
log("\n=== 6. Asignación masiva: registro con rol admin ===");
const email6 = `masiva${Date.now()}@test.com`;
const r6 = await post("/auth/registro", { nombre: "Masiva", email: email6, password: "Prueba12345", rol: "admin", id: 1 });
log(`HTTP ${r6.status} | respuesta: ${await r6.text()} | rol en BD: ${sql(`SELECT rol FROM usuarios WHERE email='${email6}'`)}`);

// 7. IDOR y control de acceso
log("\n=== 7. IDOR: cliente2 pide la orden de cliente ===");
const tCliente = await token("cliente@tienda.com", "Cliente123");
const tCliente2 = await token("cliente2@tienda.com", "Cliente123");
const tAdmin = await token("admin@tienda.com", "Admin12345");
const pago = { numero_tarjeta: "4111 1111 1111 1111", titular: "Juan", vencimiento: "12/28", cvv: "123" };
const orden = await (await post("/ordenes", { items: [{ producto_id: 3, cantidad: 1 }], pago }, { Authorization: `Bearer ${tCliente}` })).json();
const pedir = (t) => fetch(`${API}/ordenes/${orden.id}`, { headers: { Authorization: `Bearer ${t}` } });
const [a, b, c] = [await pedir(tCliente), await pedir(tCliente2), await pedir(tAdmin)];
log(`orden #${orden.id} de cliente: dueño HTTP ${a.status} | cliente2 HTTP ${b.status} ${await b.text()} | admin HTTP ${c.status}`);
log(`cliente2 en GET /admin/ordenes: HTTP ${(await fetch(`${API}/admin/ordenes`, { headers: { Authorization: `Bearer ${tCliente2}` } })).status}`);
log(`cliente2 en POST /productos: HTTP ${(await post("/productos", { nombre: "Hack", precio: 1, stock: 1 }, { Authorization: `Bearer ${tCliente2}` })).status}`);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const manipulado = `${b64({ alg: "none", typ: "JWT" })}.${b64({ id: 1, rol: "admin" })}.`;
log(`JWT alg=none con rol admin: HTTP ${(await fetch(`${API}/admin/ordenes`, { headers: { Authorization: `Bearer ${manipulado}` } })).status}`);

// 8. CORS
log("\n=== 8. CORS con Origin: http://evil.com ===");
const casos8 = [
  ["GET desde evil.com", await fetch(`${API}/productos?limite=1`, { headers: { Origin: "http://evil.com" } })],
  ["Preflight desde evil.com", await fetch(`${API}/ordenes`, { method: "OPTIONS", headers: { Origin: "http://evil.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization" } })],
  ["GET desde el origen legítimo", await fetch(`${API}/productos?limite=1`, { headers: { Origin: "http://localhost:5173" } })],
];
for (const [n, r] of casos8) {
  log(`${n}: HTTP ${r.status} | access-control-allow-origin: ${r.headers.get("access-control-allow-origin") ?? "(ausente)"}`);
}

// 9. Token
log("\n=== 9. Token: duración y contenido ===");
const payload = JSON.parse(Buffer.from(tCliente.split(".")[1], "base64url"));
log(`payload: ${JSON.stringify(payload)} | duración: ${(payload.exp - payload.iat) / 3600} h | algoritmo: ${JSON.parse(Buffer.from(tCliente.split(".")[0], "base64url")).alg}`);

// 5. XSS almacenado: preparación (la ejecución se revisa en el navegador)
log("\n=== 5. XSS almacenado: preparación ===");
const auth = { Authorization: `Bearer ${tAdmin}` };
const r5 = await post("/productos", { nombre: "<img src=x onerror=alert(1)>", precio: 1000, stock: 50, imagen_url: "javascript:alert(3)" }, auth);
log(`con imagen_url javascript: → HTTP ${r5.status} ${(await r5.text()).slice(0, 110)}`);
const r5b = await post("/productos", { nombre: "<img src=x onerror=alert(1)>", descripcion: "<script>alert(2)</script>", precio: 1000, stock: 50, categoria: "<b>xss</b>" }, auth);
const producto = await r5b.json();
log(`sin imagen_url → HTTP ${r5b.status} | id ${producto.id} | nombre guardado tal cual: ${producto.nombre}`);
const o5 = await (await post("/ordenes", { items: [{ producto_id: producto.id, cantidad: 1 }], pago: { ...pago, titular: "<script>alert(4)</script>" } }, { Authorization: `Bearer ${tCliente}` })).json();
log(`orden con ese producto: #${o5.id} ${o5.estado}`);

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, `${lineas.join("\n")}\n`);
console.log(`\nXSS_PRODUCTO=${producto.id} XSS_ORDEN=${o5.id}`);
