import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
import { listarOrdenesAdmin } from '../../api/ordenes'
import Cargando from '../../components/Cargando'
import EtiquetaEstado from '../../components/EtiquetaEstado'
import MensajeError from '../../components/MensajeError'
import Paginacion from '../../components/Paginacion'
import type { EstadoOrden, Orden, RespuestaPaginada } from '../../types'
import { formatearFecha, formatearPrecio } from '../../utils/formato'

const LIMITE = 10

export default function AdminOrdenes() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoOrden | ''>('')
  const [pagina, setPagina] = useState(1)
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<Orden> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    setCargando(true)
    setError(null)
    listarOrdenesAdmin({ estado: estado || undefined, pagina, limite: LIMITE }, controlador.signal)
      .then(setRespuesta)
      .catch((err) => {
        if (!controlador.signal.aborted) setError(mensajeDeError(err))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [estado, pagina, intento])

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="filtro-estado" className="text-sm text-slate-600">
          Estado
        </label>
        <select
          id="filtro-estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoOrden | '')
            setPagina(1)
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">Todos</option>
          <option value="PAGADA">Pagadas</option>
          <option value="RECHAZADA">Rechazadas</option>
        </select>
      </div>

      {error ? (
        <MensajeError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
      ) : cargando && !respuesta ? (
        <Cargando texto="Cargando órdenes..." />
      ) : respuesta && respuesta.datos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-600">No hay órdenes</div>
      ) : respuesta ? (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {respuesta.total} {respuesta.total === 1 ? 'orden' : 'órdenes'}
            {cargando && ' · actualizando...'}
          </p>
          <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${cargando ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Comprador</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {respuesta.datos.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/admin/ordenes/${o.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/admin/ordenes/${o.id}`} className="text-indigo-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                        #{o.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <p>{o.comprador.nombre}</p>
                      <p className="text-xs text-slate-400">{o.comprador.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{formatearFecha(o.creado_en)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatearPrecio(o.total)}</td>
                    <td className="px-3 py-2">
                      <EtiquetaEstado estado={o.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={respuesta.pagina} totalPaginas={respuesta.totalPaginas} onCambiar={setPagina} />
        </>
      ) : null}
    </div>
  )
}
