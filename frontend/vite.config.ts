import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// SEG-04 en el frontend: cabeceras de seguridad para el HTML y los archivos que entrega Vite.
// La API (Express) ya envía las suyas con helmet; estas cubren el frontend.
const API = 'http://localhost:3000'

// Build de producción (vite preview): CSP estricta. La app no usa scripts ni estilos en línea:
// solo el bundle de /assets, las imágenes de /productos y llamadas a la API.
// img-src admite https: porque el admin puede usar una URL de imagen externa (con vista previa).
const CSP_PRODUCCION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  `connect-src 'self' ${API}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Desarrollo: sin CSP, porque la recarga en caliente de Vite inyecta scripts y estilos en línea.
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': CSP_PRODUCCION,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  },
})
