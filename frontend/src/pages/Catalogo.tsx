import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '../api/cliente'
import { listarCategorias, listarProductos } from '../api/productos'
import Cargando from '../components/Cargando'
import MensajeError from '../components/MensajeError'
import Paginacion from '../components/Paginacion'
import TarjetaProducto from '../components/TarjetaProducto'
import type { Producto, RespuestaPaginada } from '../types'

const LIMITE = 12
const DEBOUNCE_MS = 400

function leerPagina(valor: string | null): number {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export default function Catalogo() {
  // Los filtros viven en la URL (?buscar=&categoria=&pagina=) para que recargar no los pierda.
  const [params, setParams] = useSearchParams()
  const buscar = params.get('buscar') ?? ''
  const categoria = params.get('categoria') ?? ''
  const pagina = leerPagina(params.get('pagina'))

  const [texto, setTexto] = useState(buscar)
  const ultimoBuscado = useRef(buscar)
  const [categorias, setCategorias] = useState<string[]>([])
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<Producto> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  const actualizarFiltros = useCallback(
    (cambios: Record<string, string | null>, reemplazar = false) => {
      setParams(
        (anteriores) => {
          const nuevos = new URLSearchParams(anteriores)
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor) nuevos.set(clave, valor)
            else nuevos.delete(clave)
          }
          return nuevos
        },
        { replace: reemplazar }
      )
    },
    [setParams]
  )

  // Si la búsqueda de la URL cambia por fuera del input (p. ej. clic en el logo), se sincroniza el input.
  useEffect(() => {
    if (buscar !== ultimoBuscado.current) {
      ultimoBuscado.current = buscar
      setTexto(buscar)
    }
  }, [buscar])

  // Debounce: la búsqueda se aplica 400 ms después de dejar de escribir y vuelve a la página 1.
  useEffect(() => {
    const limpio = texto.trim()
    if (limpio === buscar) return
    const temporizador = setTimeout(() => {
      ultimoBuscado.current = limpio
      actualizarFiltros({ buscar: limpio, pagina: null }, true)
    }, DEBOUNCE_MS)
    return () => clearTimeout(temporizador)
  }, [texto, buscar, actualizarFiltros])

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]))
  }, [])

  useEffect(() => {
    const controlador = new AbortController()
    setCargando(true)
    setError(null)
    listarProductos({ buscar, categoria, pagina, limite: LIMITE }, controlador.signal)
      .then(setRespuesta)
      .catch((err) => {
        if (!controlador.signal.aborted) setError(mensajeDeError(err))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [buscar, categoria, pagina, intento])

  const hayFiltros = buscar !== '' || categoria !== ''

  function limpiarFiltros() {
    setTexto('')
    ultimoBuscado.current = ''
    setParams({})
  }

  function cambiarPagina(nueva: number) {
    actualizarFiltros({ pagina: nueva > 1 ? String(nueva) : null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Catálogo</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar productos..."
            aria-label="Buscar productos"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => actualizarFiltros({ categoria: e.target.value, pagina: null })}
          aria-label="Filtrar por categoría"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-56"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <MensajeError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
      ) : cargando && !respuesta ? (
        <Cargando texto="Cargando productos..." />
      ) : respuesta && respuesta.datos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-lg font-medium text-slate-700">No se encontraron productos</p>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className="mt-3 text-sm font-medium text-indigo-700 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : respuesta ? (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {respuesta.total} {respuesta.total === 1 ? 'producto' : 'productos'}
            {cargando && ' · actualizando...'}
          </p>
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${cargando ? 'opacity-60' : ''}`}>
            {respuesta.datos.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
          <Paginacion pagina={respuesta.pagina} totalPaginas={respuesta.totalPaginas} onCambiar={cambiarPagina} />
        </>
      ) : null}
    </div>
  )
}
