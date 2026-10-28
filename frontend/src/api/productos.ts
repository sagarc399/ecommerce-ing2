import type { Producto, RespuestaPaginada } from '../types'
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
