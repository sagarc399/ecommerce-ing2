import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const pestana = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Panel admin</h1>
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <NavLink to="/admin/productos" className={pestana}>
            Productos
          </NavLink>
          <NavLink to="/admin/ordenes" className={pestana}>
            Órdenes
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
