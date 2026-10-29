// Validación del formulario de producto con los mismos criterios que backend/src/validators/producto.validator.ts.
import type { Producto, ProductoEntrada } from '../types'

export interface FormularioProducto {
  nombre: string
  descripcion: string
  precio: string
  stock: string
  imagen_url: string
  categoria: string
}

export type ErroresProducto = Partial<Record<keyof FormularioProducto, string>>

const PRECIO_MAXIMO = 9999999999.99
const ENTERO_MAXIMO = 2147483647

export const FORMULARIO_PRODUCTO_VACIO: FormularioProducto = {
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '',
  imagen_url: '',
  categoria: '',
}

export function formularioDesdeProducto(p: Producto): FormularioProducto {
  return {
    nombre: p.nombre,
    descripcion: p.descripcion ?? '',
    precio: String(p.precio),
    stock: String(p.stock),
    imagen_url: p.imagen_url ?? '',
    categoria: p.categoria ?? '',
  }
}

// Imágenes del seed servidas por el propio frontend desde public/productos/ (igual que en el backend).
const RUTA_IMAGEN_LOCAL = /^\/productos\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/

// URL http/https o imagen local /productos/<archivo>.
export function esImagenValida(texto: string): boolean {
  if (RUTA_IMAGEN_LOCAL.test(texto)) return true
  try {
    const url = new URL(texto)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validarProducto(f: FormularioProducto): ErroresProducto {
  const errores: ErroresProducto = {}

  const nombre = f.nombre.trim()
  if (!nombre) errores.nombre = 'El nombre es obligatorio'
  else if (nombre.length < 2 || nombre.length > 150) errores.nombre = 'El nombre debe tener entre 2 y 150 caracteres'

  if (f.descripcion.trim().length > 5000) errores.descripcion = 'La descripción no puede superar 5000 caracteres'

  const precio = Number(f.precio)
  if (f.precio.trim() === '' || !Number.isFinite(precio) || precio < 0) {
    errores.precio = 'El precio debe ser un número mayor o igual a 0'
  } else if (precio > PRECIO_MAXIMO) {
    errores.precio = `El precio no puede superar ${PRECIO_MAXIMO}`
  } else if (Math.round(precio * 100) / 100 !== precio) {
    errores.precio = 'El precio admite máximo 2 decimales'
  }

  const stock = Number(f.stock)
  if (f.stock.trim() === '' || !Number.isInteger(stock) || stock < 0 || stock > ENTERO_MAXIMO) {
    errores.stock = 'El stock debe ser un número entero mayor o igual a 0'
  }

  const imagen = f.imagen_url.trim()
  if (imagen.length > 500) errores.imagen_url = 'La URL no puede superar 500 caracteres'
  else if (imagen && !esImagenValida(imagen)) {
    errores.imagen_url = 'Debe ser una URL que empiece por http:// o https://, o una imagen local /productos/<archivo>'
  }

  if (f.categoria.trim().length > 80) errores.categoria = 'La categoría no puede superar 80 caracteres'

  return errores
}

export function aProductoEntrada(f: FormularioProducto): ProductoEntrada {
  return {
    nombre: f.nombre.trim(),
    descripcion: f.descripcion.trim(),
    precio: Number(f.precio),
    stock: Number(f.stock),
    imagen_url: f.imagen_url.trim(),
    categoria: f.categoria.trim(),
  }
}
