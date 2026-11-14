# Multi-stage Dockerfile for TeamForge Backend Service
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install build dependencies
RUN npm ci

# Copy shared & backend source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared package
RUN npm --workspace=shared run build

# Generate Prisma Client & Build Backend
RUN npm --workspace=backend run prisma:generate
RUN npm --workspace=backend run build

# Production Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl curl

# Copy runtime node_modules and built dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

WORKDIR /app/backend
CMD ["node", "dist/src/index.js"]

