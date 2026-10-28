import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { mensajeDeError } from '../api/cliente'
import MensajeError from '../components/MensajeError'
import { useAuth } from '../context/AuthContext'

interface EstadoNavegacion {
  desde?: string
  mensaje?: string
}

export default function Login() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const estado = (useLocation().state ?? {}) as EstadoNavegacion

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(email.trim(), password)
      navigate(estado.desde ?? '/', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>

      {estado.mensaje && !error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{estado.mensaje}</p>
      )}

      <form onSubmit={enviar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <MensajeError mensaje={error} />}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-medium text-indigo-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
