const API_URL: string | undefined = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('Falta la variable VITE_API_URL en frontend/.env')
}

const CLAVE_TOKEN = 'token'

export class ErrorApi extends Error {
  status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
  }
}

export function obtenerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN)
}

export function guardarToken(token: string | null) {
  if (token) localStorage.setItem(CLAVE_TOKEN, token)
  else localStorage.removeItem(CLAVE_TOKEN)
}

// AuthContext registra aquí qué hacer cuando el backend rechaza el token (401).
let manejadorNoAutorizado: (() => void) | null = null

export function alExpirarSesion(manejador: (() => void) | null) {
  manejadorNoAutorizado = manejador
}

interface OpcionesFetch {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo?: unknown
  senal?: AbortSignal
  // false: un 401 no dispara el cierre de sesión global (lo maneja quien llama).
  manejarExpiracion?: boolean
}

export async function apiFetch<T>(ruta: string, opciones: OpcionesFetch = {}): Promise<T> {
  const token = obtenerToken()
  const encabezados: Record<string, string> = {}
  if (opciones.cuerpo !== undefined) encabezados['Content-Type'] = 'application/json'
  if (token) encabezados.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: encabezados,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
      signal: opciones.senal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
  }

  const texto = await respuesta.text()
  let datos: unknown = null
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    // Token enviado pero rechazado: la sesión expiró o el token no es válido.
    if (respuesta.status === 401 && token && opciones.manejarExpiracion !== false) manejadorNoAutorizado?.()

    const mensaje =
      datos && typeof datos === 'object' && 'mensaje' in datos && typeof datos.mensaje === 'string'
        ? datos.mensaje
        : `Error inesperado (HTTP ${respuesta.status})`
    throw new ErrorApi(respuesta.status, mensaje)
  }

  return datos as T
}

export function mensajeDeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado'
}
