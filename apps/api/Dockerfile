# syntax=docker/dockerfile:1.7
# =============================================================================
# FGD Beauty Suite — API (NestJS + Prisma) image.
# Multi-stage build. Build context MUST be the repo root so the pnpm
# workspace (packages/*) is available:
#   docker build -f apps/api/Dockerfile -t fgd-api .
# =============================================================================

ARG NODE_VERSION=22

# --- Base: node + pnpm via corepack ----------------------------------------
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
# OpenSSL is required by the Prisma query engine at build and runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

# --- Dependencies: install the full workspace (dev + prod) -----------------
FROM base AS deps
# Copy only the manifests first to maximize Docker layer caching.
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
# Use --frozen-lockfile when a lockfile exists; fall back gracefully otherwise.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install --no-frozen-lockfile; \
    fi

# --- Builder: prisma generate + nest build ---------------------------------
# NB: no se podan devDependencies aquí. La poda (--prod) borraría el CLI de
# Prisma (que el servicio `migrate` necesita) y el cliente Prisma ya generado.
# Se conserva el árbol completo: imagen algo mayor pero correcta y con el
# stage `builder` reutilizable para migraciones+seed.
FROM deps AS builder
COPY apps/api ./apps/api
# Generate the Prisma client, then compile the NestJS app.
RUN pnpm --filter @fgd/api exec prisma generate
RUN pnpm --filter @fgd/api run build

# --- Runner: minimal, non-root runtime -------------------------------------
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production \
    API_PORT=3001
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy only what the runtime needs.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Directorio de subidas (imágenes del CMS). Se monta como volumen en prod
# (UPLOAD_DIR=/app/uploads); lo creamos y damos propiedad a `node` para que el
# proceso no-root pueda escribir en él.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Run as the unprivileged `node` user shipped with the base image.
USER node
WORKDIR /app/apps/api

EXPOSE 3001

# Healthcheck hits the versioned health route exposed by the API.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider \
      "http://127.0.0.1:${API_PORT}/api/v1/health" || exit 1

CMD ["node", "dist/main.js"]
