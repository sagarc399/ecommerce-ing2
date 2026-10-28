// Validaciones de órdenes y datos de pago, separadas del controlador.
import { ENTERO_MAXIMO, leerQuery, validarPaginacion, type Resultado } from "./comunes";

export interface ItemOrden {
  producto_id: number;
  cantidad: number;
}

export interface DatosTarjeta {
  numero_tarjeta: string; // solo dígitos, sin espacios
  titular: string;
  vencimiento: string;
  cvv: string;
}

export interface OrdenEntrada {
  items: ItemOrden[];
  pago: DatosTarjeta;
}

export type EstadoOrden = "PAGADA" | "RECHAZADA";

const MAXIMO_ITEMS = 20;
const CANTIDAD_MAXIMA = 10;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// Solo se leen producto_id y cantidad: precios o totales enviados por el cliente se ignoran.
function validarItems(items: unknown): Resultado<ItemOrden[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, mensaje: "El campo items debe ser un arreglo con al menos un producto" };
  }
  if (items.length > MAXIMO_ITEMS) {
    return { ok: false, mensaje: `El campo items admite máximo ${MAXIMO_ITEMS} elementos` };
  }

  // Si un producto viene repetido, se suman sus cantidades.
  const cantidades = new Map<number, number>();
  for (const [i, item] of items.entries()) {
    if (!esObjeto(item)) {
      return { ok: false, mensaje: `items[${i}] debe ser un objeto con producto_id y cantidad` };
    }
    const { producto_id, cantidad } = item;
    if (typeof producto_id !== "number" || !Number.isInteger(producto_id) || producto_id < 1 || producto_id > ENTERO_MAXIMO) {
      return { ok: false, mensaje: `items[${i}].producto_id debe ser un entero positivo` };
    }
    if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
      return { ok: false, mensaje: `items[${i}].cantidad debe ser un entero entre 1 y ${CANTIDAD_MAXIMA}` };
    }
    cantidades.set(producto_id, (cantidades.get(producto_id) ?? 0) + cantidad);
  }

  return {
    ok: true,
    datos: [...cantidades].map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
  };
}

function validarTarjeta(pago: unknown, ahora: Date): Resultado<DatosTarjeta> {
  if (!esObjeto(pago)) {
    return { ok: false, mensaje: "El campo pago es obligatorio" };
  }
  const { numero_tarjeta, titular, vencimiento, cvv } = pago;

  const numero = typeof numero_tarjeta === "string" ? numero_tarjeta.replace(/\s+/g, "") : "";
  if (!/^\d{16}$/.test(numero)) {
    return { ok: false, mensaje: "El campo pago.numero_tarjeta debe tener exactamente 16 dígitos" };
  }

  if (typeof titular !== "string" || titular.trim() === "") {
    return { ok: false, mensaje: "El campo pago.titular es obligatorio" };
  }
  if (titular.trim().length > 100) {
    return { ok: false, mensaje: "El campo pago.titular no puede superar 100 caracteres" };
  }

  const partes = typeof vencimiento === "string" ? /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(vencimiento.trim()) : null;
  if (!partes) {
    return { ok: false, mensaje: "El campo pago.vencimiento debe tener el formato MM/AA" };
  }
  // La tarjeta es válida hasta el último día del mes de vencimiento.
  const mes = Number(partes[1]);
  const anio = 2000 + Number(partes[2]);
  const mesActual = ahora.getFullYear() * 12 + ahora.getMonth() + 1;
  if (anio * 12 + mes < mesActual) {
    return { ok: false, mensaje: "La tarjeta está vencida" };
  }

  if (typeof cvv !== "string" || !/^\d{3}$/.test(cvv)) {
    return { ok: false, mensaje: "El campo pago.cvv debe tener 3 dígitos" };
  }

  return { ok: true, datos: { numero_tarjeta: numero, titular: titular.trim(), vencimiento: partes[0], cvv } };
}

export function validarOrden(body: unknown, ahora = new Date()): Resultado<OrdenEntrada> {
  if (!esObjeto(body)) {
    return { ok: false, mensaje: "El cuerpo de la petición debe ser un objeto JSON" };
  }
  const items = validarItems(body.items);
  if (!items.ok) return items;
  const pago = validarTarjeta(body.pago, ahora);
  if (!pago.ok) return pago;
  return { ok: true, datos: { items: items.datos, pago: pago.datos } };
}

export function validarFiltrosOrdenes(
  query: Record<string, unknown>
): Resultado<{ estado: EstadoOrden | null; pagina: number; limite: number }> {
  const paginacion = validarPaginacion(query);
  if (!paginacion.ok) return paginacion;

  const estado = leerQuery(query, "estado");
  if (estado !== undefined && estado !== "PAGADA" && estado !== "RECHAZADA") {
    return { ok: false, mensaje: "El parámetro estado debe ser PAGADA o RECHAZADA" };
  }
  return { ok: true, datos: { estado: estado ?? null, ...paginacion.datos } };
}
