import { useEffect, type ReactNode } from 'react'

interface Props {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}

// Modal propio (en lugar de window.confirm): se cierra con Escape o clic en el fondo.
export default function Modal({ titulo, abierto, onCerrar, children, ancho = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal"
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 ${ancho}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="titulo-modal" className="text-lg font-semibold">
            {titulo}
          </h2>
          <button type="button" onClick={onCerrar} className="text-slate-500 hover:text-slate-700" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
