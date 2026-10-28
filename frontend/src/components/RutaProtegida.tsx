import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Rol } from '../types'
import Cargando from './Cargando'

interface Props {
  children: ReactNode
  roles?: Rol[]
}

// Exige sesión iniciada (y opcionalmente un rol). Sin sesión → /login?redirigir=<ruta actual>.
export default function RutaProtegida({ children, roles }: Props) {
  const { usuario, cargando, salidaVoluntaria } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <Cargando texto="Verificando sesión..." />
  // Si acaba de pulsar "Salir" en esta página, va al catálogo en lugar de pedirle iniciar sesión.
  if (!usuario && salidaVoluntaria) return <Navigate to="/" replace />
  if (!usuario) {
    const redirigir = encodeURIComponent(ubicacion.pathname + ubicacion.search)
    return <Navigate to={`/login?redirigir=${redirigir}`} replace />
  }
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="py-16 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-2xl font-bold">No tienes permisos para ver esta página</h1>
        <Link to="/" className="mt-6 inline-block font-medium text-indigo-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
