import type { Usuario } from '../types'
import { apiFetch } from './cliente'

export interface RespuestaLogin {
  token: string
  usuario: Usuario
}

export function login(email: string, password: string) {
  return apiFetch<RespuestaLogin>('/auth/login', { metodo: 'POST', cuerpo: { email, password } })
}

export function registro(nombre: string, email: string, password: string) {
  return apiFetch<Usuario>('/auth/registro', { metodo: 'POST', cuerpo: { nombre, email, password } })
}

// Se usa al recargar para validar el token guardado; el 401 lo maneja AuthContext sin redirigir.
export function obtenerUsuarioActual() {
  return apiFetch<Usuario>('/auth/me', { manejarExpiracion: false })
}
