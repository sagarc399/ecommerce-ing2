interface Props {
  valor: number
  minimo?: number
  maximo: number
  onCambiar: (valor: number) => void
}

export default function SelectorCantidad({ valor, minimo = 1, maximo, onCambiar }: Props) {
  const boton =
    'flex h-9 w-9 items-center justify-center text-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent'

  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
      <button type="button" className={boton} onClick={() => onCambiar(valor - 1)} disabled={valor <= minimo} aria-label="Disminuir cantidad">
        −
      </button>
      <span className="w-10 text-center text-sm font-medium" aria-live="polite">
        {valor}
      </span>
      <button type="button" className={boton} onClick={() => onCambiar(valor + 1)} disabled={valor >= maximo} aria-label="Aumentar cantidad">
        +
      </button>
    </div>
  )
}
