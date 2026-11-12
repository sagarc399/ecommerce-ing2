// Deja a cliente@tienda.com con N pedidos (por defecto 20), el mismo estado que tenía la BD cuando se midió
// la accesibilidad del ANTES (db:reset + las corridas de medir.mjs). Así axe ve los mismos elementos en
// "Mis pedidos" sin volver a correr medir.mjs (que sobrescribiría la medición KLM del antes).
// Uso (después de npm run db:reset): node pruebas/usabilidad/preparar-pedidos.mjs [N]
const API = "http://localhost:3000/api";
const N = Number(process.argv[2] ?? 20);

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "cliente@tienda.com", password: "Cliente123" }),
});
if (!login.ok) throw new Error(`login ${login.status}`);
const { token } = await login.json();

const resp = await fetch(`${API}/ordenes/mias?limite=100`, { headers: { Authorization: `Bearer ${token}` } });
if (!resp.ok) throw new Error(`mis órdenes ${resp.status}`);
const actuales = await resp.json();
const ya = Array.isArray(actuales) ? actuales.length : (actuales.total ?? actuales.datos?.length);
if (typeof ya !== "number") throw new Error("no se pudo contar los pedidos actuales");
console.log(`Pedidos actuales: ${ya}`);

for (let i = ya; i < N; i++) {
  const r = await fetch(`${API}/ordenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ producto_id: 3, cantidad: 1 }],
      pago: { numero_tarjeta: "4111111111111111", titular: "Cliente Prueba", vencimiento: "12/30", cvv: "123" },
    }),
  });
  if (r.status !== 201) throw new Error(`orden ${i + 1}: ${r.status} ${await r.text()}`);
}
console.log(`Pedidos de cliente@tienda.com: ${Math.max(ya, N)}`);
