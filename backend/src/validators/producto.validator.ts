// Validaciones de datos de productos, separadas del controlador.
import { ENTERO_MAXIMO, leerQuery, validarPaginacion, type Resultado } from "./comunes";

export interface ProductoEntrada {
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen_url: string | null;
  categoria: string | null;
}

export interface FiltrosListado {
  buscar: string | null;
  categoria: string | null;
  activo: boolean | null;
  pagina: number;
  limite: number;
}

const PRECIO_MAXIMO = 9999999999.99; // NUMERIC(12,2)

// Campo de texto opcional: undefined, null o "" se guardan como null.
function textoOpcional(valor: unknown, campo: string, maximo: number): Resultado<string | null> {
  if (valor === undefined || valor === null) return { ok: true, datos: null };
  if (typeof valor !== "string") return { ok: false, mensaje: `El campo ${campo} debe ser texto` };
  const limpio = valor.trim();
  if (limpio.length > maximo) {
    return { ok: false, mensaje: `El campo ${campo} no puede superar ${maximo} caracteres` };
  }
  return { ok: true, datos: limpio === "" ? null : limpio };
}

export function validarProducto(body: unknown): Resultado<ProductoEntrada> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, mensaje: "El cuerpo de la petición debe ser un objeto JSON" };
  }
  const { nombre, descripcion, precio, stock, imagen_url, categoria } = body as Record<string, unknown>;

  if (typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, mensaje: "El campo nombre es obligatorio" };
  }
  const nombreLimpio = nombre.trim();
  if (nombreLimpio.length < 2 || nombreLimpio.length > 150) {
    return { ok: false, mensaje: "El campo nombre debe tener entre 2 y 150 caracteres" };
  }

  const desc = textoOpcional(descripcion, "descripcion", 5000);
  if (!desc.ok) return desc;

  if (typeof precio !== "number" || !Number.isFinite(precio) || precio < 0) {
    return { ok: false, mensaje: "El campo precio debe ser un número mayor o igual a 0" };
  }
  if (precio > PRECIO_MAXIMO) {
    return { ok: false, mensaje: `El campo precio no puede superar ${PRECIO_MAXIMO}` };
  }
  if (Math.round(precio * 100) / 100 !== precio) {
    return { ok: false, mensaje: "El campo precio admite máximo 2 decimales" };
  }

  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > ENTERO_MAXIMO) {
    return { ok: false, mensaje: "El campo stock debe ser un número entero mayor o igual a 0" };
  }

  const imagen = textoOpcional(imagen_url, "imagen_url", 500);
  if (!imagen.ok) return imagen;
  if (imagen.datos !== null) {
    let url: URL | null = null;
    try {
      url = new URL(imagen.datos);
    } catch {
      url = null;
    }
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return { ok: false, mensaje: "El campo imagen_url debe ser una URL válida que empiece por http:// o https://" };
    }
  }

  const cat = textoOpcional(categoria, "categoria", 80);
  if (!cat.ok) return cat;

  return {
    ok: true,
    datos: {
      nombre: nombreLimpio,
      descripcion: desc.datos,
      precio,
      stock,
      imagen_url: imagen.datos,
      categoria: cat.datos,
    },
  };
}

// Lee los filtros de la query. "activo" solo se acepta en el listado de admin.
export function validarFiltrosListado(query: Record<string, unknown>, permitirActivo: boolean): Resultado<FiltrosListado> {
  const paginacion = validarPaginacion(query);
  if (!paginacion.ok) return paginacion;

  let activo: boolean | null = null;
  const activoTexto = leerQuery(query, "activo");
  if (permitirActivo && activoTexto !== undefined) {
    if (activoTexto !== "true" && activoTexto !== "false") {
      return { ok: false, mensaje: "El parámetro activo debe ser true o false" };
    }
    activo = activoTexto === "true";
  }

  return {
    ok: true,
    datos: {
      buscar: leerQuery(query, "buscar") ?? null,
      categoria: leerQuery(query, "categoria") ?? null,
      activo,
      ...paginacion.datos,
    },
  };
}
