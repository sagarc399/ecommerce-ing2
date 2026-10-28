import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ItemCarrito, Producto } from '../types'

const CLAVE_CARRITO = 'carrito'
const CANTIDAD_MAXIMA_BACKEND = 10

interface ValorCarrito {
  items: ItemCarrito[]
  totalUnidades: number
  total: number // solo para mostrar: el backend recalcula el total en el checkout
  agregar: (producto: Producto, cantidad: number) => void
  cambiarCantidad: (productoId: number, cantidad: number) => void
  quitar: (productoId: number) => void
  ajustarADisponible: (productoId: number, disponible: number) => void
  vaciar: () => void
  cantidadEnCarrito: (productoId: number) => number
}

// Máximo permitido por producto: el menor entre el límite del backend y el stock.
export function cantidadMaxima(stock: number): number {
  return Math.max(0, Math.min(CANTIDAD_MAXIMA_BACKEND, stock))
}

function limitar(cantidad: number, stock: number): number {
  return Math.min(Math.max(1, Math.floor(cantidad)), cantidadMaxima(stock))
}

function leerCarrito(): ItemCarrito[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]')
    return Array.isArray(guardado) ? guardado : []
  } catch {
    return []
  }
}

const CarritoContext = createContext<ValorCarrito | null>(null)

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>(leerCarrito)

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items))
  }, [items])

  const agregar = useCallback((producto: Producto, cantidad: number) => {
    if (cantidadMaxima(producto.stock) === 0) return
    setItems((actuales) => {
      const existente = actuales.find((i) => i.producto_id === producto.id)
      if (existente) {
        return actuales.map((i) =>
          i.producto_id === producto.id
            ? { ...i, precio: producto.precio, stock: producto.stock, cantidad: limitar(i.cantidad + cantidad, producto.stock) }
            : i
        )
      }
      return [
        ...actuales,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen_url: producto.imagen_url,
          stock: producto.stock,
          cantidad: limitar(cantidad, producto.stock),
        },
      ]
    })
  }, [])

  const cambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((actuales) =>
      actuales.map((i) => (i.producto_id === productoId ? { ...i, cantidad: limitar(cantidad, i.stock) } : i))
    )
  }, [])

  const quitar = useCallback((productoId: number) => {
    setItems((actuales) => actuales.filter((i) => i.producto_id !== productoId))
  }, [])

  // Tras un 409 del checkout: actualiza el stock conocido y deja la cantidad en lo disponible (0 → se quita).
  const ajustarADisponible = useCallback((productoId: number, disponible: number) => {
    setItems((actuales) =>
      disponible <= 0
        ? actuales.filter((i) => i.producto_id !== productoId)
        : actuales.map((i) =>
            i.producto_id === productoId
              ? { ...i, stock: disponible, cantidad: Math.min(i.cantidad, cantidadMaxima(disponible)) }
              : i
          )
    )
  }, [])

  const vaciar = useCallback(() => setItems([]), [])

  const cantidadEnCarrito = useCallback(
    (productoId: number) => items.find((i) => i.producto_id === productoId)?.cantidad ?? 0,
    [items]
  )

  const valor = useMemo(
    () => ({
      items,
      totalUnidades: items.reduce((suma, i) => suma + i.cantidad, 0),
      total: items.reduce((suma, i) => suma + i.precio * i.cantidad, 0),
      agregar,
      cambiarCantidad,
      quitar,
      ajustarADisponible,
      vaciar,
      cantidadEnCarrito,
    }),
    [items, agregar, cambiarCantidad, quitar, ajustarADisponible, vaciar, cantidadEnCarrito]
  )

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}

export function useCarrito(): ValorCarrito {
  const contexto = useContext(CarritoContext)
  if (!contexto) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>')
  return contexto
}
