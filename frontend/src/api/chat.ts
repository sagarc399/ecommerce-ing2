import { apiFetch } from './cliente'

export type RolChat = 'usuario' | 'asistente'

export interface MensajeChatApi {
  rol: RolChat
  texto: string
}

export interface RespuestaChat {
  respuesta: string
  proveedor: 'groq' | 'gemini' | 'reglas'
}

export function enviarMensaje(mensajes: MensajeChatApi[]) {
  return apiFetch<RespuestaChat>('/chat', { metodo: 'POST', cuerpo: { mensajes } })
}
