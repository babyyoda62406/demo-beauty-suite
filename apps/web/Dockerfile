# syntax=docker/dockerfile:1.7
# =============================================================================
# FGD Beauty Suite — Web (Next.js 15 App Router) image.
# Uses Next.js `output: "standalone"`. Build context MUST be the repo root:
#   docker build -f apps/web/Dockerfile -t fgd-web .
# =============================================================================

ARG NODE_VERSION=22

# --- Base: node + pnpm via corepack ----------------------------------------
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

# --- Dependencies: install the full workspace ------------------------------
FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install --no-frozen-lockfile; \
    fi

# --- Builder: next build (standalone output) -------------------------------
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Public env values are baked at build time; provide sensible container defaults.
ARG NEXT_PUBLIC_API_URL=http://api:3001
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY apps/web ./apps/web
RUN pnpm --filter @fgd/web run build

# --- Runner: minimal, non-root runtime -------------------------------------
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    WEB_PORT=3000 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# The standalone output bundles a minimal server + only the needed node_modules.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/" || exit 1

# `server.js` is emitted by Next.js standalone at the workspace-relative path.
CMD ["node", "apps/web/server.js"]
