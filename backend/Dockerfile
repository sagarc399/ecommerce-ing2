# syntax=docker/dockerfile:1
# API de Tienda USCO: compila TypeScript y corre node dist con un usuario sin privilegios.

# --- Etapa 1: compilación (imagen Debian: TypeScript y sus binarios nativos funcionan con glibc) ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Certificado raíz adicional opcional (certs/ca-extra.pem, p. ej. un antivirus que inspecciona HTTPS):
# entra como secreto de BuildKit, solo durante npm ci, y no queda en la imagen.
RUN --mount=type=secret,id=ca_extra NODE_EXTRA_CA_CERTS=/run/secrets/ca_extra npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- Etapa 2: ejecución ---
FROM node:24-alpine
WORKDIR /app
# Solo lo necesario para correr: dependencias de producción y el JavaScript compilado.
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Usuario sin privilegios que trae la imagen oficial de Node.
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
