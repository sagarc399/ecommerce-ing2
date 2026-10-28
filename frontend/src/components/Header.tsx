import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCarrito } from '../context/CarritoContext'

export default function Header() {
  const { usuario, logout } = useAuth()
  const { totalUnidades } = useCarrito()
  const navigate = useNavigate()

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-md px-2 py-1.5 font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`

  // voluntario: si está en una ruta protegida, RutaProtegida lo manda al catálogo y no a /login.
  function cerrarSesion() {
    logout({ voluntario: true })
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-indigo-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">T</span>
          <span className="hidden sm:inline">Tienda USCO</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link to="/carrito" className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100" aria-label={`Carrito: ${totalUnidades} unidades`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            {totalUnidades > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">
                {totalUnidades}
              </span>
            )}
          </Link>

          {usuario ? (
            <>
              {usuario.rol === 'admin' ? (
                <NavLink to="/admin" className={claseEnlace}>
                  Panel admin
                </NavLink>
              ) : (
                <NavLink to="/pedidos" className={claseEnlace}>
                  Mis pedidos
                </NavLink>
              )}
              <span className="hidden max-w-[9rem] truncate text-slate-600 md:inline" title={usuario.email}>
                {usuario.nombre}
                {usuario.rol === 'admin' && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">admin</span>}
              </span>
              <button type="button" onClick={cerrarSesion} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-1 text-slate-700 hover:text-indigo-700">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
