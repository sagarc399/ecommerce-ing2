import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '../../api/cliente'
import { activarProducto, desactivarProducto, listarProductosAdmin } from '../../api/productos'
import Cargando from '../../components/Cargando'
import FormularioProducto from '../../components/FormularioProducto'
import ImagenProducto from '../../components/ImagenProducto'
import MensajeError from '../../components/MensajeError'
import Modal from '../../components/Modal'
import Paginacion from '../../components/Paginacion'
import { useToast } from '../../context/ToastContext'
import type { Producto, RespuestaPaginada } from '../../types'
import { formatearPrecio } from '../../utils/formato'

type FiltroEstado = 'todos' | 'activos' | 'inactivos'

const LIMITE = 10
const DEBOUNCE_MS = 400

function claseStock(stock: number): string {
  if (stock === 0) return 'font-semibold text-red-600'
  if (stock < 5) return 'font-semibold text-orange-500'
  return ''
}

export default function AdminProductos() {
  const toast = useToast()
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [pagina, setPagina] = useState(1)
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<Producto> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  // Formulario: undefined = cerrado, null = nuevo, Producto = editar.
  const [editando, setEditando] = useState<Producto | null | undefined>(undefined)
  const [porDesactivar, setPorDesactivar] = useState<Producto | null>(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBuscar(texto.trim())
      setPagina(1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(temporizador)
  }, [texto])

  useEffect(() => {
    const controlador = new AbortController()
    setCargando(true)
    setError(null)
    listarProductosAdmin(
      { buscar, activo: estado === 'todos' ? undefined : estado === 'activos', pagina, limite: LIMITE },
      controlador.signal
    )
      .then(setRespuesta)
      .catch((err) => {
        if (!controlador.signal.aborted) setError(mensajeDeError(err))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [buscar, estado, pagina, recarga])

  const recargar = () => setRecarga((n) => n + 1)
  const cerrarFormulario = useCallback(() => setEditando(undefined), [])
  const cerrarConfirmacion = useCallback(() => setPorDesactivar(null), [])

  function alGuardar(producto: Producto) {
    toast.exito(editando ? `"${producto.nombre}" actualizado` : `"${producto.nombre}" creado`)
    setEditando(undefined)
    recargar()
  }

  async function confirmarDesactivar() {
    if (!porDesactivar || procesando) return
    setProcesando(true)
    try {
      await desactivarProducto(porDesactivar.id)
      toast.exito(`"${porDesactivar.nombre}" desactivado`)
      setPorDesactivar(null)
      recargar()
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setProcesando(false)
    }
  }

  async function activar(producto: Producto) {
    try {
      await activarProducto(producto.id)
      toast.exito(`"${producto.nombre}" activado`)
      recargar()
    } catch (err) {
      toast.error(mensajeDeError(err))
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre o descripción..."
          aria-label="Buscar productos"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as FiltroEstado)
            setPagina(1)
          }}
          aria-label="Filtrar por estado"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 sm:w-40"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        <button
          type="button"
          onClick={() => setEditando(null)}
          className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + Nuevo producto
        </button>
      </div>

      {error ? (
        <MensajeError mensaje={error} onReintentar={recargar} />
      ) : cargando && !respuesta ? (
        <Cargando texto="Cargando productos..." />
      ) : respuesta && respuesta.datos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-600">
          No se encontraron productos
        </div>
      ) : respuesta ? (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {respuesta.total} {respuesta.total === 1 ? 'producto' : 'productos'}
            {cargando && ' · actualizando...'}
          </p>
          {/* En pantallas pequeñas la tabla se desplaza dentro de su contenedor, no la página. */}
          <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${cargando ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {respuesta.datos.map((p) => (
                  <tr key={p.id} className={p.activo ? '' : 'bg-slate-50 text-slate-500'}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <ImagenProducto src={p.imagen_url} alt={p.nombre} className="h-10 w-10 shrink-0 rounded-md" />
                        <div>
                          <p className="font-medium text-slate-800">{p.nombre}</p>
                          <p className="text-xs text-slate-400">#{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{p.categoria ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{formatearPrecio(p.precio)}</td>
                    <td className={`px-3 py-2 text-right ${claseStock(p.stock)}`}>{p.stock}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditando(p)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100">
                          Editar
                        </button>
                        {p.activo ? (
                          <button
                            type="button"
                            onClick={() => setPorDesactivar(p)}
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => activar(p)}
                            className="rounded-md border border-emerald-200 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={respuesta.pagina} totalPaginas={respuesta.totalPaginas} onCambiar={setPagina} />
        </>
      ) : null}

      <Modal
        titulo={editando ? `Editar producto #${editando.id}` : 'Nuevo producto'}
        abierto={editando !== undefined}
        onCerrar={cerrarFormulario}
        ancho="max-w-lg"
      >
        {editando !== undefined && <FormularioProducto key={editando?.id ?? 'nuevo'} producto={editando} onGuardado={alGuardar} onCancelar={cerrarFormulario} />}
      </Modal>

      <Modal titulo="Desactivar producto" abierto={porDesactivar !== null} onCerrar={cerrarConfirmacion}>
        <p className="text-slate-600">
          ¿Seguro que quieres desactivar <strong>{porDesactivar?.nombre}</strong>? Dejará de aparecer en el catálogo, pero se conserva en la base de
          datos y en el historial de pedidos. Puedes volver a activarlo después.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={cerrarConfirmacion} className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarDesactivar}
            disabled={procesando}
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-red-300"
          >
            {procesando ? 'Desactivando...' : 'Sí, desactivar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
