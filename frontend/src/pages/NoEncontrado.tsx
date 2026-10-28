import { Link } from 'react-router-dom'

export default function NoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-indigo-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-slate-600">La dirección que buscas no existe.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
        Ir al catálogo
      </Link>
    </div>
  )
}
