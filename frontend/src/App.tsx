import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Chatbot from './components/chat/Chatbot'
import Header from './components/Header'
import RutaProtegida from './components/RutaProtegida'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOrdenes from './pages/admin/AdminOrdenes'
import AdminProductos from './pages/admin/AdminProductos'
import Carrito from './pages/Carrito'
import Catalogo from './pages/Catalogo'
import Checkout from './pages/Checkout'
import DetallePedido from './pages/DetallePedido'
import DetalleProducto from './pages/DetalleProducto'
import Login from './pages/Login'
import NoEncontrado from './pages/NoEncontrado'
import Pedidos from './pages/Pedidos'
import Registro from './pages/Registro'

function Layout() {
  return (
    // pb-24 (96 px) debajo del pie: al final del scroll el botón flotante del chat (56 px + 16/24 px de margen)
    // queda sobre espacio vacío y no tapa ningún elemento.
    <div className="flex min-h-screen flex-col pb-24">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Tienda USCO · Electiva Ingeniería de Software II
      </footer>
      <Chatbot />
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

        {/* Checkout: exige sesión; el mensaje para admin lo muestra la propia página. */}
        <Route
          path="/checkout"
          element={
            <RutaProtegida>
              <Checkout />
            </RutaProtegida>
          }
        />

        <Route
          path="/pedidos"
          element={
            <RutaProtegida roles={['cliente']}>
              <Pedidos />
            </RutaProtegida>
          }
        />
        <Route
          path="/pedidos/:id"
          element={
            <RutaProtegida roles={['cliente']}>
              <DetallePedido volverA="/pedidos" textoVolver="Mis pedidos" />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin"
          element={
            <RutaProtegida roles={['admin']}>
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="productos" replace />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="ordenes" element={<AdminOrdenes />} />
          <Route path="ordenes/:id" element={<DetallePedido volverA="/admin/ordenes" textoVolver="Órdenes" esAdmin />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
