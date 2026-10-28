import bcrypt from "bcryptjs";
import { requerirVariable } from "../config/env";
import { pool } from "../config/db";

const RONDAS_BCRYPT = 10;

const usuariosSemilla = [
  {
    nombre: "Administrador",
    email: requerirVariable("ADMIN_EMAIL").trim().toLowerCase(),
    password: requerirVariable("ADMIN_PASSWORD"),
    rol: "admin",
  },
  {
    nombre: "Cliente de prueba",
    email: "cliente@tienda.com",
    password: "Cliente123",
    rol: "cliente",
  },
];

async function main() {
  for (const u of usuariosSemilla) {
    const passwordHash = await bcrypt.hash(u.password, RONDAS_BCRYPT);
    const { rowCount } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, passwordHash, u.rol]
    );
    console.log(rowCount ? `Creado: ${u.email} (${u.rol})` : `Ya existía: ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error("Error ejecutando el seed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
