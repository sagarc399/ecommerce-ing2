import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensajeDeError } from '../api/cliente'
import { misOrdenes } from '../api/ordenes'
import Cargando from '../components/Cargando'
import EtiquetaEstado from '../components/EtiquetaEstado'
import MensajeError from '../components/MensajeError'
import type { Orden } from '../types'
import { formatearFecha, formatearPrecio } from '../utils/formato'

function unidades(orden: Orden): number {
  return orden.items.reduce((suma, i) => suma + i.cantidad, 0)
}

export default function Pedidos() {
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    setError(null)
    misOrdenes(controlador.signal)
      .then(setOrdenes)
      .catch((err) => {
        if (!controlador.signal.aborted) setError(mensajeDeError(err))
      })
    return () => controlador.abort()
  }, [intento])

  if (error) return <MensajeError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
  if (!ordenes) return <Cargando texto="Cargando tus pedidos..." />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Mis pedidos</h1>

      {ordenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-lg font-medium text-slate-700">Aún no tienes pedidos</p>
          <Link to="/" className="mt-4 inline-block font-medium text-indigo-700 hover:underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {ordenes.map((o) => (
            <li key={o.id}>
              <Link to={`/pedidos/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-semibold">Pedido #{o.id}</p>
                  <p className="text-sm text-slate-500">{formatearFecha(o.creado_en)}</p>
                  <p className="text-xs text-slate-400">
                    {unidades(o)} {unidades(o) === 1 ? 'unidad' : 'unidades'} · {o.items.length}{' '}
                    {o.items.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="font-semibold">{formatearPrecio(o.total)}</p>
                  <EtiquetaEstado estado={o.estado} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
