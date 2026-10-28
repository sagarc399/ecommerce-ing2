import { useEffect, useState, type FormEvent } from 'react'
import { mensajeDeError } from '../api/cliente'
import { actualizarProducto, crearProducto, listarCategorias } from '../api/productos'
import type { Producto } from '../types'
import {
  aProductoEntrada,
  esUrlHttp,
  FORMULARIO_PRODUCTO_VACIO,
  formularioDesdeProducto,
  validarProducto,
  type ErroresProducto,
  type FormularioProducto as Formulario,
} from '../utils/producto'
import ImagenProducto from './ImagenProducto'
import MensajeError from './MensajeError'

interface Props {
  producto: Producto | null // null = crear
  onGuardado: (producto: Producto) => void
  onCancelar: () => void
}

export default function FormularioProducto({ producto, onGuardado, onCancelar }: Props) {
  const [form, setForm] = useState<Formulario>(() => (producto ? formularioDesdeProducto(producto) : FORMULARIO_PRODUCTO_VACIO))
  const [errores, setErrores] = useState<ErroresProducto>({})
  const [intentado, setIntentado] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]))
  }, [])

  function actualizar(clave: keyof Formulario, valor: string) {
    const nuevo = { ...form, [clave]: valor }
    setForm(nuevo)
    if (intentado) setErrores(validarProducto(nuevo))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (guardando) return
    setIntentado(true)
    setErrorServidor(null)
    const encontrados = validarProducto(form)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      const datos = aProductoEntrada(form)
      const guardado = producto ? await actualizarProducto(producto.id, datos) : await crearProducto(datos)
      onGuardado(guardado)
    } catch (err) {
      // Si el backend responde 400 se muestra su mensaje tal cual.
      setErrorServidor(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  const claseInput = (clave: keyof Formulario) =>
    `w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
      errores[clave] ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
    }`
  const errorDe = (clave: keyof Formulario) => (errores[clave] ? <p className="mt-1 text-xs text-red-600">{errores[clave]}</p> : null)
  const urlVistaPrevia = esUrlHttp(form.imagen_url.trim()) ? form.imagen_url.trim() : null

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      {errorServidor && <MensajeError mensaje={errorServidor} />}

      <div>
        <label htmlFor="p-nombre" className="mb-1 block text-sm font-medium">
          Nombre *
        </label>
        <input id="p-nombre" value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} className={claseInput('nombre')} />
        {errorDe('nombre')}
      </div>

      <div>
        <label htmlFor="p-descripcion" className="mb-1 block text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="p-descripcion"
          rows={3}
          value={form.descripcion}
          onChange={(e) => actualizar('descripcion', e.target.value)}
          className={claseInput('descripcion')}
        />
        {errorDe('descripcion')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="p-precio" className="mb-1 block text-sm font-medium">
            Precio (COP) *
          </label>
          <input
            id="p-precio"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.precio}
            onChange={(e) => actualizar('precio', e.target.value)}
            className={claseInput('precio')}
          />
          {errorDe('precio')}
        </div>
        <div>
          <label htmlFor="p-stock" className="mb-1 block text-sm font-medium">
            Stock *
          </label>
          <input
            id="p-stock"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            value={form.stock}
            onChange={(e) => actualizar('stock', e.target.value)}
            className={claseInput('stock')}
          />
          {errorDe('stock')}
        </div>
      </div>

      <div>
        <label htmlFor="p-categoria" className="mb-1 block text-sm font-medium">
          Categoría
        </label>
        <input
          id="p-categoria"
          list="categorias-existentes"
          value={form.categoria}
          onChange={(e) => actualizar('categoria', e.target.value)}
          className={claseInput('categoria')}
        />
        <datalist id="categorias-existentes">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errorDe('categoria')}
      </div>

      <div>
        <label htmlFor="p-imagen" className="mb-1 block text-sm font-medium">
          URL de la imagen
        </label>
        <input
          id="p-imagen"
          type="url"
          placeholder="https://..."
          value={form.imagen_url}
          onChange={(e) => actualizar('imagen_url', e.target.value)}
          className={claseInput('imagen_url')}
        />
        {errorDe('imagen_url')}
        <div className="mt-2">
          <p className="mb-1 text-xs text-slate-500">Vista previa</p>
          <ImagenProducto key={urlVistaPrevia ?? 'vacia'} src={urlVistaPrevia} alt="Vista previa" className="aspect-[3/2] w-full max-w-xs rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300">
          {guardando ? 'Guardando...' : producto ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
