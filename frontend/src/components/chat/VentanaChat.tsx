import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface MensajeVista {
  id: number
  rol: 'usuario' | 'asistente'
  texto: string
  // local: se muestra pero no se envía al backend (bienvenida y avisos de error)
  local?: boolean
  error?: boolean
  // true si la respondió el proveedor de reglas (respaldo) y no Gemini
  automatica?: boolean
}

export const MAXIMO_CARACTERES = 500

const SUGERENCIAS = ['¿Cómo compro?', '¿Cómo funciona el pago?', '¿Dónde veo mis pedidos?']

interface Props {
  mensajes: MensajeVista[]
  esperando: boolean
  onEnviar: (texto: string) => void
  onNuevaConversacion: () => void
  onCerrar: () => void
}

export default function VentanaChat({ mensajes, esperando, onEnviar, onNuevaConversacion, onCerrar }: Props) {
  const [texto, setTexto] = useState('')
  const entradaRef = useRef<HTMLTextAreaElement>(null)
  const finRef = useRef<HTMLDivElement>(null)

  const hayMensajesDelUsuario = mensajes.some((m) => m.rol === 'usuario')

  // Al abrir, el foco va al campo de texto.
  useEffect(() => {
    entradaRef.current?.focus()
  }, [])

  // Al terminar de esperar, se devuelve el foco al campo (estaba deshabilitado).
  useEffect(() => {
    if (!esperando) entradaRef.current?.focus()
  }, [esperando])

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes, esperando])

  function enviar(contenido: string) {
    const limpio = contenido.trim()
    if (!limpio || esperando || limpio.length > MAXIMO_CARACTERES) return
    onEnviar(limpio)
    setTexto('')
  }

  // Enter envía; Shift+Enter hace salto de línea.
  function alPresionar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      enviar(texto)
    }
  }

  return (
    <section
      role="dialog"
      aria-label="Chat de ayuda"
      className="fixed inset-x-2 bottom-20 top-2 z-30 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[520px] sm:max-h-[calc(100vh-8rem)] sm:w-[380px]"
    >
      <header className="flex items-center justify-between gap-2 bg-indigo-600 px-4 py-3 text-white">
        <div>
          <h2 className="font-semibold">Asistente Tienda USCO</h2>
          <p className="text-xs text-indigo-100">Te ayudo a comprar en la tienda</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNuevaConversacion}
            className="rounded-md px-2 py-1 text-xs font-medium text-indigo-50 hover:bg-indigo-500"
          >
            Nueva conversación
          </button>
          <button type="button" onClick={onCerrar} className="rounded-md p-1 hover:bg-indigo-500" aria-label="Cerrar chat">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
        {mensajes.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.rol === 'usuario' ? 'items-end' : 'items-start'}`}>
            {/* Texto plano: React escapa el contenido y nunca se inserta como HTML (evita XSS). */}
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                m.rol === 'usuario'
                  ? 'rounded-br-sm bg-indigo-600 text-white'
                  : m.error
                    ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-700'
                    : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {m.texto}
            </p>
            {m.automatica && <span className="mt-0.5 px-1 text-[11px] text-slate-400">Respuesta automática</span>}
          </div>
        ))}

        {esperando && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm italic text-slate-500">Escribiendo...</p>
          </div>
        )}

        {!hayMensajesDelUsuario && !esperando && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar(texto)
        }}
        className="border-t border-slate-200 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={entradaRef}
            rows={2}
            value={texto}
            maxLength={MAXIMO_CARACTERES}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alPresionar}
            disabled={esperando}
            placeholder={esperando ? 'Esperando respuesta...' : 'Escribe tu pregunta...'}
            aria-label="Mensaje para el asistente"
            className="max-h-32 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={esperando || texto.trim() === ''}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            Enviar
          </button>
        </div>
        <p className={`mt-1 text-right text-xs ${texto.length >= MAXIMO_CARACTERES ? 'text-red-600' : 'text-slate-400'}`}>
          {texto.length}/{MAXIMO_CARACTERES}
        </p>
      </form>
    </section>
  )
}
