# syntax=docker/dockerfile:1
# Frontend de Tienda USCO: vite build servido con nginx, con las mismas cabeceras de seguridad
# que preview.headers (cabeceras-seguridad.ts → generar-nginx.mjs).

# Origen público de la API tal como lo ve el navegador (sin /api). Se fija en el build: el bundle
# usa "$API_URL/api" y la CSP lo autoriza en connect-src. Se pasa desde docker-compose.yml.
ARG API_URL=http://localhost:3000

# --- Etapa 1: build (imagen Debian: Vite usa binarios nativos compilados para glibc) ---
FROM node:24-bookworm-slim AS build
ARG API_URL
WORKDIR /app
COPY package.json package-lock.json ./
# Certificado raíz adicional opcional (certs/ca-extra.pem, p. ej. un antivirus que inspecciona HTTPS):
# entra como secreto de BuildKit, solo durante npm ci, y no queda en la imagen.
RUN --mount=type=secret,id=ca_extra NODE_EXTRA_CA_CERTS=/run/secrets/ca_extra npm ci
COPY . .
# Vite toma VITE_API_URL del entorno; frontend/.env no entra en la imagen (.dockerignore).
RUN VITE_API_URL="$API_URL/api" npm run build \
  && node generar-nginx.mjs "$API_URL" > /app/default.conf

# --- Etapa 2: nginx sin privilegios (escucha en 8080 y corre con el usuario nginx) ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
