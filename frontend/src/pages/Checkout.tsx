import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import { crearOrden } from '../api/ordenes'
import ImagenProducto from '../components/ImagenProducto'
import { useAuth } from '../context/AuthContext'
import { useCarrito } from '../context/CarritoContext'
import { useToast } from '../context/ToastContext'
import { formatearPrecio } from '../utils/formato'
import {
  formatearNumeroTarjeta,
  formatearVencimiento,
  soloDigitos,
  validarTarjeta,
  type ErroresTarjeta,
  type FormularioTarjeta,
} from '../utils/tarjeta'

type Problema =
  | { tipo: 'rechazo'; ordenId: number | null }
  | { tipo: 'stock'; productoId: number; nombre: string; disponible: number; solicitado: number }
  | { tipo: 'noDisponible'; nombre: string }
  | { tipo: 'error'; mensaje: string }

const FORMULARIO_VACIO: FormularioTarjeta = { numero: '', titular: '', vencimiento: '', cvv: '' }

function campo(datos: unknown, clave: string): unknown {
  return datos && typeof datos === 'object' && clave in datos ? (datos as Record<string, unknown>)[clave] : undefined
}

export default function Checkout() {
  const { usuario } = useAuth()
  const { items, total, totalUnidades, vaciar, quitar, ajustarADisponible } = useCarrito()
  const toast = useToast()
  const navigate = useNavigate()

  // Los datos de la tarjeta viven SOLO en este estado: nunca en localStorage, logs ni URL.
  const [form, setForm] = useState<FormularioTarjeta>(FORMULARIO_VACIO)
  const [errores, setErrores] = useState<ErroresTarjeta>({})
  const [tocados, setTocados] = useState<Partial<Record<keyof FormularioTarjeta, boolean>>>({})
  const [enviando, setEnviando] = useState(false)
  const [problema, setProblema] = useState<Problema | null>(null)
  // El ref bloquea un segundo envío aunque el doble clic llegue antes de que React re-renderice.
  const enviandoRef = useRef(false)
  const cvvRef = useRef<HTMLInputElement>(null)

  if (usuario?.rol === 'admin') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Los administradores no pueden realizar compras</h1>
        <Link to="/admin" className="mt-6 inline-block font-medium text-indigo-700 hover:underline">
          Ir al panel admin
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <p className="mt-2 text-slate-600">Agrega productos antes de pagar.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
          Ir al catálogo
        </Link>
      </div>
    )
  }

  function actualizar(clave: keyof FormularioTarjeta, valor: string) {
    const nuevo = { ...form, [clave]: valor }
    setForm(nuevo)
    if (tocados[clave]) setErrores(validarTarjeta(nuevo))
  }

  function marcarTocado(clave: keyof FormularioTarjeta) {
    setTocados((t) => ({ ...t, [clave]: true }))
    setErrores(validarTarjeta(form))
  }

  async function pagar(e: FormEvent) {
    e.preventDefault()
    if (enviandoRef.current) return

    const encontrados = validarTarjeta(form)
    setErrores(encontrados)
    setTocados({ numero: true, titular: true, vencimiento: true, cvv: true })
    if (Object.keys(encontrados).length > 0) return

    enviandoRef.current = true
    setEnviando(true)
    setProblema(null)
    let rechazado = false

    try {
      const orden = await crearOrden(
        items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        { numero_tarjeta: form.numero, titular: form.titular.trim(), vencimiento: form.vencimiento, cvv: form.cvv }
      )
      navigate(`/pedidos/${orden.id}`, { state: { exito: true } })
      vaciar()
      toast.exito(`¡Pago aprobado! Pedido #${orden.id} confirmado.`)
    } catch (err) {
      if (!(err instanceof ErrorApi)) {
        setProblema({ tipo: 'error', mensaje: mensajeDeError(err) })
      } else if (err.status === 401) {
        return // AuthContext cierra la sesión y redirige a /login
      } else if (err.status === 402) {
        rechazado = true
        const ordenId = campo(err.datos, 'orden_id')
        setProblema({ tipo: 'rechazo', ordenId: typeof ordenId === 'number' ? ordenId : null })
        toast.error('Pago rechazado. Intenta con otra tarjeta.')
      } else if (err.status === 409) {
        const productoId = Number(campo(err.datos, 'producto_id'))
        setProblema({
          tipo: 'stock',
          productoId,
          nombre: String(campo(err.datos, 'producto') ?? `Producto ${productoId}`),
          disponible: Number(campo(err.datos, 'disponible') ?? 0),
          solicitado: Number(campo(err.datos, 'solicitado') ?? 0),
        })
      } else if (err.status === 404) {
        const productoId = Number(campo(err.datos, 'producto_id'))
        const nombre = items.find((i) => i.producto_id === productoId)?.nombre ?? `Producto ${productoId}`
        quitar(productoId)
        setProblema({ tipo: 'noDisponible', nombre })
      } else {
        setProblema({ tipo: 'error', mensaje: err.message })
      }
    } finally {
      if (rechazado) {
        // USA-03: tras un rechazo se conservan número, titular y vencimiento (solo en este estado de
        // React, nunca en el almacenamiento del navegador) para no reescribir la tarjeta; el CVV se
        // borra siempre por seguridad y el foco va a ese campo.
        setForm((f) => ({ ...f, cvv: '' }))
        setTocados((t) => ({ ...t, cvv: false }))
        setErrores((er) => ({ ...er, cvv: undefined }))
        cvvRef.current?.focus()
      } else {
        // Con cualquier otro resultado se borran todos los datos de la tarjeta.
        setForm(FORMULARIO_VACIO)
        setTocados({})
        setErrores({})
      }
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  function ajustarCantidad() {
    if (problema?.tipo !== 'stock') return
    ajustarADisponible(problema.productoId, problema.disponible)
    toast.exito(
      problema.disponible > 0
        ? `Cantidad de "${problema.nombre}" ajustada a ${problema.disponible}`
        : `"${problema.nombre}" se quitó del carrito`
    )
    setProblema(null)
  }

  const claseInput = (clave: keyof FormularioTarjeta) =>
    `w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
      tocados[clave] && errores[clave] ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
    }`

  const errorDe = (clave: keyof FormularioTarjeta) =>
    tocados[clave] && errores[clave] ? <p className="mt-1 text-xs text-red-600">{errores[clave]}</p> : null

  return (
    <div>
      <Link to="/carrito" className="mb-4 inline-block text-sm text-indigo-700 hover:underline">
        ← Volver al carrito
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Pagar</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={pagar} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
            Pago simulado. Usa cualquier tarjeta de 16 dígitos. Si termina en 0000 será rechazada.
          </div>

          {problema?.tipo === 'rechazo' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <p className="font-medium">Pago rechazado. Intenta con otra tarjeta.</p>
              <p className="mt-1">Por seguridad, vuelve a ingresar el CVV.</p>
              {problema.ordenId && (
                <p className="mt-1">
                  La orden #{problema.ordenId} quedó registrada como rechazada en{' '}
                  <Link to="/pedidos" className="font-medium underline">
                    Mis pedidos
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
          {problema?.tipo === 'stock' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
              <p>
                No hay stock suficiente de <strong>{problema.nombre}</strong>: pediste {problema.solicitado} y{' '}
                {problema.disponible === 0 ? 'ya no quedan unidades' : `solo hay ${problema.disponible} disponible${problema.disponible === 1 ? '' : 's'}`}.
              </p>
              <button type="button" onClick={ajustarCantidad} className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700">
                Ajustar cantidad
              </button>
            </div>
          )}
          {problema?.tipo === 'noDisponible' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
              <strong>{problema.nombre}</strong> ya no está disponible y se quitó de tu carrito. Revisa el resumen y vuelve a intentar.
            </div>
          )}
          {problema?.tipo === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {problema.mensaje}
            </div>
          )}

          <div>
            <label htmlFor="numero" className="mb-1 block text-sm font-medium">
              Número de tarjeta
            </label>
            <input
              id="numero"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4111 1111 1111 1111"
              value={form.numero}
              onChange={(e) => actualizar('numero', formatearNumeroTarjeta(e.target.value))}
              onBlur={() => marcarTocado('numero')}
              className={`${claseInput('numero')} font-mono tracking-wider`}
            />
            {errorDe('numero')}
          </div>

          <div>
            <label htmlFor="titular" className="mb-1 block text-sm font-medium">
              Titular
            </label>
            <input
              id="titular"
              autoComplete="off"
              placeholder="Como aparece en la tarjeta"
              value={form.titular}
              onChange={(e) => actualizar('titular', e.target.value)}
              onBlur={() => marcarTocado('titular')}
              className={claseInput('titular')}
            />
            {errorDe('titular')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vencimiento" className="mb-1 block text-sm font-medium">
                Vencimiento
              </label>
              <input
                id="vencimiento"
                inputMode="numeric"
                autoComplete="off"
                placeholder="MM/AA"
                value={form.vencimiento}
                onChange={(e) => actualizar('vencimiento', formatearVencimiento(e.target.value))}
                onBlur={() => marcarTocado('vencimiento')}
                className={claseInput('vencimiento')}
              />
              {errorDe('vencimiento')}
            </div>
            <div>
              <label htmlFor="cvv" className="mb-1 block text-sm font-medium">
                CVV
              </label>
              <input
                id="cvv"
                ref={cvvRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="•••"
                value={form.cvv}
                onChange={(e) => actualizar('cvv', soloDigitos(e.target.value, 3))}
                onBlur={() => marcarTocado('cvv')}
                className={claseInput('cvv')}
              />
              {errorDe('cvv')}
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
          >
            {enviando ? 'Procesando...' : `Pagar ${formatearPrecio(total)}`}
          </button>
        </form>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 font-semibold">Resumen del pedido</h2>
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.producto_id} className="flex items-center gap-3 py-2">
                <ImagenProducto src={i.imagen_url} alt={i.nombre} className="h-12 w-12 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {i.cantidad} × {formatearPrecio(i.precio)}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatearPrecio(i.precio * i.cantidad)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
            <span>
              Total <span className="text-sm font-normal text-slate-500">({totalUnidades} u.)</span>
            </span>
            <span>{formatearPrecio(total)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">El total final lo calcula el servidor con los precios vigentes.</p>
        </aside>
      </div>
    </div>
  )
}
