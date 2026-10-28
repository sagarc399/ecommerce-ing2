import { Link } from 'react-router-dom'
import ImagenProducto from '../components/ImagenProducto'
import SelectorCantidad from '../components/SelectorCantidad'
import { cantidadMaxima, useCarrito } from '../context/CarritoContext'
import { formatearPrecio } from '../utils/formato'

export default function Carrito() {
  const { items, total, totalUnidades, cambiarCantidad, quitar, vaciar } = useCarrito()

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <p className="mt-2 text-slate-600">Agrega productos desde el catálogo.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
          Ir al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Carrito</h1>
        <button type="button" onClick={vaciar} className="text-sm text-slate-500 hover:text-red-600">
          Vaciar carrito
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.producto_id} className="flex gap-3 p-4 sm:gap-4">
              <Link to={`/producto/${item.producto_id}`} className="shrink-0">
                <ImagenProducto src={item.imagen_url} alt={item.nombre} className="h-20 w-20 rounded-lg sm:h-24 sm:w-24" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/producto/${item.producto_id}`} className="font-medium leading-snug hover:text-indigo-700">
                    {item.nombre}
                  </Link>
                  <button
                    type="button"
                    onClick={() => quitar(item.producto_id)}
                    className="shrink-0 text-sm text-slate-400 hover:text-red-600"
                    aria-label={`Quitar ${item.nombre} del carrito`}
                  >
                    Quitar
                  </button>
                </div>
                <p className="text-sm text-slate-500">{formatearPrecio(item.precio)} c/u</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SelectorCantidad
                    valor={item.cantidad}
                    maximo={cantidadMaxima(item.stock)}
                    onCambiar={(n) => cambiarCantidad(item.producto_id, n)}
                  />
                  <p className="font-semibold">{formatearPrecio(item.precio * item.cantidad)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 font-semibold">Resumen</h2>
          <div className="flex justify-between text-sm text-slate-600">
            <span>
              {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
            </span>
            <span>{formatearPrecio(total)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatearPrecio(total)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">El total final se confirma con los precios vigentes al momento de pagar.</p>
          <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-md bg-slate-300 px-4 py-2.5 font-medium text-white">
            Proceder al pago
          </button>
          <p className="mt-1 text-center text-xs text-slate-500">Disponible en la siguiente fase</p>
        </aside>
      </div>
    </div>
  )
}
