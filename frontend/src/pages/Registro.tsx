import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '../api/cliente'
import MensajeError from '../components/MensajeError'
import { useAuth } from '../context/AuthContext'
import { rutaInternaSegura } from '../utils/formato'

const PASSWORD_MINIMO = 8

export default function Registro() {
  const { usuario, registro } = useAuth()
  const navigate = useNavigate()
  const redirigir = rutaInternaSegura(useSearchParams()[0].get('redirigir'))
  const destino = redirigir ?? '/'

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={destino} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validación en el cliente (el backend vuelve a validar).
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (password.length < PASSWORD_MINIMO) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MINIMO} caracteres`)
      return
    }

    setEnviando(true)
    try {
      await registro(nombre.trim(), email.trim(), password)
      navigate(destino, { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const claseInput =
    'w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>

      <form onSubmit={enviar} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <MensajeError mensaje={error} />}

        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
            Nombre
          </label>
          <input id="nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className={claseInput} />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={claseInput} />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={claseInput}
            aria-describedby="ayuda-password"
          />
          <p id="ayuda-password" className={`mt-1 text-xs ${password && password.length < PASSWORD_MINIMO ? 'text-red-600' : 'text-slate-500'}`}>
            Mínimo {PASSWORD_MINIMO} caracteres
          </p>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {enviando ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link
          to={redirigir ? `/login?redirigir=${encodeURIComponent(redirigir)}` : '/login'}
          className="font-medium text-indigo-700 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
