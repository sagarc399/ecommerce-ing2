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

// [nombre, descripcion, precio (COP), stock, categoria]
const productosSemilla: [string, string, number, number, string][] = [
  ["Audífonos Bluetooth", "Audífonos inalámbricos con cancelación de ruido y 30 horas de batería.", 189900, 25, "Tecnología"],
  ["Teclado mecánico", "Teclado mecánico retroiluminado con switches rojos, distribución en español.", 249900, 15, "Tecnología"],
  ["Mouse inalámbrico", "Mouse ergonómico inalámbrico de 1600 DPI con receptor USB.", 45000, 40, "Tecnología"],
  ["Monitor 24 pulgadas", "Monitor Full HD IPS de 24 pulgadas a 75 Hz. Última unidad disponible.", 1250000, 1, "Tecnología"],
  ["Cafetera de goteo", "Cafetera eléctrica de goteo para 12 tazas con jarra de vidrio.", 159900, 12, "Hogar"],
  ["Juego de sábanas", "Juego de sábanas doble en algodón de 200 hilos.", 129900, 20, "Hogar"],
  ["Lámpara de escritorio LED", "Lámpara LED con brazo flexible y tres niveles de intensidad.", 89900, 0, "Hogar"],
  ["Balón de fútbol", "Balón de fútbol número 5 cosido a máquina.", 79900, 30, "Deportes"],
  ["Mat de yoga", "Mat antideslizante de 6 mm con correa para transportar.", 65000, 18, "Deportes"],
  ["Mancuernas 5 kg", "Par de mancuernas de 5 kg recubiertas en neopreno.", 149900, 10, "Deportes"],
  ["Camiseta deportiva", "Camiseta de secado rápido para entrenamiento, talla M.", 49900, 50, "Ropa"],
  ["Chaqueta impermeable", "Chaqueta rompevientos impermeable con capucha.", 289900, 8, "Ropa"],
];

// "Lámpara de escritorio LED" → "LamparadeescritorioLED"
function semillaImagen(nombre: string): string {
  return nombre.normalize("NFD").replace(/[^A-Za-z0-9]/g, "");
}

async function sembrarProductos() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM productos");
  if (rows[0].total > 0) {
    console.log(`Productos: la tabla ya tiene ${rows[0].total}, no se insertan ejemplos`);
    return;
  }

  const valores: unknown[] = [];
  const filas = productosSemilla.map(([nombre, descripcion, precio, stock, categoria]) => {
    const imagen = `https://picsum.photos/seed/${semillaImagen(nombre)}/600/400`;
    valores.push(nombre, descripcion, precio, stock, imagen, categoria);
    const n = valores.length;
    return `($${n - 5}, $${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
  });

  await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria)
     VALUES ${filas.join(", ")}`,
    valores
  );
  console.log(`Productos: creados ${productosSemilla.length} de ejemplo`);
}

async function main() {
  await sembrarUsuarios();
  await sembrarProductos();
}

async function sembrarUsuarios() {
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
