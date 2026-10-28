import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import { obtenerOrden } from '../api/ordenes'
import Cargando from '../components/Cargando'
import DetalleOrden from '../components/DetalleOrden'
import MensajeError from '../components/MensajeError'
import type { Orden } from '../types'

interface Props {
  volverA: string
  textoVolver: string
  esAdmin?: boolean
}

// Página de detalle de orden. La usa el cliente (/pedidos/:id) y el admin (/admin/ordenes/:id).
export default function DetallePedido({ volverA, textoVolver, esAdmin = false }: Props) {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero >= 1
  const exito = (useLocation().state as { exito?: boolean } | null)?.exito === true

  const [orden, setOrden] = useState<Orden | null>(null)
  const [error, setError] = useState<{ status: number; mensaje: string } | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!idValido) return
    const controlador = new AbortController()
    setError(null)
    obtenerOrden(idNumero, controlador.signal)
      .then(setOrden)
      .catch((err) => {
        if (controlador.signal.aborted) return
        setError({ status: err instanceof ErrorApi ? err.status : 0, mensaje: mensajeDeError(err) })
      })
    return () => controlador.abort()
  }, [idNumero, idValido, intento])

  const volver = (
    <Link to={volverA} className="mb-4 inline-block text-sm text-indigo-700 hover:underline">
      ← {textoVolver}
    </Link>
  )

  // 404 también cuando la orden es de otro usuario (el backend no revela que existe).
  if (!idValido || error?.status === 404 || error?.status === 400) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Pedido no encontrado</h1>
        <Link to={volverA} className="mt-6 inline-block font-medium text-indigo-700 hover:underline">
          ← {textoVolver}
        </Link>
      </div>
    )
  }
  if (error) return <MensajeError mensaje={error.mensaje} onReintentar={() => setIntento((n) => n + 1)} />
  if (!orden || orden.id !== idNumero) return <Cargando texto="Cargando pedido..." />

  return (
    <div className="mx-auto max-w-2xl">
      {volver}
      {exito && orden.estado === 'PAGADA' && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status">
          <p className="font-semibold">¡Gracias por tu compra!</p>
          <p className="text-sm">Tu pago fue aprobado y el pedido quedó confirmado.</p>
        </div>
      )}
      <DetalleOrden orden={orden} mostrarComprador={esAdmin} />
    </div>
  )
}
