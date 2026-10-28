import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cantidadMaxima, useCarrito } from '../context/CarritoContext'
import type { Producto } from '../types'
import { formatearPrecio } from '../utils/formato'
import ImagenProducto from './ImagenProducto'

export default function TarjetaProducto({ producto }: { producto: Producto }) {
  const { usuario } = useAuth()
  const { agregar, cantidadEnCarrito } = useCarrito()

  const agotado = producto.stock === 0
  const enCarrito = cantidadEnCarrito(producto.id)
  const alMaximo = enCarrito >= cantidadMaxima(producto.stock)
  const esAdmin = usuario?.rol === 'admin'

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/producto/${producto.id}`} className="relative block">
        <ImagenProducto src={producto.imagen_url} alt={producto.nombre} className="aspect-[3/2] w-full" />
        {agotado && (
          <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">Agotado</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {producto.categoria && <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{producto.categoria}</p>}
        <Link to={`/producto/${producto.id}`} className="font-semibold leading-snug text-slate-800 hover:text-indigo-700">
          {producto.nombre}
        </Link>
        <p className="mt-auto pt-2 text-lg font-bold text-slate-900">{formatearPrecio(producto.precio)}</p>

        {!esAdmin && (
          <button
            type="button"
            onClick={() => agregar(producto, 1)}
            disabled={agotado || alMaximo}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {agotado ? 'Agotado' : alMaximo ? 'Máximo en el carrito' : enCarrito > 0 ? `Agregar otro (${enCarrito})` : 'Agregar al carrito'}
          </button>
        )}
      </div>
    </article>
  )
}
