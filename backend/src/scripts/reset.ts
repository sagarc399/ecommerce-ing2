// Reinicia los datos: vacía todas las tablas, reinicia los ids y vuelve a ejecutar el seed.
// Uso: npm run db:reset (nunca en producción).
import { pool } from "../config/db";
import { sembrar } from "./seed";

const TABLAS = ["usuarios", "productos", "ordenes", "orden_items", "pagos"];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("db:reset no se puede ejecutar con NODE_ENV=production. Operación cancelada.");
    process.exitCode = 1;
    return;
  }

  await pool.query("TRUNCATE pagos, orden_items, ordenes, productos, usuarios RESTART IDENTITY CASCADE");
  console.log("Tablas vaciadas y contadores de id reiniciados");

  await sembrar();

  console.log("Registros por tabla:");
  for (const tabla of TABLAS) {
    // Los nombres vienen de la lista fija TABLAS, no del usuario.
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tabla}`);
    console.log(`  ${tabla.padEnd(12)} ${rows[0].total}`);
  }
}

main()
  .catch((err) => {
    console.error("Error reiniciando la base de datos:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
