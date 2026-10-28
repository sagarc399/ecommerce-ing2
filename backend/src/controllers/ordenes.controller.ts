import type { Request, Response } from "express";
import { pool } from "../config/db";
import { procesarPago } from "../services/pago.service";
import { validarId } from "../validators/comunes";
import { validarFiltrosOrdenes, validarOrden } from "../validators/orden.validator";

// Orden con sus items (nombre del producto y subtotal) y su pago. Nunca incluye datos sensibles de la tarjeta.
const SELECT_ORDEN = `
  SELECT o.id, o.usuario_id, o.total, o.estado, o.creado_en,
    json_build_object('id', u.id, 'nombre', u.nombre, 'email', u.email) AS comprador,
    COALESCE((
      SELECT json_agg(json_build_object(
               'producto_id', oi.producto_id,
               'nombre', p.nombre,
               'cantidad', oi.cantidad,
               'precio_unitario', oi.precio_unitario,
               'subtotal', oi.cantidad * oi.precio_unitario
             ) ORDER BY oi.id)
      FROM orden_items oi JOIN productos p ON p.id = oi.producto_id
      WHERE oi.orden_id = o.id
    ), '[]'::json) AS items,
    (SELECT json_build_object('estado', pg.estado, 'ultimos4', pg.ultimos4, 'referencia', pg.referencia, 'monto', pg.monto)
     FROM pagos pg WHERE pg.orden_id = o.id) AS pago
  FROM ordenes o
  JOIN usuarios u ON u.id = o.usuario_id`;

// NUMERIC llega como string en las columnas normales (dentro del JSON ya llega como número).
function formatearOrden(fila: Record<string, unknown>) {
  return { ...fila, total: Number(fila.total) };
}

export async function crearOrden(req: Request, res: Response) {
  const validacion = validarOrden(req.body);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }
  const { items, pago } = validacion.datos;
  const usuarioId = req.usuario!.id;
  const ids = items.map((i) => i.producto_id);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    // Bloquea las filas de los productos hasta el COMMIT/ROLLBACK. ORDER BY id evita deadlocks.
    const { rows: productos } = await cliente.query(
      `SELECT id, nombre, precio, stock, activo FROM productos
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR UPDATE`,
      [ids]
    );
    const porId = new Map(productos.map((p) => [p.id as number, p]));

    for (const item of items) {
      const producto = porId.get(item.producto_id);
      if (!producto || !producto.activo) {
        await cliente.query("ROLLBACK");
        return res.status(404).json({
          mensaje: `El producto ${item.producto_id} no existe o no está disponible`,
          producto_id: item.producto_id,
        });
      }
    }

    for (const item of items) {
      const producto = porId.get(item.producto_id)!;
      if (producto.stock < item.cantidad) {
        await cliente.query("ROLLBACK");
        return res.status(409).json({
          mensaje: `Stock insuficiente para "${producto.nombre}"`,
          producto: producto.nombre,
          producto_id: producto.id,
          disponible: producto.stock,
          solicitado: item.cantidad,
        });
      }
    }

    // Total calculado SOLO con los precios de la BD, en centavos para evitar errores de redondeo.
    const totalCentavos = items.reduce(
      (suma, item) => suma + Math.round(Number(porId.get(item.producto_id)!.precio) * 100) * item.cantidad,
      0
    );
    const total = totalCentavos / 100;

    const resultadoPago = await procesarPago(pago.numero_tarjeta);
    const aprobado = resultadoPago.estado === "APROBADO";

    const { rows: ordenRows } = await cliente.query(
      "INSERT INTO ordenes (usuario_id, total, estado) VALUES ($1, $2, $3) RETURNING id",
      [usuarioId, total, aprobado ? "PAGADA" : "RECHAZADA"]
    );
    const ordenId: number = ordenRows[0].id;

    // Los items se guardan también en las rechazadas, para dejar historial.
    await cliente.query(
      `INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario)
       SELECT $1, p.id, v.cantidad, p.precio
       FROM unnest($2::int[], $3::int[]) AS v(producto_id, cantidad)
       JOIN productos p ON p.id = v.producto_id`,
      [ordenId, ids, items.map((i) => i.cantidad)]
    );

    if (aprobado) {
      await cliente.query(
        `UPDATE productos p
         SET stock = p.stock - v.cantidad, actualizado_en = NOW()
         FROM unnest($1::int[], $2::int[]) AS v(producto_id, cantidad)
         WHERE p.id = v.producto_id`,
        [ids, items.map((i) => i.cantidad)]
      );
    }

    // Solo se guardan los últimos 4 dígitos: nunca el número completo ni el CVV.
    await cliente.query(
      "INSERT INTO pagos (orden_id, monto, ultimos4, estado, referencia) VALUES ($1, $2, $3, $4, $5)",
      [ordenId, total, resultadoPago.ultimos4, resultadoPago.estado, resultadoPago.referencia]
    );

    await cliente.query("COMMIT");

    if (!aprobado) {
      return res.status(402).json({ mensaje: "Pago rechazado", orden_id: ordenId });
    }

    const { rows } = await pool.query(`${SELECT_ORDEN} WHERE o.id = $1`, [ordenId]);
    return res.status(201).json(formatearOrden(rows[0]));
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

export async function misOrdenes(req: Request, res: Response) {
  const { rows } = await pool.query(
    `${SELECT_ORDEN} WHERE o.usuario_id = $1 ORDER BY o.creado_en DESC, o.id DESC`,
    [req.usuario!.id]
  );
  return res.status(200).json(rows.map(formatearOrden));
}

export async function obtenerOrden(req: Request, res: Response) {
  const id = validarId(req.params.id);
  if (id === null) {
    return res.status(400).json({ mensaje: "El id debe ser un número entero positivo" });
  }

  // El cliente solo ve sus órdenes; si es de otro usuario se responde 404 para no revelar que existe.
  const { rows } =
    req.usuario!.rol === "admin"
      ? await pool.query(`${SELECT_ORDEN} WHERE o.id = $1`, [id])
      : await pool.query(`${SELECT_ORDEN} WHERE o.id = $1 AND o.usuario_id = $2`, [id, req.usuario!.id]);

  if (rows.length === 0) {
    return res.status(404).json({ mensaje: "Orden no encontrada" });
  }
  return res.status(200).json(formatearOrden(rows[0]));
}

export async function listarOrdenesAdmin(req: Request, res: Response) {
  const filtros = validarFiltrosOrdenes(req.query as Record<string, unknown>);
  if (!filtros.ok) {
    return res.status(400).json({ mensaje: filtros.mensaje });
  }
  const { estado, pagina, limite } = filtros.datos;

  const valores: unknown[] = [];
  let where = "";
  if (estado !== null) {
    valores.push(estado);
    where = `WHERE o.estado = $${valores.length}`;
  }

  const conteo = await pool.query(`SELECT COUNT(*)::int AS total FROM ordenes o ${where}`, valores);
  const total: number = conteo.rows[0].total;

  const { rows } = await pool.query(
    `${SELECT_ORDEN} ${where}
     ORDER BY o.creado_en DESC, o.id DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, limite, (pagina - 1) * limite]
  );

  return res.status(200).json({
    datos: rows.map(formatearOrden),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  });
}
