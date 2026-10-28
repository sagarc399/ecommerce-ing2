import type { Orden } from '../types'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import EtiquetaEstado from './EtiquetaEstado'

interface Props {
  orden: Orden
  mostrarComprador?: boolean
}

// Detalle de una orden: lo usan /pedidos/:id (cliente) y /admin/ordenes/:id (admin).
export default function DetalleOrden({ orden, mostrarComprador = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Pedido #{orden.id}</h1>
        <EtiquetaEstado estado={orden.estado} />
      </div>
      <p className="text-sm text-slate-500">{formatearFecha(orden.creado_en)}</p>

      {mostrarComprador && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium">Comprador</p>
          <p className="text-slate-600">
            {orden.comprador.nombre} · {orden.comprador.email}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {orden.items.map((item) => (
            <li key={item.producto_id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{item.nombre}</p>
                <p className="text-sm text-slate-500">
                  {item.cantidad} × {formatearPrecio(item.precio_unitario)}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{formatearPrecio(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-slate-200 bg-slate-50 p-4 text-lg font-bold">
          <span>Total</span>
          <span>{formatearPrecio(orden.total)}</span>
        </div>
      </div>

      {orden.pago && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="mb-2 font-medium">Pago</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-600">
            <dt>Estado</dt>
            <dd className={orden.pago.estado === 'APROBADO' ? 'text-emerald-700' : 'text-red-600'}>{orden.pago.estado}</dd>
            <dt>Tarjeta</dt>
            <dd className="font-mono">•••• {orden.pago.ultimos4}</dd>
            <dt>Referencia</dt>
            <dd className="break-all font-mono">{orden.pago.referencia}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
