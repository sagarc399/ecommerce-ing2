// SEG-04 en el frontend: cabeceras de seguridad. Única fuente de verdad para:
//  - vite.config.ts (preview.headers y server.headers), y
//  - nginx en el contenedor de producción (generar-nginx.mjs las convierte en add_header).

// CSP del build de producción. La app no usa scripts ni estilos en línea: solo el bundle de /assets,
// las imágenes de /productos y llamadas a la API. img-src admite https: porque el admin puede usar
// una URL de imagen externa con vista previa (SEG-14, riesgo aceptado).
export function cspProduccion(apiUrl: string): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https:",
    `connect-src 'self' ${apiUrl}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

// Cabeceras del build (vite preview y nginx).
export function cabecerasProduccion(apiUrl: string): Record<string, string> {
  return {
    'Content-Security-Policy': cspProduccion(apiUrl),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  }
}

// Desarrollo: sin CSP, porque la recarga en caliente de Vite inyecta scripts y estilos en línea.
export const cabecerasDesarrollo: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
}
