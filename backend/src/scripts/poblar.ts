// Datos para las pruebas no funcionales (npm run db:poblar). No reemplaza a db:reset, que deja los datos de la demo.
// Agrega al seed: 48 productos, 3 productos de carga (stock 100000), 25 clientes y 80 órdenes históricas.
// Es idempotente: cada bloque se omite si ya existe. Todo ocurre en una sola transacción.
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { pool } from "../config/db";
import { sembrar } from "./seed";

const CLIENTES = 25;
const ORDENES = 80;
const PORCENTAJE_RECHAZADAS = 15;
const STOCK_CARGA = 100000;

const IMAGENES = [
  "audifonos-bluetooth", "teclado-mecanico", "mouse-inalambrico", "monitor-24", "cafetera-goteo", "juego-sabanas",
  "lampara-escritorio-led", "balon-futbol", "mat-yoga", "mancuernas-5kg", "camiseta-deportiva", "chaqueta-impermeable",
].map((nombre) => `/productos/${nombre}.jpg`);

// [nombre, precio en COP] por categoría: 12 × 4 = 48 productos.
const CATALOGO: Record<string, [string, number][]> = {
  "Tecnología": [
    ["Cargador USB-C 65W", 89900], ["Webcam Full HD", 149900], ["Disco SSD 1 TB", 329900], ["Memoria USB 64 GB", 35900],
    ["Parlante portátil resistente al agua", 199900], ["Hub USB de 7 puertos", 79900], ["Soporte para portátil", 69900],
    ["Router Wi-Fi 6", 389900], ["Tableta de 10 pulgadas", 899900], ["Reloj inteligente deportivo", 459900],
    ["Micrófono USB de condensador", 229900], ["Base refrigerante para portátil", 95000],
  ],
  Hogar: [
    ["Licuadora de 1,5 litros", 179900], ["Olla arrocera 1,8 litros", 139900], ["Juego de ollas antiadherentes", 349900],
    ["Plancha de vapor", 119900], ["Ventilador de torre", 259900], ["Aspiradora de mano", 219900],
    ["Juego de toallas de algodón", 89900], ["Cobija térmica doble", 159900], ["Reloj de pared", 59900],
    ["Organizador de closet", 74900], ["Tostadora de dos ranuras", 109900], ["Termo de acero 1 litro", 65000],
  ],
  Deportes: [
    ["Bicicleta estática plegable", 1199900], ["Cuerda para saltar", 29900], ["Bandas de resistencia", 49900],
    ["Guantes de boxeo", 139900], ["Raqueta de tenis", 289900], ["Pelota de baloncesto", 94900],
    ["Morral de hidratación", 119900], ["Rodilleras deportivas", 59900], ["Patines en línea", 449900],
    ["Casco de ciclismo", 169900], ["Botella deportiva 750 ml", 32900], ["Colchoneta para abdominales", 84900],
  ],
  Ropa: [
    ["Jean clásico de hombre", 129900], ["Blusa de lino", 89900], ["Tenis urbanos", 239900], ["Sudadera con capucha", 119900],
    ["Medias deportivas (pack de 6)", 39900], ["Gorra de algodón", 34900], ["Vestido casual", 149900],
    ["Chaqueta de jean", 199900], ["Pantaloneta deportiva", 59900], ["Bufanda tejida", 45000],
    ["Cinturón de cuero", 69900], ["Sandalias de playa", 49900],
  ],
};

// Generador con semilla (LCG): los mismos datos en cada ejecución.
function crearAzar(semilla: number) {
  let estado = semilla;
  return (maximo: number) => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado % maximo;
  };
}

function referenciaPago(indice: number): string {
  return `PAY-HIST${String(indice).padStart(6, "0")}`;
}

async function poblarProductos(db: PoolClient) {
  let creados = 0;
  let indice = 0;
  for (const [categoria, productos] of Object.entries(CATALOGO)) {
    for (const [nombre, precio] of productos) {
      const stock = 20 + ((indice * 37) % 180);
      const { rowCount } = await db.query(
        `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria)
         SELECT $1::varchar, $2::text, $3::numeric, $4::int, $5::varchar, $6::varchar
         WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = $1::varchar)`,
        [nombre, `${nombre} de la categoría ${categoria}.`, precio, stock, IMAGENES[indice % IMAGENES.length], categoria]
      );
      creados += rowCount ?? 0;
      indice++;
    }
  }
  console.log(`Productos generados: ${creados} nuevos`);
}

async function poblarProductosDeCarga(db: PoolClient) {
  let creados = 0;
  for (const letra of ["A", "B", "C"]) {
    const nombre = `Producto carga ${letra}`;
    const { rowCount } = await db.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria)
       SELECT $1::varchar, 'Producto exclusivo para pruebas de carga.', 10000, $2::int, $3::varchar, 'Tecnología'
       WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = $1::varchar)`,
      [nombre, STOCK_CARGA, IMAGENES[0]]
    );
    creados += rowCount ?? 0;
  }
  console.log(`Productos de carga: ${creados} nuevos`);
}

async function poblarClientes(db: PoolClient) {
  // Mismo hash bcrypt para todos: tienen la misma contraseña y así no se tarda 25 veces.
  const passwordHash = await bcrypt.hash("Cliente123", 10);
  let creados = 0;
  for (let i = 1; i <= CLIENTES; i++) {
    const n = String(i).padStart(2, "0");
    const { rowCount } = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, 'cliente')
       ON CONFLICT (email) DO NOTHING`,
      [`Cliente de carga ${n}`, `carga${n}@tienda.com`, passwordHash]
    );
    creados += rowCount ?? 0;
  }
  console.log(`Clientes de carga: ${creados} nuevos`);
}

// Órdenes históricas repartidas en los últimos 90 días, coherentes con items y pagos.
// Las PAGADA descuentan stock; las RECHAZADA no. Nunca usan los productos de carga.
async function poblarOrdenes(db: PoolClient) {
  const existentes = await db.query(
    "SELECT COUNT(*)::int AS total FROM ordenes o JOIN usuarios u ON u.id = o.usuario_id WHERE u.email LIKE 'carga%@tienda.com'"
  );
  if (existentes.rows[0].total > 0) {
    console.log(`Órdenes históricas: ya hay ${existentes.rows[0].total}, no se crean más`);
    return;
  }

  const usuarios = (await db.query("SELECT id FROM usuarios WHERE email LIKE 'carga%@tienda.com' ORDER BY id")).rows;
  const productos = (
    await db.query("SELECT id, precio FROM productos WHERE activo AND stock >= 30 AND nombre NOT LIKE 'Producto carga%' ORDER BY id")
  ).rows;

  const azar = crearAzar(20261105);
  const rechazadas = Math.round((ORDENES * PORCENTAJE_RECHAZADAS) / 100);

  for (let i = 0; i < ORDENES; i++) {
    const pagada = i >= rechazadas;
    const usuario = usuarios[i % usuarios.length];
    const cantidadItems = 1 + azar(3);
    const inicio = azar(productos.length);
    const items = Array.from({ length: cantidadItems }, (_, k) => ({
      producto: productos[(inicio + k * 3) % productos.length],
      cantidad: 1 + azar(3),
    }));
    const total = items.reduce((suma, it) => suma + Number(it.producto.precio) * it.cantidad, 0);
    const dias = 1 + azar(90);

    const { rows } = await db.query(
      `INSERT INTO ordenes (usuario_id, total, estado, creado_en)
       VALUES ($1, $2, $3, NOW() - make_interval(days => $4::int, mins => $5::int))
       RETURNING id, creado_en`,
      [usuario.id, total, pagada ? "PAGADA" : "RECHAZADA", dias, azar(1440)]
    );
    const orden = rows[0];

    for (const it of items) {
      await db.query(
        "INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)",
        [orden.id, it.producto.id, it.cantidad, it.producto.precio]
      );
      if (pagada) await db.query("UPDATE productos SET stock = stock - $1 WHERE id = $2", [it.cantidad, it.producto.id]);
    }

    // Solo los últimos 4 dígitos, igual que el checkout real.
    await db.query(
      `INSERT INTO pagos (orden_id, monto, ultimos4, estado, referencia, creado_en) VALUES ($1, $2, $3, $4, $5, $6)`,
      [orden.id, total, pagada ? "1111" : "0000", pagada ? "APROBADO" : "RECHAZADO", referenciaPago(i + 1), orden.creado_en]
    );
  }
  console.log(`Órdenes históricas: ${ORDENES - rechazadas} PAGADA y ${rechazadas} RECHAZADA`);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("db:poblar no se puede ejecutar con NODE_ENV=production. Operación cancelada.");
    process.exitCode = 1;
    return;
  }

  await sembrar(); // garantiza los 12 productos y los usuarios base

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await poblarProductos(db);
    await poblarProductosDeCarga(db);
    await poblarClientes(db);
    await poblarOrdenes(db);
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    db.release();
  }

  console.log("Registros por tabla:");
  for (const tabla of ["usuarios", "productos", "ordenes", "orden_items", "pagos"]) {
    // Los nombres vienen de esta lista fija, no del usuario.
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tabla}`);
    console.log(`  ${tabla.padEnd(12)} ${rows[0].total}`);
  }
}

main()
  .catch((err) => {
    console.error("Error poblando la base de datos:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
