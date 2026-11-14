# Multi-stage Dockerfile for TeamForge Frontend Single Page App
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

RUN npm ci

COPY shared/ ./shared/
COPY frontend/ ./frontend/

RUN npm --workspace=shared run build
RUN npm --workspace=frontend run build

# Nginx Production Stage
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

