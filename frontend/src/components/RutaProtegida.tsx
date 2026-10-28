import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Rol } from '../types'
import Cargando from './Cargando'

interface Props {
  children: ReactNode
  roles?: Rol[]
}

// Exige sesión iniciada (y opcionalmente un rol). Se usará en la Fase 6 para checkout, mis pedidos y admin.
export default function RutaProtegida({ children, roles }: Props) {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <Cargando texto="Verificando sesión..." />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />

  return <>{children}</>
}
