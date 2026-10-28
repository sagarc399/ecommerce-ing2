export type Rol = 'admin' | 'cliente'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
}

export interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  imagen_url: string | null
  categoria: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string
}

// El precio guardado en el carrito es solo para mostrar: el backend recalcula el total al pagar.
export interface ItemCarrito {
  producto_id: number
  nombre: string
  precio: number
  imagen_url: string | null
  stock: number
  cantidad: number
}

export type EstadoOrden = 'PAGADA' | 'RECHAZADA'

export interface ItemOrden {
  producto_id: number
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface PagoOrden {
  estado: 'APROBADO' | 'RECHAZADO'
  ultimos4: string
  referencia: string
  monto: number
}

export interface Orden {
  id: number
  usuario_id: number
  total: number
  estado: EstadoOrden
  creado_en: string
  comprador: { id: number; nombre: string; email: string }
  items: ItemOrden[]
  pago: PagoOrden | null
}

// Datos que el admin envía al crear o editar un producto (POST y PUT usan el mismo cuerpo).
export interface ProductoEntrada {
  nombre: string
  descripcion: string
  precio: number
  stock: number
  imagen_url: string
  categoria: string
}

export interface RespuestaPaginada<T> {
  datos: T[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}
