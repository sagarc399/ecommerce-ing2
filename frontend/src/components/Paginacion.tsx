interface Props {
  pagina: number
  totalPaginas: number
  onCambiar: (pagina: number) => void
}

// Muestra la primera, la última y las páginas cercanas a la actual, con "…" en los huecos.
function paginasVisibles(pagina: number, total: number): (number | '…')[] {
  const resultado: (number | '…')[] = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - pagina) <= 1) resultado.push(p)
    else if (resultado[resultado.length - 1] !== '…') resultado.push('…')
  }
  return resultado
}

export default function Paginacion({ pagina, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null

  const boton = 'min-w-9 rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Paginación">
      <button type="button" className={`${boton} border-slate-300 bg-white hover:bg-slate-100`} onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1}>
        Anterior
      </button>
      {paginasVisibles(pagina, totalPaginas).map((p, i) =>
        p === '…' ? (
          <span key={`hueco-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onCambiar(p)}
            aria-current={p === pagina ? 'page' : undefined}
            className={`${boton} ${p === pagina ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-100'}`}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className={`${boton} border-slate-300 bg-white hover:bg-slate-100`} onClick={() => onCambiar(pagina + 1)} disabled={pagina >= totalPaginas}>
        Siguiente
      </button>
    </nav>
  )
}
