import { Outlet, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Carrito from './pages/Carrito'
import Catalogo from './pages/Catalogo'
import DetalleProducto from './pages/DetalleProducto'
import Login from './pages/Login'
import NoEncontrado from './pages/NoEncontrado'
import Registro from './pages/Registro'

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Tienda USCO · Electiva Ingeniería de Software II
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<DetalleProducto />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
