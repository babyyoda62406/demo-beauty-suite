#!/usr/bin/env bash
# =============================================================================
# FGD Beauty Suite — local development bootstrap.
# Copies .env.example -> .env (if missing) and prints next steps.
# Idempotent: safe to run multiple times.
# =============================================================================
set -euo pipefail

# Resolve the repository root (the parent of this script's directory).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# Simple colored logging helpers.
info()  { printf '\033[36m[setup]\033[0m %s\n' "$*"; }
ok()    { printf '\033[32m[ ok  ]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[warn ]\033[0m %s\n' "$*"; }

info "FGD Beauty Suite — preparando el entorno local…"

# 1) Ensure .env exists.
if [ -f .env ]; then
  ok ".env ya existe; no se sobrescribe."
else
  if [ -f .env.example ]; then
    cp .env.example .env
    ok "Creado .env a partir de .env.example."
    warn "Revisa .env y sustituye los secretos DUMMY antes de usar en real."
  else
    warn "No se encontró .env.example. Crea .env manualmente."
  fi
fi

# 2) Advisory tooling checks (do not fail the script).
if command -v docker >/dev/null 2>&1; then
  ok "Docker detectado: $(docker --version)"
else
  warn "Docker no está instalado. Necesario para 'make up'."
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm detectado: $(pnpm --version)"
else
  warn "pnpm no está instalado. Instálalo con 'corepack enable && corepack prepare pnpm@10 --activate'."
fi

cat <<'EOF'

Siguientes pasos:
  1. make up        # levanta postgres, redis, mailhog, api y web
  2. make migrate   # aplica las migraciones Prisma
  3. make seed      # carga datos de ejemplo (Aurora + plataforma)

URLs por defecto:
  - Web:      http://localhost:3000
  - API:      http://localhost:3001/api/v1
  - Mailhog:  http://localhost:8025

EOF

ok "Entorno preparado."
