import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { cabecerasDesarrollo, cabecerasProduccion } from './cabeceras-seguridad.ts'

// SEG-04 en el frontend: las cabeceras están en cabeceras-seguridad.ts, que también usa el contenedor
// de nginx (generar-nginx.mjs). La API (Express) ya envía las suyas con helmet.
const API = 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Desarrollo: sin CSP, para no romper la recarga en caliente.
  server: { headers: cabecerasDesarrollo },
  // Build de producción servido con vite preview: CSP estricta.
  preview: { headers: cabecerasProduccion(API) },
})
