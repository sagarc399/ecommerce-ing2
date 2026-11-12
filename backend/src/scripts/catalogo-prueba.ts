// Catálogo de 48 productos (4 categorías) compartido por db:poblar (pruebas de carga) y db:demo (demo con datos).
// El stock de cada producto es determinista: 20 + (índice × 37) mod 180.
import type { PoolClient } from "pg";

export const IMAGENES = [
  "audifonos-bluetooth", "teclado-mecanico", "mouse-inalambrico", "monitor-24", "cafetera-goteo", "juego-sabanas",
  "lampara-escritorio-led", "balon-futbol", "mat-yoga", "mancuernas-5kg", "camiseta-deportiva", "chaqueta-impermeable",
].map((nombre) => `/productos/${nombre}.jpg`);

// [nombre, precio en COP] por categoría: 12 × 4 = 48 productos.
export const CATALOGO: Record<string, [string, number][]> = {
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
export function crearAzar(semilla: number) {
  let estado = semilla;
  return (maximo: number) => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado % maximo;
  };
}

export async function poblarProductos(db: PoolClient) {
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

