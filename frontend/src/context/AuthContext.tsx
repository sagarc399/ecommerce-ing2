import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'
import { alExpirarSesion, ErrorApi, guardarToken, obtenerToken } from '../api/cliente'
import type { Usuario } from '../types'

interface ValorAuth {
  usuario: Usuario | null
  token: string | null
  cargando: boolean // true mientras se valida la sesión guardada al recargar
  login: (email: string, password: string) => Promise<Usuario>
  registro: (nombre: string, email: string, password: string) => Promise<Usuario>
  logout: () => void
}

const AuthContext = createContext<ValorAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => obtenerToken())
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState<boolean>(() => obtenerToken() !== null)

  const logout = useCallback(() => {
    guardarToken(null)
    setToken(null)
    setUsuario(null)
  }, [])

  // Si el backend responde 401 a una petición con token: se cierra la sesión y se va a /login.
  useEffect(() => {
    alExpirarSesion(() => {
      logout()
      navigate('/login', { state: { mensaje: 'Tu sesión expiró. Inicia sesión de nuevo.' } })
    })
    return () => alExpirarSesion(null)
  }, [logout, navigate])

  // Al recargar la página se valida el token guardado con GET /auth/me.
  // Si es inválido solo se limpia la sesión, sin sacar al usuario de la página en la que está.
  useEffect(() => {
    if (!obtenerToken()) return
    let cancelado = false
    authApi
      .obtenerUsuarioActual()
      .then((u) => {
        if (!cancelado) setUsuario(u)
      })
      .catch((err) => {
        // Otros errores (p. ej. backend caído) no cierran la sesión.
        if (err instanceof ErrorApi && err.status === 401) logout()
        else console.error(err)
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const respuesta = await authApi.login(email, password)
    guardarToken(respuesta.token)
    setToken(respuesta.token)
    setUsuario(respuesta.usuario)
    return respuesta.usuario
  }, [])

  const registro = useCallback(
    async (nombre: string, email: string, password: string) => {
      await authApi.registro(nombre, email, password)
      return login(email, password)
    },
    [login]
  )

  const valor = useMemo(
    () => ({ usuario, token, cargando, login, registro, logout }),
    [usuario, token, cargando, login, registro, logout]
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): ValorAuth {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return contexto
}
