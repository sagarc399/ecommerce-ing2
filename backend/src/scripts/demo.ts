// Datos de demostración (npm run db:demo): deja la tienda como la vería un cliente real, con historial.
// 1) Hace lo mismo que db:reset: vacía las tablas, reinicia los ids y ejecuta el seed (admin, cliente, cliente2
//    y los 12 productos de la demo, con las mismas credenciales de siempre).
// 2) Agrega los 48 productos del catálogo de prueba, 12 clientes con nombres reales y 40 órdenes históricas
//    (85 % PAGADA, 15 % RECHAZADA) con sus ítems y pagos.
// Coherencia: las PAGADA descuentan stock y las RECHAZADA no; los pagos guardan solo los últimos 4 dígitos.
// Las órdenes NO tocan los 12 productos del seed, así que el guion de la demo (monitor con stock 1, lámpara
// agotada) y npm run prueba:concurrencia funcionan igual que con db:reset.
// Es determinista (semilla fija) y se puede repetir: siempre parte de cero. Nunca en producción.
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { pool } from "../config/db";
import { crearAzar, poblarProductos } from "./catalogo-prueba";
import { sembrar } from "./seed";

const TABLAS = ["usuarios", "productos", "ordenes", "orden_items", "pagos"];
const ORDENES = 40;
const PORCENTAJE_RECHAZADAS = 15;
const CLAVE_CLIENTES = "Cliente123"; // la misma de cliente@tienda.com, documentada en el README

const CLIENTES_DEMO: [string, string][] = [
  ["Laura Gómez", "laura.gomez@correo.com"],
  ["Andrés Rojas", "andres.rojas@correo.com"],
  ["Valentina Torres", "valentina.torres@correo.com"],
  ["Camilo Herrera", "camilo.herrera@correo.com"],
  ["Daniela Vargas", "daniela.vargas@correo.com"],
  ["Santiago Ramírez", "santiago.ramirez@correo.com"],
  ["Mariana Castro", "mariana.castro@correo.com"],
  ["Julián Moreno", "julian.moreno@correo.com"],
  ["Paula Jiménez", "paula.jimenez@correo.com"],
  ["Felipe Ortiz", "felipe.ortiz@correo.com"],
  ["Natalia Ruiz", "natalia.ruiz@correo.com"],
  ["Sebastián Díaz", "sebastian.diaz@correo.com"],
];

async function crearClientes(db: PoolClient) {
  const passwordHash = await bcrypt.hash(CLAVE_CLIENTES, 10);
  for (const [nombre, email] of CLIENTES_DEMO) {
    await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'cliente') ON CONFLICT (email) DO NOTHING`,
      [nombre, email, passwordHash]
    );
  }
  console.log(`Clientes de la demo: ${CLIENTES_DEMO.length}`);
}

// Órdenes de los últimos 60 días, repartidas entre cliente@, cliente2@ y los 12 clientes de la demo.
// Solo usan productos del catálogo generado con stock de 30 o más, así que el stock nunca queda negativo.
async function crearOrdenes(db: PoolClient) {
  const usuarios = (
    await db.query("SELECT id FROM usuarios WHERE rol = 'cliente' ORDER BY id")
  ).rows;
  const productos = (
    await db.query("SELECT id, precio FROM productos WHERE activo AND stock >= 30 AND descripcion LIKE '% de la categoría %.' ORDER BY id")
  ).rows;

  const azar = crearAzar(20261112);
  const rechazadas = Math.round((ORDENES * PORCENTAJE_RECHAZADAS) / 100);

  for (let i = 0; i < ORDENES; i++) {
    // Las rechazadas quedan intercaladas (una de cada ~7) en lugar de agrupadas al principio.
    const pagada = i % Math.round(ORDENES / rechazadas) !== 3;
    const usuario = usuarios[i % usuarios.length];
    const cantidadItems = 1 + azar(3);
    const inicio = azar(productos.length);
    const items = Array.from({ length: cantidadItems }, (_, k) => ({
      producto: productos[(inicio + k * 5) % productos.length],
      cantidad: 1 + azar(2),
    }));
    const total = items.reduce((suma, it) => suma + Number(it.producto.precio) * it.cantidad, 0);

    const { rows } = await db.query(
      `INSERT INTO ordenes (usuario_id, total, estado, creado_en)
       VALUES ($1, $2, $3, NOW() - make_interval(days => $4::int, mins => $5::int))
       RETURNING id, creado_en`,
      [usuario.id, total, pagada ? "PAGADA" : "RECHAZADA", 1 + azar(60), azar(1440)]
    );
    const orden = rows[0];

    for (const it of items) {
      await db.query("INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)", [
        orden.id,
        it.producto.id,
        it.cantidad,
        it.producto.precio,
      ]);
      if (pagada) await db.query("UPDATE productos SET stock = stock - $1 WHERE id = $2", [it.cantidad, it.producto.id]);
    }

    // Solo los últimos 4 dígitos, igual que el checkout real (las rechazadas usan una tarjeta terminada en 0000).
    await db.query(`INSERT INTO pagos (orden_id, monto, ultimos4, estado, referencia, creado_en) VALUES ($1, $2, $3, $4, $5, $6)`, [
      orden.id,
      total,
      pagada ? "1111" : "0000",
      pagada ? "APROBADO" : "RECHAZADO",
      `PAY-DEMO${String(i + 1).padStart(6, "0")}`,
      orden.creado_en,
    ]);
  }
  const { rows } = await db.query("SELECT estado, COUNT(*)::int AS n FROM ordenes GROUP BY estado ORDER BY estado");
  console.log(`Órdenes históricas: ${rows.map((r) => `${r.n} ${r.estado}`).join(" y ")}`);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("db:demo no se puede ejecutar con NODE_ENV=production. Operación cancelada.");
    process.exitCode = 1;
    return;
  }

  await pool.query("TRUNCATE pagos, orden_items, ordenes, productos, usuarios RESTART IDENTITY CASCADE");
  console.log("Tablas vaciadas y contadores de id reiniciados");
  await sembrar();

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await poblarProductos(db);
    await crearClientes(db);
    await crearOrdenes(db);
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
  }

  console.log("Registros por tabla:");
  let total = 0;
  for (const tabla of TABLAS) {
    // Los nombres vienen de la lista fija TABLAS, no del usuario.
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tabla}`);
    total += rows[0].total;
    console.log(`  ${tabla.padEnd(12)} ${rows[0].total}`);
  }
  console.log(`  ${"TOTAL".padEnd(12)} ${total}`);

  // Comprobaciones de coherencia.
  const { rows: chequeo } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM productos WHERE stock < 0) AS stock_negativo,
      (SELECT COUNT(*)::int FROM ordenes o JOIN pagos p ON p.orden_id = o.id
        WHERE (o.estado = 'PAGADA') <> (p.estado = 'APROBADO')) AS estado_inconsistente,
      (SELECT COUNT(*)::int FROM ordenes o
        WHERE o.total <> (SELECT SUM(cantidad * precio_unitario) FROM orden_items WHERE orden_id = o.id)) AS total_inconsistente,
      (SELECT COUNT(*)::int FROM ordenes o WHERE NOT EXISTS (SELECT 1 FROM orden_items WHERE orden_id = o.id)) AS ordenes_sin_items,
      (SELECT COUNT(*)::int FROM orden_items oi JOIN productos p ON p.id = oi.producto_id
        WHERE p.descripcion NOT LIKE '% de la categoría %.') AS items_en_productos_del_seed`);
  console.log("Coherencia (todo debe ser 0):", chequeo[0]);
}

main()
  .catch((err) => {
    console.error("Error cargando los datos de la demo:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
