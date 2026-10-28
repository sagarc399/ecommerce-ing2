const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatearPrecio(valor: number): string {
  return formatoCOP.format(valor)
}

export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso))
}

// Ruta interna segura para redirigir después del login (evita redirecciones a otros dominios).
export function rutaInternaSegura(ruta: string | null | undefined): string | null {
  return ruta && ruta.startsWith('/') && !ruta.startsWith('//') ? ruta : null
}
