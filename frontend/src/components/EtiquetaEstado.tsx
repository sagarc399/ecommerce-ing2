import type { EstadoOrden } from '../types'

export default function EtiquetaEstado({ estado }: { estado: EstadoOrden }) {
  const pagada = estado === 'PAGADA'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        pagada ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
      }`}
    >
      {estado}
    </span>
  )
}
