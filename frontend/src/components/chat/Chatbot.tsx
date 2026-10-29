import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { enviarMensaje } from '../../api/chat'
import { mensajeDeError } from '../../api/cliente'
import BotonChat from './BotonChat'
import VentanaChat, { type MensajeVista } from './VentanaChat'

const BIENVENIDA = '¡Hola! Soy el asistente de Tienda USCO. Puedo ayudarte a comprar, pagar o revisar tus pedidos. ¿En qué te ayudo?'

// En estas rutas el chat no se muestra, para que el botón flotante no tape "Pagar".
const RUTAS_SIN_CHAT = ['/checkout']

// Se monta una sola vez en el Layout: la conversación sobrevive a los cambios de página
// (también al pasar por /checkout, donde solo se oculta). Vive solo en memoria, nunca en localStorage.
export default function Chatbot() {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeVista[]>([])
  const [esperando, setEsperando] = useState(false)
  const siguienteId = useRef(1)
  const botonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const visible = !RUTAS_SIN_CHAT.includes(pathname)

  const nuevo = (m: Omit<MensajeVista, 'id'>): MensajeVista => ({ ...m, id: siguienteId.current++ })

  const abrir = useCallback(() => {
    setAbierto(true)
    setMensajes((actuales) => (actuales.length === 0 ? [nuevo({ rol: 'asistente', texto: BIENVENIDA, local: true })] : actuales))
  }, [])

  const cerrar = useCallback(() => {
    setAbierto(false)
    botonRef.current?.focus()
  }, [])

  // Escape cierra el chat.
  useEffect(() => {
    if (!abierto || !visible) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto, visible, cerrar])

  async function enviar(texto: string) {
    const delUsuario = nuevo({ rol: 'usuario', texto })
    const historial = [...mensajes, delUsuario]
    setMensajes(historial)
    setEsperando(true)
    try {
      // Solo se envía la conversación real: la bienvenida y los avisos de error son locales.
      const { respuesta, proveedor } = await enviarMensaje(historial.filter((m) => !m.local).map(({ rol, texto }) => ({ rol, texto })))
      setMensajes((actuales) => [...actuales, nuevo({ rol: 'asistente', texto: respuesta, automatica: proveedor === 'reglas' })])
    } catch (err) {
      // Errores (incluido 429) dentro del chat, no en un alert.
      setMensajes((actuales) => [...actuales, nuevo({ rol: 'asistente', texto: mensajeDeError(err), local: true, error: true })])
    } finally {
      setEsperando(false)
    }
  }

  function nuevaConversacion() {
    setMensajes([nuevo({ rol: 'asistente', texto: BIENVENIDA, local: true })])
  }

  if (!visible) return null

  return (
    <>
      {abierto && (
        <VentanaChat
          mensajes={mensajes}
          esperando={esperando}
          onEnviar={enviar}
          onNuevaConversacion={nuevaConversacion}
          onCerrar={cerrar}
        />
      )}
      <BotonChat ref={botonRef} abierto={abierto} onAlternar={abierto ? cerrar : abrir} />
    </>
  )
}
