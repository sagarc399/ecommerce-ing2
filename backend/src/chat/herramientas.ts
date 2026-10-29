// Herramientas (function calling) del chatbot v2. TODAS son de solo lectura y usan consultas
// parametrizadas que ya existen en el backend: el modelo solo elige la herramienta y sus argumentos,
// nunca escribe SQL.
//
// SEGURIDAD: mis_pedidos y estado_pedido usan SIEMPRE el usuario del token JWT de la petición
// (contexto.usuario), nunca un id de usuario que venga del modelo o del mensaje.
import { pool } from "../config/db";
import { formatearOrden, SELECT_ORDEN } from "../controllers/ordenes.controller";
import { escaparLike } from "../controllers/productos.controller";
import type { ContextoChat } from "./proveedor";

const MAXIMO_PRODUCTOS = 5;
const MAXIMO_PEDIDOS = 5;
const SIN_SESION = { error: "El usuario no ha iniciado sesión" };
const PEDIDO_NO_ENCONTRADO = { error: "Pedido no encontrado" };

// Definiciones en formato OpenAI (Groq). Ninguna acepta un id de usuario.
export const DEFINICIONES_HERRAMIENTAS = [
  {
    type: "function",
    function: {
      name: "buscar_productos",
      description:
        "Busca productos ACTIVOS del catálogo por texto (nombre o descripción) y/o categoría. Devuelve máximo 5 con id, nombre, precio, stock y categoría.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Palabras a buscar, p. ej. 'monitor' o 'lámpara led'" },
          categoria: { type: "string", description: "Categoría exacta, p. ej. 'Tecnología'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_categorias",
      description: "Lista las categorías que tienen productos activos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "mis_pedidos",
      description: "Devuelve los últimos 5 pedidos del usuario que tiene la sesión iniciada (id, fecha, total, estado e items).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "estado_pedido",
      description: "Devuelve el detalle de UN pedido del usuario que tiene la sesión iniciada.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer", description: "Número del pedido" } },
        required: ["id"],
      },
    },
  },
] as const;

// "$1.250.000"
function precioCOP(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-CO")}`;
}

// Minúsculas y sin tildes, igual en SQL (translate) y en JS, para que "lampara" encuentre "Lámpara".
const CON_TILDE = "áéíóúüñ";
const SIN_TILDE = "aeiouun";
function normalizar(texto: string): string {
  return texto.toLowerCase().replace(/[áéíóúüñ]/g, (c) => SIN_TILDE[CON_TILDE.indexOf(c)]);
}

function textoArgumento(valor: unknown, maximo: number): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim().slice(0, maximo) : null;
}

async function buscarProductos(args: Record<string, unknown>) {
  const texto = textoArgumento(args.texto, 100);
  const categoria = textoArgumento(args.categoria, 80);

  const condiciones = ["activo = TRUE"];
  const valores: unknown[] = [];
  // Cada palabra debe aparecer en el nombre o la descripción ("lámpara led" → "Lámpara de escritorio LED").
  for (const palabra of (texto ? normalizar(texto).split(/\s+/) : []).slice(0, 5)) {
    valores.push(`%${escaparLike(palabra)}%`);
    const n = valores.length;
    condiciones.push(
      `(translate(lower(nombre), '${CON_TILDE}', '${SIN_TILDE}') LIKE $${n} OR translate(lower(coalesce(descripcion, '')), '${CON_TILDE}', '${SIN_TILDE}') LIKE $${n})`
    );
  }
  if (categoria) {
    valores.push(normalizar(categoria));
    condiciones.push(`translate(lower(categoria), '${CON_TILDE}', '${SIN_TILDE}') = $${valores.length}`);
  }

  const { rows } = await pool.query(
    `SELECT id, nombre, precio, stock, categoria FROM productos
     WHERE ${condiciones.join(" AND ")}
     ORDER BY id
     LIMIT ${MAXIMO_PRODUCTOS}`,
    valores
  );
  return {
    encontrados: rows.length,
    productos: rows.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: precioCOP(Number(p.precio)),
      stock: p.stock,
      agotado: p.stock === 0,
      categoria: p.categoria,
    })),
  };
}

async function listarCategorias() {
  const { rows } = await pool.query(
    "SELECT DISTINCT categoria FROM productos WHERE activo = TRUE AND categoria IS NOT NULL ORDER BY categoria"
  );
  return { categorias: rows.map((f) => f.categoria) };
}

function resumirOrden(orden: ReturnType<typeof formatearOrden>) {
  const o = orden as unknown as {
    id: number;
    creado_en: Date;
    total: number;
    estado: string;
    items: { nombre: string; cantidad: number }[];
  };
  return {
    id: o.id,
    fecha: new Date(o.creado_en).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }),
    total: precioCOP(o.total),
    estado: o.estado,
    items: o.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
  };
}

async function misPedidos(contexto: ContextoChat) {
  if (!contexto.usuario) return SIN_SESION;
  const { rows } = await pool.query(
    `${SELECT_ORDEN} WHERE o.usuario_id = $1 ORDER BY o.creado_en DESC, o.id DESC LIMIT ${MAXIMO_PEDIDOS}`,
    [contexto.usuario.id]
  );
  return { cantidad: rows.length, pedidos: rows.map((f) => resumirOrden(formatearOrden(f))) };
}

async function estadoPedido(args: Record<string, unknown>, contexto: ContextoChat) {
  if (!contexto.usuario) return SIN_SESION;
  const id = Number(args.id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) return PEDIDO_NO_ENCONTRADO;
  // usuario_id sale del token: una orden de otra persona no se encuentra.
  const { rows } = await pool.query(`${SELECT_ORDEN} WHERE o.id = $1 AND o.usuario_id = $2`, [id, contexto.usuario.id]);
  return rows.length === 0 ? PEDIDO_NO_ENCONTRADO : resumirOrden(formatearOrden(rows[0]));
}

// Ejecuta la herramienta pedida por el modelo. Argumentos inválidos o herramientas desconocidas
// devuelven { error } en lugar de lanzar, para que el modelo pueda responder al usuario.
export async function ejecutarHerramienta(nombre: string, argumentosJson: string, contexto: ContextoChat): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    const parseados = argumentosJson ? JSON.parse(argumentosJson) : {};
    if (parseados && typeof parseados === "object" && !Array.isArray(parseados)) args = parseados;
  } catch {
    return { error: "Argumentos inválidos" };
  }

  switch (nombre) {
    case "buscar_productos":
      return buscarProductos(args);
    case "listar_categorias":
      return listarCategorias();
    case "mis_pedidos":
      return misPedidos(contexto);
    case "estado_pedido":
      return estadoPedido(args, contexto);
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}
