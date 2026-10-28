import type { Producto, ProductoEntrada, RespuestaPaginada } from '../types'
import { apiFetch } from './cliente'

export interface FiltrosProductos {
  buscar?: string
  categoria?: string
  pagina?: number
  limite?: number
}

export function listarProductos(filtros: FiltrosProductos, senal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filtros.buscar) params.set('buscar', filtros.buscar)
  if (filtros.categoria) params.set('categoria', filtros.categoria)
  if (filtros.pagina) params.set('pagina', String(filtros.pagina))
  if (filtros.limite) params.set('limite', String(filtros.limite))
  const query = params.toString()
  return apiFetch<RespuestaPaginada<Producto>>(`/productos${query ? `?${query}` : ''}`, { senal })
}

export function obtenerProducto(id: number, senal?: AbortSignal) {
  return apiFetch<Producto>(`/productos/${id}`, { senal })
}

export function listarCategorias() {
  return apiFetch<string[]>('/productos/categorias')
}

// --- Admin ---

export interface FiltrosProductosAdmin {
  buscar?: string
  activo?: boolean
  pagina?: number
  limite?: number
}

export function listarProductosAdmin(filtros: FiltrosProductosAdmin, senal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filtros.buscar) params.set('buscar', filtros.buscar)
  if (filtros.activo !== undefined) params.set('activo', String(filtros.activo))
  if (filtros.pagina) params.set('pagina', String(filtros.pagina))
  if (filtros.limite) params.set('limite', String(filtros.limite))
  const query = params.toString()
  return apiFetch<RespuestaPaginada<Producto>>(`/admin/productos${query ? `?${query}` : ''}`, { senal })
}

export function crearProducto(datos: ProductoEntrada) {
  return apiFetch<Producto>('/productos', { metodo: 'POST', cuerpo: datos })
}

export function actualizarProducto(id: number, datos: ProductoEntrada) {
  return apiFetch<Producto>(`/productos/${id}`, { metodo: 'PUT', cuerpo: datos })
}

export function desactivarProducto(id: number) {
  return apiFetch<{ mensaje: string }>(`/productos/${id}`, { metodo: 'DELETE' })
}

export function activarProducto(id: number) {
  return apiFetch<{ mensaje: string; producto: Producto }>(`/productos/${id}/activar`, { metodo: 'PATCH' })
}
