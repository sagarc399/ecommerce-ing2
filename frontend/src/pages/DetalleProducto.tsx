import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import { obtenerProducto } from '../api/productos'
import Cargando from '../components/Cargando'
import ImagenProducto from '../components/ImagenProducto'
import MensajeError from '../components/MensajeError'
import SelectorCantidad from '../components/SelectorCantidad'
import { useAuth } from '../context/AuthContext'
import { cantidadMaxima, useCarrito } from '../context/CarritoContext'
import type { Producto } from '../types'
import { formatearPrecio } from '../utils/formato'

export default function DetalleProducto() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero >= 1

  const { usuario } = useAuth()
  const { agregar, cantidadEnCarrito } = useCarrito()

  const [producto, setProducto] = useState<Producto | null>(null)
  const [cargando, setCargando] = useState(idValido)
  const [error, setError] = useState<{ status: number; mensaje: string } | null>(null)
  const [intento, setIntento] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState<number | null>(null)

  useEffect(() => {
    if (!idValido) return
    const controlador = new AbortController()
    setCargando(true)
    setError(null)
    obtenerProducto(idNumero, controlador.signal)
      .then(setProducto)
      .catch((err) => {
        if (controlador.signal.aborted) return
        setError({ status: err instanceof ErrorApi ? err.status : 0, mensaje: mensajeDeError(err) })
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [idNumero, idValido, intento])

  if (!idValido || error?.status === 404 || error?.status === 400) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Producto no encontrado</h1>
        <p className="mt-2 text-slate-600">El producto no existe o ya no está disponible.</p>
        <Link to="/" className="mt-6 inline-block font-medium text-indigo-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>
    )
  }
  if (error) return <MensajeError mensaje={error.mensaje} onReintentar={() => setIntento((n) => n + 1)} />
  if (cargando || !producto) return <Cargando texto="Cargando producto..." />

  const enCarrito = cantidadEnCarrito(producto.id)
  const disponibleParaAgregar = cantidadMaxima(producto.stock) - enCarrito
  const agotado = producto.stock === 0
  const esAdmin = usuario?.rol === 'admin'

  function agregarAlCarrito() {
    if (!producto) return
    agregar(producto, cantidad)
    setAgregado(cantidad)
    setCantidad(1)
  }

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-indigo-700 hover:underline">
        ← Volver al catálogo
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ImagenProducto src={producto.imagen_url} alt={producto.nombre} className="aspect-[3/2] w-full rounded-xl" />

        <div className="flex flex-col gap-3">
          {producto.categoria && <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">{producto.categoria}</p>}
          <h1 className="text-2xl font-bold sm:text-3xl">{producto.nombre}</h1>
          <p className="text-3xl font-bold text-slate-900">{formatearPrecio(producto.precio)}</p>
          <p className={`text-sm font-medium ${agotado ? 'text-red-600' : 'text-emerald-700'}`}>
            {agotado ? 'Agotado' : `${producto.stock} ${producto.stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`}
          </p>
          {producto.descripcion && <p className="leading-relaxed text-slate-600">{producto.descripcion}</p>}

          <div className="mt-2 border-t border-slate-200 pt-4">
            {esAdmin ? (
              <p className="text-sm text-slate-500">Los administradores no pueden realizar compras.</p>
            ) : agotado ? (
              <button type="button" disabled className="w-full rounded-md bg-slate-300 px-4 py-3 font-medium text-white sm:w-auto">
                Agotado
              </button>
            ) : disponibleParaAgregar <= 0 ? (
              <p className="text-sm text-slate-600">
                Ya tienes la cantidad máxima de este producto en el{' '}
                <Link to="/carrito" className="font-medium text-indigo-700 hover:underline">
                  carrito
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <SelectorCantidad valor={Math.min(cantidad, disponibleParaAgregar)} maximo={disponibleParaAgregar} onCambiar={setCantidad} />
                <button
                  type="button"
                  onClick={agregarAlCarrito}
                  className="flex-1 rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 sm:flex-none"
                >
                  Agregar al carrito
                </button>
              </div>
            )}

            {!esAdmin && enCarrito > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                {agregado !== null && <span className="font-medium text-emerald-700">✓ Agregado al carrito. </span>}
                Tienes {enCarrito} en el carrito ·{' '}
                <Link to="/carrito" className="font-medium text-indigo-700 hover:underline">
                  Ver carrito
                </Link>
              </p>
            )}
            {!esAdmin && !agotado && (
              <p className="mt-2 text-xs text-slate-600">
                Máximo {cantidadMaxima(producto.stock)} {cantidadMaxima(producto.stock) === 1 ? 'unidad' : 'unidades'} por compra.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
