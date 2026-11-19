// Genera la configuración de nginx del contenedor web con las MISMAS cabeceras de seguridad que
// preview.headers (cabeceras-seguridad.ts). Uso: node generar-nginx.mjs <URL de la API> > default.conf
// Requiere Node 22.18 o superior (ejecuta TypeScript borrable sin compilar).
import { cabecerasProduccion } from "./cabeceras-seguridad.ts";

const apiUrl = process.argv[2];
if (!apiUrl || !/^https?:\/\/[^\s'";]+$/.test(apiUrl)) {
  console.error("Uso: node generar-nginx.mjs http://host:puerto");
  process.exit(1);
}

// "always" las envía también en respuestas de error (404, 500…).
const cabeceras = Object.entries(cabecerasProduccion(apiUrl))
  .map(([nombre, valor]) => `    add_header ${nombre} "${valor}" always;`)
  .join("\n");

process.stdout.write(`# Generado por generar-nginx.mjs: no editar a mano.
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    # No anunciar la versión de nginx (equivalente a SEG-05 en el frontend).
    server_tokens off;

${cabeceras}

    # SPA: cualquier ruta de React (/carrito, /checkout, /admin…) devuelve index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Archivos con hash en el nombre: se pueden guardar en caché mucho tiempo.
    location /assets/ {
        expires 1y;
${cabeceras}
    }
}
`);
