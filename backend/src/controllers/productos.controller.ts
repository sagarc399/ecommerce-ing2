import type { Request, Response } from "express";
import { pool } from "../config/db";
import { validarId } from "../validators/comunes";
import { validarFiltrosListado, validarProducto } from "../validators/producto.validator";

const COLUMNAS = "id, nombre, descripcion, precio, stock, imagen_url, categoria, activo, creado_en, actualizado_en";

// PostgreSQL devuelve NUMERIC como string: se convierte precio a number.
function formatearProducto(fila: Record<string, unknown>) {
  return { ...fila, precio: Number(fila.precio) };
}

// Escapa los comodines de LIKE para que el texto buscado se tome literal.
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function listar(req: Request, res: Response, esAdmin: boolean) {
  const filtros = validarFiltrosListado(req.query as Record<string, unknown>, esAdmin);
  if (!filtros.ok) {
    return res.status(400).json({ mensaje: filtros.mensaje });
  }
  const { buscar, categoria, activo, pagina, limite } = filtros.datos;

  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (!esAdmin) {
    condiciones.push("activo = TRUE");
  } else if (activo !== null) {
    valores.push(activo);
    condiciones.push(`activo = $${valores.length}`);
  }
  if (buscar !== null) {
    valores.push(`%${escaparLike(buscar)}%`);
    condiciones.push(`(nombre ILIKE $${valores.length} OR descripcion ILIKE $${valores.length})`);
  }
  if (categoria !== null) {
    valores.push(categoria);
    condiciones.push(`categoria = $${valores.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const conteo = await pool.query(`SELECT COUNT(*)::int AS total FROM productos ${where}`, valores);
  const total: number = conteo.rows[0].total;

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM productos ${where}
     ORDER BY id
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, limite, (pagina - 1) * limite]
  );

  return res.status(200).json({
    datos: rows.map(formatearProducto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  });
}

export async function listarPublico(req: Request, res: Response) {
  return listar(req, res, false);
}

export async function listarAdmin(req: Request, res: Response) {
  return listar(req, res, true);
}

export async function listarCategorias(_req: Request, res: Response) {
  const { rows } = await pool.query(
    `SELECT DISTINCT categoria FROM productos
     WHERE activo = TRUE AND categoria IS NOT NULL
     ORDER BY categoria`
  );
  return res.status(200).json(rows.map((fila) => fila.categoria));
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = validarId(req.params.id);
  if (id === null) {
    return res.status(400).json({ mensaje: "El id debe ser un número entero positivo" });
  }

  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = $1 AND activo = TRUE`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ mensaje: "Producto no encontrado" });
  }
  return res.status(200).json(formatearProducto(rows[0]));
}

export async function crear(req: Request, res: Response) {
  const validacion = validarProducto(req.body);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }
  const p = validacion.datos;

  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNAS}`,
    [p.nombre, p.descripcion, p.precio, p.stock, p.imagen_url, p.categoria]
  );
  return res.status(201).json(formatearProducto(rows[0]));
}

export async function actualizar(req: Request, res: Response) {
  const id = validarId(req.params.id);
  if (id === null) {
    return res.status(400).json({ mensaje: "El id debe ser un número entero positivo" });
  }
  const validacion = validarProducto(req.body);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }
  const p = validacion.datos;

  const { rows } = await pool.query(
    `UPDATE productos
     SET nombre = $1, descripcion = $2, precio = $3, stock = $4, imagen_url = $5, categoria = $6,
         actualizado_en = NOW()
     WHERE id = $7
     RETURNING ${COLUMNAS}`,
    [p.nombre, p.descripcion, p.precio, p.stock, p.imagen_url, p.categoria, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ mensaje: "Producto no encontrado" });
  }
  return res.status(200).json(formatearProducto(rows[0]));
}

// Borrado lógico: nunca se hace DELETE físico.
export async function desactivar(req: Request, res: Response) {
  const id = validarId(req.params.id);
  if (id === null) {
    return res.status(400).json({ mensaje: "El id debe ser un número entero positivo" });
  }

  const { rowCount } = await pool.query(
    "UPDATE productos SET activo = FALSE, actualizado_en = NOW() WHERE id = $1",
    [id]
  );
  if (rowCount === 0) {
    return res.status(404).json({ mensaje: "Producto no encontrado" });
  }
  return res.status(200).json({ mensaje: "Producto desactivado" });
}

export async function activar(req: Request, res: Response) {
  const id = validarId(req.params.id);
  if (id === null) {
    return res.status(400).json({ mensaje: "El id debe ser un número entero positivo" });
  }

  const { rows } = await pool.query(
    `UPDATE productos SET activo = TRUE, actualizado_en = NOW() WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ mensaje: "Producto no encontrado" });
  }
  return res.status(200).json({ mensaje: "Producto activado", producto: formatearProducto(rows[0]) });
}
