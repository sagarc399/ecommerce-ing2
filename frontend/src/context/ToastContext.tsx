import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type TipoToast = 'exito' | 'error'

interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
}

interface ValorToast {
  exito: (mensaje: string) => void
  error: (mensaje: string) => void
}

const DURACION_MS = 4000
const ToastContext = createContext<ValorToast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const siguienteId = useRef(1)

  const cerrar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = siguienteId.current++
      setToasts((actuales) => [...actuales, { id, tipo, mensaje }])
      setTimeout(() => cerrar(id), DURACION_MS)
    },
    [cerrar]
  )

  const valor = useMemo(
    () => ({ exito: (m: string) => mostrar('exito', m), error: (m: string) => mostrar('error', m) }),
    [mostrar]
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 sm:items-end" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tipo === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
              t.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            <span className="flex-1">{t.mensaje}</span>
            <button type="button" onClick={() => cerrar(t.id)} className="opacity-80 hover:opacity-100" aria-label="Cerrar notificación">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ValorToast {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return contexto
}
