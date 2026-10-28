// Prueba de sobreventa: dos clientes compran al mismo tiempo la última unidad del monitor.
// Requiere el servidor corriendo (npm run dev).
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { pool } from "../config/db";

const API = `http://localhost:${env.PORT}/api`;
const PRODUCTO = "Monitor 24 pulgadas";
const CLIENTES = [
  { nombre: "Cliente de prueba", email: "cliente@tienda.com", password: "Cliente123" },
  { nombre: "Cliente de prueba 2", email: "cliente2@tienda.com", password: "Cliente123" },
];
const TARJETA = { numero_tarjeta: "4111 1111 1111 1111", titular: "Prueba Concurrencia", vencimiento: "12/30", cvv: "123" };

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`Login de ${email} falló con ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

async function comprar(token: string, productoId: number) {
  const res = await fetch(`${API}/ordenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: [{ producto_id: productoId, cantidad: 1 }], pago: TARJETA }),
  });
  return { status: res.status, cuerpo: (await res.json()) as Record<string, unknown> };
}

async function main() {
  const { rows } = await pool.query(
    "UPDATE productos SET stock = 1, actualizado_en = NOW() WHERE nombre = $1 RETURNING id",
    [PRODUCTO]
  );
  if (rows.length === 0) throw new Error(`No existe el producto "${PRODUCTO}". Ejecuta npm run seed.`);
  const productoId: number = rows[0].id;
  console.log(`1. Stock de "${PRODUCTO}" (id ${productoId}) puesto en 1`);

  for (const c of CLIENTES) {
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, 'cliente')
       ON CONFLICT (email) DO NOTHING`,
      [c.nombre, c.email, await bcrypt.hash(c.password, 10)]
    );
  }
  const tokens = await Promise.all(CLIENTES.map((c) => login(c.email, c.password)));
  console.log(`2. Login correcto de ${CLIENTES.map((c) => c.email).join(" y ")}`);

  console.log("3. Lanzando las dos compras al mismo tiempo...");
  const resultados = await Promise.all(tokens.map((t) => comprar(t, productoId)));
  resultados.forEach((r, i) => {
    const detalle = r.status === 201 ? `orden ${r.cuerpo.id} PAGADA` : String(r.cuerpo.mensaje);
    console.log(`   ${CLIENTES[i].email}: HTTP ${r.status} → ${detalle}`);
  });

  const final = await pool.query("SELECT stock FROM productos WHERE id = $1", [productoId]);
  const stockFinal: number = final.rows[0].stock;
  console.log(`4. Stock final en la BD: ${stockFinal}`);

  const codigos = resultados.map((r) => r.status).sort();
  const superada = codigos[0] === 201 && codigos[1] === 409 && stockFinal === 0;
  console.log(superada ? "PRUEBA SUPERADA" : "PRUEBA FALLIDA");
  if (!superada) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Error en la prueba de concurrencia:", err instanceof Error ? err.message : err);
    console.log("PRUEBA FALLIDA");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
