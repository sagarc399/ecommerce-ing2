import type { EstadoOrden, Orden, RespuestaPaginada } from '../types'
import { apiFetch } from './cliente'

export interface ItemCompra {
  producto_id: number
  cantidad: number
}

// Los datos de la tarjeta solo viajan en el cuerpo de esta petición: nunca se guardan en el navegador.
export interface DatosTarjeta {
  numero_tarjeta: string
  titular: string
  vencimiento: string
  cvv: string
}

export function crearOrden(items: ItemCompra[], pago: DatosTarjeta) {
  return apiFetch<Orden>('/ordenes', { metodo: 'POST', cuerpo: { items, pago } })
}

export function misOrdenes(senal?: AbortSignal) {
  return apiFetch<Orden[]>('/ordenes/mias', { senal })
}

export function obtenerOrden(id: number, senal?: AbortSignal) {
  return apiFetch<Orden>(`/ordenes/${id}`, { senal })
}

export interface FiltrosOrdenesAdmin {
  estado?: EstadoOrden
  pagina?: number
  limite?: number
}

export function listarOrdenesAdmin(filtros: FiltrosOrdenesAdmin, senal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.pagina) params.set('pagina', String(filtros.pagina))
  if (filtros.limite) params.set('limite', String(filtros.limite))
  const query = params.toString()
  return apiFetch<RespuestaPaginada<Orden>>(`/admin/ordenes${query ? `?${query}` : ''}`, { senal })
}
